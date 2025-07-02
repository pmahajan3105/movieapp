/**
 * LoadingOverlay Component Tests
 * Tests the global loading overlay with React Query integration from Sprint 3
 */

import { render, screen } from '@testing-library/react'
import LoadingOverlay from '@/components/ui/LoadingOverlay'
import { useIsFetching } from '@tanstack/react-query'

// Mock React Query
jest.mock('@tanstack/react-query', () => ({
  useIsFetching: jest.fn()
}))

// Mock framer-motion
jest.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>
  }
}))

describe('LoadingOverlay', () => {
  const mockUseIsFetching = useIsFetching as jest.MockedFunction<typeof useIsFetching>

  beforeEach(() => {
    mockUseIsFetching.mockReset()
  })

  it('should not render when no queries are fetching', () => {
    mockUseIsFetching.mockReturnValue(0)

    render(<LoadingOverlay />)

    expect(screen.queryByText('Loading…')).not.toBeInTheDocument()
  })

  it('should render when queries are fetching', () => {
    mockUseIsFetching.mockReturnValue(1)

    render(<LoadingOverlay />)

    expect(screen.getByText('Loading…')).toBeInTheDocument()
  })

  it('should render when multiple queries are fetching', () => {
    mockUseIsFetching.mockReturnValue(3)

    render(<LoadingOverlay />)

    expect(screen.getByText('Loading…')).toBeInTheDocument()
  })

  it('should have correct CSS classes for styling', () => {
    mockUseIsFetching.mockReturnValue(1)

    render(<LoadingOverlay />)

    const overlay = screen.getByText('Loading…').parentElement
    expect(overlay).toHaveClass('fixed', 'inset-0')
    expect(overlay).toHaveClass('flex', 'flex-col', 'items-center', 'justify-center')
    expect(overlay).toHaveClass('bg-base-100/60', 'backdrop-blur-sm')
  })

  it('should contain loading spinner', () => {
    mockUseIsFetching.mockReturnValue(1)

    render(<LoadingOverlay />)

    const spinner = document.querySelector('.loading-spinner')
    expect(spinner).toBeInTheDocument()
    expect(spinner).toHaveClass('loading', 'loading-spinner', 'loading-lg', 'text-primary')
  })

  it('should have correct z-index for overlay positioning', () => {
    mockUseIsFetching.mockReturnValue(1)

    render(<LoadingOverlay />)

    const overlay = screen.getByText('Loading…').parentElement
    expect(overlay).toHaveClass('z-[1200]')
  })

  it('should render with motion props when animating', () => {
    mockUseIsFetching.mockReturnValue(1)

    render(<LoadingOverlay />)

    const overlay = screen.getByText('Loading…').parentElement
    // Motion props should be applied via our mock
    expect(overlay).toHaveAttribute('initial')
    expect(overlay).toHaveAttribute('animate')
    expect(overlay).toHaveAttribute('exit')
  })

  it('should handle rapid state changes gracefully', () => {
    mockUseIsFetching.mockReturnValue(0)
    const { rerender } = render(<LoadingOverlay />)

    expect(screen.queryByText('Loading…')).not.toBeInTheDocument()

    mockUseIsFetching.mockReturnValue(1)
    rerender(<LoadingOverlay />)

    expect(screen.getByText('Loading…')).toBeInTheDocument()

    mockUseIsFetching.mockReturnValue(0)
    rerender(<LoadingOverlay />)

    expect(screen.queryByText('Loading…')).not.toBeInTheDocument()
  })

  it('should use proper text content', () => {
    mockUseIsFetching.mockReturnValue(1)

    render(<LoadingOverlay />)

    expect(screen.getByText('Loading…')).toBeInTheDocument()
  })

  it('should not interfere with page content when not visible', () => {
    mockUseIsFetching.mockReturnValue(0)

    const { container } = render(
      <div>
        <div data-testid="page-content">Page Content</div>
        <LoadingOverlay />
      </div>
    )

    expect(screen.getByTestId('page-content')).toBeInTheDocument()
    expect(screen.queryByText('Loading…')).not.toBeInTheDocument()
    
    // No overlay elements should be rendered
    expect(container.querySelector('.loading-spinner')).not.toBeInTheDocument()
  })

  it('should cover entire viewport when visible', () => {
    mockUseIsFetching.mockReturnValue(1)

    render(<LoadingOverlay />)

    const overlay = screen.getByText('Loading…').parentElement
    expect(overlay).toHaveClass('fixed', 'inset-0')
  })

  it('should center loading content vertically and horizontally', () => {
    mockUseIsFetching.mockReturnValue(1)

    render(<LoadingOverlay />)

    const overlay = screen.getByText('Loading…').parentElement
    expect(overlay).toHaveClass('flex', 'items-center', 'justify-center')
  })

  it('should have appropriate styling for backdrop blur', () => {
    mockUseIsFetching.mockReturnValue(1)

    render(<LoadingOverlay />)

    const overlay = screen.getByText('Loading…').parentElement
    expect(overlay).toHaveClass('backdrop-blur-sm')
  })

  it('should handle edge case of negative fetching count', () => {
    // This shouldn't happen with React Query, but test defensive programming
    mockUseIsFetching.mockReturnValue(-1)

    render(<LoadingOverlay />)

    expect(screen.queryByText('Loading…')).not.toBeInTheDocument()
  })

  it('should be portal-friendly if used within modals', () => {
    mockUseIsFetching.mockReturnValue(1)

    // Test that it can be rendered without causing layout issues
    const { container } = render(
      <div data-testid="modal">
        <LoadingOverlay />
      </div>
    )

    expect(screen.getByText('Loading…')).toBeInTheDocument()
    expect(container.querySelector('[data-testid="modal"]')).toBeInTheDocument()
  })

  it('should use semantic text content for screen readers', () => {
    mockUseIsFetching.mockReturnValue(1)

    render(<LoadingOverlay />)

    const loadingText = screen.getByText('Loading…')
    expect(loadingText).toHaveClass('text-sm', 'font-medium', 'text-base-content/80')
  })

  it('should position loading text below spinner', () => {
    mockUseIsFetching.mockReturnValue(1)

    render(<LoadingOverlay />)

    const loadingText = screen.getByText('Loading…')
    expect(loadingText).toHaveClass('mt-4')
  })

  it('should use proper color classes for theming', () => {
    mockUseIsFetching.mockReturnValue(1)

    render(<LoadingOverlay />)

    const overlay = screen.getByText('Loading…').parentElement
    expect(overlay).toHaveClass('bg-base-100/60')
    
    const spinner = document.querySelector('.loading-spinner')
    expect(spinner).toHaveClass('text-primary')
    
    const text = screen.getByText('Loading…')
    expect(text).toHaveClass('text-base-content/80')
  })
}) 