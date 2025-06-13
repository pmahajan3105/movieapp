/**
 * Comprehensive API type definitions for better type safety
 * Replaces loose typing throughout the codebase
 */

// Strict API Response Types
export interface ApiResponse<T = unknown> {
  readonly success: boolean
  readonly data?: T
  readonly error?: string
  readonly message?: string
  readonly timestamp?: string
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  readonly pagination: {
    readonly page: number
    readonly limit: number
    readonly total: number
    readonly totalPages: number
  }
}

// Error Types
export interface ApiError {
  readonly code: string
  readonly message: string
  readonly field?: string
  readonly timestamp: string
}

export interface ValidationError extends ApiError {
  readonly field: string
  readonly value?: unknown
  readonly rule: string
}

// Request Types
export interface WatchlistCreateRequest {
  readonly movie_id: string
  readonly notes?: string
}

export interface WatchlistUpdateRequest {
  readonly watched?: boolean
  readonly rating?: number
  readonly notes?: string
  readonly watched_at?: string
}

export interface RatingCreateRequest {
  readonly movie_id: string
  readonly rating?: number
  readonly interested: boolean
  readonly interaction_type?: 'like' | 'dislike' | 'watchlist' | 'quick_rate' | 'browse'
  readonly source?: string
}

export interface PreferencesUpdateRequest {
  readonly genres?: string[]
  readonly decades?: string[]
  readonly mood?: string
  readonly length?: 'short' | 'medium' | 'long'
}

// Authentication Types
export interface AuthResponse {
  readonly user: AuthUser | null
  readonly session: AuthSession | null
  readonly error?: AuthError
}

export interface AuthUser {
  readonly id: string
  readonly email: string
  readonly email_confirmed_at?: string
  readonly last_sign_in_at?: string
  readonly created_at: string
  readonly updated_at?: string
}

export interface AuthSession {
  readonly access_token: string
  readonly refresh_token: string
  readonly expires_at: number
  readonly token_type: string
  readonly user: AuthUser
}

export interface AuthError {
  readonly message: string
  readonly status?: number
}

// Database Query Options
export interface QueryOptions {
  readonly page?: number
  readonly limit?: number
  readonly sortBy?: string
  readonly sortOrder?: 'asc' | 'desc'
  readonly filter?: Record<string, unknown>
}

export interface MovieQueryOptions extends QueryOptions {
  readonly genre?: string[]
  readonly year?: number
  readonly minRating?: number
  readonly maxRating?: number
  readonly director?: string
  readonly actor?: string
}

export interface WatchlistQueryOptions extends QueryOptions {
  readonly watched?: boolean
  readonly rating?: number
  readonly dateAdded?: string
}

// Form Validation Types
export interface FormField<T = string> {
  readonly value: T
  readonly error?: string
  readonly touched: boolean
  readonly required?: boolean
}

export interface LoginFormData {
  readonly email: FormField
  readonly password: FormField
}

export interface SignupFormData {
  readonly email: FormField
  readonly password: FormField
  readonly full_name: FormField
  readonly confirmPassword: FormField
}

export interface FormErrors {
  readonly [key: string]: string
}

// Component Props Types with strict constraints
export interface ComponentBaseProps {
  readonly className?: string
  readonly 'data-testid'?: string
}

export interface LoadingProps extends ComponentBaseProps {
  readonly isLoading: boolean
  readonly loadingText?: string
  readonly size?: 'sm' | 'md' | 'lg'
}

export interface ErrorProps extends ComponentBaseProps {
  readonly error: string | Error
  readonly onRetry?: () => void
  readonly variant?: 'inline' | 'page' | 'toast'
}

// Event Handler Types
export interface MovieEventHandlers {
  readonly onRate: (movieId: string, interested: boolean, rating?: number) => void
  readonly onAddToWatchlist: (movieId: string) => void
  readonly onRemoveFromWatchlist: (movieId: string) => void
  readonly onClick: (movie: { id: string; title: string }) => void
}

export interface WatchlistEventHandlers {
  readonly onMarkWatched: (movieId: string, watchlistId: string) => void
  readonly onRemove: (movieId: string) => void
  readonly onFilter: (filter: 'all' | 'watched' | 'unwatched') => void
  readonly onSort: (sort: 'added_at' | 'title' | 'year') => void
}

// Configuration Types
export interface AppConfig {
  readonly supabase: {
    readonly url: string
    readonly anonKey: string
  }
  readonly tmdb: {
    readonly apiKey: string
    readonly baseUrl: string
    readonly imageBaseUrl: string
  }
  readonly features: {
    readonly aiRecommendations: boolean
    readonly offlineMode: boolean
    readonly analytics: boolean
  }
}

// Utility Types for better type safety
export type NonEmptyArray<T> = [T, ...T[]]

export type RequiredKeys<T, K extends keyof T> = T & Required<Pick<T, K>>

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>

export type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P]
}

export type APIMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

export interface APIRequestConfig {
  readonly method: APIMethod
  readonly url: string
  readonly headers?: Record<string, string>
  readonly body?: unknown
  readonly timeout?: number
}

// Note: Import specific types from main types file as needed in consuming modules
