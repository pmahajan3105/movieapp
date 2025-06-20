// Re-export the generated types for consistency
export type { Database } from '../../types/supabase-generated'
export type { Tables, TablesInsert, TablesUpdate } from '../../types/supabase-generated'

// Legacy compatibility exports (can be gradually phased out)
import type { Database } from '../../types/supabase-generated'

export type UserProfile = Database['public']['Tables']['user_profiles']['Row']
export type Movie = Database['public']['Tables']['movies']['Row']
export type ChatSession = Database['public']['Tables']['chat_sessions']['Row']
export type WatchlistItem = Database['public']['Tables']['watchlist']['Row']
export type Rating = Database['public']['Tables']['ratings']['Row']
export type Recommendation = Database['public']['Tables']['recommendations']['Row']

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

export type UserProfileInsert = Database['public']['Tables']['user_profiles']['Insert']
export type MovieInsert = Database['public']['Tables']['movies']['Insert']
export type ChatSessionInsert = Database['public']['Tables']['chat_sessions']['Insert']
export type WatchlistInsert = Database['public']['Tables']['watchlist']['Insert']
export type RatingInsert = Database['public']['Tables']['ratings']['Insert']
export type RecommendationInsert = Database['public']['Tables']['recommendations']['Insert']

export type UserProfileUpdate = Database['public']['Tables']['user_profiles']['Update']
export type MovieUpdate = Database['public']['Tables']['movies']['Update']
export type ChatSessionUpdate = Database['public']['Tables']['chat_sessions']['Update']
export type WatchlistUpdate = Database['public']['Tables']['watchlist']['Update']
export type RatingUpdate = Database['public']['Tables']['ratings']['Update']
export type RecommendationUpdate = Database['public']['Tables']['recommendations']['Update']

// Legacy exports that existed before (removing deprecated ones)
export type Swipe = Rating // Legacy alias
export type SwipeInsert = RatingInsert // Legacy alias
export type SwipeUpdate = RatingUpdate // Legacy alias

export type RecommendationQueueItem = Recommendation // Legacy alias
export type RecommendationQueueInsert = RecommendationInsert // Legacy alias
export type RecommendationQueueUpdate = RecommendationUpdate // Legacy alias
