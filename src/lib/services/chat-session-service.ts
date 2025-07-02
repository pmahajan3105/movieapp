import { SupabaseClient } from '@supabase/supabase-js'
import { logger } from '@/lib/logger'
import type { ChatMessage, PreferenceData } from '@/types/chat'
import { DatabaseError, ErrorFactory } from '@/lib/errors'

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
          logger.error(`❌ Error accessing chat_sessions table: ${selectError.message}`)
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
          logger.error('❌ Failed to create chat session:', { error: sessionError.message })
          throw ErrorFactory.fromSupabaseError(sessionError, { operation: 'create_session' })
        }

        currentSessionId = newSession.id
        logger.info('✅ Created new chat session:', { sessionId: currentSessionId })
      }

      return {
        sessionId: currentSessionId,
        chatHistory,
        preferencesAlreadyExtracted,
      }
    } catch (error) {
      logger.error('❌ Chat session error:', { 
        error: error instanceof Error ? error.message : String(error) 
      })
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
        logger.error('❌ Failed to update chat session:', { error: updateError.message })
        throw new Error('Failed to update chat session')
      }

      // Update user preferences if extracted
      if (preferences && preferencesExtracted) {
        await this.updateUserPreferences(preferences)
      }

      logger.info('✅ Updated chat session:', { 
        sessionId, 
        messageCount: updatedMessages.length,
        preferencesExtracted 
      })
    } catch (error) {
      logger.error('❌ Failed to update session:', { 
        error: error instanceof Error ? error.message : String(error) 
      })
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

      if (preferencesError) {
        logger.error('❌ Failed to update user preferences:', {
          error: preferencesError.message,
        })
        // Don't throw here - preferences update is not critical for chat flow
      } else {
        logger.info('✅ Updated user preferences in database')
      }
    } catch (error) {
      logger.error('❌ Error updating user preferences:', { 
        error: error instanceof Error ? error.message : String(error) 
      })
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
        logger.error('❌ Failed to mark preferences as extracted:', { error: error.message })
        throw new Error('Failed to update session')
      }

      logger.info('✅ Marked preferences as extracted for session:', { sessionId })
    } catch (error) {
      logger.error('❌ Error marking preferences extracted:', { 
        error: error instanceof Error ? error.message : String(error) 
      })
      throw error
    }
  }
}