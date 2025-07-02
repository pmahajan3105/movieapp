/**
 * Custom error classes for the CineAI application
 * Provides structured error handling with specific error types
 */

// Base application error class
export abstract class AppError extends Error {
  abstract readonly code: string
  abstract readonly statusCode: number

  constructor(
    message: string,
    public readonly context?: Record<string, unknown>
  ) {
    super(message)
    this.name = this.constructor.name

    // Maintain proper stack trace for V8
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor)
    }
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
      context: this.context,
    }
  }
}

// Authentication and authorization errors
export class AuthenticationError extends AppError {
  readonly code = 'AUTH_REQUIRED'
  readonly statusCode = 401

  constructor(message = 'Authentication required', context?: Record<string, unknown>) {
    super(message, context)
  }
}

export class AuthorizationError extends AppError {
  readonly code = 'AUTH_FORBIDDEN'
  readonly statusCode = 403

  constructor(message = 'Access forbidden', context?: Record<string, unknown>) {
    super(message, context)
  }
}

export class SessionExpiredError extends AppError {
  readonly code = 'SESSION_EXPIRED'
  readonly statusCode = 401

  constructor(message = 'Session has expired', context?: Record<string, unknown>) {
    super(message, context)
  }
}

// Validation errors
export class ValidationError extends AppError {
  readonly code = 'VALIDATION_ERROR'
  readonly statusCode = 400

  constructor(
    message = 'Validation failed',
    public readonly errors: string[] = [],
    context?: Record<string, unknown>
  ) {
    super(message, { ...context, errors })
  }
}

export class InputSanitizationError extends AppError {
  readonly code = 'INPUT_UNSAFE'
  readonly statusCode = 400

  constructor(message = 'Input contains unsafe content', context?: Record<string, unknown>) {
    super(message, context)
  }
}

// Database errors
export class DatabaseError extends AppError {
  readonly code = 'DATABASE_ERROR'
  readonly statusCode = 500

  constructor(message = 'Database operation failed', context?: Record<string, unknown>) {
    super(message, context)
  }
}

export class RecordNotFoundError extends AppError {
  readonly code = 'RECORD_NOT_FOUND'
  readonly statusCode = 404

  constructor(resource: string, identifier?: string | number, context?: Record<string, unknown>) {
    const message = identifier
      ? `${resource} with ID '${identifier}' not found`
      : `${resource} not found`
    super(message, { ...context, resource, identifier })
  }
}

export class ConflictError extends AppError {
  readonly code = 'CONFLICT'
  readonly statusCode = 409

  constructor(message = 'Resource conflict', context?: Record<string, unknown>) {
    super(message, context)
  }
}

// External API errors
export class ExternalAPIError extends AppError {
  readonly code = 'EXTERNAL_API_ERROR'
  readonly statusCode = 502

  constructor(
    public readonly service: string,
    message = 'External service unavailable',
    public readonly originalStatus?: number,
    context?: Record<string, unknown>
  ) {
    super(message, { ...context, service, originalStatus })
  }
}

export class TMDBAPIError extends AppError {
  readonly code = 'TMDB_API_ERROR'
  readonly statusCode = 502

  constructor(
    message = 'TMDB service unavailable',
    public readonly originalStatus?: number,
    context?: Record<string, unknown>
  ) {
    super(message, { ...context, service: 'TMDB', originalStatus })
  }
}

export class AnthropicAPIError extends AppError {
  readonly code = 'ANTHROPIC_API_ERROR'
  readonly statusCode = 502

  constructor(
    message = 'AI service unavailable',
    public readonly originalStatus?: number,
    context?: Record<string, unknown>
  ) {
    super(message, { ...context, service: 'Anthropic', originalStatus })
  }
}

// Rate limiting errors
export class RateLimitError extends AppError {
  readonly code = 'RATE_LIMIT_EXCEEDED'
  readonly statusCode = 429

  constructor(
    public readonly retryAfter?: number,
    message = 'Rate limit exceeded',
    context?: Record<string, unknown>
  ) {
    super(message, { ...context, retryAfter })
  }
}

// Configuration errors
export class ConfigurationError extends AppError {
  readonly code = 'CONFIGURATION_ERROR'
  readonly statusCode = 500

  constructor(message = 'Application configuration error', context?: Record<string, unknown>) {
    super(message, context)
  }
}

export class EnvironmentError extends AppError {
  readonly code = 'ENVIRONMENT_ERROR'
  readonly statusCode = 500

  constructor(
    public readonly envVar: string,
    message?: string,
    context?: Record<string, unknown>
  ) {
    super(message || `Required environment variable ${envVar} is not set`, { ...context, envVar })
  }
}

// AI and recommendation errors
export class PreferenceExtractionError extends AppError {
  readonly code = 'PREFERENCE_EXTRACTION_ERROR'
  readonly statusCode = 422

