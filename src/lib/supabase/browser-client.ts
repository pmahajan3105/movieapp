import { createBrowserClient } from '@supabase/ssr'
import { isDev } from '@/lib/env'
import { logger } from '@/lib/logger'

// Simple Database interface for Supabase client typing
interface Database {
  public: {
    Tables: {
      movies: {
        Row: any
        Insert: any
        Update: any
      }
      watchlist: {
        Row: any
        Insert: any
        Update: any
      }
      ratings: {
        Row: any
        Insert: any
        Update: any
      }
      user_profiles: {
        Row: any
        Insert: any
        Update: any
      }
      chat_sessions: {
        Row: any
        Insert: any
        Update: any
      }
      recommendations: {
        Row: any
        Insert: any
        Update: any
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
      get(name: string) {
        if (typeof document === 'undefined') return undefined

        if (isDev()) logger.debug('Browser cookie get', { name })

        const match = document.cookie.split('; ').find(row => row.startsWith(name + '='))
        if (!match) return undefined
        return decodeURIComponent(match.split('=')[1] || '')
      },
      set(name: string, value: string, options: any) {
        if (typeof document === 'undefined') return

        if (isDev()) logger.debug('Browser cookie set', { name, length: value?.length || 0 })

        let cookie = `${name}=${encodeURIComponent(value)}`
        if (options?.maxAge) cookie += `; max-age=${options.maxAge}`
        if (options?.path) cookie += `; path=${options.path}`
        if (options?.sameSite) cookie += `; samesite=${options.sameSite}`
        if (options?.secure) cookie += '; secure'
        document.cookie = cookie
      },
      remove(name: string, options: any) {
        if (typeof document === 'undefined') return

        if (isDev()) logger.debug('Browser cookie remove', { name })

        let cookie = `${name}=; max-age=0`
        if (options?.path) cookie += `; path=${options.path}`
        if (options?.sameSite) cookie += `; samesite=${options.sameSite}`
        if (options?.secure) cookie += '; secure'
        document.cookie = cookie
      },
    },
  })
}

// Singleton for client-side usage
export const supabase = createClient()

// Re-export common types from main types file for convenience
export type { Movie, WatchlistItem, Rating, UserProfile } from '@/types'
