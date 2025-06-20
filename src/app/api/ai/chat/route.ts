import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/client'
import { z } from 'zod'
import { MOVIE_SYSTEM_PROMPT } from '@/lib/anthropic/config'
import { movieService } from '@/lib/services/movie-service'
import { getModelForTask, supportsStreaming } from '@/lib/ai/models'
import { v4 as uuidv4 } from 'uuid'
import type { ChatMessage, PreferenceData } from '@/types/chat'
// Legacy mem0 integration removed - using simpler preference extraction
// import { movieMemoryService } from '@/lib/mem0/client'
// import type { Message } from 'mem0ai'

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
      const potentialTitle = match[1]?.trim()
      // Filter out common non-movie terms
      const nonMovieTerms = ['movies', 'films', 'cinema', 'that', 'this', 'it', 'them']
      if (
        potentialTitle &&
        !nonMovieTerms.includes(potentialTitle.toLowerCase()) &&
        potentialTitle.length > 2
      ) {
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

    console.log('🎬 Claude Chat API request:', {
      message: message.substring(0, 50),
      sessionId,
      stream,
    })

    // Check if AI service is available
    if (!process.env.ANTHROPIC_API_KEY && !process.env.GROQ_API_KEY) {
      console.error('❌ No AI API keys configured')
      return NextResponse.json(
        { error: 'AI service not configured', success: false },
        { status: 500 }
      )
    }

    // Prefer GROQ if available, fallback to Anthropic
    const useGroq = !!process.env.GROQ_API_KEY
    console.log('🤖 Using AI provider:', useGroq ? 'GROQ' : 'Anthropic')

    // Use server client to get authenticated user
    const supabase = await createServerClient()

    // Get the authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      console.error('❌ Authentication required for chat:', authError?.message)
      return NextResponse.json(
        {
          error: 'Authentication required. Please sign in to use the chat feature.',
          success: false,
        },
        { status: 401 }
      )
    }

    console.log('👤 Authenticated user for chat:', user.email)

    // Get or create chat session
    let currentSessionId: string
    let chatHistory: ChatMessage[] = []

    try {
      if (sessionId) {
        // Try to get existing session
        currentSessionId = sessionId
        const { data: existingSession, error: selectError } = await supabase
          .from('chat_sessions')
          .select('messages, preferences_extracted')
          .eq('id', sessionId)
          .eq('user_id', user.id)
          .single()

        if (selectError && selectError.code !== 'PGRST116') {
          // Not a "not found" error - could be table missing
          console.error('❌ Error accessing chat_sessions table:', selectError)
          throw new Error('Chat feature temporarily unavailable. Database table not found.')
        }

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
          console.error('❌ Session creation error:', sessionError)

          // Check if it's a missing table error
          if (sessionError.code === '42P01') {
            return NextResponse.json(
              {
                error:
                  'Chat feature temporarily unavailable. Please contact support to enable the chat functionality.',
                success: false,
                code: 'MISSING_TABLE',
              },
              { status: 503 }
            )
          }

          return NextResponse.json(
            { error: `Database error: ${sessionError.message || 'Unknown error'}`, success: false },
            { status: 500 }
          )
        }

        currentSessionId = newSession.id
      }
    } catch (dbError) {
      console.error('❌ Database error in chat session handling:', dbError)
      return NextResponse.json(
        {
          error: 'Chat feature temporarily unavailable. Please try again later.',
          success: false,
          code: 'DATABASE_ERROR',
        },
        { status: 503 }
      )
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

      // Handle streaming vs non-streaming responses
      if (stream) {
        // Return streaming response
        const encoder = new TextEncoder()

        const responseStream = new ReadableStream({
          async start(controller) {
            try {
              let response

              if (useGroq) {
                // GROQ streaming API call
                response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${process.env.GROQ_API_KEY!}`,
                  },
                  body: JSON.stringify({
                    model: 'llama-3.3-70b-versatile',
                    messages: [{ role: 'system', content: systemPrompt }, ...claudeMessages],
                    max_tokens: 1000,
                    temperature: 0.7,
                    stream: true,
                  }),
                })
              } else {
                // Anthropic streaming API call
                response = await fetch('https://api.anthropic.com/v1/messages', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': process.env.ANTHROPIC_API_KEY!,
                    'anthropic-version': '2023-06-01',
                  },
                  body: JSON.stringify({
                    model: 'claude-3-5-sonnet-20241022',
                    max_tokens: 1000,
                    messages: claudeMessages,
                    system: systemPrompt,
                    temperature: 0.7,
                    stream: true,
                  }),
                })
              }

              if (!response.ok) {
                throw new Error(
                  `${useGroq ? 'GROQ' : 'Anthropic'} streaming API error: ${response.status}`
                )
              }

              // Send start event
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({
                    type: 'start',
                    sessionId: currentSessionId,
                    timestamp: new Date().toISOString(),
                  })}\n\n`
                )
              )

              const reader = response.body?.getReader()
              if (!reader) {
                throw new Error('No response stream available')
              }

              let fullResponse = ''
              let buffer = '' // Buffer for incomplete chunks
              let jsonBuffer = '' // Buffer specifically for JSON parsing

              while (true) {
                const { done, value } = await reader.read()
                if (done) break

                const chunk = new TextDecoder().decode(value)
                buffer += chunk

                const lines = buffer.split('\n')
                // Keep the last line in buffer if it doesn't end with newline
                buffer = lines.pop() || ''

                for (const line of lines) {
                  if (line.startsWith('data: ')) {
                    const eventData = line.slice(6).trim()

                    if (eventData === '[DONE]') {
                      // Process final response
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

                      // More flexible extraction triggers - catch all the ways users ask to save
                      const userRequestedSave = chatHistory.some(
                        msg =>
                          msg.role === 'user' &&
                          ((msg.content.toLowerCase().includes('save') &&
                            (msg.content.toLowerCase().includes('preference') ||
                              msg.content.toLowerCase().includes('my account') ||
                              msg.content.toLowerCase().includes('my profile'))) ||
                            (msg.content.toLowerCase().includes('update') &&
                              (msg.content.toLowerCase().includes('preference') ||
                                msg.content.toLowerCase().includes('my account') ||
                                msg.content.toLowerCase().includes('my profile') ||
                                msg.content.toLowerCase().includes('it in my'))) ||
                            (msg.content.toLowerCase().includes('remember') &&
                              msg.content.toLowerCase().includes('preference')) ||
                            (msg.content.toLowerCase().includes('store') &&
                              msg.content.toLowerCase().includes('preference')))
                      )

                      const aiCompletionSignals =
                        fullResponse.toLowerCase().includes('updated your') ||
                        fullResponse.toLowerCase().includes('saved') ||
                        fullResponse.toLowerCase().includes('got it') ||
                        fullResponse.toLowerCase().includes('noted') ||
                        fullResponse.toLowerCase().includes('recorded') ||
                        fullResponse.toLowerCase().includes('preferences') ||
                        fullResponse.toLowerCase().includes('perfect!') ||
                        fullResponse.toLowerCase().includes('great') ||
                        fullResponse.toLowerCase().includes('excellent')

                      console.log('🔍 Extraction check (streaming):', {
                        userMessages,
                        userRequestedSave,
                        aiCompletionSignals,
                        userTexts: chatHistory.filter(m => m.role === 'user').map(m => m.content),
                        fullResponse: fullResponse.substring(0, 100),
                      })

                      const shouldExtract =
                        userRequestedSave || // User explicitly asked to save preferences
                        (userMessages >= 2 && aiCompletionSignals) ||
                        userMessages >= 3 // Extract after 3+ user messages anyway

                      if (shouldExtract) {
                        try {
                          console.log('🔍 Extracting preferences from conversation (streaming)')

                          // Legacy mem0 integration removed - now using direct preference extraction
                          console.log('💾 Processing conversation for preference extraction')

                          // Use the same enhanced preference extraction logic
                          const conversationText = chatHistory
                            .map(m => m.content)
                            .join(' ')
                            .toLowerCase()

                          // Extract genres mentioned in conversation
                          const genres: string[] = []
                          const genreKeywords = {
                            comedy: ['comedy', 'comedies', 'funny', 'humor', 'laugh'],
                            horror: [
                              'horror',
                              'scary',
                              'fear',
                              'frightening',
                              'terrifying',
                              'shining',
                            ],
                            action: ['action', 'fight', 'explosion', 'adventure'],
                            drama: ['drama', 'emotional', 'serious'],
                            romance: ['romance', 'romantic', 'love'],
                            'sci-fi': ['sci-fi', 'science fiction', 'futuristic', 'space'],
                            thriller: ['thriller', 'suspense', 'tense'],
                            fantasy: ['fantasy', 'magic', 'wizards'],
                          }

                          for (const [genre, keywords] of Object.entries(genreKeywords)) {
                            if (keywords.some(keyword => conversationText.includes(keyword))) {
                              genres.push(genre.charAt(0).toUpperCase() + genre.slice(1))
                            }
                          }

                          // Extract year range from conversation (same logic as non-streaming)
                          let yearRange = { min: 1980, max: 2024 }
                          const currentYear = new Date().getFullYear()

                          const yearPatterns = [
                            /last (\d+) years?/gi,
                            /past (\d+) years?/gi,
                            /recent (\d+) years?/gi,
                            /from (\d{4}) to (\d{4})/gi,
                            /between (\d{4}) and (\d{4})/gi,
                            /(\d{4})-(\d{4})/gi,
                            /after (\d{4})/gi,
                            /since (\d{4})/gi,
                            /before (\d{4})/gi,
                            /until (\d{4})/gi,
                            /(\d{4})s/gi,
                          ]

                          for (const pattern of yearPatterns) {
                            const matches = Array.from(conversationText.matchAll(pattern))
                            for (const match of matches) {
                              if (pattern.source.includes('last|past|recent')) {
                                const yearsBack = parseInt(match[1]!, 10)
                                if (yearsBack && yearsBack > 0 && yearsBack <= 50) {
                                  yearRange = { min: currentYear - yearsBack, max: currentYear }
                                  console.log(
                                    `📅 Extracted year range from "last ${yearsBack} years":`,
                                    yearRange
                                  )
                                  break
                                }
                              } else if (
                                pattern.source.includes('from.*to|between.*and|\\d{4}-\\d{4}')
                              ) {
                                const startYear = parseInt(match[1]!, 10)
                                const endYear = parseInt(match[2]!, 10)
                                if (
                                  startYear &&
                                  endYear &&
                                  startYear >= 1900 &&
                                  endYear <= currentYear &&
                                  startYear <= endYear
                                ) {
                                  yearRange = { min: startYear, max: endYear }
                                  break
                                }
                              }
                              // Add other year extraction logic as needed
                            }
                          }

                          // Extract rating range from conversation (same logic as non-streaming)
                          let ratingRange = { min: 6.0, max: 10.0 }

                          const ratingPatterns = [
                            /(\d+(?:\.\d+)?)\s*\+/gi,
                            /(\d+(?:\.\d+)?)\s*or\s*higher/gi,
                            /above\s*(\d+(?:\.\d+)?)/gi,
                            /over\s*(\d+(?:\.\d+)?)/gi,
                          ]

                          for (const pattern of ratingPatterns) {
                            const matches = Array.from(conversationText.matchAll(pattern))
                            for (const match of matches) {
                              if (pattern.source.includes('\\+|or.*higher|above|over')) {
                                const minRating = parseFloat(match[1]!)
                                if (minRating && minRating >= 1 && minRating <= 10) {
                                  ratingRange = { min: minRating, max: 10.0 }
                                  console.log(
                                    `⭐ Extracted rating range from "${match[0]}":`,
                                    ratingRange
                                  )
                                  break
                                }
                              }
                            }
                          }

                          // Extract actors/directors if mentioned
                          const actors: string[] = []
                          const directors: string[] = []

                          // Create enhanced preferences object
                          const extractedPreferenceData = {
                            genres: genres.length > 0 ? genres : [],
                            actors,
                            directors,
                            themes: [],
                            moods: [],
                            dislikedGenres: [],
                            languages: ['English'],
                            viewingContexts: [],
                            yearRange,
                            ratingRange,
                          }

                          console.log(
                            '✅ Extracted preferences (streaming):',
                            extractedPreferenceData
                          )

                          // Save to database
                          const { error: updateError } = await supabase
                            .from('user_profiles')
                            .upsert({
                              id: user.id,
                              email: user.email,
                              preferences: extractedPreferenceData,
                              onboarding_completed: true,
                              updated_at: new Date().toISOString(),
                            })

                          if (updateError) {
                            console.error('❌ Database update error (streaming):', updateError)
                            throw updateError
                          }

                          console.log('✅ Preferences saved to database successfully (streaming)')
                          preferencesExtracted = true
                          extractedPreferences = extractedPreferenceData
                        } catch (error) {
                          console.error('❌ Preference extraction error (streaming):', error)
                        }
                      }

                      // Send completion event
                      controller.enqueue(
                        encoder.encode(
                          `data: ${JSON.stringify({
                            type: 'complete',
                            fullResponse,
                            sessionId: currentSessionId,
                            preferencesExtracted,
                            preferences: extractedPreferences,
                            timestamp: new Date().toISOString(),
                          })}\n\n`
                        )
                      )

                      // Update chat session
                      await supabase
                        .from('chat_sessions')
                        .update({
                          messages: chatHistory,
                          preferences_extracted: preferencesExtracted,
                          updated_at: new Date().toISOString(),
                        })
                        .eq('id', currentSessionId)

                      controller.enqueue(encoder.encode(`data: [DONE]\n\n`))
                      controller.close()
                      return
                    }

                    // Skip empty data events
                    if (!eventData || eventData === '') continue

                    // Improved JSON chunk buffering
                    jsonBuffer += eventData

                    // Try to parse JSON chunks - first attempt simple parse
                    try {
                      const jsonData = JSON.parse(jsonBuffer)

                      let content = ''
                      if (useGroq) {
                        content = jsonData.choices?.[0]?.delta?.content || ''
                      } else {
                        if (jsonData.type === 'content_block_delta') {
                          content = jsonData.delta?.text || ''
                        }
                      }

                      if (content) {
                        fullResponse += content

                        // Debug logging
                        console.log(
                          '📤 Sending content chunk:',
                          JSON.stringify(content.substring(0, 50))
                        )

                        // Send content event
                        controller.enqueue(
                          encoder.encode(
                            `data: ${JSON.stringify({
                              type: 'content',
                              content,
                              timestamp: new Date().toISOString(),
                            })}\n\n`
                          )
                        )
                      }

                      // Successfully parsed, clear buffer
                      jsonBuffer = ''
                    } catch {
                      // JSON might be incomplete - try to find complete objects
                      let processedAnyObject = false

                      // Look for multiple complete JSON objects in buffer
                      let startIndex = 0
                      while (startIndex < jsonBuffer.length) {
                        const objectStart = jsonBuffer.indexOf('{', startIndex)
                        if (objectStart === -1) break

                        // Try to find the matching closing brace
                        let braceCount = 0
                        let inString = false
                        let escapeNext = false
                        let objectEnd = -1

                        for (let i = objectStart; i < jsonBuffer.length; i++) {
                          const char = jsonBuffer[i]

                          if (escapeNext) {
                            escapeNext = false
                            continue
                          }

                          if (char === '\\') {
                            escapeNext = true
                            continue
                          }

                          if (char === '"') {
                            inString = !inString
                            continue
                          }

                          if (!inString) {
                            if (char === '{') {
                              braceCount++
                            } else if (char === '}') {
                              braceCount--
                              if (braceCount === 0) {
                                objectEnd = i
                                break
                              }
                            }
                          }
                        }

                        if (objectEnd !== -1) {
                          // Found a complete JSON object
                          const jsonString = jsonBuffer.slice(objectStart, objectEnd + 1)

                          try {
                            const jsonData = JSON.parse(jsonString)

                            let content = ''
                            if (useGroq) {
                              content = jsonData.choices?.[0]?.delta?.content || ''
                            } else {
                              if (jsonData.type === 'content_block_delta') {
                                content = jsonData.delta?.text || ''
                              }
                            }

                            if (content) {
                              fullResponse += content

                              // Debug logging
                              console.log(
                                '📤 Sending content chunk (multi):',
                                JSON.stringify(content.substring(0, 50))
                              )

                              // Send content event
                              controller.enqueue(
                                encoder.encode(
                                  `data: ${JSON.stringify({
                                    type: 'content',
                                    content,
                                    timestamp: new Date().toISOString(),
                                  })}\n\n`
                                )
                              )
                            }

                            processedAnyObject = true
                          } catch {
                            // Skip malformed object
                            console.log(
                              '⚠️ Skipping malformed JSON object:',
                              jsonString.substring(0, 100)
                            )
                          }

                          // Move past this object
                          startIndex = objectEnd + 1
                        } else {
                          // No complete object found, stop processing
                          break
                        }
                      }

                      if (processedAnyObject) {
                        // Remove processed content from buffer
                        jsonBuffer = jsonBuffer.slice(startIndex)
                      }

                      // Prevent buffer from growing too large
                      if (jsonBuffer.length > 10000) {
                        console.log('⚠️ JSON buffer too large, resetting to current chunk')
                        jsonBuffer = eventData
                      }
                    }
                  }
                }
              }

              // Process any remaining buffer content
              if (buffer.startsWith('data: ')) {
                const eventData = buffer.slice(6).trim()
                if (eventData && eventData !== '[DONE]' && eventData !== '') {
                  // Try to parse any remaining complete JSON objects
                  jsonBuffer += eventData

                  let remainingBuffer = jsonBuffer
                  let jsonStartIndex = 0

                  while (jsonStartIndex < remainingBuffer.length) {
                    const objectStart = remainingBuffer.indexOf('{', jsonStartIndex)
                    if (objectStart === -1) break

                    let braceCount = 0
                    let objectEnd = -1
                    let inString = false
                    let escapeNext = false

                    for (let i = objectStart; i < remainingBuffer.length; i++) {
                      const char = remainingBuffer[i]

                      if (escapeNext) {
                        escapeNext = false
                        continue
                      }

                      if (char === '\\') {
                        escapeNext = true
                        continue
                      }

                      if (char === '"') {
                        inString = !inString
                        continue
                      }

                      if (!inString) {
                        if (char === '{') {
                          braceCount++
                        } else if (char === '}') {
                          braceCount--
                          if (braceCount === 0) {
                            objectEnd = i
                            break
                          }
                        }
                      }
                    }

                    if (objectEnd !== -1) {
                      const jsonString = remainingBuffer.slice(objectStart, objectEnd + 1)

                      try {
                        if (useGroq) {
                          const parsed = JSON.parse(jsonString)
                          const content = parsed.choices?.[0]?.delta?.content || ''
                          if (content) {
                            fullResponse += content
                            controller.enqueue(
                              encoder.encode(
                                `data: ${JSON.stringify({
                                  type: 'content',
                                  content,
                                  timestamp: new Date().toISOString(),
                                })}\n\n`
                              )
                            )
                          }
                        }
                      } catch {
                        // Skip malformed final chunks
                      }

                      jsonStartIndex = objectEnd + 1
                      remainingBuffer = remainingBuffer.slice(objectEnd + 1)
                      jsonStartIndex = 0
                    } else {
                      break
                    }
                  }
                }
              }
            } catch (error) {
              console.error('❌ Streaming error:', error)

              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({
                    type: 'error',
                    error: error instanceof Error ? error.message : 'Streaming error occurred',
                    timestamp: new Date().toISOString(),
                  })}\n\n`
                )
              )

              controller.close()
            }
          },
        })

        return new Response(responseStream, {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
          },
        })
      }

      // Non-streaming response
      let response, data, aiResponse

      if (useGroq) {
        // GROQ API call
        response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.GROQ_API_KEY!}`,
          },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: [{ role: 'system', content: systemPrompt }, ...claudeMessages],
            max_tokens: 1000,
            temperature: 0.7,
          }),
        })

        if (!response.ok) {
          throw new Error(`GROQ API error: ${response.status}`)
        }

        data = await response.json()
        aiResponse = data.choices[0]?.message?.content
      } else {
        // Anthropic API call
        response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': process.env.ANTHROPIC_API_KEY!,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 1000,
            messages: claudeMessages,
            system: systemPrompt,
            temperature: 0.7,
          }),
        })

        if (!response.ok) {
          throw new Error(`Anthropic API error: ${response.status}`)
        }

        data = await response.json()
        aiResponse = data.content[0]?.text
      }

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

      // Enhanced preference extraction logic with Mem0 integration
      const userMessages = chatHistory.filter(m => m.role === 'user').length
      let preferencesExtracted = false
      let extractedPreferences: PreferenceData | undefined

      // More flexible extraction triggers - catch all the ways users ask to save
      const userRequestedSave = chatHistory.some(
        msg =>
          msg.role === 'user' &&
          ((msg.content.toLowerCase().includes('save') &&
            (msg.content.toLowerCase().includes('preference') ||
              msg.content.toLowerCase().includes('my account') ||
              msg.content.toLowerCase().includes('my profile'))) ||
            (msg.content.toLowerCase().includes('update') &&
              (msg.content.toLowerCase().includes('preference') ||
                msg.content.toLowerCase().includes('my account') ||
                msg.content.toLowerCase().includes('my profile') ||
                msg.content.toLowerCase().includes('it in my'))) ||
            (msg.content.toLowerCase().includes('remember') &&
              msg.content.toLowerCase().includes('preference')) ||
            (msg.content.toLowerCase().includes('store') &&
              msg.content.toLowerCase().includes('preference')))
      )

      const aiCompletionSignals =
        aiResponse.toLowerCase().includes('updated your') ||
        aiResponse.toLowerCase().includes('saved') ||
        aiResponse.includes('got it') ||
        aiResponse.includes('noted') ||
        aiResponse.includes('recorded') ||
        aiResponse.includes('preferences') ||
        aiResponse.includes('perfect!') ||
        aiResponse.includes('great') ||
        aiResponse.includes('excellent')

      console.log('🔍 Extraction check:', {
        userMessages,
        userRequestedSave,
        aiCompletionSignals,
        userTexts: chatHistory.filter(m => m.role === 'user').map(m => m.content),
        aiResponse: aiResponse.substring(0, 100),
      })

      const shouldExtract =
        userRequestedSave || // User explicitly asked to save preferences
        (userMessages >= 2 && aiCompletionSignals) ||
        userMessages >= 3 // Extract after 3+ user messages anyway

      if (shouldExtract) {
        try {
          console.log('🔍 Extracting preferences from conversation')

          // Store conversation in Mem0 for advanced memory management
          // Legacy mem0 integration removed - now using direct preference extraction
          console.log('💾 Processing conversation for preference extraction')

          // Enhanced preference extraction from conversation
          const conversationText = chatHistory
            .map(m => m.content)
            .join(' ')
            .toLowerCase()

          // Extract genres mentioned in conversation
          const genres: string[] = []
          const genreKeywords = {
            comedy: ['comedy', 'comedies', 'funny', 'humor', 'laugh'],
            horror: ['horror', 'scary', 'fear', 'frightening', 'terrifying', 'shining'],
            action: ['action', 'fight', 'explosion', 'adventure'],
            drama: ['drama', 'emotional', 'serious'],
            romance: ['romance', 'romantic', 'love'],
            'sci-fi': ['sci-fi', 'science fiction', 'futuristic', 'space'],
            thriller: ['thriller', 'suspense', 'tense'],
            fantasy: ['fantasy', 'magic', 'wizards'],
          }

          for (const [genre, keywords] of Object.entries(genreKeywords)) {
            if (keywords.some(keyword => conversationText.includes(keyword))) {
              genres.push(genre.charAt(0).toUpperCase() + genre.slice(1))
            }
          }

          // Extract year range from conversation
          let yearRange = { min: 1980, max: 2024 }
          const currentYear = new Date().getFullYear()

          // Look for specific year mentions
          const yearPatterns = [
            // "last X years" patterns
            /last (\d+) years?/gi,
            /past (\d+) years?/gi,
            /recent (\d+) years?/gi,
            // "from year X to Y" patterns
            /from (\d{4}) to (\d{4})/gi,
            /between (\d{4}) and (\d{4})/gi,
            /(\d{4})-(\d{4})/gi,
            // "after year X" patterns
            /after (\d{4})/gi,
            /since (\d{4})/gi,
            /from (\d{4})/gi,
            // "before year X" patterns
            /before (\d{4})/gi,
            /until (\d{4})/gi,
            // Decade patterns
            /(\d{4})s/gi,
          ]

          for (const pattern of yearPatterns) {
            const matches = Array.from(conversationText.matchAll(pattern))
            for (const match of matches) {
              if (pattern.source.includes('last|past|recent')) {
                // "last X years" - calculate from current year
                const yearsBack = parseInt(match[1]!, 10)
                if (yearsBack && yearsBack > 0 && yearsBack <= 50) {
                  yearRange = { min: currentYear - yearsBack, max: currentYear }
                  console.log(`📅 Extracted year range from "last ${yearsBack} years":`, yearRange)
                  break
                }
              } else if (pattern.source.includes('from.*to|between.*and|\\d{4}-\\d{4}')) {
                // Range patterns
                const startYear = parseInt(match[1]!, 10)
                const endYear = parseInt(match[2]!, 10)
                if (
                  startYear &&
                  endYear &&
                  startYear >= 1900 &&
                  endYear <= currentYear &&
                  startYear <= endYear
                ) {
                  yearRange = { min: startYear, max: endYear }
                  console.log(`📅 Extracted year range:`, yearRange)
                  break
                }
              } else if (pattern.source.includes('after|since|from')) {
                // "after year X"
                const year = parseInt(match[1]!, 10)
                if (year && year >= 1900 && year <= currentYear) {
                  yearRange = { min: year, max: currentYear }
                  console.log(`📅 Extracted year range from "after ${year}":`, yearRange)
                  break
                }
              } else if (pattern.source.includes('before|until')) {
                // "before year X"
                const year = parseInt(match[1]!, 10)
                if (year && year >= 1900 && year <= currentYear) {
                  yearRange = { min: 1980, max: year }
                  console.log(`📅 Extracted year range from "before ${year}":`, yearRange)
                  break
                }
              } else if (pattern.source.includes('\\d{4}s')) {
                // Decade pattern (e.g., "1990s")
                const decade = parseInt(match[1]!, 10)
                if (decade && decade >= 1900 && decade <= currentYear) {
                  yearRange = { min: decade, max: decade + 9 }
                  console.log(`📅 Extracted year range from "${decade}s":`, yearRange)
                  break
                }
              }
            }
          }

          // Extract rating range from conversation
          let ratingRange = { min: 6.0, max: 10.0 }

          const ratingPatterns = [
            // "8+ rating" or "8 or higher"
            /(\d+(?:\.\d+)?)\s*\+/gi,
            /(\d+(?:\.\d+)?)\s*or\s*higher/gi,
            /above\s*(\d+(?:\.\d+)?)/gi,
            /over\s*(\d+(?:\.\d+)?)/gi,
            // "6-9 rating" or "between 7 and 9"
            /(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)/gi,
            /between\s*(\d+(?:\.\d+)?)\s*and\s*(\d+(?:\.\d+)?)/gi,
            // "at least X rating"
            /at\s*least\s*(\d+(?:\.\d+)?)/gi,
            /minimum\s*(\d+(?:\.\d+)?)/gi,
            // "under X rating"
            /under\s*(\d+(?:\.\d+)?)/gi,
            /below\s*(\d+(?:\.\d+)?)/gi,
            /less\s*than\s*(\d+(?:\.\d+)?)/gi,
          ]

          for (const pattern of ratingPatterns) {
            const matches = Array.from(conversationText.matchAll(pattern))
            for (const match of matches) {
              if (pattern.source.includes('\\+|or.*higher|above|over|at.*least|minimum')) {
                // "X+ rating" or "X or higher"
                const minRating = parseFloat(match[1]!)
                if (minRating && minRating >= 1 && minRating <= 10) {
                  ratingRange = { min: minRating, max: 10.0 }
                  console.log(`⭐ Extracted rating range from "${match[0]}":`, ratingRange)
                  break
                }
              } else if (pattern.source.includes('-|between.*and')) {
                // Range patterns
                const minRating = parseFloat(match[1]!)
                const maxRating = parseFloat(match[2]!)
                if (
                  minRating &&
                  maxRating &&
                  minRating >= 1 &&
                  maxRating <= 10 &&
                  minRating <= maxRating
                ) {
                  ratingRange = { min: minRating, max: maxRating }
                  console.log(`⭐ Extracted rating range:`, ratingRange)
                  break
                }
              } else if (pattern.source.includes('under|below|less.*than')) {
                // "under X rating"
                const maxRating = parseFloat(match[1]!)
                if (maxRating && maxRating >= 1 && maxRating <= 10) {
                  ratingRange = { min: 1.0, max: maxRating }
                  console.log(`⭐ Extracted rating range from "under ${maxRating}":`, ratingRange)
                  break
                }
              }
            }
          }

          // Extract actors/directors if mentioned
          const actors: string[] = []
          const directors: string[] = []

          // Extract specific movie titles mentioned
          const movieTitles: string[] = []
          // Look for movie title patterns in quotes or after "like"
          const moviePatterns = [
            /"([^"]+)"/gi,
            /'([^']+)'/gi,
            /like\s+([A-Z][A-Za-z\s:,&-]+?)(?:\s+(?:movie|film)|[,.;]|$)/gi,
          ]

          for (const pattern of moviePatterns) {
            const matches = Array.from(conversationText.matchAll(pattern))
            for (const match of matches) {
              const title = (match[1] ?? '').trim()
              if (title.length > 2 && title.length < 100) {
                movieTitles.push(title)
              }
            }
          }

          // Create enhanced preferences object
          const extractedPreferenceData = {
            genres: genres.length > 0 ? genres : [],
            actors,
            directors,
            themes: [],
            moods: [],
            dislikedGenres: [],
            languages: ['English'],
            viewingContexts: [],
            movieTitles: movieTitles.length > 0 ? movieTitles : [],
            yearRange,
            ratingRange,
          }

          console.log('✅ Extracted preferences:', extractedPreferenceData)

          // Save to database
          const { error: updateError } = await supabase.from('user_profiles').upsert({
            id: user.id,
            email: user.email,
            preferences: extractedPreferenceData,
            onboarding_completed: true,
            updated_at: new Date().toISOString(),
          })

          if (updateError) {
            console.error('❌ Database update error:', updateError)
            throw updateError
          }

          console.log('✅ Preferences saved to database successfully')
          preferencesExtracted = true
          extractedPreferences = extractedPreferenceData
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
        { error: error.errors?.[0]?.message ?? 'Unknown error', success: false },
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
