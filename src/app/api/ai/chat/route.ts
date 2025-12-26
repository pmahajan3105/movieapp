import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { LocalStorageService } from '@/lib/db'
import { ConfigService } from '@/lib/config/config-service'
import { z } from 'zod'
import { MOVIE_SYSTEM_PROMPT } from '@/lib/anthropic/config'
import { getBestModelForTask } from '@/lib/ai/models'

// Import services
import { MessageValidationService } from '@/lib/services/message-validation-service'
import { applyRateLimit, rateLimiters } from '@/lib/utils/rate-limiter'

// Request validation schema
const chatRequestSchema = z.object({
  message: z.string().min(1, 'Message cannot be empty').max(1000, 'Message too long'),
  sessionId: z.string().optional(),
  stream: z.boolean().optional().default(false),
})

export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResponse = await applyRateLimit(request, rateLimiters.ai)
    if (rateLimitResponse) {
      return rateLimitResponse
    }

    // Parse and validate request
    const body = await request.json()
    const {
      message: rawMessage,
      sessionId,
      stream,
    } = chatRequestSchema.parse(body)

    // Sanitize and validate the message
    const validation = MessageValidationService.sanitizeAndValidateMessage(rawMessage)
    if (!validation.valid) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid message content',
          details: validation.errors,
        },
        { status: 400 }
      )
    }

    const message = validation.sanitized

    logger.info('AI Chat API request:', {
      message: message.substring(0, 50),
      sessionId,
      stream,
    })

    // Check for API keys
    const apiKeys = ConfigService.getApiKeys()
    if (!apiKeys.anthropic && !apiKeys.openai) {
      return NextResponse.json(
        {
          success: false,
          error: 'No AI API key configured. Please add an OpenAI or Anthropic key in settings.',
        },
        { status: 500 }
      )
    }

    // Get or create chat session
    let currentSessionId = sessionId
    let chatHistory: Array<{ role: string; content: string }> = []

    if (sessionId) {
      const session = LocalStorageService.getChatSession(sessionId)
      if (session) {
        chatHistory = session.messages
        if (session.preferencesExtracted) {
          return NextResponse.json({
            success: true,
            message: "I've already gathered your preferences! You can now explore your personalized movie recommendations.",
            sessionId,
            preferencesExtracted: true,
          })
        }
      }
    }

    if (!currentSessionId) {
      currentSessionId = LocalStorageService.createChatSession()
    }

    // Determine preferred provider based on available keys
    const preferredProvider = apiKeys.openai ? 'openai' : 'claude'

    // Determine AI model to use
    const modelId = getBestModelForTask('chat')

    logger.info(`Using AI model: ${modelId}, provider: ${preferredProvider}`)

    // Add current message to conversation
    chatHistory.push({
      role: 'user',
      content: message,
    })

    // Enrich system prompt with local user context
    const profile = LocalStorageService.getUserProfile()
    const genrePrefs = LocalStorageService.getGenrePreferences()
    const stats = LocalStorageService.getStats()

    let enrichedPrompt = MOVIE_SYSTEM_PROMPT
    if (profile?.name) {
      enrichedPrompt = enrichedPrompt.replace('the user', profile.name)
    }

    // Add user context
    const genreList = Array.from(genrePrefs.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([genre]) => genre)
      .join(', ')

    if (genreList) {
      enrichedPrompt += `\n\nUser's favorite genres: ${genreList}`
    }

    enrichedPrompt += `\nUser has rated ${stats.totalRatings} movies and has ${stats.watchlistCount} movies in their watchlist.`

    // Prepare AI messages
    const aiMessages = [
      {
        role: 'system' as const,
        content: enrichedPrompt,
      },
      ...chatHistory.map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      })),
    ]

    logger.info('Sending request to AI:', {
      model: modelId,
      provider: preferredProvider,
      messageCount: chatHistory.length,
    })

    // Import the AI service
    const { aiService } = await import('@/lib/ai/service')

    try {
      // Use non-streaming chat for simplicity in local mode
      const response = await aiService.chat(aiMessages, {
        model: modelId,
        temperature: 0.7,
        maxTokens: 1000,
        preferredProvider,
      })

      // Save the updated chat history
      chatHistory.push({
        role: 'assistant',
        content: response.content,
      })

      LocalStorageService.updateChatSession(currentSessionId, {
        messages: chatHistory,
      })

      // Record interaction
      LocalStorageService.recordInteraction('ai_chat', undefined, {
        sessionId: currentSessionId,
        messageCount: chatHistory.length,
      })

      logger.info('AI chat response received', {
        provider: response.provider,
        model: response.model,
        tokens: response.usage?.totalTokens,
      })

      return NextResponse.json({
        success: true,
        message: response.content,
        sessionId: currentSessionId,
        provider: response.provider,
        usage: response.usage,
        source: 'local',
      })
    } catch (aiError) {
      logger.error('AI service error:', {
        error: aiError instanceof Error ? aiError.message : String(aiError),
        provider: preferredProvider,
      })
      return NextResponse.json(
        { success: false, error: 'AI service temporarily unavailable' },
        { status: 500 }
      )
    }
  } catch (error) {
    logger.error('Chat API error:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    })

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request format',
          details: error.errors,
        },
        { status: 400 }
      )
    }

    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
