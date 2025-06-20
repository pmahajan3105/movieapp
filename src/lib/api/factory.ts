import { NextRequest, NextResponse } from 'next/server'
import {
  createTypedServerClient,
  createApiResponse,
  handleSupabaseError,
} from '@/lib/typed-supabase'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase-generated'

type TypedSupabaseClient = SupabaseClient<Database>

// Enhanced request context with user and supabase client
export interface RequestContext {
  request: NextRequest
  supabase: TypedSupabaseClient
  user: {
    id: string
    email: string
  }
}

// Handler types
export type AuthenticatedHandler<T = unknown> = (context: RequestContext) => Promise<T>
export type ErrorSafeHandler<T = unknown> = (request: NextRequest) => Promise<T>
export type SupabaseHandler<T = unknown> = (
  request: NextRequest,
  supabase: TypedSupabaseClient
) => Promise<T>

/**
 * Adds authentication middleware to a handler
 */
export function withAuth<T>(handler: AuthenticatedHandler<T>) {
  return async (request: NextRequest, supabase: TypedSupabaseClient): Promise<T> => {
    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      throw new Error('Unauthorized')
    }

    const context: RequestContext = {
      request,
      supabase,
      user: {
        id: user.id,
        email: user.email || '',
      },
    }

    return handler(context)
  }
}

/**
 * Adds Supabase client to a handler
 */
export function withSupabase<T>(handler: SupabaseHandler<T>) {
  return async (request: NextRequest): Promise<T> => {
    const supabase = await createTypedServerClient()
    return handler(request, supabase)
  }
}

/**
 * Adds comprehensive error handling to a handler
 */
export function withError<T>(handler: ErrorSafeHandler<T>) {
  return async (request: NextRequest): Promise<NextResponse> => {
    try {
      const result = await handler(request)
      return NextResponse.json(createApiResponse(true, result))
    } catch (error) {
      console.error('API Error:', error)

      // Handle common error types
      if (error instanceof Error) {
        if (error.message === 'Unauthorized') {
          return NextResponse.json(
            createApiResponse(false, undefined, {
              message: 'Authentication required',
              code: 'UNAUTHORIZED',
            }),
            { status: 401 }
          )
        }

        if (error.message.includes('not found')) {
          return NextResponse.json(
            createApiResponse(false, undefined, {
              message: 'Resource not found',
              code: 'NOT_FOUND',
            }),
            { status: 404 }
          )
        }

        if (error.message.includes('validation') || error.message.includes('required')) {
          return NextResponse.json(
            createApiResponse(false, undefined, {
              message: error.message,
              code: 'VALIDATION_ERROR',
            }),
            { status: 400 }
          )
        }
      }

      // Handle Supabase errors
      const supabaseError = handleSupabaseError(error)
      return NextResponse.json(createApiResponse(false, undefined, supabaseError), { status: 500 })
    }
  }
}

/**
 * Compose all middleware: withAuth(withError(withSupabase(handler)))
 * This is the main function you'll use for authenticated API endpoints
 */
export function createAuthenticatedApiHandler<T>(handler: AuthenticatedHandler<T>) {
  return withError(withSupabase(withAuth(handler)))
}

/**
 * For API endpoints that don't require authentication
 */
export function createPublicApiHandler<T>(handler: SupabaseHandler<T>) {
  return withError(withSupabase(handler))
}

/**
 * Helper to parse and validate JSON body
 */
export async function parseJsonBody<T = unknown>(request: NextRequest): Promise<T> {
  try {
    return await request.json()
  } catch {
    throw new Error('Invalid JSON body')
  }
}

/**
 * Helper to extract query parameters
 */
export function getQueryParams(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  return {
    get: (key: string, defaultValue?: string) => searchParams.get(key) || defaultValue,
    getNumber: (key: string, defaultValue = 0) => {
      const value = searchParams.get(key)
      return value ? parseInt(value, 10) : defaultValue
    },
    getBoolean: (key: string, defaultValue = false) => {
      const value = searchParams.get(key)
      if (value === null) return defaultValue
      return value === 'true' || value === '1'
    },
  }
}

/**
 * Helper for pagination
 */
export function getPagination(request: NextRequest) {
  const params = getQueryParams(request)
  const page = Math.max(1, params.getNumber('page', 1))
  const limit = Math.max(1, Math.min(100, params.getNumber('limit', 20))) // Cap at 100
  const offset = (page - 1) * limit

  return {
    page,
    limit,
    offset,
    range: [offset, offset + limit - 1] as [number, number],
  }
}
