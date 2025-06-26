import { createServerClient as createSSRServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { cache } from 'react'
import { Database } from './types'

// Server client for server components and API routes
export const createServerClient = cache(async () => {
  // MUST await for dynamic cookies API
  const cookieStore = await cookies()

  return createSSRServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options?: any }>) {
          cookiesToSet.forEach(({ name, value, options }) => {
            try {
              cookieStore.set(name, value, options)
            } catch {
              /* called from a Server Component – safe to ignore */
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
