'use client'

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { useNetworkStatus } from '@/hooks/useNetworkStatus'
import { logger } from '@/lib/logger'

interface ErrorInfo {
  id: string
  error: Error
  context?: string
  timestamp: Date
  userId?: string
  sessionId?: string
  url?: string
  userAgent?: string
  retryCount: number
  recovered: boolean
}

interface RecoveryAction {
  id: string
  label: string
  action: () => Promise<void> | void
  primary?: boolean
}

interface ErrorRecoveryContextType {
  errors: ErrorInfo[]
  reportError: (error: Error, context?: string) => string
  resolveError: (errorId: string) => void
  getRecoveryActions: (errorId: string) => RecoveryAction[]
  retryOperation: (errorId: string, operation: () => Promise<unknown>) => Promise<void>
  clearErrors: () => void
  getHealthStatus: () => {
    isHealthy: boolean
    issues: string[]
    lastErrorTime?: Date
  }
}

const ErrorRecoveryContext = createContext<ErrorRecoveryContextType | undefined>(undefined)

export function ErrorRecoveryProvider({ children }: { children: React.ReactNode }) {
  const [errors, setErrors] = useState<ErrorInfo[]>([])
  const { isOnline } = useNetworkStatus()

  // Generate session ID for error tracking
  const [sessionId] = useState(
    () => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  )

  const reportError = useCallback(
    (error: Error, context?: string): string => {
      const errorId = `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

      const errorInfo: ErrorInfo = {
        id: errorId,
        error,
        context,
        timestamp: new Date(),
        sessionId,
        url: typeof window !== 'undefined' ? window.location.href : undefined,
        userAgent: typeof window !== 'undefined' ? navigator.userAgent : undefined,
        retryCount: 0,
        recovered: false,
      }

      setErrors(prev => {
        // Keep only last 20 errors to prevent memory leaks
        const newErrors = [...prev.slice(-19), errorInfo]

        // Log error for debugging
        logger.error('Error reported to recovery context', {
          errorId,
          message: error.message,
          context,
          stack: error.stack,
        })

        return newErrors
      })

      // Send to monitoring in production
      if (process.env.NODE_ENV === 'production') {
        sendToMonitoring(errorInfo).catch(err =>
          console.warn('Failed to send error to monitoring:', err)
        )
      }

      return errorId
    },
    [sessionId]
  )

  const resolveError = useCallback((errorId: string) => {
    setErrors(prev => prev.map(err => (err.id === errorId ? { ...err, recovered: true } : err)))
  }, [])

  const retryOperation = useCallback(
    async (errorId: string, operation: () => Promise<unknown>) => {
      const error = errors.find(e => e.id === errorId)
      if (!error) return

      setErrors(prev =>
        prev.map(err => (err.id === errorId ? { ...err, retryCount: err.retryCount + 1 } : err))
      )

      try {
        await operation()
        resolveError(errorId)
      } catch (retryError) {
        // Report the retry failure
        reportError(retryError as Error, `Retry failed for: ${error.context}`)
      }
    },
    [errors, reportError, resolveError]
  )

  const getRecoveryActions = useCallback(
    (errorId: string): RecoveryAction[] => {
      const error = errors.find(e => e.id === errorId)
      if (!error) return []

      const actions: RecoveryAction[] = []

      // Network-related errors
      if (error.error.message.includes('network') || error.error.message.includes('fetch')) {
        if (!isOnline) {
          actions.push({
            id: 'wait-for-connection',
            label: 'Wait for Connection',
            action: () => {
              // Auto-retry when connection returns
              const checkConnection = () => {
                if (navigator.onLine) {
                  retryOperation(errorId, async () => {
                    // This would be replaced with the actual operation
                    await new Promise(resolve => setTimeout(resolve, 100))
                  })
                } else {
                  setTimeout(checkConnection, 1000)
                }
              }
              checkConnection()
            },
          })
        } else {
          actions.push({
            id: 'retry-request',
            label: 'Retry Request',
            action: () =>
              retryOperation(errorId, async () => {
                // Placeholder for actual retry operation
                await new Promise(resolve => setTimeout(resolve, 100))
              }),
            primary: true,
          })
        }
      }

      // AI service errors
      if (error.context?.includes('AI') || error.error.message.includes('AI')) {
        actions.push({
          id: 'use-basic-mode',
          label: 'Use Basic Mode',
          action: () => {
            // Switch to non-AI functionality
            localStorage.setItem('use-basic-mode', 'true')
            window.location.reload()
          },
        })
      }

      // Authentication errors
      if (error.error.message.includes('auth') || error.error.message.includes('unauthorized')) {
        actions.push({
          id: 'refresh-session',
          label: 'Refresh Session',
          action: () => {
            window.location.href = '/login'
          },
          primary: true,
        })
      }

      // Generic refresh action
      actions.push({
        id: 'refresh-page',
        label: 'Refresh Page',
        action: () => window.location.reload(),
      })

      return actions
    },
    [errors, isOnline, retryOperation]
  )

  const clearErrors = useCallback(() => {
    setErrors([])
  }, [])

  const getHealthStatus = useCallback(() => {
    const recentErrors = errors.filter(
      err => Date.now() - err.timestamp.getTime() < 5 * 60 * 1000 // Last 5 minutes
    )

    const unresolvedErrors = recentErrors.filter(err => !err.recovered)
    const issues: string[] = []

    if (!isOnline) {
      issues.push('No internet connection')
    }

    if (unresolvedErrors.length > 5) {
      issues.push('Multiple system errors detected')
    }

    if (unresolvedErrors.some(err => err.context?.includes('database'))) {
      issues.push('Database connectivity issues')
    }

    if (unresolvedErrors.some(err => err.context?.includes('AI'))) {
      issues.push('AI services experiencing issues')
    }

    return {
      isHealthy: issues.length === 0 && unresolvedErrors.length < 3,
      issues,
      lastErrorTime: errors.length > 0 ? errors[errors.length - 1]?.timestamp : undefined,
    }
  }, [errors, isOnline])

  // Auto-clear old errors
  useEffect(() => {
    const interval = setInterval(
      () => {
        const cutoff = Date.now() - 30 * 60 * 1000 // 30 minutes
        setErrors(prev => prev.filter(err => err.timestamp.getTime() > cutoff))
      },
      5 * 60 * 1000
    ) // Check every 5 minutes

    return () => clearInterval(interval)
  }, [])

  return (
    <ErrorRecoveryContext.Provider
      value={{
        errors,
        reportError,
        resolveError,
        getRecoveryActions,
        retryOperation,
        clearErrors,
        getHealthStatus,
      }}
    >
      {children}
    </ErrorRecoveryContext.Provider>
  )
}

async function sendToMonitoring(errorInfo: ErrorInfo): Promise<void> {
  try {
    await fetch('/api/monitoring/errors', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Session-ID': errorInfo.sessionId || 'unknown',
      },
      body: JSON.stringify({
        errorId: errorInfo.id,
        message: errorInfo.error.message,
        stack: errorInfo.error.stack,
        context: errorInfo.context,
        timestamp: errorInfo.timestamp.toISOString(),
        url: errorInfo.url,
        userAgent: errorInfo.userAgent,
      }),
    })
  } catch {
    // Silently fail monitoring - don't create error loops
    console.warn('Failed to send error to monitoring service')
  }
}

export function useErrorRecovery() {
  const context = useContext(ErrorRecoveryContext)
  if (!context) {
    throw new Error('useErrorRecovery must be used within ErrorRecoveryProvider')
  }
  return context
}
