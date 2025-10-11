// AI Service for CineAI - Multi-Provider (OpenAI primary, Anthropic fallback)
import Anthropic from '@anthropic-ai/sdk'
import { openaiProvider } from './providers/openai-provider'
import { logger } from '@/lib/logger'
import { DEFAULT_MODEL, FALLBACK_MODEL, getModelById } from './models'
import { validateModel, logModelValidation } from '@/lib/utils/model-validation'

// Initialize Anthropic client for fallback
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

export interface AIMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface AIResponse {
  content: string
  usage?: {
    inputTokens: number
    outputTokens: number
    totalTokens: number
  }
  model: string
  provider: 'anthropic' | 'openai'
}

export interface StreamingOptions {
  onChunk?: (chunk: string) => void
  onComplete?: (content: string) => void
  onError?: (error: Error) => void
  signal?: AbortSignal
}

export interface AICallOptions {
  model?: string
  temperature?: number
  maxTokens?: number
  useFallback?: boolean // Force Claude fallback
  preferredProvider?: 'openai' | 'claude' // User's provider preference
}

export class AIService {
  /**
   * Call AI with messages and get a response
   * Primary: OpenAI GPT-5-mini, Fallback: Claude 4.5 Sonnet
   */
  async chat(messages: AIMessage[], options: AICallOptions = {}): Promise<AIResponse> {
    const {
      model = DEFAULT_MODEL,
      temperature = 0.7,
      maxTokens = 4000,
      useFallback = false,
      preferredProvider,
    } = options

    // Validate model ID with graceful fallback
    const validation = validateModel(model)
    const actualModel = validation.isValid ? validation.modelId : validation.fallbackModelId!
    logModelValidation(validation, 'AI Service chat')

    // Determine provider based on preference or model
    const modelConfig = getModelById(actualModel)
    let provider = modelConfig?.provider || 'openai'

    // Override with user preference
    if (preferredProvider === 'claude') {
      provider = 'anthropic'
    } else if (preferredProvider === 'openai') {
      provider = 'openai'
    }

    // Force fallback if requested
    if (useFallback) {
      provider = 'anthropic'
    }

    try {
      logger.debug(`AI chat request`, { model: actualModel, originalModel: model, provider, messageCount: messages.length })

      // Route to appropriate provider
      if (provider === 'openai') {
        try {
          return await this.chatWithOpenAI(messages, { model: actualModel, temperature, maxTokens })
        } catch (openaiError) {
          // Auto-fallback to Claude on OpenAI errors
          logger.warn('OpenAI failed, falling back to Claude', {
            error: openaiError instanceof Error ? openaiError.message : String(openaiError),
          })
          return await this.chatWithAnthropic(messages, {
            model: actualModel,
            temperature,
            maxTokens,
          })
        }
      } else {
        return await this.chatWithAnthropic(messages, {
          model: actualModel,
          temperature,
          maxTokens,
        })
      }
    } catch (error: any) {
      logger.error('AI chat error', { error: error.message, provider })
      throw error
    }
  }

  /**
   * OpenAI GPT-5-mini Implementation
   */
  private async chatWithOpenAI(
    messages: AIMessage[],
    options: { model: string; temperature: number; maxTokens: number }
  ): Promise<AIResponse> {
    return await openaiProvider.chat(messages, options)
  }

