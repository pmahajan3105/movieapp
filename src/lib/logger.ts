import { isDevelopment, isProduction } from './env'

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogContext {
  [key: string]: unknown
}

interface LogEntry {
  level: LogLevel
  message: string
  context?: LogContext
  timestamp: string
  stack?: string
}

class Logger {
  private shouldLog(level: LogLevel): boolean {
    if (isProduction()) {
      return level === 'warn' || level === 'error'
    }
    return true // Log everything in development and test
  }

  private formatMessage(entry: LogEntry): string {
    const emoji = {
      debug: '🔍',
      info: 'ℹ️',
      warn: '⚠️',
      error: '❌',
    }

    if (isDevelopment()) {
      const contextStr = entry.context ? `\n${JSON.stringify(entry.context, null, 2)}` : ''
      const stackStr = entry.stack ? `\n${entry.stack}` : ''
      return `${emoji[entry.level]} [${entry.level.toUpperCase()}] ${entry.message}${contextStr}${stackStr}`
    }

    // Production format (JSON for log aggregation)
    return JSON.stringify(entry)
  }

  private log(level: LogLevel, message: string, context?: LogContext, error?: Error): void {
    if (!this.shouldLog(level)) return

    const entry: LogEntry = {
      level,
      message,
      context,
      timestamp: new Date().toISOString(),
      stack: error?.stack,
    }

    const formattedMessage = this.formatMessage(entry)

    // Console output based on level
    switch (level) {
      case 'debug':
        console.debug(formattedMessage)
        break
      case 'info':
        console.info(formattedMessage)
        break
      case 'warn':
        console.warn(formattedMessage)
        break
      case 'error':
        console.error(formattedMessage)
        break
    }

    // In production, you might want to send to external logging service
    if (isProduction() && (level === 'error' || level === 'warn')) {
      this.sendToExternalLogger(entry)
    }
  }

  private async sendToExternalLogger(_entry: LogEntry): Promise<void> {
    // Placeholder for external logging service (e.g., Sentry, LogRocket, etc.)
    // Example:
    // await fetch('/api/logs', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(entry)
    // })
  }

  debug(message: string, context?: LogContext): void {
    this.log('debug', message, context)
  }

  info(message: string, context?: LogContext): void {
    this.log('info', message, context)
  }

  warn(message: string, context?: LogContext, error?: Error): void {
    this.log('warn', message, context, error)
  }

  error(message: string, context?: LogContext, error?: Error): void {
    this.log('error', message, context, error)
  }

  // Convenience method for API errors
  apiError(endpoint: string, error: Error, context?: LogContext): void {
    this.error(
      `API Error at ${endpoint}`,
      {
        endpoint,
        errorMessage: error.message,
        ...context,
      },
      error
    )
  }

  // Convenience method for auth errors
  authError(action: string, error: Error, context?: LogContext): void {
    this.error(
      `Auth Error during ${action}`,
      {
        action,
        errorMessage: error.message,
        ...context,
      },
      error
    )
  }

  // Convenience method for database errors
  dbError(operation: string, error: Error, context?: LogContext): void {
    this.error(
      `Database Error during ${operation}`,
      {
        operation,
        errorMessage: error.message,
        ...context,
      },
      error
    )
  }
}

export const logger = new Logger()

// Global error handler for unhandled promises
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', event => {
    logger.error('Unhandled Promise Rejection', {
      reason: event.reason,
      stack: event.reason?.stack,
    })
  })

  window.addEventListener('error', event => {
    logger.error('Global Error', {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      stack: event.error?.stack,
    })
  })
}
