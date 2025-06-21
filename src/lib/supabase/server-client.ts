import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { cache } from 'react'

// Temporary stub until all helpers are migrated to generated types
interface Database {
  public: {
    Tables: {
      movies: { Row: any; Insert: any; Update: any }
      watchlist: { Row: any; Insert: any; Update: any }
      ratings: { Row: any; Insert: any; Update: any }
      user_profiles: { Row: any; Insert: any; Update: any }
      chat_sessions: { Row: any; Insert: any; Update: any }
      recommendations: { Row: any; Insert: any; Update: any }
    }
  }
}

// Server-only client - use only in server components and API routes
export const createClient = cache(async () => {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      // NEW cookie API → lets Supabase refresh tokens
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          // Persist every Set-Cookie header Supabase gives us
          cookiesToSet.forEach(({ name, value, options }) => {
            try {
              cookieStore.set(name, value, options)
            } catch {
              // Called from a Server Component – safe to ignore
            }
          })
        },
      },
    }
  )
})

// Standard response format for API routes
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: {
    message: string
    code: string
    details?: unknown
  }
  meta?: {
    timestamp: string
    requestId: string
  }
}

// Helper to create consistent API responses
export function createApiResponse<T>(
  success: boolean,
  data?: T,
  error?: { message: string; code: string; details?: unknown }
): ApiResponse<T> {
  return {
    success,
    data,
    error,
    meta: {
      timestamp: new Date().toISOString(),
      requestId: crypto.randomUUID(),
    },
  }
}

// Helper to handle Supabase errors consistently
export function handleSupabaseError(error: unknown): {
  message: string
  code: string
  details?: unknown
} {
  if (error && typeof error === 'object' && 'code' in error && 'message' in error) {
    return {
      message: (error as any).message,
      code: (error as any).code,
      details: error,
    }
  }

  return {
    message: error instanceof Error ? error.message : 'Unknown error occurred',
    code: 'UNKNOWN_ERROR',
    details: error,
  }
}