  /**
   * Anthropic Claude Implementation (Fallback)
   */
  private async chatWithAnthropic(
    messages: AIMessage[],
    options: { model: string; temperature: number; maxTokens: number }
  ): Promise<AIResponse> {
    const { model, temperature, maxTokens } = options

    // Prepare messages for Anthropic format
    const anthropicMessages = messages
      .filter(msg => msg.role !== 'system')
      .map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      }))

    const systemMessage = messages.find(msg => msg.role === 'system')?.content

    // Build request parameters
    const requestParams: Anthropic.MessageCreateParams = {
      model,
      max_tokens: maxTokens,
      temperature,
      messages: anthropicMessages,
    }

    if (systemMessage) {
      requestParams.system = systemMessage
    }

    const response = await anthropic.messages.create(requestParams)

    const content = response.content
      .filter(block => block.type === 'text')
      .map(block => block.text)
      .join('\n')

    return {
      content,
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
        totalTokens: response.usage.input_tokens + response.usage.output_tokens,
      },
      model: response.model,
      provider: 'anthropic',
    }
  }

  /**
   * Stream AI response in real-time
   * Supports both OpenAI and Claude with automatic fallback
   */
  async chatStream(
    messages: AIMessage[],
    options: AICallOptions & StreamingOptions = {}
  ): Promise<string> {
    const {
      model = DEFAULT_MODEL,
      temperature = 0.7,
      maxTokens = 4000,
      onChunk,
      onComplete,
      onError,
      signal,
      preferredProvider,
    } = options

    // Validate model ID with graceful fallback
    const validation = validateModel(model)
    const actualModel = validation.isValid ? validation.modelId : validation.fallbackModelId!
    logModelValidation(validation, 'AI Service streaming')

    const modelConfig = getModelById(actualModel)
    let provider = modelConfig?.provider || 'openai'

    if (preferredProvider === 'claude') {
      provider = 'anthropic'
    } else if (preferredProvider === 'openai') {
      provider = 'openai'
    }

    try {
      logger.debug(`AI stream request`, { model: actualModel, originalModel: model, provider, messageCount: messages.length })

      if (provider === 'openai') {
        try {
          const response = await openaiProvider.chatStream(
            messages,
            { model: actualModel, temperature, maxTokens },
            { onChunk, onComplete, onError, signal }
          )
          return response.content
        } catch (openaiError) {
          logger.warn('OpenAI streaming failed, falling back to Claude', {
            error: openaiError instanceof Error ? openaiError.message : String(openaiError),
          })
          return await this.chatStreamAnthropic(
            messages,
            { model: actualModel, temperature, maxTokens },
            { onChunk, onComplete, onError, signal }
          )
        }
      } else {
        return await this.chatStreamAnthropic(
          messages,
          { model: actualModel, temperature, maxTokens },
          { onChunk, onComplete, onError, signal }
        )
      }
    } catch (error: any) {
      logger.error('AI stream error', { error: error.message, provider })
      onError?.(error)
      throw error
    }
  }

  /**
   * Anthropic streaming implementation
   */
  private async chatStreamAnthropic(
    messages: AIMessage[],
    options: { model: string; temperature: number; maxTokens: number },
    streamingOptions: StreamingOptions
  ): Promise<string> {
    const { model, temperature, maxTokens } = options
    const { onChunk, onComplete, onError, signal } = streamingOptions

    try {
      const anthropicMessages = messages
        .filter(msg => msg.role !== 'system')
        .map(msg => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
        }))

      const systemMessage = messages.find(msg => msg.role === 'system')?.content

      const requestParams: Anthropic.MessageCreateParams = {
        model,
        max_tokens: maxTokens,
        temperature,
        messages: anthropicMessages,
        stream: true,
      }

      if (systemMessage) {
        requestParams.system = systemMessage
      }

      const stream = await anthropic.messages.create(requestParams)
      let fullContent = ''

      for await (const chunk of stream) {
        if (signal?.aborted) {
          break
        }

        if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
          const text = chunk.delta.text
          fullContent += text
          onChunk?.(text)
        }
      }

      onComplete?.(fullContent)
      return fullContent
    } catch (error: any) {
      logger.error('Anthropic streaming error', { error: error.message })
      onError?.(error)
      throw error
    }
  }

  /**
   * Generate movie recommendations (using GPT-5-mini for creativity)
   */
  async generateRecommendations(
    userPreferences: string,
    movieContext: string,
    options: AICallOptions = {}
  ): Promise<AIResponse> {
    const messages: AIMessage[] = [
      {
        role: 'system',
        content: `You are CineAI, an expert movie recommendation assistant. Generate personalized movie recommendations based on user preferences and context.

Guidelines:
- Provide 5-8 diverse movie recommendations
- Include brief explanations for each recommendation
- Consider genres, mood, themes, and viewing context
- Format as a clean, readable list
- Be enthusiastic but concise`,
      },
      {
        role: 'user',
        content: `User Preferences: ${userPreferences}

Movie Context: ${movieContext}

Please provide personalized movie recommendations.`,
      },
    ]

    return this.chat(messages, {
      model: options.model || DEFAULT_MODEL,
      temperature: 0.8,
      maxTokens: 2000,
      ...options,
    })
  }

  /**
   * Extract user preferences from chat conversation (using GPT-5-mini)
   */
  async extractPreferences(chatHistory: string, options: AICallOptions = {}): Promise<AIResponse> {
    const messages: AIMessage[] = [
      {
        role: 'system',
        content: `Analyze this chat conversation and extract the user's movie preferences in JSON format.

Extract:
- genres: array of preferred genres
- themes: array of themes/topics they enjoy
- mood: current viewing mood
- exclusions: things they want to avoid
- context: viewing situation (solo, date night, family, etc.)

Return valid JSON only.`,
      },
      {
        role: 'user',
        content: `Chat History:\n${chatHistory}\n\nExtract movie preferences as JSON:`,
      },
    ]

    return this.chat(messages, {
      model: options.model || DEFAULT_MODEL,
      temperature: 0.3,
      maxTokens: 1000,
      ...options,
    })
  }
}

// Export singleton instance
export const aiService = new AIService()

// Convenience functions
export async function generateMovieRecommendations(
  userPreferences: string,
  movieContext: string,
  options?: AICallOptions
): Promise<AIResponse> {
  return aiService.generateRecommendations(userPreferences, movieContext, options)
}

export async function extractUserPreferences(
  chatHistory: string,
  options?: AICallOptions
): Promise<AIResponse> {
  return aiService.extractPreferences(chatHistory, options)
}
