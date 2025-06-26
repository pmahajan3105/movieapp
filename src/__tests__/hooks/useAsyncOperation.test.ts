import { renderHook, act, waitFor } from '@testing-library/react'
import { useAsyncOperation } from '@/hooks/useAsyncOperation'

// Mock successful promise
const successfulPromise = () => Promise.resolve('Success')

// Mock failing promise
const failingPromise = () => Promise.reject(new Error('Failure'))

describe('useAsyncOperation', () => {
  it('should return the initial state correctly', () => {
    const { result } = renderHook(() => useAsyncOperation())

    expect(result.current.isLoading).toBe(false)
    expect(result.current.data).toBeNull()
    expect(result.current.error).toBeNull()
  })

  it('should set isLoading to true when the operation starts', () => {
    const { result } = renderHook(() => useAsyncOperation())

    act(() => {
      result.current.execute(successfulPromise)
    })

    expect(result.current.isLoading).toBe(true)
  })

  it('should set data on successful execution', async () => {
    const { result } = renderHook(() => useAsyncOperation<string>())

    act(() => {
      result.current.execute(successfulPromise)
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
      expect(result.current.data).toBe('Success')
      expect(result.current.error).toBeNull()
    })
  })

  it('should set error on failed execution', async () => {
    const { result } = renderHook(() => useAsyncOperation())

    act(() => {
      result.current.execute(failingPromise)
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
      expect(result.current.data).toBeNull()
      expect(result.current.error).toBe('Failure')
    })
  })

  it('should reset error state before a new execution', async () => {
    const { result } = renderHook(() => useAsyncOperation())

    // First execution fails
    act(() => {
      result.current.execute(failingPromise)
    })
    await waitFor(() => {
      expect(result.current.error).toBe('Failure')
    })

    // Second execution succeeds
    act(() => {
      result.current.execute(successfulPromise)
    })
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
      expect(result.current.data).toBe('Success')
      expect(result.current.error).toBeNull()
    })
  })
})
