export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
}

export interface ChatSession {
  id: string
  user_id: string
  messages: ChatMessage[]
  preferences_extracted?: boolean
  created_at: Date
  updated_at: Date
}

export interface PreferenceData {
  favorite_movies?: string[]
  preferred_genres?: string[]
  avoid_genres?: string[]
  themes?: string[]
  preferred_eras?: string[]
  favorite_actors?: string[]
  favorite_directors?: string[]
  viewing_context?: {
    solo?: boolean
    social?: boolean
    weekend?: string
    weekday?: string
  }
  mood_preferences?: {
    default?: string
    relaxing?: string
    energizing?: string
  }
  additional_notes?: string
}

export interface ChatApiRequest {
  message: string
  sessionId?: string
}

export interface ChatApiResponse {
  success: boolean
  message?: string
  sessionId: string
  preferencesExtracted?: boolean
  preferences?: PreferenceData
  error?: string
}
