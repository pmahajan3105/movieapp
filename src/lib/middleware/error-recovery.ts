// Server-side error recovery middleware

import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'

interface ErrorRecoveryOptions {
  enableRetry?: boolean
  maxRetries?: number
  retryDelay?: number
  fallbackResponse?: any
  logLevel?: 'error' | 'warn' | 'info'
}

interface APIError extends Error {
  statusCode?: number
  code?: string
  context?: Record<string, any>
}

export class ErrorRecoveryMiddleware {
  private options: Required<ErrorRecoveryOptions>

  constructor(options: ErrorRecoveryOptions = {}) {
    this.options = {
      enableRetry: options.enableRetry ?? true,
      maxRetries: options.maxRetries ?? 3,
      retryDelay: options.retryDelay ?? 1000,
      fallbackResponse: options.fallbackResponse ?? null,
      logLevel: options.logLevel ?? 'error'
    }
  }

  async handleRequest(
    request: NextRequest,
    handler: (req: NextRequest) => Promise<NextResponse>
  ): Promise<NextResponse> {
    let lastError: APIError | null = null
    let attemptCount = 0

    while (attemptCount <= this.options.maxRetries) {
      try {
        return await handler(request)
      } catch (error) {
        lastError = this.normalizeError(error)
        attemptCount++

        // Log the error
        logger[this.options.logLevel]('API request failed', {
          method: request.method,
          url: request.url,
          attempt: attemptCount,
          maxRetries: this.options.maxRetries,
          error: lastError.message,
          statusCode: lastError.statusCode,
          code: lastError.code,
          context: lastError.context
        })

        // Check if we should retry
        if (!this.shouldRetry(lastError, attemptCount)) {
          break
        }

        // Wait before retrying
        if (attemptCount <= this.options.maxRetries) {
          await this.delay(this.calculateRetryDelay(attemptCount))
        }
      }
    }

    // All retries failed, return error response
    return this.createErrorResponse(lastError!, request)
  }

  private normalizeError(error: any): APIError {
    if (error instanceof Error) {
      return {
        name: error.name,
        message: error.message,
        stack: error.stack,
        statusCode: (error as any).statusCode || 500,
        code: (error as any).code || 'INTERNAL_ERROR',
        context: (error as any).context || {}
      }
    }

    return {
      name: 'UnknownError',
      message: String(error),
      statusCode: 500,
      code: 'UNKNOWN_ERROR',
      context: {}
    }
  }

  private shouldRetry(error: APIError, attemptCount: number): boolean {
    if (!this.options.enableRetry || attemptCount >= this.options.maxRetries) {
      return false
    }

    // Don't retry client errors (4xx)
    if (error.statusCode && error.statusCode >= 400 && error.statusCode < 500) {
      return false
    }

    // Don't retry authentication errors
    if (error.code === 'AUTH_ERROR' || error.message.includes('unauthorized')) {
      return false
    }

    // Don't retry validation errors
    if (error.code === 'VALIDATION_ERROR') {
      return false
    }

    // Retry server errors and network issues
    return true
  }

  private calculateRetryDelay(attemptCount: number): number {
    // Exponential backoff with jitter
    const baseDelay = this.options.retryDelay
    const exponentialDelay = baseDelay * Math.pow(2, attemptCount - 1)
    const jitter = Math.random() * 0.1 * exponentialDelay
    return Math.min(exponentialDelay + jitter, 30000) // Max 30 seconds
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  private createErrorResponse(error: APIError, request: NextRequest): NextResponse {
    const errorResponse = {
      success: false,
      error: {
        message: error.message,
        code: error.code,
        statusCode: error.statusCode,
        timestamp: new Date().toISOString(),
        requestId: this.generateRequestId(),
        context: {
          method: request.method,
          url: request.url,
          ...error.context
        }
      },
      // Include fallback data if available
      ...(this.options.fallbackResponse && {
        fallbackData: this.options.fallbackResponse
      })
    }

    return NextResponse.json(errorResponse, {
      status: error.statusCode || 500,
      headers: {
        'Content-Type': 'application/json',
        'X-Error-Recovery': 'true',
        'X-Request-ID': errorResponse.error.requestId
      }
    })
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
}

// Utility function to wrap API handlers
export function withErrorRecovery(
  handler: (req: NextRequest) => Promise<NextResponse>,
  options?: ErrorRecoveryOptions
) {
  const middleware = new ErrorRecoveryMiddleware(options)
  
  return async (request: NextRequest) => {
    return middleware.handleRequest(request, handler)
  }
}

// Predefined error recovery configurations
export const ErrorRecoveryConfigs = {
  // For data fetching APIs
  dataFetch: {
    enableRetry: true,
    maxRetries: 3,
    retryDelay: 1000,
    logLevel: 'warn' as const
  },

  // For AI service APIs
  aiService: {
    enableRetry: true,
    maxRetries: 2,
    retryDelay: 2000,
    logLevel: 'error' as const,
    fallbackResponse: {
      message: 'AI service temporarily unavailable. Please try again later.',
      useBasicMode: true
    }
  },

  // For critical operations
  critical: {
    enableRetry: true,
    maxRetries: 5,
    retryDelay: 500,
    logLevel: 'error' as const
  },

  // For background tasks
  background: {
    enableRetry: true,
    maxRetries: 10,
    retryDelay: 5000,
    logLevel: 'info' as const
  }
} as const

// Error types for better error handling
export const ErrorCodes = {
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',
  AUTH_ERROR: 'AUTH_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  RATE_LIMIT_ERROR: 'RATE_LIMIT_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  AI_SERVICE_ERROR: 'AI_SERVICE_ERROR'
} as const

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes]