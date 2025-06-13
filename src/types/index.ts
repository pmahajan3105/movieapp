// Core Movie Type (simplified - no cast)
export interface Movie {
  id: string
  title: string
  year?: number
  genre?: string[]
  director?: string[]
  actors?: string[]
  plot?: string
  poster_url?: string
  backdrop_url?: string
  description?: string // Plot overview / TMDB overview
  release_date?: string // YYYY-MM-DD (TMDB API)
  rating?: number
  runtime?: number
  omdb_id?: string
  imdb_id?: string
  tmdb_id?: number
  popularity?: number
  source?: string
  created_at?: string
  updated_at?: string
}

// User Types
export interface UserProfile {
  id: string
  email: string
  full_name?: string
  preferences?: Record<string, unknown>
  onboarding_completed: boolean
  created_at: string
  updated_at?: string
}

// Rating Types
export interface Rating {
  id: string
  user_id: string
  movie_id: string
  rating?: number // 1-5 stars
  interested: boolean
  interaction_type?: 'like' | 'dislike' | 'watchlist' | 'quick_rate' | 'browse'
  source?: string
  rated_at: string
}

// Recommendation Types
export interface Recommendation {
  id: string
  user_id: string
  movie_id: string
  movie?: Movie
  score: number // 0-1
  reason?: string
  created_at: string
}

// Enhanced recommendation with detailed explanations
export interface EnhancedRecommendation {
  movie: Movie
  reason: string
  confidence: number // 0-1 confidence score
  position: number
  explanation: RecommendationExplanation
  source?: 'ai' | 'database' | 'fallback'
}

export interface RecommendationExplanation {
  // Primary reasons why this was recommended
  primaryReasons: string[]

  // Specific matches with user preferences
  preferenceMatches: {
    genres?: string[]
    directors?: string[]
    actors?: string[]
    themes?: string[]
    mood?: string
  }

  // Quality indicators
  qualitySignals: {
    rating?: number
    criticsScore?: number
    userRatings?: number
    awards?: string[]
  }

  // Context matches
  contextMatch: {
    runtime?: string // e.g., "Perfect for your 90-120 minute preference"
    year?: string // e.g., "Recent release (2023)"
    availability?: string // e.g., "Currently on Netflix"
    mood?: string // e.g., "Great for relaxing weekend viewing"
  }

  // Warnings or considerations
  considerations?: string[]

  // Similar movies in user's liked list
  similarToLiked?: string[]
}

// Watchlist Types
export interface WatchlistItem {
  id: string
  user_id: string
  movie_id: string
  movie?: Movie
  added_at: string
  watched: boolean
  watched_at?: string
  rating?: number
  notes?: string
}

// Chat Types
export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

export interface ChatSession {
  id: string
  user_id: string
  messages: ChatMessage[]
  preferences_extracted?: Record<string, unknown>
  completed: boolean
  created_at: string
}

// Component Props Types
export interface ChatBarProps {
  onSendMessage: (message: string) => void
  isLoading?: boolean
  placeholder?: string
  disabled?: boolean
  className?: string
}

export interface CategoryRowProps {
  category: {
    category_name: string
    ai_description: string
    generated_date: string
  }
  movies: Movie[]
  onRate: (movieId: string, interested: boolean) => void
  className?: string
}

export interface MovieGridCardProps {
  movie: Movie
  userRating?: Rating
  onRate: (movieId: string, interested: boolean, rating?: number) => void
  onAddToWatchlist: (movieId: string) => void
  size?: 'sm' | 'md' | 'lg'
  showRating?: boolean
  className?: string
}

export interface QuickRateCardProps {
  movie: Movie
  onRate: (interested: boolean) => void
  className?: string
}

// API Response Types
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface MoviesResponse {
  movies: Movie[]
  total: number
  page?: number
  limit?: number
  filters?: Record<string, unknown>
}

export interface RecommendationsResponse {
  recommendations: Recommendation[]
  total: number
  user_id: string
}

// State Management Types
export interface AppState {
  user: UserProfile | null
  isLoading: boolean
  error: string | null
}

// Form Types
export interface LoginForm {
  email: string
  password: string
}

export interface SignupForm {
  email: string
  password: string
  full_name: string
}

export interface PreferencesForm {
  genres: string[]
  decades: string[]
  mood?: string
  length?: 'short' | 'medium' | 'long'
}

// Constants
export const GENRES = [
  'Action',
  'Adventure',
  'Animation',
  'Biography',
  'Comedy',
  'Crime',
  'Documentary',
  'Drama',
  'Family',
  'Fantasy',
  'Film-Noir',
  'History',
  'Horror',
  'Music',
  'Musical',
  'Mystery',
  'Romance',
  'Sci-Fi',
  'Sport',
  'Thriller',
  'War',
  'Western',
] as const

export const DECADES = ['1970s', '1980s', '1990s', '2000s', '2010s', '2020s'] as const

export type Genre = (typeof GENRES)[number]
export type Decade = (typeof DECADES)[number]
