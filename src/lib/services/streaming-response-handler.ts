import { logger } from '@/lib/logger'
import type { ChatMessage, PreferenceData } from '@/types/chat'
import { PreferenceExtractionService } from './preference-extraction-service'
import { ChatSessionService } from './chat-session-service'

export class StreamingResponseHandler {
  /**
   * Create a streaming response for the chat API
   */
  static createStreamingResponse(
    anthropicResponse: Response,
    sessionId: string,
    userMessage: ChatMessage,
    chatSessionService: ChatSessionService,
    chatHistory: ChatMessage[],
    anthropicApiKey: string
  ): Response {
    const encoder = new TextEncoder()
    let assistantMessage = ''
    let chunks: string[] = []

    const readable = new ReadableStream({
      async start(controller) {
        try {
          if (!anthropicResponse.body) {
            throw new Error('No response body from Anthropic')
          }

          const reader = anthropicResponse.body.getReader()
          const decoder = new TextDecoder()

          while (true) {
            const { done, value } = await reader.read()
            if (done) break

            const chunk = decoder.decode(value, { stream: true })
            chunks.push(chunk)

            // Parse streaming response
            const lines = chunk.split('\n')
            for (const line of lines) {
              if (line.trim() === '') continue

              if (line.startsWith('data: ')) {
                const data = line.slice(6)
                if (data === '[DONE]') continue

                try {
                  const parsed = JSON.parse(data)

                  if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
                    const text = parsed.delta.text
                    assistantMessage += text

                    // Send text chunk to client
                    controller.enqueue(
                      encoder.encode(
                        `data: ${JSON.stringify({
                          type: 'content',
                          content: text,
                        })}\n\n`
                      )
                    )
                  }
                } catch (parseError) {
                  // Ignore parsing errors for streaming data
                  continue
                }
              }
            }
          }

          // Process complete response
          await StreamingResponseHandler.processCompleteStreamingResponse(
            sessionId,
            userMessage,
            assistantMessage,
            chatSessionService,
            chatHistory,
            anthropicApiKey,
            controller,
            encoder
          )
        } catch (error) {
          logger.error('❌ Streaming error:', {
            error: error instanceof Error ? error.message : String(error),
          })

          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: 'error',
                error: 'Streaming failed',
              })}\n\n`
            )
          )
        } finally {
          controller.close()
        }
      },
    })

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    })
  }

  /**
   * Process the complete streaming response and extract preferences
   */
  private static async processCompleteStreamingResponse(
    sessionId: string,
    userMessage: ChatMessage,
    assistantMessage: string,
    chatSessionService: ChatSessionService,
    chatHistory: ChatMessage[],
    anthropicApiKey: string,
    controller: ReadableStreamDefaultController,
    encoder: TextEncoder
  ): Promise<void> {
    try {
      const aiResponse: ChatMessage = {
        role: 'assistant',
        content: assistantMessage,
        timestamp: new Date().toISOString(),
      }

      // Check if we have enough conversation for preference extraction
      const fullHistory = [...chatHistory, userMessage, aiResponse]
      let extractedPreferences: PreferenceData | null = null
      let shouldExtractPreferences = false

      // Determine if we should extract preferences
      if (fullHistory.length >= 4) {
        // At least 2 user messages and 2 AI responses
        const userMessages = fullHistory.filter(msg => msg.role === 'user')
        const conversationLength = userMessages.reduce((acc, msg) => acc + msg.content.length, 0)

        if (conversationLength > 100) {
          // Meaningful conversation
          shouldExtractPreferences = true
        }
      }

      if (shouldExtractPreferences) {
        logger.info('💾 Processing conversation for preference extraction')

        try {
          extractedPreferences =
            await PreferenceExtractionService.extractPreferencesFromConversation(
              fullHistory,
              anthropicApiKey
            )

          if (extractedPreferences && Object.keys(extractedPreferences).length > 0) {
            // Send preferences to client
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  type: 'preferences',
                  preferences: extractedPreferences,
                })}\n\n`
              )
            )

            // Update session with preferences
            await chatSessionService.updateSession(
              sessionId,
              userMessage,
              aiResponse,
              extractedPreferences,
              true
            )

            // Send completion notification
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  type: 'complete',
                  sessionId,
                  preferencesExtracted: true,
                  fullResponse: assistantMessage,
                  message:
                    "Great! I've learned about your movie preferences. You can now get personalized recommendations!",
                })}\n\n`
              )
            )

            logger.info('✅ Preferences extracted and saved via streaming')
            return
          }
        } catch (extractionError) {
          logger.error('❌ Failed to extract preferences:', {
            error:
              extractionError instanceof Error ? extractionError.message : String(extractionError),
          })
        }
      }

      // Update session without preferences
      await chatSessionService.updateSession(sessionId, userMessage, aiResponse, undefined, false)

      // Send completion notification
      controller.enqueue(
        encoder.encode(
          `data: ${JSON.stringify({
            type: 'complete',
            sessionId,
            preferencesExtracted: false,
            fullResponse: assistantMessage,
          })}\n\n`
        )
      )
    } catch (error) {
      logger.error('❌ Failed to process streaming response:', {
        error: error instanceof Error ? error.message : String(error),
      })

      controller.enqueue(
        encoder.encode(
          `data: ${JSON.stringify({
            type: 'error',
            error: 'Failed to process response',
          })}\n\n`
        )
      )
    }
  }
}
