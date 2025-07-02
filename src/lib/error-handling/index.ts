/**
 * Error Handling Module Exports
 */

export {
  APIErrorHandler,
  ERROR_CODES,
  handleDatabaseError,
  handleValidationError,
  handleAuthError,
  handleNotFoundError,
  handleExternalServiceError,
  withErrorHandling
} from './api-error-handler'

export type {
  ErrorContext,
  APIError,
  StandardErrorResponse
} from './api-error-handler'