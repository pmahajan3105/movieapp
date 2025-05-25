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
// eslint-disable-next-line @next/next/no-img-element
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

// Mock unified smart API response
const mockSmartApiResponse = {
  success: true,
  data: mockMovies,
  total: 10,
  pagination: {
    currentPage: 1,
    hasMore: true,
    totalPages: 2,
  },
  recommendationType: 'popular',
  userHasPreferences: false,
}

// Mock watchlist response
const mockWatchlistResponse = {
  success: true,
  data: [
    { movie_id: 'movie-1' }
  ]
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

    // Mock smart API and watchlist API calls
    ;(global.fetch as jest.Mock)
      .mockImplementation((url: string) => {
        if (url.includes('/api/movies?smart=true')) {
          return Promise.resolve({
            ok: true,
            json: jest.fn().mockResolvedValue(mockSmartApiResponse),
          })
        }
        if (url.includes('/api/watchlist')) {
          return Promise.resolve({
            ok: true,
            json: jest.fn().mockResolvedValue(mockWatchlistResponse),
          })
        }
        return Promise.resolve({
          ok: true,
          json: jest.fn().mockResolvedValue({ success: true, data: [] }),
        })
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
    })

    it('loads movies using smart API on mount', async () => {
      render(<MoviesPage />)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/movies?smart=true&limit=8&page=1')
        )
      })
    })

    it('loads watchlist on mount', async () => {
      render(<MoviesPage />)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/watchlist')
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

  describe('Smart Recommendations', () => {
    it('shows appropriate title based on recommendation type', async () => {
      const personalizedResponse = {
        ...mockSmartApiResponse,
        recommendationType: 'personalized',
        userHasPreferences: true,
      }

      ;(global.fetch as jest.Mock)
        .mockImplementation((url: string) => {
          if (url.includes('/api/movies?smart=true')) {
            return Promise.resolve({
              ok: true,
              json: jest.fn().mockResolvedValue(personalizedResponse),
            })
          }
          if (url.includes('/api/watchlist')) {
            return Promise.resolve({
              ok: true,
              json: jest.fn().mockResolvedValue(mockWatchlistResponse),
            })
          }
          return Promise.resolve({
            ok: true,
            json: jest.fn().mockResolvedValue({ success: true, data: [] }),
          })
        })

      render(<MoviesPage />)

      await waitFor(() => {
        expect(screen.getByText('Your Personalized Recommendations 🎯')).toBeInTheDocument()
      })
    })

    it('shows AI-Enhanced indicator when user has preferences', async () => {
      const personalizedResponse = {
        ...mockSmartApiResponse,
        recommendationType: 'personalized',
        userHasPreferences: true,
      }

      ;(global.fetch as jest.Mock)
        .mockImplementation((url: string) => {
          if (url.includes('/api/movies?smart=true')) {
            return Promise.resolve({
              ok: true,
              json: jest.fn().mockResolvedValue(personalizedResponse),
            })
          }
          if (url.includes('/api/watchlist')) {
            return Promise.resolve({
              ok: true,
              json: jest.fn().mockResolvedValue(mockWatchlistResponse),
            })
          }
          return Promise.resolve({
            ok: true,
            json: jest.fn().mockResolvedValue({ success: true, data: [] }),
          })
        })

      render(<MoviesPage />)

      await waitFor(() => {
        expect(screen.getByText('AI-Enhanced Recommendations')).toBeInTheDocument()
      })
    })
  })

  describe('Watchlist Integration', () => {
    it('adds movie to watchlist when button clicked', async () => {
      ;(global.fetch as jest.Mock)
        .mockImplementation((url: string, options?: RequestInit) => {
          if (url.includes('/api/movies?smart=true')) {
            return Promise.resolve({
              ok: true,
              json: jest.fn().mockResolvedValue(mockSmartApiResponse),
            })
          }
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
            json: jest.fn().mockResolvedValue({ success: true, data: [] }),
          })
        })

      render(<MoviesPage />)

      await waitFor(() => {
        expect(screen.getByText('Avengers: Endgame')).toBeInTheDocument()
      })

      const addButton = screen.getAllByText('Add to Watchlist')[1] // Second movie button
      fireEvent.click(addButton)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/watchlist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ movie_id: 'movie-2' }),
        })
      })
    })

    it('shows "In Watchlist" for movies already in watchlist', async () => {
      render(<MoviesPage />)

      await waitFor(() => {
        expect(screen.getByText('In Watchlist')).toBeInTheDocument()
      })
    })
  })

  describe('Load More Functionality', () => {
    it('shows load more button when hasMore is true', async () => {
      render(<MoviesPage />)

      await waitFor(() => {
        expect(screen.getByText('Load More Movies')).toBeInTheDocument()
      })
    })

    it('loads more movies when button clicked', async () => {
      const page2Response = {
        ...mockSmartApiResponse,
        pagination: { ...mockSmartApiResponse.pagination, currentPage: 2, hasMore: false },
      }

      ;(global.fetch as jest.Mock)
        .mockImplementation((url: string) => {
          if (url.includes('page=2')) {
            return Promise.resolve({
              ok: true,
              json: jest.fn().mockResolvedValue(page2Response),
            })
          }
          if (url.includes('/api/movies?smart=true')) {
            return Promise.resolve({
              ok: true,
              json: jest.fn().mockResolvedValue(mockSmartApiResponse),
            })
          }
          if (url.includes('/api/watchlist')) {
            return Promise.resolve({
              ok: true,
              json: jest.fn().mockResolvedValue(mockWatchlistResponse),
            })
          }
          return Promise.resolve({
            ok: true,
            json: jest.fn().mockResolvedValue({ success: true, data: [] }),
          })
        })

      render(<MoviesPage />)

      await waitFor(() => {
        expect(screen.getByText('Load More Movies')).toBeInTheDocument()
      })

      const loadMoreButton = screen.getByText('Load More Movies')
      fireEvent.click(loadMoreButton)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('page=2')
        )
      })
    })
  })

  describe('Real-time Mode', () => {
    it('shows real-time toggle', async () => {
      render(<MoviesPage />)

      await waitFor(() => {
        expect(screen.getByText('Real-time')).toBeInTheDocument()
      })
    })

    it('enables real-time mode when toggle clicked', async () => {
      render(<MoviesPage />)

      await waitFor(() => {
        expect(screen.getByText('Real-time')).toBeInTheDocument()
      })

      // Find the toggle button by its class (since it doesn't have an accessible name)
      const toggleButton = document.querySelector('button[class*="relative inline-flex h-6 w-11"]')
      fireEvent.click(toggleButton as Element)

      // Wait for the setTimeout delay (100ms) plus some buffer
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('realtime=true')
        )
      }, { timeout: 2000 })
    })
  })

  describe('Error Handling', () => {
    it('shows error message when movie loading fails', async () => {
      ;(global.fetch as jest.Mock)
        .mockImplementation((url: string) => {
          if (url.includes('/api/movies?smart=true')) {
            return Promise.reject(new Error('Network error'))
          }
          if (url.includes('/api/watchlist')) {
            return Promise.resolve({
              ok: true,
              json: jest.fn().mockResolvedValue(mockWatchlistResponse),
            })
          }
          return Promise.resolve({
            ok: true,
            json: jest.fn().mockResolvedValue({ success: true, data: [] }),
          })
        })

      render(<MoviesPage />)

      await waitFor(() => {
        expect(screen.getByText('Failed to Load Movies')).toBeInTheDocument()
        expect(screen.getByText('Network error')).toBeInTheDocument()
      })
    })
  })

  describe('Responsive Layout', () => {
    it('renders movie cards in grid layout', async () => {
      render(<MoviesPage />)

      await waitFor(() => {
        expect(screen.getByText('Avengers: Endgame')).toBeInTheDocument()
        expect(screen.getByText('Inception')).toBeInTheDocument()
      })
    })

    it('shows movie ratings and years', async () => {
      render(<MoviesPage />)

      await waitFor(() => {
        expect(screen.getByText('2019')).toBeInTheDocument()
        expect(screen.getByText('2010')).toBeInTheDocument()
        expect(screen.getByText('⭐ 8.4')).toBeInTheDocument()
        expect(screen.getByText('⭐ 8.8')).toBeInTheDocument()
      })
    })

    it('shows movie genres as badges', async () => {
      render(<MoviesPage />)

      await waitFor(() => {
        expect(screen.getByText('Action')).toBeInTheDocument()
        expect(screen.getByText('Sci-Fi')).toBeInTheDocument()
      })
    })
  })
}) 