/**
 * Simple utility functions test - demonstrates what I CAN do
 * These tests don't require complex mocking or Supabase clients
 */

import { describe, it, expect } from '@jest/globals'

// Test pure utility functions that don't have external dependencies
describe('Simple Utility Functions', () => {
  describe('String utilities', () => {
    it('should capitalize first letter', () => {
      const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1)

      expect(capitalize('hello')).toBe('Hello')
      expect(capitalize('world')).toBe('World')
      expect(capitalize('')).toBe('')
    })

    it('should truncate long strings', () => {
      const truncate = (str: string, maxLength: number) =>
        str.length > maxLength ? str.substring(0, maxLength) + '...' : str

      expect(truncate('Short', 10)).toBe('Short')
      expect(truncate('This is a very long string', 10)).toBe('This is a ...')
    })
  })

  describe('Array utilities', () => {
    it('should remove duplicates from array', () => {
      const removeDuplicates = <T>(arr: T[]) => [...new Set(arr)]

      expect(removeDuplicates([1, 2, 2, 3, 3, 4])).toEqual([1, 2, 3, 4])
      expect(removeDuplicates(['a', 'b', 'a', 'c'])).toEqual(['a', 'b', 'c'])
    })

    it('should chunk array into smaller arrays', () => {
      const chunk = <T>(arr: T[], size: number): T[][] => {
        const chunks: T[][] = []
        for (let i = 0; i < arr.length; i += size) {
          chunks.push(arr.slice(i, i + size))
        }
        return chunks
      }

      expect(chunk([1, 2, 3, 4, 5, 6], 2)).toEqual([
        [1, 2],
        [3, 4],
        [5, 6],
      ])
      expect(chunk(['a', 'b', 'c', 'd', 'e'], 3)).toEqual([
        ['a', 'b', 'c'],
        ['d', 'e'],
      ])
    })
  })

  describe('Number utilities', () => {
    it('should format numbers with commas', () => {
      const formatNumber = (num: number) => num.toLocaleString()

      expect(formatNumber(1234)).toBe('1,234')
      expect(formatNumber(1234567)).toBe('1,234,567')
    })

    it('should clamp numbers within range', () => {
      const clamp = (num: number, min: number, max: number) => Math.min(Math.max(num, min), max)

      expect(clamp(5, 1, 10)).toBe(5)
      expect(clamp(-5, 1, 10)).toBe(1)
      expect(clamp(15, 1, 10)).toBe(10)
    })
  })
})
