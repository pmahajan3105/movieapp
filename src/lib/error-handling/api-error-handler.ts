/**
 * Standardized API Error Handling Service
 * Provides consistent error responses and logging across all API routes
 */

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { logger } from '@/lib/logger'

export interface ErrorContext {
  endpoint: string
  userId?: string
  method?: string
  requestId?: string
  metadata?: Record<string, any>
}

export interface APIError {
  code: string
  message: string
  status: number
  details?: any
  userMessage?: string
}

export interface StandardErrorResponse {
  success: false
  error: {
    code: string
    message: string
    userMessage?: string
    details?: any
    timestamp: string
    requestId?: string
  }
}

/**
 * Standard error codes and their HTTP status mappings
 */
export const ERROR_CODES = {
  // Authentication & Authorization
  UNAUTHORIZED: { code: 'UNAUTHORIZED', status: 401, message: 'Authentication required' },
  FORBIDDEN: { code: 'FORBIDDEN', status: 403, message: 'Access denied' },
  INVALID_TOKEN: { code: 'INVALID_TOKEN', status: 401, message: 'Invalid or expired token' },
  
  // Validation
  VALIDATION_ERROR: { code: 'VALIDATION_ERROR', status: 400, message: 'Invalid request data' },
  MISSING_REQUIRED_FIELD: { code: 'MISSING_REQUIRED_FIELD', status: 400, message: 'Required field missing' },
  INVALID_FORMAT: { code: 'INVALID_FORMAT', status: 400, message: 'Invalid data format' },
  
  // Resource Management
  NOT_FOUND: { code: 'NOT_FOUND', status: 404, message: 'Resource not found' },
  RESOURCE_EXISTS: { code: 'RESOURCE_EXISTS', status: 409, message: 'Resource already exists' },
  RESOURCE_LIMIT: { code: 'RESOURCE_LIMIT', status: 429, message: 'Resource limit exceeded' },
  
  // Database
  DATABASE_ERROR: { code: 'DATABASE_ERROR', status: 500, message: 'Database operation failed' },
  CONNECTION_ERROR: { code: 'CONNECTION_ERROR', status: 503, message: 'Database connection failed' },
  CONSTRAINT_VIOLATION: { code: 'CONSTRAINT_VIOLATION', status: 400, message: 'Data constraint violation' },
  
  // External Services
  EXTERNAL_SERVICE_ERROR: { code: 'EXTERNAL_SERVICE_ERROR', status: 502, message: 'External service error' },
  AI_SERVICE_ERROR: { code: 'AI_SERVICE_ERROR', status: 502, message: 'AI service unavailable' },
  TMDB_ERROR: { code: 'TMDB_ERROR', status: 502, message: 'Movie database service error' },
  
  // General
  INTERNAL_ERROR: { code: 'INTERNAL_ERROR', status: 500, message: 'Internal server error' },
  UNKNOWN_ERROR: { code: 'UNKNOWN_ERROR', status: 500, message: 'An unknown error occurred' },
  
  // Rate Limiting
  RATE_LIMITED: { code: 'RATE_LIMITED', status: 429, message: 'Too many requests' },
  
  // Feature Specific
  RECOMMENDATION_ERROR: { code: 'RECOMMENDATION_ERROR', status: 500, message: 'Recommendation generation failed' },
  SEARCH_ERROR: { code: 'SEARCH_ERROR', status: 500, message: 'Search operation failed' },
} as const

/**
 * Main API Error Handler Class
 */
export class APIErrorHandler {
  /**
   * Handle any error and return standardized response
   */
  static handle(
    error: unknown, 
    context: ErrorContext,
    fallbackErrorCode = ERROR_CODES.INTERNAL_ERROR
  ): NextResponse<StandardErrorResponse> {
    const requestId = context.requestId || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    // Determine error type and create standardized response
    const standardError = this.classifyError(error, context)
    
    // Log the error with context
    this.logError(standardError, context, requestId, error)
    
    // Create response
    const response: StandardErrorResponse = {
      success: false,
      error: {
        code: standardError.code,
        message: standardError.message,
        userMessage: standardError.userMessage || this.getUserFriendlyMessage(standardError.code),
        details: process.env.NODE_ENV === 'development' ? standardError.details : undefined,
        timestamp: new Date().toISOString(),
        requestId
      }
    }
    
    return NextResponse.json(response, { status: standardError.status })
  }
  
