import { useState, useCallback } from 'react'

export interface AsyncOperationState<T = unknown> {
  isLoading: boolean
  error: string | null
  data: T | null
}

export interface AsyncOperationActions {
  setError: (error: string | null) => void
  clearError: () => void
  reset: () => void
}

export interface UseAsyncOperationReturn<T = unknown>
  extends AsyncOperationState<T>,
    AsyncOperationActions {
  execute: <Args extends unknown[]>(
    asyncFn: (...args: Args) => Promise<T>,
    ...args: Args
  ) => Promise<T | null>
}

/**
 * A comprehensive hook to manage async operations with loading, error, and data states.
 * Consolidates the duplicate loading state patterns found across 20+ components.
 *
 * @example
 * ```tsx
 * const { isLoading, error, data, execute, setError } = useAsyncOperation<User>()
 *
 * const handleLogin = async (email: string) => {
 *   await execute(async () => {
 *     const response = await fetch('/api/auth/login', {
 *       method: 'POST',
 *       body: JSON.stringify({ email })
 *     })
 *     return response.json()
 *   })
 * }
 * ```
 */
export function useAsyncOperation<T = unknown>(
  initialData: T | null = null
): UseAsyncOperationReturn<T> {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<T | null>(initialData)

  const execute = useCallback(
    async <Args extends unknown[]>(
      asyncFn: (...args: Args) => Promise<T>,
      ...args: Args
    ): Promise<T | null> => {
      setIsLoading(true)
      setError(null)

      try {
        const result = await asyncFn(...args)
        setData(result)
        return result
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred'
        setError(errorMessage)
        return null
      } finally {
        setIsLoading(false)
      }
    },
    []
  )

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const reset = useCallback(() => {
    setIsLoading(false)
    setError(null)
    setData(initialData)
  }, [initialData])

  return {
    isLoading,
    error,
    data,
    execute,
    setError,
    clearError,
    reset,
  }
}

/**
 * A simpler version for operations that don't need to track data,
 * just loading and error states (like form submissions, delete operations)
 */
export function useAsyncAction(): Omit<UseAsyncOperationReturn<void>, 'data'> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { data, ...rest } = useAsyncOperation<void>()
  return rest
}
