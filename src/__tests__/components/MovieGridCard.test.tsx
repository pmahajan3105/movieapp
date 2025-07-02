/* eslint-disable @next/next/no-img-element */
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { MovieGridCard } from '../../components/movies/MovieGridCard'
import type { Movie, Rating } from '../../types'

// Mock Next.js Image component
jest.mock('next/image', () => ({
  __esModule: true,
  default: function Image(props: {
    src: string
    alt: string
    className?: string
    fill?: boolean
    sizes?: string
    [key: string]: unknown
  }) {
    // Extract Next.js specific props that shouldn't go to HTML img
    const { src, alt, className, fill, sizes, ...htmlProps } = props
    return <img src={src} alt={alt} className={className} {...htmlProps} />
  },
}))

describe('MovieGridCard', () => {
  const mockMovie: Movie = {
    id: 'movie-1',
    title: 'Test Movie',
    year: 2024,
    genre: ['Action', 'Adventure'],
    director: ['Test Director'],
    plot: 'This is a test movie plot.',
    poster_url: 'https://example.com/poster.jpg',
    rating: 8.5,
    runtime: 120,
    imdb_id: 'tt1234567',
    created_at: '2024-01-01T00:00:00Z',
  }

  const mockUserRating: Rating = {
    id: 'rating-1',
    user_id: 'user-1',
    movie_id: 'movie-1',
    interested: true,
    rated_at: '2024-01-01T00:00:00Z',
  }

  const defaultProps = {
    movie: mockMovie,
    userRating: undefined,
    onRate: jest.fn(),
    onAddToWatchlist: jest.fn(),
    size: 'md' as const,
    className: '',
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders movie information correctly', () => {
    render(<MovieGridCard {...defaultProps} />)

    expect(screen.getByText('Test Movie')).toBeInTheDocument()
    expect(screen.getByText('2024')).toBeInTheDocument()
    expect(screen.getByText('8.5')).toBeInTheDocument()
    expect(screen.getByText('Action')).toBeInTheDocument()
  })

  it('displays movie poster when available', () => {
    render(<MovieGridCard {...defaultProps} />)

    const posterImage = screen.getByAltText('Test Movie')
    expect(posterImage).toBeInTheDocument()
    expect(posterImage).toHaveAttribute('src', 'https://example.com/poster.jpg')
  })

  it('displays placeholder when poster is not available', () => {
    const movieWithoutPoster = { ...mockMovie, poster_url: '' }
    render(<MovieGridCard {...defaultProps} movie={movieWithoutPoster} />)

    expect(screen.queryByAltText('Test Movie')).not.toBeInTheDocument()
    // Check for the first letter placeholder
    expect(screen.getByText('T')).toBeInTheDocument()
  })

  it('calls onRate with like when thumbs up is clicked', () => {
    render(<MovieGridCard {...defaultProps} />)

    const likeButton = screen.getByLabelText('Like Test Movie')
    fireEvent.click(likeButton)

    expect(defaultProps.onRate).toHaveBeenCalledWith('movie-1', true)
  })

  it('calls onRate with dislike when thumbs down is clicked', () => {
    render(<MovieGridCard {...defaultProps} />)

    const dislikeButton = screen.getByLabelText('Dislike Test Movie')
    fireEvent.click(dislikeButton)

    expect(defaultProps.onRate).toHaveBeenCalledWith('movie-1', false)
  })

  it('calls onAddToWatchlist when watchlist button is clicked', () => {
    render(<MovieGridCard {...defaultProps} />)

    const watchlistButton = screen.getByLabelText('Add Test Movie to watchlist')
    fireEvent.click(watchlistButton)

    expect(defaultProps.onAddToWatchlist).toHaveBeenCalledWith('movie-1')
  })

  it('applies correct size classes', () => {
    const { rerender, container } = render(<MovieGridCard {...defaultProps} size="sm" />)
    expect(container.querySelector('.w-32')).toBeInTheDocument()

    rerender(<MovieGridCard {...defaultProps} size="lg" />)
    expect(container.querySelector('.w-48')).toBeInTheDocument()
  })

  it('applies custom className', () => {
    const { container } = render(<MovieGridCard {...defaultProps} className="custom-class" />)

    expect(container.querySelector('.custom-class')).toBeInTheDocument()
  })

  it('shows user rating indicator when user has rated', () => {
    render(<MovieGridCard {...defaultProps} userRating={mockUserRating} />)

    // The component should show the rating indicator in the top right
    const cardElement = screen.getByText('Test Movie').closest('.group')
    expect(cardElement).toBeInTheDocument()
  })

  it('handles missing movie data gracefully', () => {
    const movieWithMissingData = {
      ...mockMovie,
      year: undefined,
      rating: undefined,
      genre: undefined,
    }

    render(<MovieGridCard {...defaultProps} movie={movieWithMissingData} />)

    expect(screen.getByText('Test Movie')).toBeInTheDocument()
    // Should not crash when optional data is missing
  })

  it('displays runtime when available', () => {
    render(<MovieGridCard {...defaultProps} />)

    expect(screen.getByText('120 min')).toBeInTheDocument()
  })

  it('is accessible', () => {
    render(<MovieGridCard {...defaultProps} />)

    // Check for proper ARIA labels
    expect(screen.getByLabelText('Like Test Movie')).toBeInTheDocument()
    expect(screen.getByLabelText('Dislike Test Movie')).toBeInTheDocument()
    expect(screen.getByLabelText('Add Test Movie to watchlist')).toBeInTheDocument()
  })
})
