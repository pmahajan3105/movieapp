import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'
import {
  groq,
  groqConfig,
  PREFERENCE_SYSTEM_PROMPT,
  PREFERENCE_EXTRACTION_PROMPT,
} from '@/lib/groq/config'
import { v4 as uuidv4 } from 'uuid'
import type { ChatMessage, PreferenceData } from '@/types/chat'

const chatRequestSchema = z.object({
  message: z.string().min(1, 'Message cannot be empty').max(1000, 'Message too long'),
  sessionId: z.string().optional(),
  stream: z.boolean().optional().default(false), // Disable streaming by default for stability
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { message, sessionId, stream } = chatRequestSchema.parse(body)

    console.log('🎬 Chat API request:', { message: message.substring(0, 50), sessionId, stream })

    // Check if Groq is available
    if (!groq) {
      console.error('❌ Groq not configured')
      return NextResponse.json(
        { error: 'AI service not configured', success: false },
        { status: 500 }
      )
    }

    // Use anon key for now (same as other working APIs)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // For now, skip user authentication to avoid cookie issues
    // TODO: Implement proper authentication later
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
      // Create new session - let database auto-generate ID
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
        console.error('Session creation error details:', {
          error: sessionError,
          message: sessionError.message,
          details: sessionError.details,
          hint: sessionError.hint,
          code: sessionError.code,
        })
        return NextResponse.json(
          { error: `Database error: ${sessionError.message || 'Unknown error'}`, success: false },
          { status: 500 }
        )
      }

      // Use the auto-generated ID
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

    // Prepare messages for Groq API
    const groqMessages = [
      { role: 'system', content: PREFERENCE_SYSTEM_PROMPT },
      ...chatHistory.map(msg => ({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: msg.content,
      })),
    ] as Array<{ role: 'system' | 'user' | 'assistant'; content: string }>

    console.log('🤖 Calling Groq API with', groqMessages.length, 'messages')

    // Enhanced streaming response with proper Server-Sent Events (if enabled)
    if (stream) {
      const encoder = new TextEncoder()
      
      return new Response(
        new ReadableStream({
          async start(controller) {
            try {
              console.log('🌊 Starting stream response')
              
              // Call Groq API with streaming enabled
              const completion = await groq.chat.completions.create({
                messages: groqMessages,
                model: groqConfig.model,
                max_tokens: groqConfig.maxTokens,
                temperature: groqConfig.temperature,
                top_p: groqConfig.topP,
                stream: true,
              })

              let fullResponse = ''
              
              // Send initial metadata
              const initialData = {
                type: 'start',
                sessionId: currentSessionId,
                timestamp: new Date().toISOString()
              }
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(initialData)}\n\n`))

              // Stream the response
              for await (const chunk of completion) {
                const content = chunk.choices[0]?.delta?.content || ''
                if (content) {
                  fullResponse += content
                  const streamData = {
                    type: 'content',
                    content: content,
                    timestamp: new Date().toISOString()
                  }
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify(streamData)}\n\n`))
                }
              }

              // Handle preference extraction and database updates after streaming
              if (fullResponse) {
                console.log('✅ Stream completed, processing response')
                
                // Add AI response to history
                const aiMessage: ChatMessage = {
                  id: uuidv4(),
                  role: 'assistant',
                  content: fullResponse,
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
                    fullResponse.toLowerCase().includes('organize') ||
                    fullResponse.toLowerCase().includes('learned') ||
                    fullResponse.toLowerCase().includes('understand') ||
                    fullResponse.toLowerCase().includes('gathered') ||
                    userMessages >= 5
                  )

                if (shouldExtract) {
                  try {
                    console.log('🔍 Extracting preferences from conversation')
                    
                    // Extract preferences using AI with better prompt
                    const conversationSummary = chatHistory
                      .map(m => `${m.role}: ${m.content}`)
                      .join('\n')

                    const extractionCompletion = await groq.chat.completions.create({
                      messages: [
                        { role: 'system', content: PREFERENCE_EXTRACTION_PROMPT },
                        {
                          role: 'user',
                          content: `Please analyze this movie preference conversation and extract structured data:\n\n${conversationSummary}`,
                        },
                      ] as Array<{ role: 'system' | 'user'; content: string }>,
                      model: groqConfig.model,
                      max_tokens: 500,
                      temperature: 0.1, // Very low temperature for consistent extraction
                    })

                    const extractionResult = extractionCompletion.choices[0]?.message?.content

                    if (extractionResult) {
                      // More robust JSON parsing
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
                        // Continue without extraction
                      }
                    }
                  } catch (error) {
                    console.error('❌ Preference extraction error:', error)
                    // Continue without extraction
                  }
                }

                // Update chat session with enhanced error handling
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
                  // Continue - don't fail the whole request for this
                }

                // Send completion event with preferences if extracted
                const completionData = {
                  type: 'complete',
                  sessionId: currentSessionId,
                  preferencesExtracted,
                  preferences: extractedPreferences,
                  fullResponse,
                  timestamp: new Date().toISOString()
                }
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(completionData)}\n\n`))
              }

              // Close the stream
              controller.enqueue(encoder.encode(`data: [DONE]\n\n`))
              controller.close()

            } catch (error) {
              console.error('❌ Streaming error:', error)
              const errorData = {
                type: 'error',
                error: error instanceof Error ? error.message : 'Unknown streaming error',
                timestamp: new Date().toISOString()
              }
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(errorData)}\n\n`))
              controller.close()
            }
          }
        }),
        {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          },
        }
      )
    }

    // Non-streaming fallback (more stable)
    console.log('📝 Using non-streaming response')
    
    const completion = await groq.chat.completions.create({
      messages: groqMessages,
      model: groqConfig.model,
      max_tokens: groqConfig.maxTokens,
      temperature: groqConfig.temperature,
      top_p: groqConfig.topP,
      stream: false,
    })

    const aiResponse = completion.choices[0]?.message?.content

    if (!aiResponse) {
      throw new Error('No response from AI')
    }

    console.log('✅ Got AI response:', aiResponse.substring(0, 100) + '...')

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
        
        // Extract preferences using AI with better prompt
        const conversationSummary = chatHistory
          .map(m => `${m.role}: ${m.content}`)
          .join('\n')

        const extractionCompletion = await groq.chat.completions.create({
          messages: [
            { role: 'system', content: PREFERENCE_EXTRACTION_PROMPT },
            {
              role: 'user',
              content: `Please analyze this movie preference conversation and extract structured data:\n\n${conversationSummary}`,
            },
          ] as Array<{ role: 'system' | 'user'; content: string }>,
          model: groqConfig.model,
          max_tokens: 500,
          temperature: 0.1, // Very low temperature for consistent extraction
        })

        const extractionResult = extractionCompletion.choices[0]?.message?.content

        if (extractionResult) {
          // More robust JSON parsing
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
            // Continue without extraction
          }
        }
      } catch (error) {
        console.error('❌ Preference extraction error:', error)
        // Continue without extraction
      }
    }

    // Update chat session with enhanced error handling
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
      // Continue - don't fail the whole request for this
    }

    console.log('✅ Chat API success - returning response')

    return NextResponse.json({
      success: true,
      message: aiResponse,
      sessionId: currentSessionId,
      preferencesExtracted,
      preferences: extractedPreferences,
    })
  } catch (error) {
    console.error('❌ Chat API error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: error.errors[0].message,
          success: false,
        },
        { status: 400 }
      )
    }

    if (error instanceof Error && error.message.includes('API key')) {
      return NextResponse.json(
        {
          error: 'AI service configuration error',
          success: false,
        },
        { status: 500 }
      )
    }

    // Enhanced error logging
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('❌ Chat API final error:', errorMessage)

    return NextResponse.json(
      {
        error: 'Failed to process chat message. Please try again.',
        success: false,
        details: errorMessage, // Include for debugging
      },
      { status: 500 }
    )
  }
}
