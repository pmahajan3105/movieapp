// OpenAI Provider for GPT-5-mini
import OpenAI from 'openai'
import { logger } from '@/lib/logger'
import type { AIMessage, AIResponse, StreamingOptions } from '../service'

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
})

export class OpenAIProvider {
  /**
   * Chat completion with GPT-5-mini
   */
  async chat(
    messages: AIMessage[],
    options: {
      model?: string
      temperature?: number
      maxTokens?: number
    } = {}
  ): Promise<AIResponse> {
    const { model = 'gpt-5-mini', temperature = 0.7, maxTokens = 4000 } = options

    try {
      logger.debug('OpenAI chat request', { model, messageCount: messages.length })

      // Convert messages to OpenAI format
      const openaiMessages = messages.map(msg => ({
        role: msg.role as 'system' | 'user' | 'assistant',
        content: msg.content,
      }))

      const response = await openai.chat.completions.create({
        model,
        messages: openaiMessages,
        temperature,
        max_tokens: maxTokens,
      })

      const content = response.choices[0]?.message?.content || ''
      const usage = response.usage

      logger.info('OpenAI chat response received', {
        model: response.model,
        tokens: usage?.total_tokens,
        finishReason: response.choices[0]?.finish_reason,
      })

      return {
        content,
        usage: usage
          ? {
              inputTokens: usage.prompt_tokens,
              outputTokens: usage.completion_tokens,
              totalTokens: usage.total_tokens,
            }
          : undefined,
        model: response.model,
        provider: 'openai',
      }
    } catch (error: any) {
      logger.error('OpenAI API error', {
        error: error.message,
        code: error.code,
        status: error.status,
      })
      throw new Error(`OpenAI API error: ${error.message}`)
    }
  }

  /**
   * Streaming chat completion with GPT-5-mini
   */
  async chatStream(
    messages: AIMessage[],
    options: {
      model?: string
      temperature?: number
      maxTokens?: number
    } = {},
    streamingOptions: StreamingOptions = {}
  ): Promise<AIResponse> {
    const { model = 'gpt-5-mini', temperature = 0.7, maxTokens = 4000 } = options
    const { onChunk, onComplete, onError, signal } = streamingOptions

    try {
      logger.debug('OpenAI streaming request', { model, messageCount: messages.length })

      const openaiMessages = messages.map(msg => ({
        role: msg.role as 'system' | 'user' | 'assistant',
        content: msg.content,
      }))

      const stream = await openai.chat.completions.create({
        model,
        messages: openaiMessages,
        temperature,
        max_tokens: maxTokens,
        stream: true,
      })

      let fullContent = ''
      let totalInputTokens = 0
      let totalOutputTokens = 0
      let modelUsed = model

      for await (const chunk of stream) {
        if (signal?.aborted) {
          logger.info('OpenAI streaming aborted by client')
          break
        }

        const delta = chunk.choices[0]?.delta?.content || ''
        if (delta) {
          fullContent += delta
          onChunk?.(delta)
        }

        // Track model used
        if (chunk.model) {
          modelUsed = chunk.model
        }

        // Note: OpenAI streaming doesn't provide token counts in real-time
        // We'll estimate or get them from the final chunk if available
      }

      // Estimate tokens if not provided (rough approximation)
      // 1 token ≈ 4 characters for English text
      totalInputTokens = Math.ceil(
        messages.reduce((sum, msg) => sum + msg.content.length, 0) / 4
      )
      totalOutputTokens = Math.ceil(fullContent.length / 4)

      onComplete?.(fullContent)

      logger.info('OpenAI streaming completed', {
        model: modelUsed,
        contentLength: fullContent.length,
        estimatedTokens: totalInputTokens + totalOutputTokens,
      })

      return {
        content: fullContent,
        usage: {
          inputTokens: totalInputTokens,
          outputTokens: totalOutputTokens,
          totalTokens: totalInputTokens + totalOutputTokens,
        },
        model: modelUsed,
        provider: 'openai',
      }
    } catch (error: any) {
      logger.error('OpenAI streaming error', { error: error.message })
      onError?.(error)
      throw error
    }
  }
}

export const openaiProvider = new OpenAIProvider()

