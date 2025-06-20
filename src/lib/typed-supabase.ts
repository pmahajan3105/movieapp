import { createBrowserClient } from '@supabase/ssr'
import { createServerClient as createSSRServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { cache } from 'react'
import type { Database } from '../types/supabase-generated'
import { config } from './env-config'

// Type-safe aliases for commonly used types
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']
export type TablesInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert']
export type TablesUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update']

// Specific table types
export type Movie = Tables<'movies'>
export type MovieInsert = TablesInsert<'movies'>
export type MovieUpdate = TablesUpdate<'movies'>

export type UserProfile = Tables<'user_profiles'>
export type UserProfileInsert = TablesInsert<'user_profiles'>
export type UserProfileUpdate = TablesUpdate<'user_profiles'>

export type WatchlistItem = Tables<'watchlist'>
export type WatchlistInsert = TablesInsert<'watchlist'>
export type WatchlistUpdate = TablesUpdate<'watchlist'>

export type ChatSession = Tables<'chat_sessions'>
export type ChatSessionInsert = TablesInsert<'chat_sessions'>
export type ChatSessionUpdate = TablesUpdate<'chat_sessions'>

export type Rating = Tables<'ratings'>
export type RatingInsert = TablesInsert<'ratings'>
export type RatingUpdate = TablesUpdate<'ratings'>

export type Recommendation = Tables<'recommendations'>
export type RecommendationInsert = TablesInsert<'recommendations'>
export type RecommendationUpdate = TablesUpdate<'recommendations'>

// Type-safe Supabase client instances
export function createTypedBrowserClient() {
  return createBrowserClient<Database>(config.supabase.url, config.supabase.anonKey)
}

export const createTypedServerClient = cache(async () => {
  const cookieStore = await cookies()

  return createSSRServerClient<Database>(config.supabase.url, config.supabase.anonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value
      },
      set(name: string, value: string, options) {
        try {
          cookieStore.set({ name, value, ...options })
        } catch {
          console.warn(`Failed to set cookie "${name}" in server component.`)
        }
      },
      remove(name: string, options) {
        try {
          cookieStore.set({ name, value: '', ...options })
        } catch {
          console.warn(`Failed to remove cookie "${name}" in server component.`)
        }
      },
    },
  })
})

// Singleton for client-side usage
export const typedSupabase = createTypedBrowserClient()

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
