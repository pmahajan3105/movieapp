// Database Types
export interface User {
  id: string
  email: string
  preferences: UserPreferences | null
  onboarding_completed: boolean
  created_at: string
  updated_at: string
}

export interface UserPreferences {
  favorite_movies: string[]
  preferred_genres: string[]
  themes: string[]
  avoid_genres: string[]
  preferred_eras: string[]
  mood_preferences: {
    default: string
    weekend?: string
  }
}

export interface Movie {
  id: string
  imdb_id: string
  title: string
  year: number
  genre: string[]
  plot: string
  poster: string
  imdb_rating: number
  runtime: number
  director: string
  actors: string[]
  created_at: string
}

export interface Swipe {
  id: string
  user_id: string
  movie_id: string
  action: 'like' | 'dislike' | 'watchlist'
  created_at: string
}

export interface WatchlistItem {
  id: string
  user_id: string
  movie_id: string
  watched: boolean
  rating: number | null
  notes: string | null
  created_at: string
  updated_at: string
  movie?: Movie
}

export interface RecommendationQueue {
  id: string
  user_id: string
  movie_id: string
  batch_id: string
  position: number
  confidence_score: number
  ai_reasoning: string
  created_at: string
  movie?: Movie
}

// API Response Types
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface AIResponse {
  response: string
  preferences?: Partial<UserPreferences>
  isComplete?: boolean
}

export interface RecommendationResponse {
  recommendations: RecommendationQueue[]
  batchId: string
}

// UI State Types
export interface SwipeState {
  currentCard: RecommendationQueue | null
  queue: RecommendationQueue[]
  isLoading: boolean
  hasMore: boolean
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
} 