  /**
   * Create a standardized success response
   */
  static success<T = any>(
    data: T, 
    message?: string,
    metadata?: Record<string, any>
  ): NextResponse {
    return NextResponse.json({
      success: true,
      data,
      message,
      timestamp: new Date().toISOString(),
      ...metadata
    })
  }
  
  /**
   * Create a standardized error response without throwing
   */
  static error(
    errorCode: keyof typeof ERROR_CODES,
    context: ErrorContext,
    details?: any,
    userMessage?: string
  ): NextResponse<StandardErrorResponse> {
    const error = ERROR_CODES[errorCode]
    const requestId = context.requestId || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    const standardError: APIError = {
      code: error.code,
      message: error.message,
      status: error.status,
      details,
      userMessage
    }
    
    this.logError(standardError, context, requestId)
    
    const response: StandardErrorResponse = {
      success: false,
      error: {
        code: standardError.code,
        message: standardError.message,
        userMessage: userMessage || this.getUserFriendlyMessage(errorCode),
        details: process.env.NODE_ENV === 'development' ? details : undefined,
        timestamp: new Date().toISOString(),
        requestId
      }
    }
    
    return NextResponse.json(response, { status: standardError.status })
  }
  
  /**
   * Classify unknown errors into standard error types
   */
  private static classifyError(error: unknown, context: ErrorContext): APIError {
    // Zod validation errors
    if (error instanceof z.ZodError) {
      return {
        code: ERROR_CODES.VALIDATION_ERROR.code,
        message: 'Validation failed',
        status: ERROR_CODES.VALIDATION_ERROR.status,
        details: error.errors,
        userMessage: 'Please check your input and try again'
      }
    }
    
    // Supabase/PostgreSQL errors
    if (this.isSupabaseError(error)) {
      return this.classifySupabaseError(error)
    }
    
    // Anthropic/AI service errors
    if (this.isAIServiceError(error)) {
      return {
        code: ERROR_CODES.AI_SERVICE_ERROR.code,
        message: ERROR_CODES.AI_SERVICE_ERROR.message,
        status: ERROR_CODES.AI_SERVICE_ERROR.status,
        details: error,
        userMessage: 'AI service is temporarily unavailable'
      }
    }
    
    // Network/fetch errors
    if (this.isNetworkError(error)) {
      return {
        code: ERROR_CODES.EXTERNAL_SERVICE_ERROR.code,
        message: ERROR_CODES.EXTERNAL_SERVICE_ERROR.message,
        status: ERROR_CODES.EXTERNAL_SERVICE_ERROR.status,
        details: error,
        userMessage: 'External service is temporarily unavailable'
      }
    }
    
    // Standard JavaScript errors
    if (error instanceof Error) {
      // Check for specific error messages
      if (error.message.includes('Authentication required')) {
        return {
          code: ERROR_CODES.UNAUTHORIZED.code,
          message: ERROR_CODES.UNAUTHORIZED.message,
          status: ERROR_CODES.UNAUTHORIZED.status
        }
      }
      
      if (error.message.includes('Not found')) {
        return {
          code: ERROR_CODES.NOT_FOUND.code,
          message: ERROR_CODES.NOT_FOUND.message,
          status: ERROR_CODES.NOT_FOUND.status
        }
      }
      
      return {
        code: ERROR_CODES.INTERNAL_ERROR.code,
        message: error.message,
        status: ERROR_CODES.INTERNAL_ERROR.status,
        details: {
          name: error.name,
          stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        }
      }
    }
    
    // Unknown error type
    return {
      code: ERROR_CODES.UNKNOWN_ERROR.code,
      message: ERROR_CODES.UNKNOWN_ERROR.message,
      status: ERROR_CODES.UNKNOWN_ERROR.status,
      details: error
    }
  }
  
  /**
   * Check if error is from Supabase
   */
  private static isSupabaseError(error: any): boolean {
    return error && typeof error === 'object' && ('code' in error || 'message' in error) && 
           (error.code?.startsWith('PGRST') || error.code?.match(/^\d{5}$/))
  }
  
