// AI Service for CineAI - Anthropic Claude only
import Anthropic from '@anthropic-ai/sdk'
import { logger } from '@/lib/logger'
import { DEFAULT_MODEL, FAST_MODEL } from './models'

// Initialize Anthropic client
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
  provider: 'anthropic'
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
}

export class AIService {
  /**
   * Call AI with messages and get a response
   */
  async chat(messages: AIMessage[], options: AICallOptions = {}): Promise<AIResponse> {
    const { model = DEFAULT_MODEL, temperature = 0.7, maxTokens = 4000 } = options

    try {
      logger.debug(`AI chat request`, { model, messageCount: messages.length })

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
        usage: response.usage
          ? {
              inputTokens: response.usage.input_tokens,
              outputTokens: response.usage.output_tokens,
              totalTokens: response.usage.input_tokens + response.usage.output_tokens,
            }
          : undefined,
        model,
        provider: 'anthropic',
      }
    } catch (error) {
      logger.error('AI chat error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        model,
      })
      throw new Error(`AI chat failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Stream AI response in real-time
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
    } = options

    try {
      logger.debug(`AI stream request`, { model, messageCount: messages.length })

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
    } catch (error) {
      logger.error('AI stream error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        model,
      })
      const aiError = new Error(
        `AI stream failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
      onError?.(aiError)
      throw aiError
    }
  }

  /**
   * Generate movie recommendations
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
   * Extract user preferences from chat conversation
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

  /**
   * Search movies by mood/description
   */
  async moodSearch(
    moodQuery: string,
    availableMovies: string,
    options: AICallOptions = {}
  ): Promise<AIResponse> {
    const messages: AIMessage[] = [
      {
        role: 'system',
        content: `You are a movie mood-matching expert. Find movies that match the user's current mood or vague description from the available movies list.

Guidelines:
- Match movies to the mood/feeling described
- Consider atmosphere, tone, and emotional impact
- Provide 3-5 relevant matches
- Explain why each movie fits the mood
- Be creative with mood interpretation`,
      },
      {
        role: 'user',
        content: `Mood/Description: "${moodQuery}"

Available Movies:
${availableMovies}

Find movies that match this mood:`,
      },
    ]

    return this.chat(messages, {
      model: options.model || FAST_MODEL, // Use faster model for mood search
      temperature: 0.7,
      maxTokens: 1500,
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

export async function searchMoviesByMood(
  moodQuery: string,
  availableMovies: string,
  options?: AICallOptions
): Promise<AIResponse> {
  return aiService.moodSearch(moodQuery, availableMovies, options)
}
