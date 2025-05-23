import { cn } from '@/lib/utils'

describe('Utility Functions', () => {
  describe('cn function', () => {
    it('merges class names correctly', () => {
      expect(cn('class1', 'class2')).toBe('class1 class2')
    })

    it('handles conditional classes', () => {
      expect(cn('base', true && 'conditional')).toBe('base conditional')
      expect(cn('base', false && 'conditional')).toBe('base')
    })

    it('handles undefined and null values', () => {
      expect(cn('base', undefined, null)).toBe('base')
    })

    it('merges Tailwind classes correctly', () => {
      // Test that conflicting classes are properly merged
      expect(cn('px-2 py-1', 'px-4')).toBe('py-1 px-4')
    })

    it('handles empty inputs', () => {
      expect(cn()).toBe('')
      expect(cn('')).toBe('')
    })

    it('handles arrays of classes', () => {
      expect(cn(['class1', 'class2'], 'class3')).toBe('class1 class2 class3')
    })

    it('handles objects with conditional classes', () => {
      expect(cn({
        'base-class': true,
        'conditional-class': false,
        'another-class': true
      })).toBe('base-class another-class')
    })

    it('combines classes with spaces', () => {
      expect(cn('class1 class2', 'class3 class4')).toBe('class1 class2 class3 class4')
    })

    it('handles complex combinations', () => {
      const result = cn(
        'base-class',
        ['array-class1', 'array-class2'],
        {
          'conditional-true': true,
          'conditional-false': false
        },
        undefined,
        'final-class'
      )
      expect(result).toBe('base-class array-class1 array-class2 conditional-true final-class')
    })
  })
}) 