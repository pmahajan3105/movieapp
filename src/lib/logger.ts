import { isDevelopment, isProduction } from './env'

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

// Define acceptable types for log context values
type LogContextValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | Error
  | Date
  | LogContextValue[]
  | { [key: string]: LogContextValue }

type LogContext = Record<string, LogContextValue>

class Logger {
  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const emoji = {
      debug: '🔍',
      info: 'ℹ️',
      warn: '⚠️',
      error: '❌',
    }[level]

    const levelStr = level.toUpperCase()
    let logMessage = `${emoji} [${levelStr}] ${message}`

    if (context && Object.keys(context).length > 0) {
      try {
        // Handle circular references with a replacer function
        const contextStr = JSON.stringify(
          context,
          (key, value) => {
            if (typeof value === 'object' && value !== null) {
              // Check for circular references
              if (this.seenObjects?.has(value)) {
                return '[Circular Reference]'
              }
              if (!this.seenObjects) {
                this.seenObjects = new WeakSet()
              }
              this.seenObjects.add(value)
            }
            return value
          },
          2
        )
        logMessage += ` | Context: ${contextStr}`
        // Clear the seen objects for next use
        this.seenObjects = undefined
      } catch (error) {
        logMessage += ` | Context: [Unable to serialize context: ${error instanceof Error ? error.message : 'Unknown error'}]`
      }
    }

    return logMessage
  }

  private seenObjects?: WeakSet<object>

  private shouldLog(level: LogLevel): boolean {
    if (isProduction()) {
      return level === 'warn' || level === 'error'
    }
    return isDevelopment()
  }

  debug(message: string, context?: LogContext): void {
    if (this.shouldLog('debug')) {
      console.debug(this.formatMessage('debug', message, context))
    }
  }

  info(message: string, context?: LogContext): void {
    if (this.shouldLog('info')) {
      console.info(this.formatMessage('info', message, context))
    }
  }

  warn(message: string, context?: LogContext): void {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage('warn', message, context))
    }
  }

  error(message: string, context?: LogContext): void {
    if (this.shouldLog('error')) {
      console.error(this.formatMessage('error', message, context))
    }
  }

  // Specialized logging methods
  apiError(endpoint: string, error: Error, context?: LogContext): void {
    this.error(`API Error at ${endpoint}: ${error.message}`, {
      endpoint,
      error: error.message,
      stack: error.stack || undefined,
      ...context,
    })
  }

  authError(operation: string, error: Error, context?: LogContext): void {
    this.error(`Auth Error during ${operation}: ${error.message}`, {
      operation,
      error: error.message,
      stack: error.stack,
      ...context,
    })
  }

  dbError(operation: string, error: Error, context?: LogContext): void {
    this.error(`Database Error during ${operation}: ${error.message}`, {
      operation,
      error: error.message,
      stack: error.stack,
      ...context,
    })
  }
}

export const logger = new Logger()
