import { NextRequest, NextResponse } from 'next/server'
import { User } from '@supabase/supabase-js'
import { createServerClient } from '@/lib/supabase/client'
import { createClient as createSupabaseClient } from '@/lib/supabase/server-client'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { GeneratedDatabase } from '@/lib/supabase/types'

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

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

export type AuthenticatedApiHandler<T = unknown> = (
  request: NextRequest,
  context: { user: User; supabase: Awaited<ReturnType<typeof createServerClient>> }
) => Promise<NextResponse<ApiResponse<T>>>

export type ApiHandler<T = unknown> = (
  request: NextRequest,
  context: { supabase: Awaited<ReturnType<typeof createServerClient>> }
) => Promise<NextResponse<ApiResponse<T>>>

export interface SupabaseCtx {
  supabase: SupabaseClient<GeneratedDatabase>
  request: NextRequest
}

export type Handler = (ctx: SupabaseCtx) => Promise<Response> | Response

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

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

/* ------------------------------------------------------------------ */
/*  NEW  – compat helpers so legacy routes keep working               */
/* ------------------------------------------------------------------ */

/**
 *  parseJsonBody – tiny wrapper kept for backwards-compatibility
 *    (routes that were written before the refactor still import it)
 */
export async function parseJsonBody<T = unknown>(req: Request): Promise<T> {
  return req.json() as Promise<T>
}

/**
 *  createAuthenticatedApiHandler – legacy alias that simply
 *  delegates to the new combined middleware.
 */
export function createAuthenticatedApiHandler<T = unknown>(handler: AuthenticatedApiHandler<T>) {
  return withAuthAndErrorHandling(handler)
}

// ============================================================================
// API MIDDLEWARE FACTORIES
// ============================================================================

/**
 * Wraps an API handler with authentication requirement
 */
export function withAuth<T = unknown>(
  handler: AuthenticatedApiHandler<T>
): (request: NextRequest) => Promise<NextResponse<ApiResponse<T | undefined>>> {
  return async (request: NextRequest) => {
    try {
      const supabase = await createServerClient()

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser()

      if (authError || !user) {
        return NextResponse.json(
          createApiResponse(false, undefined, {
            message: 'Authentication required',
            code: 'UNAUTHORIZED',
            details: authError,
          }),
          { status: 401 }
        )
      }

      return await handler(request, { user, supabase })
    } catch (error) {
      console.error('Auth middleware error:', error)
      return NextResponse.json(
        createApiResponse(false, undefined, {
          message: 'Authentication check failed',
          code: 'AUTH_CHECK_FAILED',
          details: handleSupabaseError(error),
        }),
        { status: 500 }
      )
    }
  }
}

/**
 * Wraps an API handler with error handling
 */
export function withErrorHandling<T = unknown>(
  handler: ApiHandler<T>
): (request: NextRequest) => Promise<NextResponse<ApiResponse<T | undefined>>> {
  return async (request: NextRequest) => {
    try {
      const supabase = await createServerClient()
      return await handler(request, { supabase })
    } catch (error) {
      console.error('API handler error:', error)
      const supabaseError = handleSupabaseError(error)

      return NextResponse.json(
        createApiResponse(false, undefined, {
          message: 'Internal server error',
          code: 'INTERNAL_ERROR',
          details: supabaseError,
        }),
        { status: 500 }
      )
    }
  }
}

/**
 * Combines auth and error handling middleware
 */
export function withAuthAndErrorHandling<T = unknown>(
  handler: AuthenticatedApiHandler<T>
): (request: NextRequest) => Promise<NextResponse<ApiResponse<T | undefined>>> {
  return withErrorHandling(async (request, { supabase }) => {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        createApiResponse(false, undefined, {
          message: 'Authentication required',
          code: 'UNAUTHORIZED',
          details: authError,
        }),
        { status: 401 }
      )
    }

    return await handler(request, { user, supabase })
  })
}

// Inject a typed Supabase client
export const withSupabase = (handler: Handler): Handler => {
  return async (ctx: SupabaseCtx) => {
    const supabase = await createSupabaseClient()
    return handler({ ...ctx, supabase })
  }
}

// Simple error wrapper – catches unhandled exceptions
export const withError = (handler: Handler): Handler => {
  return async ctx => {
    try {
      return await handler(ctx)
    } catch (err: any) {
      console.error('API error:', err)
      return Response.json(
        { success: false, error: err?.message || 'Internal error' },
        {
          status: 500,
        }
      )
    }
  }
}
