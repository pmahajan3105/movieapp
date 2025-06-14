/**
 * @jest-environment jsdom
 */

import React from 'react'
import { render } from '@testing-library/react'
import { MovieCardSkeleton, MovieGridSkeleton } from '@/components/movies/MovieCardSkeleton'

describe('MovieCardSkeleton Component - Tier 1 UI Polish', () => {
  it('should render movie card skeleton structure', () => {
    render(<MovieCardSkeleton />)

    // Should have main card container
    const container = document.querySelector('.card')
    expect(container).toBeInTheDocument()
  })

  it('should render poster skeleton with correct aspect ratio', () => {
    render(<MovieCardSkeleton />)

    // Should have poster skeleton with aspect ratio
    const posterContainer = document.querySelector('.aspect-\\[2\\/3\\]')
    expect(posterContainer).toBeInTheDocument()
  })

  it('should render title skeleton', () => {
    render(<MovieCardSkeleton />)

    // Should have title skeleton
    const titleSkeleton = document.querySelector('.h-6')
    expect(titleSkeleton).toBeInTheDocument()
  })

  it('should render year and rating skeletons', () => {
    render(<MovieCardSkeleton />)

    // Should have year and rating skeletons
    const smallSkeletons = document.querySelectorAll('.h-4')
    expect(smallSkeletons.length).toBeGreaterThanOrEqual(2)
  })

  it('should render genre pill skeletons', () => {
    render(<MovieCardSkeleton />)

    // Should have genre pill skeletons with rounded corners
    const genreSkeletons = document.querySelectorAll('.rounded-full')
    expect(genreSkeletons.length).toBeGreaterThanOrEqual(2)
  })

  it('should render overview text skeletons', () => {
    render(<MovieCardSkeleton />)

    // Should have overview text skeletons
    const overviewSkeletons = document.querySelectorAll('.h-3')
    expect(overviewSkeletons.length).toBeGreaterThanOrEqual(3)
  })

  it('should render action button skeletons', () => {
    render(<MovieCardSkeleton />)

    // Should have action button skeletons
    const buttonSkeletons = document.querySelectorAll('.rounded-btn')
    expect(buttonSkeletons.length).toBeGreaterThanOrEqual(2)
  })

  it('should have proper card styling', () => {
    render(<MovieCardSkeleton />)

    // Should have card styling classes
    const card = document.querySelector('.card.bg-base-100.shadow-lg')
    expect(card).toBeInTheDocument()
  })

  it('should have hover effects', () => {
    render(<MovieCardSkeleton />)

    // Should have hover shadow effect
    const hoverCard = document.querySelector('.hover\\:shadow-xl')
    expect(hoverCard).toBeInTheDocument()
  })

  it('should have transition effects', () => {
    render(<MovieCardSkeleton />)

    // Should have transition classes
    const transitionCard = document.querySelector('.transition-shadow')
    expect(transitionCard).toBeInTheDocument()
  })

  it('should render with animate-pulse animation', () => {
    render(<MovieCardSkeleton />)

    // All skeleton elements should have animate-pulse
    const animatedElements = document.querySelectorAll('.animate-pulse')
    expect(animatedElements.length).toBeGreaterThan(0)
  })
})

describe('MovieGridSkeleton Component - Tier 1 UI Polish', () => {
  it('should render default number of skeleton cards', () => {
    render(<MovieGridSkeleton />)

    // Should render 12 cards by default
    const cards = document.querySelectorAll('.card')
    expect(cards).toHaveLength(12)
  })

  it('should render custom number of skeleton cards', () => {
    render(<MovieGridSkeleton count={6} />)

    // Should render 6 cards
    const cards = document.querySelectorAll('.card')
    expect(cards).toHaveLength(6)
  })

  it('should have responsive grid layout', () => {
    render(<MovieGridSkeleton />)

    // Should have responsive grid classes
    const grid = document.querySelector(
      '.grid.grid-cols-1.sm\\:grid-cols-2.md\\:grid-cols-3.lg\\:grid-cols-4.xl\\:grid-cols-5'
    )
    expect(grid).toBeInTheDocument()
  })

  it('should have proper gap between cards', () => {
    render(<MovieGridSkeleton />)

    // Should have gap-6 for spacing
    const grid = document.querySelector('.gap-6')
    expect(grid).toBeInTheDocument()
  })

  it('should render zero cards when count is 0', () => {
    render(<MovieGridSkeleton count={0} />)

    // Should render no cards
    const cards = document.querySelectorAll('.card')
    expect(cards).toHaveLength(0)
  })

  it('should handle large count numbers', () => {
    render(<MovieGridSkeleton count={50} />)

    // Should render 50 cards
    const cards = document.querySelectorAll('.card')
    expect(cards).toHaveLength(50)
  })
})
