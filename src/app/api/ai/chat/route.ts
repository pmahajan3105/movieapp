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

// Request validation schema
const chatRequestSchema = z.object({
  message: z.string().min(1, 'Message cannot be empty').max(1000, 'Message too long'),
  sessionId: z.string().optional(),
  stream: z.boolean().optional().default(false),
})

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request
    const body = await request.json()
    const { message: rawMessage, sessionId, stream: requestedStream } = chatRequestSchema.parse(body)
    
    // Sanitize and validate the message
    const validation = MessageValidationService.sanitizeAndValidateMessage(rawMessage)
    if (!validation.valid) {
      return NextResponse.json({
        success: false,
        error: 'Invalid message content',
        details: validation.errors
      }, { status: 400 })
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

    // Authenticate user
    const supabase = createRouteSupabaseClient(request)
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      logger.error(`❌ Authentication required for chat: ${authError?.message}`)
      return NextResponse.json(
        {
          error: 'Authentication required. Please sign in to use the chat feature.',
          success: false,
        },
        { status: 401 }
      )
    }

    logger.info(`👤 Authenticated user for chat: ${user.email}`)

    // Initialize chat session service
    const chatSessionService = new ChatSessionService(supabase, user.id)
    const sessionData = await chatSessionService.getOrCreateSession(sessionId)

    // Check if preferences already extracted
    if (sessionData.preferencesAlreadyExtracted) {
      return NextResponse.json({
        success: true,
        message: "I've already gathered your preferences! You can now explore your personalized movie recommendations.",
        sessionId: sessionData.sessionId,
        preferencesExtracted: true,
      })
    }

    // Create user message
    const userMessage: ChatMessage = {
      role: 'user',
      content: message,
      timestamp: new Date().toISOString(),
    }

    // Detect if this is a movie query
    const movieQuery = PreferenceExtractionService.detectMovieQuery(message)
    
    // Determine AI model to use
    const modelInfo = getBestModelForTask('chat', {
      complexity: movieQuery.isMovieQuery ? 'medium' : 'low',
      requiresExtendedThinking: false,
    })

    logger.info(`🤖 Using AI model: ${modelInfo.model}`)

    // Prepare conversation context
    const conversationHistory = sessionData.chatHistory.map(msg => ({
      role: msg.role,
      content: msg.content
    }))

    // Add current message to conversation
    conversationHistory.push({
      role: 'user',
      content: message
    })

    // Prepare Anthropic API request
    const anthropicRequest = {
      model: modelInfo.model,
      max_tokens: 1000,
      temperature: 0.7,
      system: MOVIE_SYSTEM_PROMPT,
      messages: conversationHistory,
      stream,
    }

    // Add thinking support if available
    if (supportsExtendedThinking(modelInfo.model)) {
      // anthropicRequest.thinking = true // Enable when available
    }

    logger.info('🚀 Sending request to Anthropic:', {
      model: modelInfo.model,
      messageCount: conversationHistory.length,
      stream,
    })

    // Make Anthropic API call
    const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(anthropicRequest),
    })

    if (!anthropicResponse.ok) {
      const errorData = await anthropicResponse.text()
      logger.error('❌ Anthropic API error:', {
        status: anthropicResponse.status,
        error: errorData,
      })
      return NextResponse.json(
        { success: false, error: 'AI service temporarily unavailable' },
        { status: 500 }
      )
    }

    // Handle streaming vs non-streaming response
    if (stream) {
      return StreamingResponseHandler.createStreamingResponse(
        anthropicResponse,
        sessionData.sessionId,
        userMessage,
        chatSessionService,
        sessionData.chatHistory,
        process.env.ANTHROPIC_API_KEY
      )
    } else {
      return NonStreamingResponseHandler.processNonStreamingResponse(
        anthropicResponse,
        sessionData.sessionId,
        userMessage,
        chatSessionService,
        sessionData.chatHistory,
        process.env.ANTHROPIC_API_KEY
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

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}