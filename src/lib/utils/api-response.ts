/**
 * Standardized API Response Utilities
 * 
 * Provides consistent response shapes across all API endpoints
 */

import { NextResponse } from 'next/server'

export interface APIResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
  metadata?: {
    timestamp: string
    requestId?: string
    version: string
    [key: string]: any
  }
}

export interface PaginatedResponse<T> extends APIResponse<T[]> {
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

export interface RecommendationResponse<T> extends APIResponse<T[]> {
  recommendations: T[]
  scoring: {
    algorithm: string
    confidence: number
    factors: string[]
    transparency: {
      userPreferences: Record<string, number>
      noveltyPenalty?: boolean
      recencyDecay: number
    }
  }
}

/**
 * Create a successful API response
 */
export function createSuccessResponse<T>(
  data: T,
  message?: string,
  metadata?: Record<string, any>
): NextResponse<APIResponse<T>> {
  return NextResponse.json({
    success: true,
    data,
    message,
    metadata: {
      timestamp: new Date().toISOString(),
      version: '2.0.0',
      ...metadata
    }
  })
}

/**
 * Create an error API response
 */
export function createErrorResponse(
  error: string,
  status: number = 400,
  message?: string,
  metadata?: Record<string, any>
): NextResponse<APIResponse> {
  return NextResponse.json({
    success: false,
    error,
    message,
    metadata: {
      timestamp: new Date().toISOString(),
      version: '2.0.0',
      ...metadata
    }
  }, { status })
}

/**
 * Create a paginated response
 */
export function createPaginatedResponse<T>(
  data: T[],
  page: number,
  limit: number,
  total: number,
  message?: string
): NextResponse<PaginatedResponse<T>> {
  const totalPages = Math.ceil(total / limit)
  
  return NextResponse.json({
    success: true,
    data,
    message,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1
    },
    metadata: {
      timestamp: new Date().toISOString(),
      version: '2.0.0'
    }
  })
}

/**
 * Create a recommendation response with transparency
 */
export function createRecommendationResponse<T>(
  recommendations: T[],
  scoring: {
    algorithm: string
    confidence: number
    factors: string[]
    userPreferences: Record<string, number>
    noveltyPenalty?: boolean
    recencyDecay: number
  },
  message?: string
): NextResponse<RecommendationResponse<T>> {
  return NextResponse.json({
    success: true,
    recommendations,
    message,
    scoring: {
      ...scoring,
      transparency: {
        userPreferences: scoring.userPreferences,
        noveltyPenalty: scoring.noveltyPenalty,
        recencyDecay: scoring.recencyDecay
      }
    },
    metadata: {
      timestamp: new Date().toISOString(),
      version: '2.0.0'
    }
  })
}

/**
 * Standard error responses
 */
export const StandardErrors = {
  UNAUTHORIZED: () => createErrorResponse(
    'Authentication required',
    401,
    'Please sign in to access this resource'
  ),
  
  FORBIDDEN: () => createErrorResponse(
    'Access denied',
    403,
    'You do not have permission to access this resource'
  ),
  
  NOT_FOUND: (resource: string = 'Resource') => createErrorResponse(
    `${resource} not found`,
    404,
    `The requested ${resource.toLowerCase()} could not be found`
  ),
  
  VALIDATION_ERROR: (details: string) => createErrorResponse(
    'Validation failed',
    400,
    `Invalid request: ${details}`
  ),
  
  RATE_LIMITED: (retryAfter?: number) => createErrorResponse(
    'Rate limit exceeded',
    429,
    'Too many requests. Please try again later.',
    { retryAfter }
  ),
  
  INTERNAL_ERROR: (details?: string) => createErrorResponse(
    'Internal server error',
    500,
    details || 'An unexpected error occurred'
  ),
  
  SERVICE_UNAVAILABLE: (service: string) => createErrorResponse(
    'Service unavailable',
    503,
    `${service} is currently unavailable. Please try again later.`
  )
}

/**
 * Add request ID to metadata
 */
export function addRequestId(metadata: Record<string, any> = {}): Record<string, any> {
  return {
    ...metadata,
    requestId: crypto.randomUUID()
  }
}