  /**
   * Classify Supabase errors
   */
  private static classifySupabaseError(error: any): APIError {
    const code = error.code
    const message = error.message || 'Database error'
    
    // PostgreSQL error codes
    switch (code) {
      case '23505': // unique_violation
        return {
          code: ERROR_CODES.RESOURCE_EXISTS.code,
          message: 'Resource already exists',
          status: ERROR_CODES.RESOURCE_EXISTS.status,
          userMessage: 'This resource already exists'
        }
      
      case '23503': // foreign_key_violation
        return {
          code: ERROR_CODES.CONSTRAINT_VIOLATION.code,
          message: 'Foreign key constraint violation',
          status: ERROR_CODES.CONSTRAINT_VIOLATION.status,
          userMessage: 'Referenced resource does not exist'
        }
      
      case 'PGRST116': // no rows returned
        return {
          code: ERROR_CODES.NOT_FOUND.code,
          message: 'Resource not found',
          status: ERROR_CODES.NOT_FOUND.status,
          userMessage: 'The requested resource was not found'
        }
      
      default:
        return {
          code: ERROR_CODES.DATABASE_ERROR.code,
          message: message,
          status: ERROR_CODES.DATABASE_ERROR.status,
          details: error,
          userMessage: 'Database operation failed'
        }
    }
  }
  
  /**
   * Check if error is from AI services
   */
  private static isAIServiceError(error: any): boolean {
    return error && typeof error === 'object' && 
           (error.type === 'anthropic_error' || 
            error.message?.includes('anthropic') ||
            error.message?.includes('openai') ||
            error.message?.includes('AI service'))
  }
  
  /**
   * Check if error is network related
   */
  private static isNetworkError(error: any): boolean {
    return error && typeof error === 'object' && 
           (error.code === 'ENOTFOUND' ||
            error.code === 'ECONNRESET' ||
            error.code === 'ETIMEDOUT' ||
            error.name === 'AbortError' ||
            error.name === 'TimeoutError')
  }
  
  /**
   * Get user-friendly error message
   */
  private static getUserFriendlyMessage(errorCode: string): string {
    const friendlyMessages: Record<string, string> = {
      UNAUTHORIZED: 'Please log in to continue',
      FORBIDDEN: 'You don\'t have permission to perform this action',
      VALIDATION_ERROR: 'Please check your input and try again',
      NOT_FOUND: 'The requested item was not found',
      DATABASE_ERROR: 'Something went wrong with your request',
      AI_SERVICE_ERROR: 'AI features are temporarily unavailable',
      EXTERNAL_SERVICE_ERROR: 'External service is temporarily unavailable',
      RATE_LIMITED: 'You\'re making requests too quickly. Please slow down',
      INTERNAL_ERROR: 'Something went wrong on our end',
    }
    
    return friendlyMessages[errorCode] || 'An unexpected error occurred'
  }
  
  /**
   * Log error with appropriate level and context
   */
  private static logError(
    standardError: APIError, 
    context: ErrorContext, 
    requestId: string,
    originalError?: unknown
  ): void {
    const logData = {
      errorCode: standardError.code,
      status: standardError.status,
      endpoint: context.endpoint,
      userId: context.userId,
      method: context.method,
      requestId,
      details: standardError.details,
      originalError: originalError instanceof Error ? {
        name: originalError.name,
        message: originalError.message,
        stack: originalError.stack
      } : originalError,
      metadata: context.metadata
    }
    
    // Log with appropriate level based on error severity
    if (standardError.status >= 500) {
      logger.error(standardError.message, logData)
    } else if (standardError.status >= 400) {
      logger.warn(standardError.message, logData)
    } else {
      logger.info(standardError.message, logData)
    }
  }
}

/**
 * Convenience functions for common error patterns
 */
export const handleDatabaseError = (error: unknown, context: ErrorContext) => 
  APIErrorHandler.handle(error, context, ERROR_CODES.DATABASE_ERROR)

export const handleValidationError = (error: unknown, context: ErrorContext) => 
  APIErrorHandler.handle(error, context, ERROR_CODES.VALIDATION_ERROR)

export const handleAuthError = (context: ErrorContext) => 
  APIErrorHandler.error('UNAUTHORIZED', context)

export const handleNotFoundError = (context: ErrorContext, resource = 'Resource') => 
  APIErrorHandler.error('NOT_FOUND', context, undefined, `${resource} not found`)

export const handleExternalServiceError = (error: unknown, context: ErrorContext, service = 'External service') => 
  APIErrorHandler.handle(error, { ...context, metadata: { service } }, ERROR_CODES.EXTERNAL_SERVICE_ERROR)

/**
 * Middleware wrapper for API routes
 */
export function withErrorHandling<T extends any[], R>(
  handler: (...args: T) => Promise<R>,
  context: Omit<ErrorContext, 'requestId'>
) {
  return async (...args: T): Promise<R> => {
    try {
      return await handler(...args)
    } catch (error) {
      throw APIErrorHandler.handle(error, context)
    }
  }
}