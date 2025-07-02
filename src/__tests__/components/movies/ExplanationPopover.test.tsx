import React from 'react'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { ExplanationPopover } from '@/components/movies/ExplanationPopover'
import { RecommendationExplanation } from '@/types/explanation'

const mockExplanation: RecommendationExplanation = {
  primary_reason: 'You enjoyed similar sci-fi movies with strong character development',
  explanation_type: 'similarity',
  confidence_score: 85,
  discovery_factor: 'safe',
  supporting_movies: ['Blade Runner 2049', 'Ex Machina', 'Her'],
  optimal_viewing_time: 'Evening (after 8pm)'
}

const minimalExplanation: RecommendationExplanation = {
  primary_reason: 'Basic recommendation',
  explanation_type: 'pattern',
  confidence_score: 70,
  discovery_factor: 'stretch'
}

describe('ExplanationPopover', () => {
  it('renders primary reason', () => {
    render(<ExplanationPopover explanation={mockExplanation} />)
    expect(screen.getByText('You enjoyed similar sci-fi movies with strong character development')).toBeInTheDocument()
  })

  it('renders supporting movies when provided', () => {
    render(<ExplanationPopover explanation={mockExplanation} />)
    expect(screen.getByText('Because you liked:')).toBeInTheDocument()
    expect(screen.getByText('Blade Runner 2049')).toBeInTheDocument()
    expect(screen.getByText('Ex Machina')).toBeInTheDocument()
    expect(screen.getByText('Her')).toBeInTheDocument()
  })

  it('does not render supporting movies section when empty', () => {
    render(<ExplanationPopover explanation={minimalExplanation} />)
    expect(screen.queryByText('Because you liked:')).not.toBeInTheDocument()
  })

  it('renders optimal viewing time when provided', () => {
    render(<ExplanationPopover explanation={mockExplanation} />)
    expect(screen.getByText('💡 Evening (after 8pm)')).toBeInTheDocument()
  })

  it('does not render optimal viewing time when not provided', () => {
    render(<ExplanationPopover explanation={minimalExplanation} />)
    expect(screen.queryByText(/💡/)).not.toBeInTheDocument()
  })

  it('applies correct styling classes', () => {
    const { container } = render(<ExplanationPopover explanation={mockExplanation} />)
    const card = container.firstChild
    expect(card).toHaveClass('p-3', 'w-64', 'text-sm', 'shadow-md')
  })

  it('handles missing optional fields gracefully', () => {
    const explanationWithoutOptionals: RecommendationExplanation = {
      primary_reason: 'Simple recommendation',
      explanation_type: 'mood',
      confidence_score: 60,
      discovery_factor: 'adventure'
    }
    
    render(<ExplanationPopover explanation={explanationWithoutOptionals} />)
    expect(screen.getByText('Simple recommendation')).toBeInTheDocument()
    expect(screen.queryByText('Because you liked:')).not.toBeInTheDocument()
    expect(screen.queryByText(/💡/)).not.toBeInTheDocument()
  })
}) 