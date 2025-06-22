/**
 * Simple integration tests for working components
 * These tests focus on components that work well without complex dependencies
 */

import React from 'react'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'

// Import simple UI components that don't require complex mocking
import { Button } from '../../components/ui/button'
import { Badge } from '../../components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'

// Mock only essential external dependencies
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
  useSearchParams: () => ({
    get: jest.fn(),
  }),
}))

describe('Simple Component Integration Tests', () => {
  describe('Button Component', () => {
    it('renders with default props', () => {
      render(<Button>Click me</Button>)

      const button = screen.getByRole('button', { name: /click me/i })
      expect(button).toBeInTheDocument()
      expect(button).toHaveClass('inline-flex', 'items-center')
    })

    it('renders with different variants', () => {
      const { rerender } = render(<Button variant="default">Default</Button>)
      expect(screen.getByRole('button')).toHaveClass('bg-primary')

      rerender(<Button variant="secondary">Secondary</Button>)
      expect(screen.getByRole('button')).toHaveClass('bg-secondary')

      rerender(<Button variant="outline">Outline</Button>)
      expect(screen.getByRole('button')).toHaveClass('border')
    })

    it('renders with different sizes', () => {
      const { rerender } = render(<Button size="sm">Small</Button>)
      expect(screen.getByRole('button')).toHaveClass('h-9', 'px-3')

      rerender(<Button size="lg">Large</Button>)
      expect(screen.getByRole('button')).toHaveClass('h-11', 'px-8')
    })

    it('handles disabled state', () => {
      render(<Button disabled>Disabled</Button>)

      const button = screen.getByRole('button')
      expect(button).toBeDisabled()
      expect(button).toHaveClass('disabled:pointer-events-none', 'disabled:opacity-50')
    })
  })

  describe('Badge Component', () => {
    it('renders with default props', () => {
      render(<Badge>New</Badge>)

      const badge = screen.getByText('New')
      expect(badge).toBeInTheDocument()
      expect(badge).toHaveClass('badge')
    })

    it('renders with different variants and colors', () => {
      const { rerender } = render(<Badge color="primary">Primary</Badge>)
      expect(screen.getByText('Primary')).toHaveClass('badge-primary')

      rerender(<Badge variant="secondary">Secondary</Badge>)
      expect(screen.getByText('Secondary')).toHaveClass('badge-secondary')

      rerender(<Badge variant="outline">Outline</Badge>)
      expect(screen.getByText('Outline')).toHaveClass('badge-outline')
    })

    it('renders with different sizes', () => {
      const { rerender } = render(<Badge size="sm">Small</Badge>)
      expect(screen.getByText('Small')).toHaveClass('badge-sm')

      rerender(<Badge size="lg">Large</Badge>)
      expect(screen.getByText('Large')).toHaveClass('badge-lg')
    })
  })

  describe('Card Component', () => {
    it('renders complete card structure', () => {
      render(
        <Card>
          <CardHeader>
            <CardTitle>Test Card</CardTitle>
          </CardHeader>
          <CardContent>
            <p>This is card content</p>
          </CardContent>
        </Card>
      )

      expect(screen.getByText('Test Card')).toBeInTheDocument()
      expect(screen.getByText('This is card content')).toBeInTheDocument()

      // Check CSS classes are applied
      const card = screen.getByText('Test Card').closest('.card')
      expect(card).toHaveClass('card')
    })

    it('renders card with custom className', () => {
      render(
        <Card className="custom-card">
          <CardContent>Content</CardContent>
        </Card>
      )

      const card = screen.getByText('Content').closest('.card')
      expect(card).toHaveClass('card', 'custom-card')
    })
  })

  describe('Component Composition', () => {
    it('renders components together correctly', () => {
      render(
        <Card>
          <CardHeader>
            <CardTitle>
              Movie Card
              <Badge color="primary" className="ml-2">
                New
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p>A great movie to watch</p>
            <Button variant="default" size="sm">
              Add to Watchlist
            </Button>
          </CardContent>
        </Card>
      )

      // All components should render together
      expect(screen.getByText('Movie Card')).toBeInTheDocument()
      expect(screen.getByText('New')).toBeInTheDocument()
      expect(screen.getByText('A great movie to watch')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /add to watchlist/i })).toBeInTheDocument()

      // Check proper nesting and classes
      const badge = screen.getByText('New')
      const button = screen.getByRole('button')

      expect(badge).toHaveClass('badge-primary')
      expect(button).toHaveClass('bg-primary', 'h-9')
    })
  })

  describe('Accessibility', () => {
    it('maintains proper ARIA attributes', () => {
      render(
        <div>
          <Button aria-label="Close dialog">×</Button>
          <Badge role="status" aria-live="polite">
            3 items
          </Badge>
        </div>
      )

      const button = screen.getByLabelText('Close dialog')
      const badge = screen.getByRole('status')

      expect(button).toHaveAttribute('aria-label', 'Close dialog')
      expect(badge).toHaveAttribute('aria-live', 'polite')
    })

    it('supports keyboard navigation', () => {
      render(
        <div>
          <Button>First</Button>
          <Button>Second</Button>
        </div>
      )

      const buttons = screen.getAllByRole('button')

      // Buttons should be focusable (they don't need explicit tabindex)
      buttons.forEach(button => {
        expect(button).not.toHaveAttribute('tabindex', '-1')
        expect(button.tagName).toBe('BUTTON')
      })
    })
  })

  describe('Performance', () => {
    it('renders multiple components efficiently', () => {
      const startTime = performance.now()

      render(
        <div>
          {Array.from({ length: 50 }, (_, i) => (
            <Card key={i}>
              <CardHeader>
                <CardTitle>
                  Movie {i + 1}
                  <Badge color="primary">HD</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Button size="sm">Watch Now</Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )

      const endTime = performance.now()
      const renderTime = endTime - startTime

      // Should render 50 cards quickly (under 100ms)
      expect(renderTime).toBeLessThan(100)

      // All cards should be present
      expect(screen.getAllByText(/Movie \d+/)).toHaveLength(50)
      expect(screen.getAllByText('HD')).toHaveLength(50)
      expect(screen.getAllByText('Watch Now')).toHaveLength(50)
    })
  })
})
