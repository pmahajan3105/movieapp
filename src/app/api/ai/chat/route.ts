import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { z } from 'zod'
import { groq, groqConfig, PREFERENCE_SYSTEM_PROMPT, PREFERENCE_EXTRACTION_PROMPT } from '@/lib/groq/config'
import { v4 as uuidv4 } from 'uuid'
import type { ChatMessage, PreferenceData } from '@/types/chat'

const chatRequestSchema = z.object({
  message: z.string().min(1, 'Message cannot be empty').max(1000, 'Message too long'),
  sessionId: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { message, sessionId } = chatRequestSchema.parse(body)

    // Check if Groq is available
    if (!groq) {
      return NextResponse.json(
        { error: 'AI service not configured', success: false },
        { status: 500 }
      )
    }

    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', success: false },
        { status: 401 }
      )
    }

    // Get or create chat session
    const currentSessionId = sessionId || uuidv4()
    let chatHistory: ChatMessage[] = []

    if (sessionId) {
      // Try to get existing session
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
            message: "I've already gathered your preferences! You can now explore your personalized movie recommendations.",
            sessionId: currentSessionId,
            preferencesExtracted: true
          })
        }
      }
    } else {
      // Create new session
      const { error: sessionError } = await supabase
        .from('chat_sessions')
        .insert({
          id: currentSessionId,
          user_id: user.id,
          messages: [],
          preferences_extracted: false
        })

      if (sessionError) {
        console.error('Session creation error:', sessionError)
        return NextResponse.json(
          { error: 'Failed to create chat session', success: false },
          { status: 500 }
        )
      }
    }

    // Add user message to history
    const userMessage: ChatMessage = {
      id: uuidv4(),
      role: 'user',
      content: message,
      timestamp: new Date()
    }
    chatHistory.push(userMessage)

    // Prepare messages for Groq API
    const groqMessages = [
      { role: 'system', content: PREFERENCE_SYSTEM_PROMPT },
      ...chatHistory.map(msg => ({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: msg.content
      }))
    ] as Array<{ role: 'system' | 'user' | 'assistant'; content: string }>

    // Call Groq API
    const completion = await groq.chat.completions.create({
      messages: groqMessages,
      model: groqConfig.model,
      max_tokens: groqConfig.maxTokens,
      temperature: groqConfig.temperature,
      top_p: groqConfig.topP,
    })

    const aiResponse = completion.choices[0]?.message?.content

    if (!aiResponse) {
      throw new Error('No response from AI')
    }

    // Add AI response to history
    const aiMessage: ChatMessage = {
      id: uuidv4(),
      role: 'assistant',
      content: aiResponse,
      timestamp: new Date()
    }
    chatHistory.push(aiMessage)

    // Check if we should extract preferences (after 5+ exchanges)
    const userMessages = chatHistory.filter(m => m.role === 'user').length
    let preferencesExtracted = false
    let extractedPreferences: PreferenceData | undefined

    if (userMessages >= 3 && aiResponse.toLowerCase().includes('organize') || 
        aiResponse.toLowerCase().includes('learned') ||
        userMessages >= 5) {
      
      try {
        // Extract preferences using AI
        const extractionCompletion = await groq.chat.completions.create({
          messages: [
            { role: 'system', content: PREFERENCE_EXTRACTION_PROMPT },
            { role: 'user', content: `Conversation history:\n${chatHistory.map(m => `${m.role}: ${m.content}`).join('\n')}` }
          ] as Array<{ role: 'system' | 'user'; content: string }>,
          model: groqConfig.model,
          max_tokens: 500,
          temperature: 0.3, // Lower temperature for more consistent extraction
        })

        const extractionResult = extractionCompletion.choices[0]?.message?.content
        
        if (extractionResult) {
          // Parse JSON from AI response
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
                updated_at: new Date().toISOString()
              })
              .eq('id', user.id)
          }
        }
      } catch (error) {
        console.error('Preference extraction error:', error)
        // Continue without extraction
      }
    }

    // Update chat session
    await supabase
      .from('chat_sessions')
      .update({
        messages: chatHistory,
        preferences_extracted: preferencesExtracted,
        updated_at: new Date().toISOString()
      })
      .eq('id', currentSessionId)

    return NextResponse.json({
      success: true,
      message: aiResponse,
      sessionId: currentSessionId,
      preferencesExtracted,
      preferences: extractedPreferences
    })

  } catch (error) {
    console.error('Chat API error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: error.errors[0].message,
          success: false 
        },
        { status: 400 }
      )
    }

    if (error instanceof Error && error.message.includes('API key')) {
      return NextResponse.json(
        { 
          error: 'AI service configuration error',
          success: false 
        },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { 
        error: 'Failed to process chat message. Please try again.',
        success: false 
      },
      { status: 500 }
    )
  }
} 