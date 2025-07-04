import { SupabaseClient } from '@supabase/supabase-js'
import { ErrorFactory } from '@/lib/errors'
import type { ChatMessage, PreferenceData } from '@/types/chat'

export interface ChatSession {
  id: string
  user_id: string
  messages: ChatMessage[]
  preferences_extracted: boolean
  created_at?: string
  updated_at?: string
}

export class ChatSessionService {
  constructor(private supabase: SupabaseClient, private userId: string) {}

  /**
   * Get or create a chat session
   */
  async getOrCreateSession(sessionId?: string): Promise<{
    sessionId: string
    chatHistory: ChatMessage[]
    preferencesAlreadyExtracted: boolean
  }> {
    let currentSessionId: string
    let chatHistory: ChatMessage[] = []
    let preferencesAlreadyExtracted = false

    try {
      if (sessionId) {
        // Try to get existing session
        currentSessionId = sessionId
        const { data: existingSession, error: selectError } = await this.supabase
          .from('chat_sessions')
          .select('messages, preferences_extracted')
          .eq('id', sessionId)
          .eq('user_id', this.userId)
          .single()

        if (selectError && selectError.code !== 'PGRST116') {
          // Not a "not found" error - could be table missing
          throw ErrorFactory.fromSupabaseError(selectError, { operation: 'get_session' })
        }

        if (existingSession) {
          chatHistory = existingSession.messages || []
          preferencesAlreadyExtracted = existingSession.preferences_extracted || false
        }
      } else {
        // Create new session
        const { data: newSession, error: sessionError } = await this.supabase
          .from('chat_sessions')
          .insert({
            user_id: this.userId,
            messages: [],
            preferences_extracted: false,
          })
          .select('id')
          .single()

        if (sessionError) {
          throw ErrorFactory.fromSupabaseError(sessionError, { operation: 'create_session' })
        }

        currentSessionId = newSession.id
      }

      return {
        sessionId: currentSessionId,
        chatHistory,
        preferencesAlreadyExtracted,
      }
    } catch (error) {
      throw error
    }
  }

  /**
   * Update session with new message and preferences
   */
  async updateSession(
    sessionId: string,
    newMessage: ChatMessage,
    aiResponse: ChatMessage,
    preferences?: PreferenceData,
    preferencesExtracted: boolean = false
  ): Promise<void> {
    try {
      // Get current messages
      const { data: currentSession } = await this.supabase
        .from('chat_sessions')
        .select('messages')
        .eq('id', sessionId)
        .eq('user_id', this.userId)
        .single()

      const currentMessages = currentSession?.messages || []
      const updatedMessages = [...currentMessages, newMessage, aiResponse]

      // Prepare update data
      const updateData: any = {
        messages: updatedMessages,
        updated_at: new Date().toISOString(),
      }

      if (preferencesExtracted) {
        updateData.preferences_extracted = true
      }

      // Update session
      const { error: updateError } = await this.supabase
        .from('chat_sessions')
        .update(updateData)
        .eq('id', sessionId)
        .eq('user_id', this.userId)

      if (updateError) {
        throw new Error('Failed to update chat session')
      }

      // Update user preferences if extracted
      if (preferences && preferencesExtracted) {
        await this.updateUserPreferences(preferences)
      }
    } catch (error) {
      throw error
    }
  }

  /**
   * Update user preferences in the database
   */
  private async updateUserPreferences(preferences: PreferenceData): Promise<void> {
    try {
      const { error: preferencesError } = await this.supabase
        .from('user_profiles')
        .upsert({
          id: this.userId,
          preferences,
          updated_at: new Date().toISOString(),
        })

      // Don't throw here - preferences update is not critical for chat flow
    } catch (error) {
    }
  }

  /**
   * Mark session as having preferences extracted
   */
  async markPreferencesExtracted(sessionId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('chat_sessions')
        .update({ 
          preferences_extracted: true,
          updated_at: new Date().toISOString() 
        })
        .eq('id', sessionId)
        .eq('user_id', this.userId)

      if (error) {
        throw new Error('Failed to update session')
      }
    } catch (error) {
      throw error
    }
  }
}