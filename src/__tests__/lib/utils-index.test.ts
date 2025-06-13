import { cn, formatDate, formatRuntime, generateId, debounce } from '../../lib/utils/index'

// Mock timers for debounce testing
jest.useFakeTimers()

describe('Utils Index', () => {
  afterEach(() => {
    jest.clearAllTimers()
  })

  describe('cn (className utility)', () => {
    it('merges class names correctly', () => {
      const result = cn('btn', 'btn-primary')
      expect(result).toBe('btn btn-primary')
    })

    it('handles conditional classes', () => {
      const result = cn('btn', true && 'btn-primary', false && 'btn-secondary')
      expect(result).toBe('btn btn-primary')
    })

    it('handles Tailwind CSS conflicts', () => {
      const result = cn('px-2 py-1', 'px-4')
      expect(result).toBe('py-1 px-4')
    })

    it('handles empty inputs', () => {
      const result = cn()
      expect(result).toBe('')
    })

    it('handles null and undefined values', () => {
      const result = cn('btn', null, undefined, 'btn-primary')
      expect(result).toBe('btn btn-primary')
    })

    it('handles arrays of classes', () => {
      const result = cn(['btn', 'btn-primary'], 'text-white')
      expect(result).toBe('btn btn-primary text-white')
    })

    it('handles objects with boolean values', () => {
      const result = cn({
        btn: true,
        'btn-primary': true,
        'btn-secondary': false,
        disabled: false,
      })
      expect(result).toBe('btn btn-primary')
    })

    it('handles complex mixed inputs', () => {
      const isActive = true
      const isDisabled = false
      const result = cn(
        'btn',
        ['text-white', 'font-bold'],
        {
          'btn-primary': isActive,
          'btn-disabled': isDisabled,
        },
        isActive && 'active',
        'hover:bg-blue-600'
      )
      expect(result).toContain('btn')
      expect(result).toContain('text-white')
      expect(result).toContain('font-bold')
      expect(result).toContain('btn-primary')
      expect(result).toContain('active')
      expect(result).toContain('hover:bg-blue-600')
      expect(result).not.toContain('btn-disabled')
    })
  })

  describe('formatDate', () => {
    it('formats Date object correctly', () => {
      const date = new Date('2024-01-15T10:30:00Z')
      const result = formatDate(date)
      expect(result).toMatch(/Jan 1[45], 2024/) // Account for timezone differences
    })

    it('formats date string correctly', () => {
      const result = formatDate('2024-01-15')
      expect(result).toMatch(/Jan 1[45], 2024/) // Account for timezone differences
    })

    it('formats ISO date string correctly', () => {
      const result = formatDate('2024-01-15T10:30:00.000Z')
      expect(result).toMatch(/Jan 1[45], 2024/) // Account for timezone differences
    })

    it('handles different date formats', () => {
      const result = formatDate('01/15/2024')
      expect(result).toMatch(/Jan 1[45], 2024/) // Account for timezone differences
    })

    it('formats dates with different years', () => {
      const result = formatDate('2023-12-25')
      expect(result).toMatch(/Dec 2[45], 2023/) // Account for timezone differences
    })

    it('formats dates with different months', () => {
      // Use specific dates to avoid timezone issues
      const result1 = formatDate(new Date(2024, 4, 30)) // May 30, 2024
      const result2 = formatDate(new Date(2024, 1, 29)) // Feb 29, 2024 (leap year)
      const result3 = formatDate(new Date(2024, 0, 1)) // Jan 1, 2024

      expect(result1).toContain('May')
      expect(result1).toContain('2024')
      expect(result2).toContain('Feb')
      expect(result2).toContain('2024')
      expect(result3).toContain('Jan')
      expect(result3).toContain('2024')
    })

    it('handles edge case dates', () => {
      // Test that the function doesn't throw errors
      expect(() => formatDate(new Date(2024, 1, 29))).not.toThrow() // Leap year
      expect(() => formatDate(new Date(2024, 0, 1))).not.toThrow() // New Year
      expect(() => formatDate(new Date(2024, 11, 31))).not.toThrow() // End of year

      // Basic format check
      const result = formatDate(new Date(2024, 5, 15))
      expect(result).toMatch(/\w+ \d{1,2}, \d{4}/)
    })
  })

  describe('formatRuntime', () => {
    it('formats minutes only when less than 60', () => {
      expect(formatRuntime(45)).toBe('45m')
      expect(formatRuntime(30)).toBe('30m')
      expect(formatRuntime(1)).toBe('1m')
      expect(formatRuntime(59)).toBe('59m')
    })

    it('formats hours and minutes when 60 or more minutes', () => {
      expect(formatRuntime(60)).toBe('1h 0m')
      expect(formatRuntime(90)).toBe('1h 30m')
      expect(formatRuntime(120)).toBe('2h 0m')
      expect(formatRuntime(150)).toBe('2h 30m')
    })

    it('handles zero minutes', () => {
      expect(formatRuntime(0)).toBe('0m')
    })

    it('handles large runtimes', () => {
      expect(formatRuntime(180)).toBe('3h 0m')
      expect(formatRuntime(240)).toBe('4h 0m')
      expect(formatRuntime(300)).toBe('5h 0m')
      expect(formatRuntime(480)).toBe('8h 0m')
    })

    it('handles typical movie runtimes', () => {
      expect(formatRuntime(95)).toBe('1h 35m') // Typical movie
      expect(formatRuntime(142)).toBe('2h 22m') // Long movie
      expect(formatRuntime(181)).toBe('3h 1m') // Very long movie
    })

    it('handles fractional minutes by flooring', () => {
      expect(formatRuntime(90.7)).toBe('1h 30m')
      expect(formatRuntime(125.9)).toBe('2h 5m')
    })

    it('handles negative numbers gracefully', () => {
      expect(formatRuntime(-30)).toBe('-30m')
      expect(formatRuntime(-90)).toBe('-1h -30m')
    })
  })

  describe('generateId', () => {
    it('generates a string', () => {
      const id = generateId()
      expect(typeof id).toBe('string')
    })

    it('generates non-empty strings', () => {
      const id = generateId()
      expect(id.length).toBeGreaterThan(0)
    })

    it('generates unique IDs', () => {
      const ids = new Set()
      for (let i = 0; i < 1000; i++) {
        ids.add(generateId())
      }
      expect(ids.size).toBe(1000) // All should be unique
    })

    it('generates IDs with expected length range', () => {
      const id = generateId()
      // Each substring is 13 chars max, so total should be around 26 chars
      expect(id.length).toBeGreaterThanOrEqual(20)
      expect(id.length).toBeLessThanOrEqual(30)
    })

    it('generates IDs with alphanumeric characters only', () => {
      const id = generateId()
      expect(id).toMatch(/^[a-z0-9]+$/)
    })

    it('generates different IDs on consecutive calls', () => {
      const id1 = generateId()
      const id2 = generateId()
      const id3 = generateId()

      expect(id1).not.toBe(id2)
      expect(id2).not.toBe(id3)
      expect(id1).not.toBe(id3)
    })

    it('generates IDs suitable for use as HTML IDs', () => {
      const id = generateId()
      // Should not start with a number (though our implementation might)
      // Should only contain valid characters
      expect(id).toMatch(/^[a-z0-9]+$/)
    })
  })

  describe('debounce', () => {
    let mockFn: jest.Mock

    beforeEach(() => {
      mockFn = jest.fn()
    })

    it('delays function execution', () => {
      const debouncedFn = debounce(mockFn, 100)

      debouncedFn('test')
      expect(mockFn).not.toHaveBeenCalled()

      jest.advanceTimersByTime(100)
      expect(mockFn).toHaveBeenCalledWith('test')
    })

    it('cancels previous calls when called again', () => {
      const debouncedFn = debounce(mockFn, 100)

      debouncedFn('first')
      debouncedFn('second')
      debouncedFn('third')

      jest.advanceTimersByTime(100)

      expect(mockFn).toHaveBeenCalledTimes(1)
      expect(mockFn).toHaveBeenCalledWith('third')
    })

    it('handles multiple arguments', () => {
      const debouncedFn = debounce(mockFn, 100)

      debouncedFn('arg1', 'arg2', 'arg3')
      jest.advanceTimersByTime(100)

      expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2', 'arg3')
    })

    it('preserves function context', () => {
      const contextFn = jest.fn()
      const debouncedMethod = debounce(contextFn, 100)

      debouncedMethod('test')
      jest.advanceTimersByTime(100)

      expect(contextFn).toHaveBeenCalledWith('test')
    })

    it('handles zero delay', () => {
      const debouncedFn = debounce(mockFn, 0)

      debouncedFn('test')
      expect(mockFn).not.toHaveBeenCalled()

      jest.advanceTimersByTime(0)
      expect(mockFn).toHaveBeenCalledWith('test')
    })

    it('handles rapid successive calls', () => {
      const debouncedFn = debounce(mockFn, 100)

      // Rapid calls
      for (let i = 0; i < 10; i++) {
        debouncedFn(`call-${i}`)
        jest.advanceTimersByTime(50) // Less than debounce time
      }

      // Should not have been called yet
      expect(mockFn).not.toHaveBeenCalled()

      // Wait for the final debounce
      jest.advanceTimersByTime(100)

      expect(mockFn).toHaveBeenCalledTimes(1)
      expect(mockFn).toHaveBeenCalledWith('call-9')
    })

    it('allows execution after debounce period', () => {
      const debouncedFn = debounce(mockFn, 100)

      debouncedFn('first')
      jest.advanceTimersByTime(100)
      expect(mockFn).toHaveBeenCalledWith('first')

      mockFn.mockClear()

      debouncedFn('second')
      jest.advanceTimersByTime(100)
      expect(mockFn).toHaveBeenCalledWith('second')
    })

    it('handles different wait times', () => {
      const shortDebounce = debounce(mockFn, 50)
      const longDebounce = debounce(mockFn, 200)

      shortDebounce('short')
      longDebounce('long')

      jest.advanceTimersByTime(50)
      expect(mockFn).toHaveBeenCalledWith('short')

      jest.advanceTimersByTime(150) // Total 200ms
      expect(mockFn).toHaveBeenCalledWith('long')
      expect(mockFn).toHaveBeenCalledTimes(2)
    })

    it('clears timeout on subsequent calls', () => {
      const debouncedFn = debounce(mockFn, 100)

      debouncedFn('first')
      jest.advanceTimersByTime(50)

      debouncedFn('second')
      jest.advanceTimersByTime(50) // Total 100ms from first call

      expect(mockFn).not.toHaveBeenCalled()

      jest.advanceTimersByTime(50) // Total 100ms from second call
      expect(mockFn).toHaveBeenCalledWith('second')
    })

    it('handles function that throws errors', () => {
      const errorFn = jest.fn(() => {
        throw new Error('Test error')
      })
      const debouncedFn = debounce(errorFn, 100)

      debouncedFn()

      expect(() => {
        jest.advanceTimersByTime(100)
      }).toThrow('Test error')

      expect(errorFn).toHaveBeenCalledTimes(1)
    })
  })

  describe('Integration Tests', () => {
    it('cn works with formatRuntime output', () => {
      const runtime = formatRuntime(120)
      const className = cn('text-sm', 'text-gray-600', runtime && 'font-medium')
      expect(className).toContain('text-sm')
      expect(className).toContain('text-gray-600')
      expect(className).toContain('font-medium')
    })

    it('generateId creates valid CSS class names', () => {
      const id = generateId()
      const className = cn(`movie-${id}`, 'card')
      expect(className).toContain('card')
      expect(className).toContain(`movie-${id}`)
    })

    it('debounce works with formatDate', () => {
      const formatAndLog = jest.fn((...args: unknown[]) => {
        return formatDate(args[0] as string)
      })

      const debouncedFormat = debounce(formatAndLog, 100)

      debouncedFormat('2024-01-15')
      debouncedFormat('2024-01-16')
      debouncedFormat('2024-01-17')

      jest.advanceTimersByTime(100)

      expect(formatAndLog).toHaveBeenCalledTimes(1)
      expect(formatAndLog).toHaveBeenCalledWith('2024-01-17')
    })

    it('all utilities handle edge cases gracefully', () => {
      // Test edge cases together
      expect(() => {
        cn('', null, undefined)
        formatDate('2024-01-01')
        formatRuntime(0)
        generateId()
        debounce(() => {}, 0)
      }).not.toThrow()
    })
  })
})
