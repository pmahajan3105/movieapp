// Generated types from Supabase schema
export type { Tables, TablesInsert, TablesUpdate } from '../../types/supabase-generated'

// Keep the generated DB type under a distinct name to avoid exploding strict errors in legacy helpers
export type GeneratedDatabase = import('../../types/supabase-generated').Database

// Temporary legacy shim: a lax Database type for existing helper functions

export type Database = any

// Entity aliases use the accurate generated types for compile-time safety in new code
export type UserProfile = GeneratedDatabase['public']['Tables']['user_profiles']['Row']
export type Movie = any
export type ChatSession = GeneratedDatabase['public']['Tables']['chat_sessions']['Row']
export type WatchlistItem = GeneratedDatabase['public']['Tables']['watchlist']['Row']
export type Rating = GeneratedDatabase['public']['Tables']['ratings']['Row']
export type Recommendation = GeneratedDatabase['public']['Tables']['recommendations']['Row']

// Note: recommendation_queue table will be added when migration is applied to production
export type RecommendationQueue = {
  id: string
  user_id: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  request_type: 'standard' | 'mood' | 'similar' | 'semantic'
  query_params: Record<string, any>
  results?: Record<string, any>
  error_message?: string
  metadata?: Record<string, any>
  created_at?: string
  processed_at?: string
  expires_at?: string
}

export type UserProfileInsert = GeneratedDatabase['public']['Tables']['user_profiles']['Insert']
export type MovieInsert = GeneratedDatabase['public']['Tables']['movies']['Insert']
export type ChatSessionInsert = GeneratedDatabase['public']['Tables']['chat_sessions']['Insert']
export type WatchlistInsert = GeneratedDatabase['public']['Tables']['watchlist']['Insert']
export type RatingInsert = GeneratedDatabase['public']['Tables']['ratings']['Insert']
export type RecommendationInsert =
  GeneratedDatabase['public']['Tables']['recommendations']['Insert']

export type UserProfileUpdate = GeneratedDatabase['public']['Tables']['user_profiles']['Update']
export type MovieUpdate = GeneratedDatabase['public']['Tables']['movies']['Update']
export type ChatSessionUpdate = GeneratedDatabase['public']['Tables']['chat_sessions']['Update']
export type WatchlistUpdate = GeneratedDatabase['public']['Tables']['watchlist']['Update']
export type RatingUpdate = GeneratedDatabase['public']['Tables']['ratings']['Update']
export type RecommendationUpdate =
  GeneratedDatabase['public']['Tables']['recommendations']['Update']

// Legacy exports that existed before (removing deprecated ones)
export type Swipe = Rating // Legacy alias
export type SwipeInsert = RatingInsert // Legacy alias
export type SwipeUpdate = RatingUpdate // Legacy alias

export type RecommendationQueueItem = Recommendation // Legacy alias
export type RecommendationQueueInsert = RecommendationInsert // Legacy alias
export type RecommendationQueueUpdate = RecommendationUpdate // Legacy alias
