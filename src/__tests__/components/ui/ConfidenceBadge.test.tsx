/**
 * ConfidenceBadge Component Tests
 * Enhanced tests to improve coverage
 */

import React from 'react'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { ConfidenceBadge } from '@/components/ui/ConfidenceBadge'
import { RecommendationExplanation } from '@/types/explanation'

const createMockExplanation = (confidence_score: number, discovery_factor: 'safe' | 'stretch' | 'adventure' = 'safe'): RecommendationExplanation => ({
  primary_reason: 'Test recommendation reason',
  explanation_type: 'similarity',
  confidence_score,
  discovery_factor,
  supporting_movies: ['Movie 1', 'Movie 2']
})

describe('ConfidenceBadge', () => {
  it('should render high confidence correctly', () => {
    const explanation = createMockExplanation(95)
    render(<ConfidenceBadge explanation={explanation} />)
    
    expect(screen.getByText('95%')).toBeInTheDocument()
    expect(screen.getByText('95%')).toHaveClass('bg-success')
  })

  it('should render medium confidence with stretch discovery factor', () => {
    const explanation = createMockExplanation(75, 'stretch')
    render(<ConfidenceBadge explanation={explanation} />)
    
    expect(screen.getByText('75%')).toBeInTheDocument()
    expect(screen.getByText('75%')).toHaveClass('bg-warning')
  })

  it('should render low confidence with adventure discovery factor', () => {
    const explanation = createMockExplanation(45, 'adventure')
    render(<ConfidenceBadge explanation={explanation} />)
    
    expect(screen.getByText('45%')).toBeInTheDocument()
    expect(screen.getByText('45%')).toHaveClass('bg-error')
  })

  it('should handle safe discovery factor styling', () => {
    const explanation = createMockExplanation(85, 'safe')
    render(<ConfidenceBadge explanation={explanation} />)
    
    const badge = screen.getByText('85%')
    expect(badge).toHaveClass('bg-success')
    expect(badge).toHaveClass('text-success-content')
  })

  it('should handle stretch discovery factor styling', () => {
    const explanation = createMockExplanation(65, 'stretch')
    render(<ConfidenceBadge explanation={explanation} />)
    
    const badge = screen.getByText('65%')
    expect(badge).toHaveClass('bg-warning')
    expect(badge).toHaveClass('text-warning-content')
  })

  it('should handle adventure discovery factor styling', () => {
    const explanation = createMockExplanation(35, 'adventure')
    render(<ConfidenceBadge explanation={explanation} />)
    
    const badge = screen.getByText('35%')
    expect(badge).toHaveClass('bg-error')
    expect(badge).toHaveClass('text-error-content')
  })

  it('should have proper accessibility attributes', () => {
    const explanation = createMockExplanation(85, 'safe')
    render(<ConfidenceBadge explanation={explanation} />)
    
    const badge = screen.getByText('85%')
    expect(badge).toHaveAttribute('aria-label', '85% match (safe)')
    expect(badge).toHaveAttribute('title', 'safe')
  })

  it('should accept custom className', () => {
    const explanation = createMockExplanation(90, 'safe')
    render(<ConfidenceBadge explanation={explanation} className="custom-class" />)
    
    const badge = screen.getByText('90%')
    expect(badge).toHaveClass('custom-class')
  })

  it('should have consistent base styling', () => {
    const explanation = createMockExplanation(70, 'stretch')
    render(<ConfidenceBadge explanation={explanation} />)
    
    const badge = screen.getByText('70%')
    expect(badge).toHaveClass('rounded-full')
    expect(badge).toHaveClass('px-2')
    expect(badge).toHaveClass('py-0.5')
    expect(badge).toHaveClass('text-xs')
    expect(badge).toHaveClass('font-semibold')
    expect(badge).toHaveClass('opacity-90')
  })

  it('should handle all discovery factors correctly', () => {
    const factors = ['safe', 'stretch', 'adventure'] as const
    const expectedClasses = ['bg-success', 'bg-warning', 'bg-error']
    
    factors.forEach((factor, index) => {
      const explanation = createMockExplanation(60, factor)
      const { unmount } = render(<ConfidenceBadge explanation={explanation} />)
      
      const badge = screen.getByText('60%')
      expect(badge).toHaveClass(expectedClasses[index]!)
      expect(badge).toHaveAttribute('title', factor)
      
      unmount()
    })
  })

  it('should handle edge cases of confidence scores', () => {
    const edgeCases = [0, 1, 50, 99, 100]
    
    edgeCases.forEach((score) => {
      const explanation = createMockExplanation(score)
      const { unmount } = render(<ConfidenceBadge explanation={explanation} />)
      
      expect(screen.getByText(`${score}%`)).toBeInTheDocument()
      
      unmount()
    })
  })

  it('should render with proper semantic structure', () => {
    const explanation = createMockExplanation(88, 'safe')
    render(<ConfidenceBadge explanation={explanation} />)
    
    const badge = screen.getByText('88%')
    expect(badge.tagName).toBe('DIV')
  })

  it('should combine custom classes with default classes', () => {
    const explanation = createMockExplanation(95, 'safe')
    render(<ConfidenceBadge explanation={explanation} className="my-custom-class extra-class" />)
    
    const badge = screen.getByText('95%')
    expect(badge.className).toContain('my-custom-class')
    expect(badge.className).toContain('extra-class')
    expect(badge.className).toContain('rounded-full') // Should still have default classes
  })

  it('should display discovery factor information correctly', () => {
    const explanation = createMockExplanation(77, 'stretch')
    render(<ConfidenceBadge explanation={explanation} />)
    
    const badge = screen.getByText('77%')
    expect(badge).toHaveAttribute('aria-label', '77% match (stretch)')
    expect(badge).toHaveAttribute('title', 'stretch')
  })
}) 