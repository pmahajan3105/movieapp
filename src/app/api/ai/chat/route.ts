import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'
import {
  MOVIE_SYSTEM_PROMPT,
  PREFERENCE_EXTRACTION_PROMPT,
} from '@/lib/anthropic/config'
import { movieService } from '@/lib/services/movie-service'
import { getModelForTask, supportsStreaming, modelSelector } from '@/lib/ai/models'
import { aiService } from '@/lib/ai/service'
import { v4 as uuidv4 } from 'uuid'
import type { ChatMessage, PreferenceData } from '@/types/chat'

// Use ChatMessage from our AI service
// import type { ChatMessage } from '@/lib/ai/service'

const chatRequestSchema = z.object({
  message: z.string().min(1, 'Message cannot be empty').max(1000, 'Message too long'),
  sessionId: z.string().optional(),
  stream: z.boolean().optional().default(false),
})

// Helper function to detect if user is asking about a specific movie
function detectMovieQuery(message: string): { isMovieQuery: boolean; movieTitle?: string } {
  const moviePatterns = [
    /tell me about (.+)/i,
    /what about (.+)/i,
    /do you know (.+)/i,
    /have you seen (.+)/i,
    /what's (.+) about/i,
    /is (.+) good/i,
    /(.+) movie/i,
  ]

  for (const pattern of moviePatterns) {
    const match = message.match(pattern)
    if (match) {
      const potentialTitle = match[1].trim()
      // Filter out common non-movie terms
      const nonMovieTerms = ['movies', 'films', 'cinema', 'that', 'this', 'it', 'them']
      if (!nonMovieTerms.includes(potentialTitle.toLowerCase()) && potentialTitle.length > 2) {
        return { isMovieQuery: true, movieTitle: potentialTitle }
      }
    }
  }

  return { isMovieQuery: false }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { message, sessionId, stream: requestedStream } = chatRequestSchema.parse(body)
    let stream = requestedStream // Use mutable variable

    console.log('🎬 Claude Chat API request:', { message: message.substring(0, 50), sessionId, stream })

    // Check if AI service is available - use more specific check
    try {
      const availableModels = modelSelector.getAvailableModels()
      if (availableModels.length === 0) {
        console.error('❌ No AI models configured')
        return NextResponse.json(
          { error: 'AI service not configured', success: false },
          { status: 500 }
        )
      }
    } catch (configError) {
      console.error('❌ AI service configuration error:', configError)
      return NextResponse.json(
        { error: 'AI service not configured', success: false },
        { status: 500 }
      )
    }

    // Use anon key for now (consistent with existing implementation)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // For now, skip user authentication to avoid cookie issues
    const user = { id: '00000000-0000-0000-0000-000000000001' } // UUID for anonymous user

    // Get or create chat session
    let currentSessionId: string
    let chatHistory: ChatMessage[] = []

    if (sessionId) {
      // Try to get existing session
      currentSessionId = sessionId
      const { data: existingSession } = await supabase
        .from('chat_sessions')
        .select('messages, preferences_extracted')
        .eq('id', sessionId)
        .eq('user_id', user.id)
        .single()

      if (existingSession) {
        chatHistory = existingSession.messages || []

        // If preferences already extracted, don't continue chat
        if (existingSession.preferences_extracted) {
          return NextResponse.json({
            success: true,
            message:
              "I've already gathered your preferences! You can now explore your personalized movie recommendations.",
            sessionId: currentSessionId,
            preferencesExtracted: true,
          })
        }
      }
    } else {
      // Create new session
      const { data: newSession, error: sessionError } = await supabase
        .from('chat_sessions')
        .insert({
          user_id: user.id,
          messages: [],
          preferences_extracted: false,
        })
        .select('id')
        .single()

      if (sessionError) {
        console.error('Session creation error:', sessionError)
        return NextResponse.json(
          { error: `Database error: ${sessionError.message || 'Unknown error'}`, success: false },
          { status: 500 }
        )
      }

      currentSessionId = newSession.id
    }

    // Add user message to history
    const userMessage: ChatMessage = {
      id: uuidv4(),
      role: 'user',
      content: message,
      timestamp: new Date(),
    }
    chatHistory.push(userMessage)

    // Check if user is asking about a specific movie
    const movieQuery = detectMovieQuery(message)
    let movieInfo = ''

    if (movieQuery.isMovieQuery && movieQuery.movieTitle) {
      console.log('🎬 Detected movie query:', movieQuery.movieTitle)
      movieInfo = await movieService.getMovieInfoForChat(movieQuery.movieTitle)
    }

    // Prepare messages for Claude API
    let systemPrompt = MOVIE_SYSTEM_PROMPT
    if (movieInfo) {
      systemPrompt += `\n\nCURRENT MOVIE INFORMATION:\n${movieInfo}\n\nUse this information to provide accurate details about the movie in your response.`
    }

    const claudeMessages = chatHistory.map(msg => ({
      role: msg.role === 'assistant' ? 'assistant' : 'user',
      content: msg.content,
    }))

    console.log('🤖 Calling Claude API with', claudeMessages.length, 'messages')

    // Get the appropriate model for chat task
    const model = getModelForTask('chat')
    console.log(`🎯 Using model: ${model.name} (${model.provider})`)

    try {
      // Handle streaming vs non-streaming responses
      if (stream) {
        console.log('📡 Using streaming response')
        
        // Check if model supports streaming
        if (!supportsStreaming(model.id)) {
          console.log('⚠️ Model does not support streaming, falling back to non-streaming')
          stream = false
        }
      }
      
      if (stream) {

        // Create streaming response using unified AI service
        const streamResponse = await aiService.createStreamingChatCompletion(
          model,
          claudeMessages.map(msg => ({
            role: msg.role as 'user' | 'assistant',
            content: msg.content,
          })),
          {
            systemPrompt: systemPrompt,
            temperature: model.temperature,
            maxTokens: model.maxTokens,
          }
        )

        // Enhance the stream with our custom logic (session management, etc.)
        const encoder = new TextEncoder()
        const enhancedStream = new ReadableStream({
          async start(controller) {
            try {
              const reader = streamResponse.getReader()
              let fullResponse = ''

              // Send start event with session info
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                type: 'start',
                sessionId: currentSessionId,
                model: model.name,
                timestamp: new Date().toISOString(),
              })}\n\n`))

              while (true) {
                const { done, value } = await reader.read()
                if (done) break

                const chunk = new TextDecoder().decode(value)
                const lines = chunk.split('\n')

                for (const line of lines) {
                  if (line.startsWith('data: ')) {
                    const eventData = line.slice(6).trim()
                    
                    if (eventData === '[DONE]') {
                      // Handle completion logic
                      const aiMessage: ChatMessage = {
                        id: uuidv4(),
                        role: 'assistant',
                        content: fullResponse,
                        timestamp: new Date(),
                      }
                      chatHistory.push(aiMessage)

                      // Update chat session
                      try {
                        await supabase
                          .from('chat_sessions')
                          .update({
                            messages: chatHistory,
                            preferences_extracted: false, // TODO: Add preference extraction
                            updated_at: new Date().toISOString(),
                          })
                          .eq('id', currentSessionId)
                      } catch (error) {
                        console.error('❌ Error saving AI message:', error)
                      }
                      
                      controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                        type: 'complete',
                        fullResponse,
                        sessionId: currentSessionId,
                        preferencesExtracted: false, // TODO: Add preference extraction
                        preferences: null,
                        timestamp: new Date().toISOString(),
                      })}\n\n`))
                      
                      controller.enqueue(encoder.encode(`data: [DONE]\n\n`))
                      controller.close()
                      return
                    }

                    try {
                      const event = JSON.parse(eventData)
                      
                      if (event.type === 'content' && event.content) {
                        fullResponse += event.content
                        // Forward the content event
                        controller.enqueue(encoder.encode(`data: ${eventData}\n\n`))
                      }
                    } catch {
                      // Forward other events as-is (removed unused parseError variable)
                      controller.enqueue(encoder.encode(`${line}\n\n`))
                    }
                  }
                }
              }
            } catch (error) {
              console.error('❌ Streaming error:', error)
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                type: 'error',
                error: error instanceof Error ? error.message : 'Streaming failed',
                timestamp: new Date().toISOString(),
              })}\n\n`))
              controller.close()
            }
          }
        })

        return new Response(enhancedStream, {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
          },
        })
      }

      // Non-streaming response using unified AI service
      const response = await aiService.createChatCompletion(
        model,
        claudeMessages.map(msg => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
        })),
        {
          systemPrompt: systemPrompt,
          temperature: model.temperature,
          maxTokens: model.maxTokens,
        }
      )

      const aiResponse = response.content

      if (!aiResponse) {
        throw new Error('No response from Claude')
      }

      console.log('✅ Got Claude response:', aiResponse.substring(0, 100) + '...')

      // Add AI response to history
      const aiMessage: ChatMessage = {
        id: uuidv4(),
        role: 'assistant',
        content: aiResponse,
        timestamp: new Date(),
      }
      chatHistory.push(aiMessage)

      // Enhanced preference extraction logic
      const userMessages = chatHistory.filter(m => m.role === 'user').length
      let preferencesExtracted = false
      let extractedPreferences: PreferenceData | undefined

      // More intelligent extraction triggers
      const shouldExtract = 
        userMessages >= 3 && (
          aiResponse.toLowerCase().includes('organize') ||
          aiResponse.toLowerCase().includes('learned') ||
          aiResponse.toLowerCase().includes('understand') ||
          aiResponse.toLowerCase().includes('gathered') ||
          userMessages >= 5
        )

      if (shouldExtract) {
        try {
          console.log('🔍 Extracting preferences from conversation')
          
          // Extract preferences using Claude
          const conversationSummary = chatHistory
            .map(m => `${m.role}: ${m.content}`)
            .join('\n')

          const extractionCompletion = await aiService.createChatCompletion(
            model,
            [
              {
                role: 'user' as const,
                content: `Please analyze this movie preference conversation and extract structured data:\n\n${conversationSummary}`,
              },
            ],
            {
              systemPrompt: PREFERENCE_EXTRACTION_PROMPT,
              temperature: 0.1, // Very low temperature for consistent extraction
            }
          )

          const extractionResult = extractionCompletion.content

          if (extractionResult) {
            try {
              const jsonMatch = extractionResult.match(/\{[\s\S]*\}/)
              if (jsonMatch) {
                extractedPreferences = JSON.parse(jsonMatch[0])
                preferencesExtracted = true

                // Update user profile with preferences
                await supabase
                  .from('user_profiles')
                  .update({
                    preferences: extractedPreferences,
                    onboarding_completed: true,
                    updated_at: new Date().toISOString(),
                  })
                  .eq('id', user.id)

                console.log('✅ Preferences extracted and saved:', extractedPreferences)
              }
            } catch (parseError) {
              console.error('❌ JSON parsing error:', parseError)
            }
          }
        } catch (error) {
          console.error('❌ Preference extraction error:', error)
        }
      }

      // Update chat session
      const { error: updateError } = await supabase
        .from('chat_sessions')
        .update({
          messages: chatHistory,
          preferences_extracted: preferencesExtracted,
          updated_at: new Date().toISOString(),
        })
        .eq('id', currentSessionId)

      if (updateError) {
        console.error('❌ Failed to update chat session:', updateError)
      }

      console.log('✅ Claude Chat API success - returning response')

      return NextResponse.json({
        success: true,
        message: aiResponse,
        sessionId: currentSessionId,
        preferencesExtracted,
        preferences: extractedPreferences,
        movieInfo: movieInfo ? 'Movie information included in response' : undefined,
      })

    } catch (claudeError: unknown) {
      console.error('❌ Claude API error:', claudeError)
      
      // Handle specific Claude API errors
      const error = claudeError as { error?: { type?: string } }
      if (error?.error?.type === 'authentication_error') {
        return NextResponse.json(
          { error: 'Claude API authentication failed. Please check your API key.', success: false },
          { status: 401 }
        )
      }

      if (error?.error?.type === 'rate_limit_error') {
        return NextResponse.json(
          { error: 'Rate limit exceeded. Please try again in a moment.', success: false },
          { status: 429 }
        )
      }

      throw claudeError
    }

  } catch (error) {
    console.error('❌ Chat API error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message, success: false },
        { status: 400 }
      )
    }

    if (error instanceof Error && error.message.includes('API key')) {
      return NextResponse.json(
        { error: 'AI service configuration error', success: false },
        { status: 500 }
      )
    }

    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('❌ Chat API final error:', errorMessage)

    return NextResponse.json(
      {
        error: 'Failed to process chat message. Please try again.',
        success: false,
        details: errorMessage,
      },
      { status: 500 }
    )
  }
}
