/**
 * @jest-environment jsdom
 */

import React from 'react'
import { render } from '@testing-library/react'
import { Skeleton } from '@/components/ui/skeleton'

describe('Skeleton Component - Tier 1 UI Polish', () => {
  it('should render with default classes', () => {
    render(<Skeleton />)

    const skeleton = document.querySelector('.animate-pulse')
    expect(skeleton).toBeInTheDocument()
  })

  it('should apply custom className', () => {
    render(<Skeleton className="h-4 w-full" />)

    const skeleton = document.querySelector('.w-full.h-4')
    expect(skeleton).toBeInTheDocument()
  })

  it('should render with animate-pulse class', () => {
    render(<Skeleton />)

    const skeleton = document.querySelector('.animate-pulse')
    expect(skeleton).toBeInTheDocument()
  })

  it('should render with rounded background', () => {
    render(<Skeleton />)

    const skeleton = document.querySelector('.rounded-md')
    expect(skeleton).toBeInTheDocument()
  })

  it('should have proper background color classes', () => {
    render(<Skeleton />)

    const skeleton = document.querySelector('.bg-gray-200')
    expect(skeleton).toBeInTheDocument()
  })

  it('should have dark mode background color', () => {
    render(<Skeleton />)

    const skeleton = document.querySelector('.dark\\:bg-gray-700')
    expect(skeleton).toBeInTheDocument()
  })

  it('should merge custom classes with default classes', () => {
    render(<Skeleton className="custom-class h-20 w-20" />)

    const skeleton = document.querySelector('.custom-class')
    expect(skeleton).toBeInTheDocument()

    const animatedSkeleton = document.querySelector('.animate-pulse')
    expect(animatedSkeleton).toBeInTheDocument()
  })

  it('should render as a div element', () => {
    render(<Skeleton data-testid="skeleton-element" />)

    const skeleton = document.querySelector('[data-testid="skeleton-element"]')
    expect(skeleton?.tagName).toBe('DIV')
  })

  it('should support all HTML div attributes', () => {
    render(
      <Skeleton
        data-testid="skeleton-with-attrs"
        id="test-skeleton"
        role="presentation"
        aria-label="Loading content"
      />
    )

    const skeleton = document.querySelector('[data-testid="skeleton-with-attrs"]')
    expect(skeleton).toHaveAttribute('id', 'test-skeleton')
    expect(skeleton).toHaveAttribute('role', 'presentation')
    expect(skeleton).toHaveAttribute('aria-label', 'Loading content')
  })

  it('should handle empty className gracefully', () => {
    render(<Skeleton className="" />)

    const skeleton = document.querySelector('.animate-pulse')
    expect(skeleton).toBeInTheDocument()
  })

  it('should handle undefined className', () => {
    render(<Skeleton className={undefined} />)

    const skeleton = document.querySelector('.animate-pulse')
    expect(skeleton).toBeInTheDocument()
  })
})
