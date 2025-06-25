import { createBrowserClient } from '@supabase/ssr'
import { isDev } from '@/lib/env'
import { logger } from '@/lib/logger'

// Import proper database types
import type { DatabaseMovie, DatabaseWatchlistItem, DatabaseRating } from '@/types/database'

// Additional database table interfaces
interface DatabaseUserProfile {
  id: string
  user_id: string
  favorite_movies: string[]
  preferred_genres: string[]
  preferred_decades: string[]
  preferred_languages: string[]
  streaming_services: string[]
  content_preferences: string[]
  created_at: string
  updated_at: string
}

interface DatabaseChatSession {
  id: string
  user_id: string
  title?: string
  created_at: string
  updated_at: string
}

interface DatabaseRecommendation {
  id: string
  user_id: string
  movie_id: string
  recommendation_reason: string
  similarity_score: number
  created_at: string
}

// Proper Database interface for Supabase client typing
interface Database {
  public: {
    Tables: {
      movies: {
        Row: DatabaseMovie
        Insert: Omit<DatabaseMovie, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<DatabaseMovie, 'id' | 'created_at' | 'updated_at'>>
      }
      watchlist: {
        Row: DatabaseWatchlistItem
        Insert: Omit<DatabaseWatchlistItem, 'id' | 'added_at'>
        Update: Partial<Omit<DatabaseWatchlistItem, 'id' | 'user_id' | 'movie_id' | 'added_at'>>
      }
      ratings: {
        Row: DatabaseRating
        Insert: Omit<DatabaseRating, 'id' | 'rated_at'>
        Update: Partial<Omit<DatabaseRating, 'id' | 'user_id' | 'movie_id' | 'rated_at'>>
      }
      user_profiles: {
        Row: DatabaseUserProfile
        Insert: Omit<DatabaseUserProfile, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<DatabaseUserProfile, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
      }
      chat_sessions: {
        Row: DatabaseChatSession
        Insert: Omit<DatabaseChatSession, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<DatabaseChatSession, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
      }
      recommendations: {
        Row: DatabaseRecommendation
        Insert: Omit<DatabaseRecommendation, 'id' | 'created_at'>
        Update: Partial<Omit<DatabaseRecommendation, 'id' | 'user_id' | 'movie_id' | 'created_at'>>
      }
    }
  }
}

// Browser-only client - safe to use in client components
export function createClient() {
  // Explicit fallback to empty string satisfies TS; runtime validation happens elsewhere
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

  return createBrowserClient<Database>(supabaseUrl, supabaseAnon, {
    // Attach a cookie adapter so Supabase-JS v2 can load the session that
    // our `/auth/callback` route sets via HTTP cookies.
    cookies: {
      getAll() {
        if (typeof document === 'undefined') return []

        return document.cookie
          .split('; ')
          .filter(Boolean)
          .map(cookie => {
            const [name, ...rest] = cookie.split('=')
            return {
              name: name || '',
              value: decodeURIComponent(rest.join('=') || ''),
            }
          })
          .filter(cookie => cookie.name) // Filter out cookies without names
      },
      setAll(cookiesToSet) {
        if (typeof document === 'undefined') return

        cookiesToSet.forEach(({ name, value, options }) => {
          if (isDev()) logger.debug('Browser cookie set', { name, length: value?.length || 0 })

          let cookie = `${name}=${encodeURIComponent(value)}`
          if (options?.maxAge) cookie += `; max-age=${options.maxAge}`
          if (options?.path) cookie += `; path=${options.path}`
          if (options?.sameSite) cookie += `; samesite=${options.sameSite}`
          if (options?.secure) cookie += '; secure'
          document.cookie = cookie
        })
      },
    },
  })
}

// Singleton for client-side usage
export const supabase = createClient()

// Re-export common types from main types file for convenience
export type { Movie, WatchlistItem, Rating, UserProfile } from '@/types'
