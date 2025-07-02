import { NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import type { ChatMessage, PreferenceData } from '@/types/chat'
import { PreferenceExtractionService } from './preference-extraction-service'
import { ChatSessionService } from './chat-session-service'

export class NonStreamingResponseHandler {
  /**
   * Process non-streaming response from Anthropic API
   */
  static async processNonStreamingResponse(
    anthropicResponse: Response,
    sessionId: string,
    userMessage: ChatMessage,
    chatSessionService: ChatSessionService,
    chatHistory: ChatMessage[],
    anthropicApiKey: string
  ): Promise<NextResponse> {
    try {
      if (!anthropicResponse.ok) {
        throw new Error(`Anthropic API error: ${anthropicResponse.status}`)
      }

      const anthropicData = await anthropicResponse.json()
      const assistantContent = anthropicData.content?.[0]?.text

      if (!assistantContent) {
        throw new Error('No content in Anthropic response')
      }

      const aiResponse: ChatMessage = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        role: 'assistant',
        content: assistantContent,
        timestamp: new Date(),
      }

      // Check if we should extract preferences
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
            // Update session with preferences
            await chatSessionService.updateSession(
              sessionId,
              userMessage,
              aiResponse,
              extractedPreferences,
              true
            )

            logger.info('✅ Preferences extracted and saved')

            return NextResponse.json({
              success: true,
              message: assistantContent,
              sessionId,
              preferencesExtracted: true,
              preferences: extractedPreferences,
              completionMessage:
                "Great! I've learned about your movie preferences. You can now get personalized recommendations!",
            })
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

      return NextResponse.json({
        success: true,
        message: assistantContent,
        sessionId,
        preferencesExtracted: false,
      })
    } catch (error) {
      logger.error('❌ Failed to process non-streaming response:', {
        error: error instanceof Error ? error.message : String(error),
      })

      return NextResponse.json(
        {
          success: false,
          error: 'Failed to process AI response',
        },
        { status: 500 }
      )
    }
  }
}
