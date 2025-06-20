import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/client'
import { z } from 'zod'

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

// Create standardized API response
export function createApiResponse<T>(
  data?: T,
  error?: string,
  status: number = 200,
  message?: string
): NextResponse<ApiResponse<T>> {
  const response: ApiResponse<T> = {
    success: !error,
    ...(data !== undefined && { data }),
    ...(error && { error }),
    ...(message && { message }),
  }

  return NextResponse.json(response, { status })
}

// Enhanced error handling with detailed logging
export function handleApiError(error: unknown, context: string = 'API'): NextResponse<ApiResponse> {
  console.error(`❌ ${context} Error:`, error)

  if (error instanceof z.ZodError) {
    return createApiResponse(
      undefined,
      `Validation error: ${error.errors.map(e => e.message).join(', ')}`,
      400
    )
  }

  if (error instanceof Error) {
    // Don't expose internal errors in production
    const message = process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    return createApiResponse(undefined, message, 500)
  }

  return createApiResponse(undefined, 'Unknown error occurred', 500)
}

// Simple authenticated handler (no rate limiting for complex routes)
export function createSimpleAuthHandler<T = any>(
  handler: (req: NextRequest, user: any, supabase: any) => Promise<NextResponse<ApiResponse<T>>>
) {
  return async (req: NextRequest): Promise<NextResponse<ApiResponse<T>>> => {
    try {
      const supabase = await createServerClient()

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser()

      if (authError || !user) {
        return createApiResponse(undefined, 'Authentication required', 401) as NextResponse<
          ApiResponse<T>
        >
      }

      return await handler(req, user, supabase)
    } catch (error) {
      return handleApiError(error, 'Auth Handler') as NextResponse<ApiResponse<T>>
    }
  }
}

// Simple public handler (no authentication required)
export function createSimplePublicHandler<T = any>(
  handler: (req: NextRequest, supabase: any) => Promise<NextResponse<ApiResponse<T>>>
) {
  return async (req: NextRequest): Promise<NextResponse<ApiResponse<T>>> => {
    try {
      const supabase = await createServerClient()
      return await handler(req, supabase)
    } catch (error) {
      return handleApiError(error, 'Public Handler') as NextResponse<ApiResponse<T>>
    }
  }
}

// Helper function to parse JSON body with validation
export async function parseJsonBody<T>(req: NextRequest, schema: z.ZodSchema<T>): Promise<T> {
  const body = await req.json()
  return schema.parse(body)
}

// Helper function to get query parameters
export function getQueryParams(req: NextRequest) {
  const url = new URL(req.url)
  return Object.fromEntries(url.searchParams.entries())
}

// Helper function for pagination
export function getPagination(req: NextRequest, defaultLimit: number = 20) {
  const url = new URL(req.url)
  const page = parseInt(url.searchParams.get('page') || '1')
  const limit = parseInt(url.searchParams.get('limit') || defaultLimit.toString())
  const offset = (page - 1) * limit

  return { page, limit, offset }
}

// Enhanced Supabase client with better error handling
export async function createEnhancedSupabaseClient() {
  try {
    return await createServerClient()
  } catch (error) {
    console.error('❌ Failed to create Supabase client:', error)
    throw new Error('Database connection failed')
  }
}

// Helper for database operations with better error messages
export async function executeDbOperation<T>(
  operation: () => Promise<{ data: T | null; error: any }>,
  context: string = 'Database operation'
): Promise<T> {
  const { data, error } = await operation()

  if (error) {
    console.error(`❌ ${context} failed:`, error)

    // Handle specific Supabase errors
    if (error.code === '42P01') {
      throw new Error('Required database table is missing. Please contact support.')
    }

    if (error.code === 'PGRST116') {
      throw new Error('Resource not found')
    }

    throw new Error(error.message || 'Database operation failed')
  }

  if (!data) {
    throw new Error('No data returned from database')
  }

  return data
}

// Lightweight route wrapper for existing complex routes
export function wrapExistingRoute<T = any>(
  handler: (req: NextRequest) => Promise<NextResponse<T>>
) {
  return async (req: NextRequest): Promise<NextResponse<T | ApiResponse>> => {
    try {
      return await handler(req)
    } catch (error) {
      console.error('❌ Route Error:', error)

      // Return standardized error for wrapped routes
      return NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Internal server error',
        },
        { status: 500 }
      )
    }
  }
}
