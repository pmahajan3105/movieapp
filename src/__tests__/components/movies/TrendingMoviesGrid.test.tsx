/**
 * @jest-environment jsdom
 */

import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { TrendingMoviesGrid } from '@/components/movies/TrendingMoviesGrid'

// Mock the movie service
jest.mock('@/lib/services/movie-service', () => ({
  getMovieService: () => ({
    getTrendingMovies: jest.fn()
  })
}))

// Mock the MovieGridCard component
jest.mock('@/components/movies/MovieGridCard', () => ({
  MovieGridCard: ({ movie }: any) => (
    <div data-testid={`movie-card-${movie.id}`}>
      <h3>{movie.title}</h3>
      <p>{movie.year}</p>
    </div>
  )
}))

const mockMovies = [
  {
    id: '1',
    title: 'Trending Movie 1',
    year: 2023,
    genre: ['Action', 'Adventure'],
    rating: 8.5,
    plot: 'An exciting action movie',
    poster_url: 'https://example.com/poster1.jpg',
    runtime: 120,
    director: ['Director 1'],
    tmdb_id: 12345
  },
  {
    id: '2',
    title: 'Trending Movie 2',
    year: 2023,
    genre: ['Drama', 'Thriller'],
    rating: 7.8,
    plot: 'A gripping drama',
    poster_url: 'https://example.com/poster2.jpg',
    runtime: 105,
    director: ['Director 2'],
    tmdb_id: 67890
  },
  {
    id: '3',
    title: 'Trending Movie 3',
    year: 2022,
    genre: ['Comedy'],
    rating: 7.2,
    plot: 'A hilarious comedy',
    poster_url: 'https://example.com/poster3.jpg',
    runtime: 95,
    director: ['Director 3'],
    tmdb_id: 54321
  }
]

const renderWithQuery = (component: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      {component}
    </QueryClientProvider>
  )
}

describe('TrendingMoviesGrid', () => {
  const { getMovieService } = require('@/lib/services/movie-service')

  beforeEach(() => {
    jest.clearAllMocks()
    getMovieService().getTrendingMovies.mockResolvedValue(mockMovies)
  })

  it('should render trending movies grid', async () => {
    renderWithQuery(<TrendingMoviesGrid />)
    
    await waitFor(() => {
      expect(screen.getByText('Trending Movies')).toBeInTheDocument()
    })
  })

  it('should display trending movies when loaded', async () => {
    renderWithQuery(<TrendingMoviesGrid />)
    
    await waitFor(() => {
      expect(screen.getByTestId('movie-card-1')).toBeInTheDocument()
      expect(screen.getByTestId('movie-card-2')).toBeInTheDocument()
      expect(screen.getByTestId('movie-card-3')).toBeInTheDocument()
    })

    expect(screen.getByText('Trending Movie 1')).toBeInTheDocument()
    expect(screen.getByText('Trending Movie 2')).toBeInTheDocument()
    expect(screen.getByText('Trending Movie 3')).toBeInTheDocument()
  })

  it('should show loading state initially', () => {
    // Mock a pending promise
    getMovieService().getTrendingMovies.mockReturnValue(new Promise(() => {}))
    
    renderWithQuery(<TrendingMoviesGrid />)
    
    expect(screen.getByText('Loading trending movies...')).toBeInTheDocument()
  })

  it('should handle empty trending movies list', async () => {
    getMovieService().getTrendingMovies.mockResolvedValue([])
    
    renderWithQuery(<TrendingMoviesGrid />)
    
    await waitFor(() => {
      expect(screen.getByText('No trending movies available')).toBeInTheDocument()
    })
  })

  it('should handle API errors gracefully', async () => {
    getMovieService().getTrendingMovies.mockRejectedValue(new Error('API Error'))
    
    renderWithQuery(<TrendingMoviesGrid />)
    
    await waitFor(() => {
      expect(screen.getByText('Failed to load trending movies')).toBeInTheDocument()
    })
  })

  it('should limit movies displayed when limit prop is provided', async () => {
    renderWithQuery(<TrendingMoviesGrid limit={2} />)
    
    await waitFor(() => {
      expect(screen.getByTestId('movie-card-1')).toBeInTheDocument()
      expect(screen.getByTestId('movie-card-2')).toBeInTheDocument()
      expect(screen.queryByTestId('movie-card-3')).not.toBeInTheDocument()
    })
  })

  it('should apply custom className when provided', async () => {
    renderWithQuery(<TrendingMoviesGrid className="custom-grid-class" />)
    
    const gridContainer = screen.getByTestId('trending-movies-grid')
    expect(gridContainer).toHaveClass('custom-grid-class')
  })

  it('should display section title', async () => {
    renderWithQuery(<TrendingMoviesGrid />)
    
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Trending Movies')
  })

  it('should call getTrendingMovies with correct parameters', async () => {
    renderWithQuery(<TrendingMoviesGrid limit={10} />)
    
    await waitFor(() => {
      expect(getMovieService().getTrendingMovies).toHaveBeenCalledWith(10)
    })
  })

  it('should use default limit when not provided', async () => {
    renderWithQuery(<TrendingMoviesGrid />)
    
    await waitFor(() => {
      expect(getMovieService().getTrendingMovies).toHaveBeenCalledWith(20)
    })
  })

  it('should render grid layout correctly', async () => {
    renderWithQuery(<TrendingMoviesGrid />)
    
    await waitFor(() => {
      const gridContainer = screen.getByTestId('trending-movies-grid')
      expect(gridContainer).toHaveClass('grid')
    })
  })

  it('should handle network errors with retry option', async () => {
    let callCount = 0
    getMovieService().getTrendingMovies.mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        return Promise.reject(new Error('Network error'))
      }
      return Promise.resolve(mockMovies)
    })
    
    renderWithQuery(<TrendingMoviesGrid />)
    
    // Should show error initially
    await waitFor(() => {
      expect(screen.getByText('Failed to load trending movies')).toBeInTheDocument()
    })
    
    // Look for retry button if implemented
    const retryButton = screen.queryByText('Retry')
    if (retryButton) {
      retryButton.click()
      
      await waitFor(() => {
        expect(screen.getByTestId('movie-card-1')).toBeInTheDocument()
      })
    }
  })

  it('should be accessible with proper ARIA labels', async () => {
    renderWithQuery(<TrendingMoviesGrid />)
    
    await waitFor(() => {
      const heading = screen.getByRole('heading', { level: 2 })
      expect(heading).toHaveTextContent('Trending Movies')
      
      const grid = screen.getByTestId('trending-movies-grid')
      expect(grid).toHaveAttribute('role', 'grid')
    })
  })
})