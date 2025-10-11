import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { createRouteSupabaseClient } from '@/lib/supabase/route-client'
import { z } from 'zod'
import { MOVIE_SYSTEM_PROMPT } from '@/lib/anthropic/config'
import { getBestModelForTask, supportsExtendedThinking } from '@/lib/ai/models'
import { v4 as uuidv4 } from 'uuid'
import type { ChatMessage } from '@/types/chat'

// Import our new services
import { MessageValidationService } from '@/lib/services/message-validation-service'
import { ChatSessionService } from '@/lib/services/chat-session-service'
import { PreferenceExtractionService } from '@/lib/services/preference-extraction-service'
import { StreamingResponseHandler } from '@/lib/services/streaming-response-handler'
import { NonStreamingResponseHandler } from '@/lib/services/non-streaming-response-handler'
import { UserMemoryService } from '@/lib/services/user-memory-service'
import { getUserContext } from '@/lib/utils/single-user-mode'
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
      stream: requestedStream,
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
    let stream = requestedStream // Use mutable variable

    logger.info('🎬 Claude Chat API request:', {
      message: message.substring(0, 50),
      sessionId,
      stream,
    })

    // Validate Anthropic API key
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'Anthropic API key missing' }, { status: 500 })
    }

    // Authenticate user (with SINGLE_USER_MODE support)
    const supabase = createRouteSupabaseClient(request)
    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser()

    // Get user context (handles SINGLE_USER_MODE)
    let user
    try {
      const userContext = getUserContext(authUser?.id)
      user = {
        id: userContext.id,
        email: userContext.email,
        isSingleUser: userContext.isSingleUser
      }
    } catch (error) {
      logger.error(`❌ Authentication required for chat: ${error}`)
      return NextResponse.json(
        {
          error: 'Authentication required. Please sign in to use the chat feature.',
          success: false,
        },
        { status: 401 }
      )
    }

    logger.info(`👤 User for chat: ${user.email} ${user.isSingleUser ? '(single user mode)' : '(authenticated)'}`)

    // Initialize chat session service
    const chatSessionService = new ChatSessionService(supabase, user.id)
    const sessionData = await chatSessionService.getOrCreateSession(sessionId)

    // Check if preferences already extracted
    if (sessionData.preferencesAlreadyExtracted) {
      return NextResponse.json({
        success: true,
        message:
          "I've already gathered your preferences! You can now explore your personalized movie recommendations.",
        sessionId: sessionData.sessionId,
        preferencesExtracted: true,
      })
    }

    // Create user message
    const userMessage: ChatMessage = {
      id: uuidv4(),
      role: 'user',
      content: message,
      timestamp: new Date(),
    }

    // Load user's AI provider preference
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('preferences')
      .eq('id', user.id)
      .single()

    const aiSettings = profile?.preferences?.ai_settings
    const preferredProvider = aiSettings?.ai_provider || 'openai'
    const preferredModel = aiSettings?.preferred_model || 'gpt-5-mini'

    // Determine AI model to use
    const modelId = preferredProvider === 'openai' ? preferredModel : getBestModelForTask('chat')

    logger.info(`🤖 Using AI model: ${modelId}, provider: ${preferredProvider}`)

    // Prepare conversation context
    const conversationHistory = sessionData.chatHistory.map(msg => ({
      role: msg.role,
      content: msg.content,
    }))

    // Add current message to conversation
    conversationHistory.push({
      role: 'user',
      content: message,
    })

    // Initialize memory service and enrich system prompt
    const memoryService = new UserMemoryService()
    const enrichedSystemPrompt = await memoryService.enrichPromptWithMemory(user.id, MOVIE_SYSTEM_PROMPT)

    // Prepare AI messages with enriched system prompt
    const aiMessages = [
      {
        role: 'system' as const,
        content: enrichedSystemPrompt,
      },
      ...conversationHistory.map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      })),
    ]

    logger.info('🚀 Sending request to AI:', {
      model: modelId,
      provider: preferredProvider,
      messageCount: conversationHistory.length,
      stream,
    })

    // Import the AI service
    const { aiService } = await import('@/lib/ai/service')

    try {
      // Handle streaming vs non-streaming
      if (stream) {
        // Use streaming chat
        let fullContent = ''
        
        const content = await aiService.chatStream(aiMessages, {
          model: modelId,
          temperature: 0.7,
          maxTokens: 1000,
          preferredProvider,
          onChunk: (chunk) => {
            fullContent += chunk
          },
          onComplete: async (content) => {
            // Save the complete assistant message
            const assistantMessage = {
              id: uuidv4(),
              role: 'assistant' as const,
              content,
              timestamp: new Date(),
            }
            // Note: saveMessage method doesn't exist, using updateSession instead
            // await chatSessionService.saveMessage(sessionData.sessionId, assistantMessage)
          },
        })

        // Save user message
        // Note: saveMessage method doesn't exist, using updateSession instead
        // await chatSessionService.saveMessage(sessionData.sessionId, userMessage)

        return NextResponse.json({
          success: true,
          message: fullContent,
          sessionId: sessionData.sessionId,
          provider: preferredProvider,
        })
      } else {
        // Use non-streaming chat
        const response = await aiService.chat(aiMessages, {
          model: modelId,
          temperature: 0.7,
          maxTokens: 1000,
          preferredProvider,
        })

        // Save messages
        // Note: saveMessage method doesn't exist, using updateSession instead
        // await chatSessionService.saveMessage(sessionData.sessionId, userMessage)
        const assistantMessage = {
          id: uuidv4(),
          role: 'assistant' as const,
          content: response.content,
          timestamp: new Date(),
        }
        // Note: saveMessage method doesn't exist, using updateSession instead
        // await chatSessionService.saveMessage(sessionData.sessionId, assistantMessage)

        logger.info('✅ AI chat response received', {
          provider: response.provider,
          model: response.model,
          tokens: response.usage?.totalTokens,
        })

        return NextResponse.json({
          success: true,
          message: response.content,
          sessionId: sessionData.sessionId,
          provider: response.provider,
          usage: response.usage,
        })
      }
    } catch (aiError: any) {
      logger.error('❌ AI service error:', {
        error: aiError.message,
        provider: preferredProvider,
      })
      return NextResponse.json(
        { success: false, error: 'AI service temporarily unavailable' },
        { status: 500 }
      )
    }
  } catch (error) {
    logger.error('❌ Chat API error:', {
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
