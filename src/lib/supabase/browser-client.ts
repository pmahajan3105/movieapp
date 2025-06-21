import { createBrowserClient } from '@supabase/ssr'

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
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      // Configure cookie handling for SSR
      cookies: {
        get(name: string) {
          if (typeof document === 'undefined') return undefined

          console.log('🍪 Browser client: Reading cookie:', name)

          const cookies = document.cookie.split(';')
          for (const cookie of cookies) {
            const parts = cookie.trim().split('=')
            const key = parts[0]
            const value = parts.slice(1).join('=') // Handle values with = in them

            if (key === name) {
              try {
                const decoded = decodeURIComponent(value)
                console.log(
                  '🍪 Browser client: Found cookie',
                  name,
                  'length:',
                  decoded?.length || 0
                )
                return decoded
              } catch {
                console.log(
                  '🍪 Browser client: Found cookie (no decode)',
                  name,
                  'length:',
                  value?.length || 0
                )
                return value
              }
            }
          }

          console.log('🍪 Browser client: Cookie not found:', name)
          return undefined
        },
        set(name: string, value: string, options: any) {
          if (typeof document === 'undefined') return

          console.log('🍪 Browser client: Setting cookie:', name, 'length:', value?.length || 0)

          let cookieStr = `${name}=${encodeURIComponent(value)}`
          if (options?.maxAge) cookieStr += `; max-age=${options.maxAge}`
          if (options?.path) cookieStr += `; path=${options.path}`
          if (options?.sameSite) cookieStr += `; samesite=${options.sameSite}`
          if (options?.secure) cookieStr += '; secure'
          if (options?.httpOnly) cookieStr += '; httponly'

          document.cookie = cookieStr
        },
        remove(name: string, options: any) {
          if (typeof document === 'undefined') return

          console.log('🍪 Browser client: Removing cookie:', name)

          let cookieStr = `${name}=; max-age=0`
          if (options?.path) cookieStr += `; path=${options.path}`
          if (options?.sameSite) cookieStr += `; samesite=${options.sameSite}`
          if (options?.secure) cookieStr += '; secure'

          document.cookie = cookieStr
        },
      },
    }
  )
}

// Singleton for client-side usage
export const supabase = createClient()

// Re-export common types from main types file for convenience
export type { Movie, WatchlistItem, Rating, UserProfile } from '@/types'
