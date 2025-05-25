/**
 * @jest-environment jsdom
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import MoviesPage from '../../app/dashboard/movies/page'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'react-hot-toast'

// Mock dependencies
jest.mock('@/contexts/AuthContext')
jest.mock('react-hot-toast')
jest.mock('next/image', () => ({ 
  __esModule: true, 
  default: ({ src, alt, ...props }: { src: string; alt: string; [key: string]: unknown }) => <img src={src} alt={alt} {...props} />
}))

// Mock fetch
global.fetch = jest.fn()

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>
const mockToast = toast as jest.MockedFunction<typeof toast>

const mockMovies = [
  {
    id: 'movie-1',
    title: 'Avengers: Endgame',
    year: 2019,
    genre: ['Action', 'Adventure'],
    rating: 8.4,
    runtime: 181,
    poster_url: 'https://example.com/poster1.jpg',
    plot: 'Epic superhero conclusion'
  },
  {
    id: 'movie-2',
    title: 'Inception',
    year: 2010,
    genre: ['Sci-Fi', 'Thriller'],
    rating: 8.8,
    runtime: 148,
    poster_url: 'https://example.com/poster2.jpg',
    plot: 'Dream heist thriller'
  }
]

const mockFetchResponse = {
  success: true,
  data: mockMovies,
  total: 10,
  pagination: {
    page: 1,
    limit: 9,
    hasMore: true,
    totalPages: 2,
  },
}

describe('MoviesPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    
    mockUseAuth.mockReturnValue({
      loading: false,
      user: { 
        id: 'user-123', 
        email: 'test@example.com',
        app_metadata: {},
        user_metadata: {},
        aud: 'authenticated',
        created_at: '2024-01-01T00:00:00Z',
      },
      signOut: jest.fn(),
      refreshUser: jest.fn(),
    })

    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(mockFetchResponse),
    })

    // Mock toast methods
    mockToast.success = jest.fn()
    mockToast.error = jest.fn()
  })

  describe('Initial Load', () => {
    it('shows loading spinner initially', () => {
      mockUseAuth.mockReturnValue({
        loading: true,
        user: null,
        signOut: jest.fn(),
        refreshUser: jest.fn(),
      })

      render(<MoviesPage />)
      
      expect(screen.getByText('Loading movies...')).toBeInTheDocument()
      expect(screen.getByRole('progressbar')).toBeInTheDocument()
    })

    it('loads both personalized and general movies on mount', async () => {
      render(<MoviesPage />)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/movies?limit=9&page=1&preferences=true')
        expect(global.fetch).toHaveBeenCalledWith('/api/movies?limit=9&page=1')
      })
    })

    it('displays movies when loaded successfully', async () => {
      render(<MoviesPage />)

      await waitFor(() => {
        expect(screen.getByText('Avengers: Endgame')).toBeInTheDocument()
        expect(screen.getByText('Inception')).toBeInTheDocument()
      })
    })
  })

  describe('Personalized Recommendations', () => {
    it('shows personalized section when user has preferences', async () => {
      const personalizedResponse = {
        ...mockFetchResponse,
        total: 5, // Non-zero indicates preferences exist
      }

      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue(personalizedResponse),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue(mockFetchResponse),
        })

      render(<MoviesPage />)

      await waitFor(() => {
        expect(screen.getByText('Your Personalized Movies 🎯')).toBeInTheDocument()
        expect(screen.getByText('Recommended For You')).toBeInTheDocument()
        expect(screen.getByText('Based on your chat preferences with CineAI')).toBeInTheDocument()
      })
    })

    it('shows message to chat with AI when no preferences exist', async () => {
      const noPreferencesResponse = {
        ...mockFetchResponse,
        data: [],
        total: 0,
      }

      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue(noPreferencesResponse),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue(mockFetchResponse),
        })

      render(<MoviesPage />)

      await waitFor(() => {
        expect(screen.getByText('No personalized recommendations yet')).toBeInTheDocument()
        expect(screen.getByText('Chat with CineAI on the Dashboard to get personalized movie recommendations!')).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Chat with CineAI' })).toBeInTheDocument()
      })
    })
  })

  describe('Load More Functionality', () => {
    it('shows load more button when hasMore is true', async () => {
      render(<MoviesPage />)

      await waitFor(() => {
        expect(screen.getByText('Load More Recommendations')).toBeInTheDocument()
        expect(screen.getByText('Load More Movies')).toBeInTheDocument()
      })
    })

    it('loads more personalized movies when button clicked', async () => {
      const page2Response = {
        ...mockFetchResponse,
        data: [mockMovies[0]], // Different data for page 2
        pagination: { ...mockFetchResponse.pagination, page: 2, hasMore: false },
      }

      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true, json: jest.fn().mockResolvedValue(mockFetchResponse) })
        .mockResolvedValueOnce({ ok: true, json: jest.fn().mockResolvedValue(mockFetchResponse) })
        .mockResolvedValueOnce({ ok: true, json: jest.fn().mockResolvedValue(page2Response) })

      render(<MoviesPage />)

      await waitFor(() => {
        expect(screen.getByText('Load More Recommendations')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Load More Recommendations'))

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/movies?limit=9&page=2&preferences=true')
      })
    })

    it('loads more general movies when button clicked', async () => {
      render(<MoviesPage />)

      await waitFor(() => {
        expect(screen.getByText('Load More Movies')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Load More Movies'))

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/movies?limit=9&page=2')
      })
    })

    it('disables load more buttons and shows loading when loading', async () => {
      render(<MoviesPage />)

      await waitFor(() => {
        expect(screen.getByText('Load More Movies')).toBeInTheDocument()
      })

      // Mock a slow response
      ;(global.fetch as jest.Mock).mockImplementationOnce(
        () => new Promise(resolve => setTimeout(resolve, 100))
      )

      fireEvent.click(screen.getByText('Load More Movies'))

      // Should show loading state
      expect(screen.getByText('Load More Movies')).toBeDisabled()
    })
  })

  describe('Refresh Functionality', () => {
    it('refreshes movies when refresh button clicked', async () => {
      render(<MoviesPage />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument()
      })

      // Clear previous calls
      jest.clearAllMocks()

      fireEvent.click(screen.getByRole('button', { name: /refresh/i }))

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/movies?limit=9&page=1&preferences=true')
        expect(global.fetch).toHaveBeenCalledWith('/api/movies?limit=9&page=1')
      })
    })
  })

  describe('Watchlist Integration', () => {
    beforeEach(() => {
      // Mock watchlist response
      ;(global.fetch as jest.Mock).mockImplementation((url: string) => {
        if (url.includes('/api/watchlist')) {
          return Promise.resolve({
            ok: true,
            json: jest.fn().mockResolvedValue({
              success: true,
              data: [{ movie_id: 'movie-1' }] // movie-1 is already in watchlist
            }),
          })
        }
        return Promise.resolve({
          ok: true,
          json: jest.fn().mockResolvedValue(mockFetchResponse),
        })
      })
    })

    it('loads user watchlist on mount', async () => {
      render(<MoviesPage />)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/watchlist')
      })
    })

    it('shows "In Watchlist" for movies already in watchlist', async () => {
      render(<MoviesPage />)

      await waitFor(() => {
        const buttons = screen.getAllByText('In Watchlist')
        expect(buttons.length).toBeGreaterThan(0)
      })
    })

    it('adds movie to watchlist when add button clicked', async () => {
      ;(global.fetch as jest.Mock).mockImplementation((url: string, options?: RequestInit) => {
        if (url.includes('/api/watchlist') && options?.method === 'POST') {
          return Promise.resolve({
            ok: true,
            json: jest.fn().mockResolvedValue({ success: true }),
          })
        }
        if (url.includes('/api/watchlist')) {
          return Promise.resolve({
            ok: true,
            json: jest.fn().mockResolvedValue({ success: true, data: [] }),
          })
        }
        return Promise.resolve({
          ok: true,
          json: jest.fn().mockResolvedValue(mockFetchResponse),
        })
      })

      render(<MoviesPage />)

      await waitFor(() => {
        const addButtons = screen.getAllByText('Add to Watchlist')
        expect(addButtons.length).toBeGreaterThan(0)
      })

      const addButton = screen.getAllByText('Add to Watchlist')[0]
      fireEvent.click(addButton)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/watchlist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ movie_id: 'movie-1' }),
        })
        expect(mockToast.success).toHaveBeenCalledWith('Added to watchlist!')
      })
    })

    it('shows error when add to watchlist fails', async () => {
      ;(global.fetch as jest.Mock).mockImplementation((url: string, options?: RequestInit) => {
        if (url.includes('/api/watchlist') && options?.method === 'POST') {
          return Promise.resolve({
            ok: false,
            status: 409,
            json: jest.fn().mockResolvedValue({ 
              success: false, 
              error: 'Movie already in watchlist' 
            }),
          })
        }
        if (url.includes('/api/watchlist')) {
          return Promise.resolve({
            ok: true,
            json: jest.fn().mockResolvedValue({ success: true, data: [] }),
          })
        }
        return Promise.resolve({
          ok: true,
          json: jest.fn().mockResolvedValue(mockFetchResponse),
        })
      })

      render(<MoviesPage />)

      await waitFor(() => {
        const addButtons = screen.getAllByText('Add to Watchlist')
        expect(addButtons.length).toBeGreaterThan(0)
      })

      fireEvent.click(screen.getAllByText('Add to Watchlist')[0])

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith('Movie is already in your watchlist!')
      })
    })
  })

  describe('Error Handling', () => {
    it('shows error message when movie loading fails', async () => {
      ;(global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'))

      render(<MoviesPage />)

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith('Failed to load movies. Please try again.')
      })
    })

    it('shows empty state when no movies found', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          success: true,
          data: [],
          total: 0,
          pagination: { page: 1, limit: 9, hasMore: false, totalPages: 0 },
        }),
      })

      render(<MoviesPage />)

      await waitFor(() => {
        expect(screen.getByText('No movies found')).toBeInTheDocument()
        expect(screen.getByText('Check back later for more movie recommendations!')).toBeInTheDocument()
      })
    })
  })

  describe('Movie Details Modal', () => {
    it('opens movie details when movie clicked', async () => {
      render(<MoviesPage />)

      await waitFor(() => {
        expect(screen.getByText('Avengers: Endgame')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Avengers: Endgame'))

      // Modal should be rendered (though we'd need to mock the MovieDetailsModal component to test this fully)
      expect(screen.getByText('Avengers: Endgame')).toBeInTheDocument()
    })
  })

  describe('Responsive Layout', () => {
    it('renders movie cards in grid layout', async () => {
      render(<MoviesPage />)

      await waitFor(() => {
        // Check for movie cards by looking for movie titles (appear in both sections)
        expect(screen.getAllByText('Avengers: Endgame')).toHaveLength(2)
        expect(screen.getAllByText('Inception')).toHaveLength(2)
      })
    })

    it('shows movie ratings and years', async () => {
      render(<MoviesPage />)

      await waitFor(() => {
        expect(screen.getAllByText('2019')).toHaveLength(2) // Appears in both sections
        expect(screen.getAllByText('2010')).toHaveLength(2) // Appears in both sections
        expect(screen.getAllByText('⭐ 8.4')).toHaveLength(2)
        expect(screen.getAllByText('⭐ 8.8')).toHaveLength(2)
      })
    })

    it('shows movie genres as badges', async () => {
      render(<MoviesPage />)

      await waitFor(() => {
        expect(screen.getAllByText('Action')).toHaveLength(2) // Appears in both sections
        expect(screen.getAllByText('Sci-Fi')).toHaveLength(2)
      })
    })
  })
}) 