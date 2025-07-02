'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useErrorRecovery } from '@/contexts/ErrorRecoveryContext'
import { useNetworkStatus } from '@/hooks/useNetworkStatus'

interface RetryOptions {
  maxRetries?: number
  baseDelay?: number
  maxDelay?: number
  exponentialBase?: number
  jitter?: boolean
  retryCondition?: (error: Error, attemptCount: number) => boolean
  onRetry?: (attemptCount: number, error: Error) => void
  onMaxRetriesReached?: (error: Error) => void
}

interface RetryState {
  isRetrying: boolean
  attemptCount: number
  lastError: Error | null
  nextRetryIn: number
}

const defaultRetryOptions: Required<RetryOptions> = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 30000,
  exponentialBase: 2,
  jitter: true,
  retryCondition: (error: Error) => {
    // Retry on network errors, timeouts, and server errors
    return error.message.includes('network') ||
           error.message.includes('timeout') ||
           error.message.includes('503') ||
           error.message.includes('502') ||
           error.message.includes('500')
  },
  onRetry: () => {},
  onMaxRetriesReached: () => {}
}

export function useRetryOperation<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
) {
  const opts = { ...defaultRetryOptions, ...options }
  const { reportError } = useErrorRecovery()
  const { isOnline } = useNetworkStatus()
  
  const [state, setState] = useState<RetryState>({
    isRetrying: false,
    attemptCount: 0,
    lastError: null,
    nextRetryIn: 0
  })

  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const countdownRef = useRef<NodeJS.Timeout | null>(null)

  const calculateDelay = useCallback((attemptCount: number): number => {
    let delay = opts.baseDelay * Math.pow(opts.exponentialBase, attemptCount)
    
    // Apply jitter to prevent thundering herd
    if (opts.jitter) {
      delay = delay * (0.5 + Math.random() * 0.5)
    }
    
    return Math.min(delay, opts.maxDelay)
  }, [opts])

  const startCountdown = useCallback((delay: number) => {
    setState(prev => ({ ...prev, nextRetryIn: Math.ceil(delay / 1000) }))
    
    const countdown = () => {
      setState(prev => {
        const newCount = prev.nextRetryIn - 1
        if (newCount > 0) {
          countdownRef.current = setTimeout(countdown, 1000)
        }
        return { ...prev, nextRetryIn: Math.max(0, newCount) }
      })
    }
    
    countdownRef.current = setTimeout(countdown, 1000)
  }, [])

  const executeWithRetry = useCallback(async (): Promise<T> => {
    setState(prev => ({ 
      ...prev, 
      isRetrying: true, 
      attemptCount: 0, 
      lastError: null,
      nextRetryIn: 0 
    }))

    // Clear any existing timeouts
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    if (countdownRef.current) {
      clearTimeout(countdownRef.current)
    }

    for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
      try {
        setState(prev => ({ ...prev, attemptCount: attempt }))
        
        // Check if we should retry (skip for first attempt)
        if (attempt > 0 && !isOnline) {
          throw new Error('No network connection available for retry')
        }

        const result = await operation()
        
        // Success - reset state
        setState({
          isRetrying: false,
          attemptCount: 0,
          lastError: null,
          nextRetryIn: 0
        })
        
        return result
        
      } catch (error) {
        const err = error as Error
        setState(prev => ({ ...prev, lastError: err }))
        
        // Report error to recovery system
        const errorId = reportError(err, `Retry attempt ${attempt + 1}/${opts.maxRetries + 1}`)
        
        // Check if we should retry
        const shouldRetry = attempt < opts.maxRetries && 
                           opts.retryCondition(err, attempt)
        
        if (!shouldRetry) {
          setState(prev => ({ ...prev, isRetrying: false }))
          opts.onMaxRetriesReached(err)
          throw err
        }
        
        // Calculate delay and notify
        const delay = calculateDelay(attempt)
        opts.onRetry(attempt + 1, err)
        
        // Start countdown for next retry
        startCountdown(delay)
        
        // Wait before retrying
        await new Promise(resolve => {
          timeoutRef.current = setTimeout(resolve, delay)
        })
      }
    }

    throw new Error('Max retries reached')
  }, [operation, opts, reportError, isOnline, calculateDelay, startCountdown])

  const cancel = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    if (countdownRef.current) {
      clearTimeout(countdownRef.current)
    }
    setState({
      isRetrying: false,
      attemptCount: 0,
      lastError: null,
      nextRetryIn: 0
    })
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      if (countdownRef.current) {
        clearTimeout(countdownRef.current)
      }
    }
  }, [])

  return {
    executeWithRetry,
    cancel,
    ...state,
    isOnline
  }
}

// Predefined retry configurations
export const RetryConfigs = {
  // For API calls
  api: {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    retryCondition: (error: Error) => 
      error.message.includes('network') ||
      error.message.includes('timeout') ||
      error.message.includes('50') // 500, 502, 503 errors
  },
  
  // For AI services (more conservative)
  aiService: {
    maxRetries: 2,
    baseDelay: 2000,
    maxDelay: 15000,
    retryCondition: (error: Error) => 
      error.message.includes('timeout') ||
      error.message.includes('503') ||
      error.message.includes('502')
  },
  
  // For critical operations
  critical: {
    maxRetries: 5,
    baseDelay: 500,
    maxDelay: 5000,
    exponentialBase: 1.5,
    retryCondition: () => true // Retry any error
  },
  
  // For background tasks
  background: {
    maxRetries: 10,
    baseDelay: 5000,
    maxDelay: 60000,
    retryCondition: (error: Error) => 
      !error.message.includes('auth') && // Don't retry auth errors
      !error.message.includes('400') // Don't retry client errors
  }
} as const