  constructor(message = 'Failed to extract user preferences', context?: Record<string, unknown>) {
    super(message, context)
  }
}

export class RecommendationError extends AppError {
  readonly code = 'RECOMMENDATION_ERROR'
  readonly statusCode = 500

  constructor(message = 'Failed to generate recommendations', context?: Record<string, unknown>) {
    super(message, context)
  }
}

export class SemanticSearchError extends AppError {
  readonly code = 'SEMANTIC_SEARCH_ERROR'
  readonly statusCode = 500

  constructor(message = 'Semantic search failed', context?: Record<string, unknown>) {
    super(message, context)
  }
}

// File and media errors
export class FileProcessingError extends AppError {
  readonly code = 'FILE_PROCESSING_ERROR'
  readonly statusCode = 422

  constructor(
    public readonly filename: string,
    message = 'File processing failed',
    context?: Record<string, unknown>
  ) {
    super(message, { ...context, filename })
  }
}

// Timeout errors
export class TimeoutError extends AppError {
  readonly code = 'TIMEOUT_ERROR'
  readonly statusCode = 408

  constructor(
    public readonly operation: string,
    public readonly timeoutMs: number,
    message?: string,
    context?: Record<string, unknown>
  ) {
    super(message || `Operation '${operation}' timed out after ${timeoutMs}ms`, {
      ...context,
      operation,
      timeoutMs,
    })
  }
}

// Generic client errors
export class BadRequestError extends AppError {
  readonly code = 'BAD_REQUEST'
  readonly statusCode = 400

  constructor(message = 'Bad request', context?: Record<string, unknown>) {
    super(message, context)
  }
}

export class NotFoundError extends AppError {
  readonly code = 'NOT_FOUND'
  readonly statusCode = 404

  constructor(message = 'Resource not found', context?: Record<string, unknown>) {
    super(message, context)
  }
}

// Generic server errors
export class InternalServerError extends AppError {
  readonly code = 'INTERNAL_SERVER_ERROR'
  readonly statusCode = 500

  constructor(message = 'Internal server error', context?: Record<string, unknown>) {
    super(message, context)
  }
}

export class ServiceUnavailableError extends AppError {
  readonly code = 'SERVICE_UNAVAILABLE'
  readonly statusCode = 503

  constructor(message = 'Service temporarily unavailable', context?: Record<string, unknown>) {
    super(message, context)
  }
}

/**
 * Error factory for creating appropriate error instances
 */
export class ErrorFactory {
  /**
   * Create an error from a Supabase error
   */
  static fromSupabaseError(error: any, context?: Record<string, unknown>): AppError {
    const code = error?.code
    const message = error?.message || 'Database operation failed'

    switch (code) {
      case 'PGRST116': // Row not found
        return new RecordNotFoundError('Resource', undefined, { ...context, supabaseCode: code })
      case '23505': // Unique violation
        return new ConflictError('Resource already exists', { ...context, supabaseCode: code })
      case '23503': // Foreign key violation
        return new ValidationError('Invalid reference', [], { ...context, supabaseCode: code })
      default:
        return new DatabaseError(message, { ...context, supabaseCode: code })
    }
  }

  /**
   * Create an error from an HTTP response
   */
  static fromHttpResponse(
    response: Response,
    service: string,
    context?: Record<string, unknown>
  ): AppError {
    const status = response.status
    const message = `${service} API error: ${status}`

    if (status === 401) {
      return new AuthenticationError(message, context)
    } else if (status === 403) {
      return new AuthorizationError(message, context)
    } else if (status === 404) {
      return new NotFoundError(message, context)
    } else if (status === 429) {
      const retryAfter = response.headers.get('retry-after')
      return new RateLimitError(retryAfter ? parseInt(retryAfter) : undefined, message, context)
    } else if (status >= 500) {
      return new ExternalAPIError(service, message, status, context)
    } else {
      return new BadRequestError(message, context)
    }
  }

  /**
   * Create a timeout error
   */
  static timeout(
    operation: string,
    timeoutMs: number,
    context?: Record<string, unknown>
  ): TimeoutError {
    return new TimeoutError(operation, timeoutMs, undefined, context)
  }
}

/**
 * Type guard to check if an error is an AppError
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError
}

/**
 * Extract error details for logging
 */
export function getErrorDetails(error: unknown): {
  message: string
  code?: string
  statusCode?: number
  context?: Record<string, unknown>
  stack?: string
} {
  if (isAppError(error)) {
    return {
      message: error.message,
      code: error.code,
      statusCode: error.statusCode,
      context: error.context,
      stack: error.stack,
    }
  }

  if (error instanceof Error) {
    return {
      message: error.message,
      stack: error.stack,
    }
  }

  return {
    message: String(error),
  }
}
