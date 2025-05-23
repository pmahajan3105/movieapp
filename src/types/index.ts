// Core Movie Types
export interface Movie {
  id: string;
  title: string;
  year: number;
  genre: string[];
  director: string[];
  cast: string[];
  plot?: string;
  poster_url?: string;
  backdrop_url?: string;
  tmdb_id?: number;
  imdb_id?: string;
  runtime?: number;
  rating?: number;
  vote_count?: number;
  release_date?: string;
  created_at: string;
  updated_at: string;
}

// New Rating System Types (replaces Swipe)
export interface Rating {
  id: string;
  user_id: string;
  movie_id: string;
  rating?: number; // 1-5 scale for detailed ratings
  interested: boolean;
  interaction_type: 'like' | 'dislike' | 'watchlist' | 'quick_rate' | 'spotlight' | 'browse';
  source: string; // Where the rating came from
  rated_at: string;
}

// Daily Spotlight Types
export interface DailySpotlight {
  id: string;
  user_id: string;
  movie_id: string;
  movie?: Movie; // Populated when joined
  position: number; // 1-5
  ai_reason: string;
  confidence_score: number; // 0-1
  generated_date: string;
  viewed: boolean;
  created_at: string;
}

// Browse Categories Types
export interface BrowseCategory {
  id: string;
  user_id: string;
  category_name: string;
  ai_description: string;
  movie_ids: string[];
  movies?: Movie[]; // Populated when joined
  generated_date: string;
  position: number;
  created_at: string;
}

// User Types
export interface UserProfile {
  id: string;
  email: string;
  name?: string;
  avatar_url?: string;
  preferences?: UserPreferences;
  created_at: string;
  updated_at: string;
}

export interface UserPreferences {
  liked_genres: string[];
  disliked_genres: string[];
  preferred_decades: number[];
  min_rating: number;
  max_runtime?: number;
  include_adult: boolean;
  language_preference: string[];
}

// Component Props Types
export interface MovieSpotlightProps {
  spotlight: DailySpotlight;
  onRate: (movieId: string, interested: boolean, rating?: number) => void;
  onAddToWatchlist: (movieId: string) => void;
  className?: string;
}

export interface MovieRowProps {
  category: BrowseCategory;
  onMovieClick: (movie: Movie) => void;
  onRate: (movieId: string, interested: boolean) => void;
  className?: string;
}

export interface MovieGridCardProps {
  movie: Movie;
  userRating?: Rating;
  onRate: (movieId: string, interested: boolean, rating?: number) => void;
  onAddToWatchlist: (movieId: string) => void;
  size?: 'sm' | 'md' | 'lg';
  showRating?: boolean;
  className?: string;
}

export interface QuickRateCardProps {
  movie: Movie;
  onRate: (interested: boolean) => void;
  className?: string;
}

export interface ChatBarProps {
  onSendMessage: (message: string) => void;
  isLoading?: boolean;
  placeholder?: string;
  className?: string;
}

export interface CategoryRowProps {
  category: BrowseCategory;
  movies: Movie[];
  onMovieClick: (movie: Movie) => void;
  onRate: (movieId: string, interested: boolean) => void;
  className?: string;
}

// API Response Types
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
  success: boolean;
}

export interface SpotlightsResponse {
  spotlights: DailySpotlight[];
  generated_date: string;
}

export interface CategoriesResponse {
  categories: BrowseCategory[];
  generated_date: string;
}

export interface ChatResponse {
  message: string;
  recommendations?: Movie[];
  category_suggestions?: string[];
  action?: 'show_movies' | 'create_category' | 'quick_rate';
}

export interface UserPreferencesResponse {
  liked_movies: Movie[];
  disliked_genres: string[];
  interaction_stats: {
    total_ratings: number;
    likes: number;
    dislikes: number;
  };
}

// Form Types
export interface RatingFormData {
  movie_id: string;
  interested: boolean;
  rating?: number;
  interaction_type: 'like' | 'dislike' | 'watchlist' | 'quick_rate' | 'spotlight' | 'browse';
  source: string;
}

export interface QuickRateFormData {
  ratings: Array<{
    movie_id: string;
    interested: boolean;
  }>;
}

export interface ChatFormData {
  message: string;
  context?: {
    current_category?: string;
    viewed_movies?: string[];
    mood?: string;
  };
}

// State Management Types
export interface AppState {
  user: UserProfile | null;
  dailySpotlights: DailySpotlight[];
  browseCategories: BrowseCategory[];
  userRatings: Rating[];
  isLoading: boolean;
  error: string | null;
}

export interface DashboardState {
  spotlights: DailySpotlight[];
  categories: BrowseCategory[];
  selectedMovie: Movie | null;
  chatHistory: ChatMessage[];
  quickRateMovies: Movie[];
  isQuickRateMode: boolean;
}

export interface ChatMessage {
  id: string;
  message: string;
  sender: 'user' | 'ai';
  timestamp: string;
  recommendations?: Movie[];
  action?: string;
}

// Utility Types
export type InteractionType = 'like' | 'dislike' | 'watchlist' | 'quick_rate' | 'spotlight' | 'browse';
export type DisplayType = 'spotlight' | 'row' | 'grid';
export type MovieSize = 'sm' | 'md' | 'lg';

// Constants
export const INTERACTION_TYPES = {
  LIKE: 'like' as const,
  DISLIKE: 'dislike' as const,
  WATCHLIST: 'watchlist' as const,
  QUICK_RATE: 'quick_rate' as const,
  SPOTLIGHT: 'spotlight' as const,
  BROWSE: 'browse' as const,
} as const;

export const DISPLAY_TYPES = {
  SPOTLIGHT: 'spotlight' as const,
  ROW: 'row' as const,
  GRID: 'grid' as const,
} as const;

// Error Types
export interface AppError {
  code: string;
  message: string;
  details?: unknown;
}

export interface ValidationError {
  field: string;
  message: string;
}

// Legacy Types (for migration compatibility)
export interface LegacySwipe {
  id: string;
  user_id: string;
  movie_id: string;
  action: 'like' | 'dislike' | 'watchlist';
  swiped_at: string;
} 