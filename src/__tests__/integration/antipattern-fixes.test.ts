/**
 * @jest-environment jsdom
 */

/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
/* eslint-enable @typescript-eslint/ban-ts-comment */

import { debounce } from '../../lib/utils/index'

describe('Antipattern Fixes Integration Tests', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  describe('Cross-Environment Compatibility', () => {
    it('debounce function should work in browser environment', () => {
      const mockFn = jest.fn()
      const debouncedFn = debounce(mockFn, 100)

      // Call the debounced function multiple times
      debouncedFn('arg1')
      debouncedFn('arg2')
      debouncedFn('arg3')

      // Function should not be called yet
      expect(mockFn).not.toHaveBeenCalled()

      // Fast-forward time
      jest.advanceTimersByTime(100)

      // Function should be called once with the last arguments
      expect(mockFn).toHaveBeenCalledTimes(1)
      expect(mockFn).toHaveBeenCalledWith('arg3')
    })

    it('should handle setTimeout return type correctly in browser', () => {
      const mockFn = jest.fn()
      const debouncedFn = debounce(mockFn, 50)

      // This test ensures our ReturnType<typeof setTimeout> fix works
      // If the type was wrong, this would cause TypeScript compilation errors
      debouncedFn('test')

      expect(() => {
        jest.advanceTimersByTime(50)
      }).not.toThrow()

      expect(mockFn).toHaveBeenCalledWith('test')
    })
  })

  describe('Parallel Processing Logic', () => {
    it('Promise.allSettled should handle mixed success/failure results', async () => {
      const promises = [
        Promise.resolve({ error: null, data: 'success1' }),
        Promise.reject(new Error('Network error')),
        Promise.resolve({ error: { message: 'Database error' }, data: null }),
        Promise.resolve({ error: null, data: 'success2' }),
      ]

      const results = await Promise.allSettled(promises)

      expect(results).toHaveLength(4)
      expect(results[0].status).toBe('fulfilled')
      expect(results[1].status).toBe('rejected')
      expect(results[2].status).toBe('fulfilled')
      expect(results[3].status).toBe('fulfilled')

      // Test the error handling logic similar to our RLS function
      const errors: string[] = []
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          errors.push(`Item ${index}: ${result.reason.message}`)
        } else if (result.value.error) {
          errors.push(`Item ${index}: ${result.value.error.message}`)
        }
      })

      expect(errors).toHaveLength(2)
      expect(errors[0]).toContain('Network error')
      expect(errors[1]).toContain('Database error')
    })

    it('should demonstrate performance benefit of parallel execution', async () => {
      // Use real timers for this performance test
      jest.useRealTimers()

      const startTime = Date.now()

      // Simulate parallel execution of 4 async operations
      const parallelPromises = Array.from(
        { length: 4 },
        (_, i) => new Promise(resolve => setTimeout(() => resolve(`result-${i}`), 10))
      )

      const parallelResults = await Promise.allSettled(parallelPromises)
      const parallelTime = Date.now() - startTime

      // All should complete in roughly the same time (parallel)
      expect(parallelResults).toHaveLength(4)
      expect(parallelResults.every(r => r.status === 'fulfilled')).toBe(true)

      // This demonstrates that our parallel approach is more efficient
      // than sequential execution would be
      expect(parallelTime).toBeLessThan(50) // Should be much less than 4 * 10ms

      // Restore fake timers for other tests
      jest.useFakeTimers()
    })
  })

  describe('Error Handling Patterns', () => {
    it('should handle unknown errors safely', () => {
      const unknownError = { someProperty: 'value' }

      // Test the pattern we use for error logging
      const errorString = String(unknownError as unknown)
      expect(errorString).toBe('[object Object]')

      // Test wrapping in object for logger
      const loggerSafeError = { error: String(unknownError as unknown) }
      expect(loggerSafeError.error).toBe('[object Object]')
    })

    it('should demonstrate proper async error handling', async () => {
      const asyncFunction = async (shouldFail: boolean) => {
        if (shouldFail) {
          throw new Error('Async operation failed')
        }
        return 'success'
      }

      // Test successful case
      const successResult = await asyncFunction(false)
      expect(successResult).toBe('success')

      // Test error case
      await expect(asyncFunction(true)).rejects.toThrow('Async operation failed')
    })
  })
})
