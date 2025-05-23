export type Database = {
  public: {
    Tables: {
      user_profiles: {
        Row: {
          id: string
          email: string
          preferences: Record<string, unknown> | null
          onboarding_completed: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          preferences?: Record<string, unknown> | null
          onboarding_completed?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          preferences?: Record<string, unknown> | null
          onboarding_completed?: boolean
          updated_at?: string
        }
      }
      movies: {
        Row: {
          id: string
          omdb_id: string
          title: string
          year: number
          genre: string[]
          plot: string
          poster_url: string
          imdb_rating: number
          runtime: number
          director: string
          actors: string[]
          language: string
          country: string
          awards: string | null
          box_office: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          omdb_id: string
          title: string
          year: number
          genre: string[]
          plot: string
          poster_url: string
          imdb_rating: number
          runtime: number
          director: string
          actors: string[]
          language: string
          country: string
          awards?: string | null
          box_office?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          omdb_id?: string
          title?: string
          year?: number
          genre?: string[]
          plot?: string
          poster_url?: string
          imdb_rating?: number
          runtime?: number
          director?: string
          actors?: string[]
          language?: string
          country?: string
          awards?: string | null
          box_office?: string | null
          updated_at?: string
        }
      }
      chat_sessions: {
        Row: {
          id: string
          user_id: string
          messages: Record<string, unknown>[]
          preferences_extracted: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          messages?: Record<string, unknown>[]
          preferences_extracted?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          messages?: Record<string, unknown>[]
          preferences_extracted?: boolean
          updated_at?: string
        }
      }
      swipes: {
        Row: {
          id: string
          user_id: string
          movie_id: string
          action: 'like' | 'dislike' | 'watchlist'
          swiped_at: string
        }
        Insert: {
          id?: string
          user_id: string
          movie_id: string
          action: 'like' | 'dislike' | 'watchlist'
          swiped_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          movie_id?: string
          action?: 'like' | 'dislike' | 'watchlist'
          swiped_at?: string
        }
      }
      watchlist: {
        Row: {
          id: string
          user_id: string
          movie_id: string
          watched: boolean
          rating: number | null
          notes: string | null
          added_at: string
          watched_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          movie_id: string
          watched?: boolean
          rating?: number | null
          notes?: string | null
          added_at?: string
          watched_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          movie_id?: string
          watched?: boolean
          rating?: number | null
          notes?: string | null
          watched_at?: string | null
        }
      }
      recommendation_queue: {
        Row: {
          id: string
          user_id: string
          movie_id: string
          batch_id: string
          position: number
          confidence_score: number
          ai_reason: string
          created_at: string
          consumed_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          movie_id: string
          batch_id: string
          position: number
          confidence_score: number
          ai_reason: string
          created_at?: string
          consumed_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          movie_id?: string
          batch_id?: string
          position?: number
          confidence_score?: number
          ai_reason?: string
          consumed_at?: string | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      swipe_action: 'like' | 'dislike' | 'watchlist'
    }
  }
}

// Convenience types for easier usage
export type UserProfile = Database['public']['Tables']['user_profiles']['Row']
export type Movie = Database['public']['Tables']['movies']['Row']
export type ChatSession = Database['public']['Tables']['chat_sessions']['Row']
export type Swipe = Database['public']['Tables']['swipes']['Row']
export type WatchlistItem = Database['public']['Tables']['watchlist']['Row']
export type RecommendationQueueItem = Database['public']['Tables']['recommendation_queue']['Row']

// Insert types
export type UserProfileInsert = Database['public']['Tables']['user_profiles']['Insert']
export type MovieInsert = Database['public']['Tables']['movies']['Insert']
export type ChatSessionInsert = Database['public']['Tables']['chat_sessions']['Insert']
export type SwipeInsert = Database['public']['Tables']['swipes']['Insert']
export type WatchlistInsert = Database['public']['Tables']['watchlist']['Insert']
export type RecommendationQueueInsert = Database['public']['Tables']['recommendation_queue']['Insert']

// Update types
export type UserProfileUpdate = Database['public']['Tables']['user_profiles']['Update']
export type MovieUpdate = Database['public']['Tables']['movies']['Update']
export type ChatSessionUpdate = Database['public']['Tables']['chat_sessions']['Update']
export type SwipeUpdate = Database['public']['Tables']['swipes']['Update']
export type WatchlistUpdate = Database['public']['Tables']['watchlist']['Update']
export type RecommendationQueueUpdate = Database['public']['Tables']['recommendation_queue']['Update'] 