/**
 * Utility Functions Tests
 * Tests for various utility functions to improve test coverage
 */

import { cn } from '@/lib/utils'

describe('Utility Functions', () => {
  describe('cn (className utility)', () => {
    it('should combine class names correctly', () => {
      const result = cn('base-class', 'additional-class')
      expect(result).toContain('base-class')
      expect(result).toContain('additional-class')
    })

    it('should handle conditional classes', () => {
      const result = cn('base-class', true && 'conditional-class', false && 'hidden-class')
      expect(result).toContain('base-class')
      expect(result).toContain('conditional-class')
      expect(result).not.toContain('hidden-class')
    })

    it('should handle undefined and null values', () => {
      const result = cn('base-class', undefined, null, 'valid-class')
      expect(result).toContain('base-class')
      expect(result).toContain('valid-class')
    })

    it('should merge Tailwind classes correctly', () => {
      // Test that tailwind-merge properly handles conflicting classes
      const result = cn('p-2', 'p-4') // Should keep only p-4
      expect(result).toContain('p-4')
      expect(result).not.toContain('p-2')
    })

    it('should handle empty inputs', () => {
      const result = cn()
      expect(typeof result).toBe('string')
      expect(result.length).toBeGreaterThanOrEqual(0)
    })

    it('should handle arrays of classes', () => {
      const result = cn(['class1', 'class2'], 'class3')
      expect(result).toContain('class1')
      expect(result).toContain('class2')
      expect(result).toContain('class3')
    })

    it('should handle objects with boolean values', () => {
      const result = cn({
        'active': true,
        'disabled': false,
        'visible': true
      })
      expect(result).toContain('active')
      expect(result).toContain('visible')
      expect(result).not.toContain('disabled')
    })

    it('should handle mixed types correctly', () => {
      const result = cn(
        'base',
        ['array1', 'array2'],
        { 'object-true': true, 'object-false': false },
        'string-class',
        undefined,
        null
      )
      expect(result).toContain('base')
      expect(result).toContain('array1')
      expect(result).toContain('array2')
      expect(result).toContain('object-true')
      expect(result).toContain('string-class')
      expect(result).not.toContain('object-false')
    })
  })
}) 