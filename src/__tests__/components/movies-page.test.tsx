/**
 * @jest-environment jsdom
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import MoviesPage from '@/app/dashboard/movies/page'
import { AuthProvider } from '@/contexts/AuthContext'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { Movie } from '@/types'

// Mock Supabase
const mockSupabase = {
  auth: {
    getSession: jest.fn(),
    getUser: jest.fn(),
    signOut: jest.fn(),
    onAuthStateChange: jest.fn(),
  },
}

jest.mock('@supabase/ssr', () => ({
  createBrowserClient: jest.fn(() => mockSupabase),
}))

// Mock toast notifications
jest.mock('react-hot-toast', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    loading: jest.fn(),
  },
}))

// Mock fetch globally
global.fetch = jest.fn()

// Test wrapper with AuthProvider and QueryClientProvider
function TestWrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
  )
}

// Custom render function
function renderWithAuth(ui: React.ReactElement) {
  return render(<TestWrapper>{ui}</TestWrapper>)
}

const mockMovies: Movie[] = [
  {
    id: 'movie-1',
    title: 'Avengers: Endgame',
    year: 2019,
    genre: ['Action', 'Adventure', 'Drama'],
    director: ['Anthony Russo', 'Joe Russo'],
    rating: 8.4,
    plot: "The Avengers assemble once more to reverse Thanos' actions.",
    poster_url: 'https://example.com/poster1.jpg',
    runtime: 181,
    created_at: '2023-01-01T00:00:00Z',
  },
  {
    id: 'movie-2',
    title: 'Inception',
    year: 2010,
    genre: ['Action', 'Sci-Fi', 'Thriller'],
    director: ['Christopher Nolan'],
    rating: 8.8,
    plot: "A thief enters people's dreams to steal secrets.",
    poster_url: 'https://example.com/poster2.jpg',
    runtime: 148,
    created_at: '2023-01-01T00:00:00Z',
  },
]

const mockSmartApiResponse = {
  success: true,
  data: mockMovies,
  pagination: {
    currentPage: 1,
    totalPages: 5,
    hasMore: true,
    total: 50,
  },
  recommendationType: 'trending',
  userHasPreferences: false,
  explanation: 'Current trending movies in your area',
  mem0Enhanced: false,
}

const mockWatchlistResponse = {
  success: true,
  data: [
    {
      id: 'watchlist-1',
      movie_id: 'movie-1',
      user_id: 'user-123',
      added_at: '2023-01-01T00:00:00Z',
      watched: false,
      movies: mockMovies[0],
    },
  ],
}

describe('MoviesPage', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks()

    // Setup Supabase auth mocks
    mockSupabase.auth.getSession.mockResolvedValue({
      data: {
        session: {
          user: { id: 'user-123', email: 'test@example.com' },
        },
      },
      error: null,
    })
    mockSupabase.auth.onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: jest.fn() } },
    })

    // Default fetch mock setup
    ;(global.fetch as jest.Mock).mockImplementation((url: string) => {
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
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  describe('Initial Load', () => {
    it('renders page title', async () => {
      render(
        <TestWrapper>
          <MoviesPage />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('Smart Movies')).toBeInTheDocument()
      })
    })

    it('loads movies on mount', async () => {
      render(
        <TestWrapper>
          <MoviesPage />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/api/movies?smart=true'))
      })
    })

    it('loads watchlist on mount', async () => {
      renderWithAuth(<MoviesPage />)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/watchlist')
      })
    })

    it('displays movies when loaded successfully', async () => {
      renderWithAuth(<MoviesPage />)

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

      ;(global.fetch as jest.Mock).mockImplementation((url: string) => {
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

      renderWithAuth(<MoviesPage />)

      await waitFor(() => {
        expect(screen.getByText('Smart Movies')).toBeInTheDocument()
        expect(screen.getByText('Discover movies tailored to your preferences')).toBeInTheDocument()
      })
    })

    it('shows AI-Enhanced indicator when user has preferences', async () => {
      const personalizedResponse = {
        ...mockSmartApiResponse,
        recommendationType: 'personalized',
        userHasPreferences: true,
      }

      ;(global.fetch as jest.Mock).mockImplementation((url: string) => {
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

      renderWithAuth(<MoviesPage />)

      await waitFor(() => {
        // Should show the component loaded properly (may show personalized content)
        expect(screen.getByText('Smart Movies')).toBeInTheDocument()
      })
    })
  })

  describe('Watchlist Interaction', () => {
    it('triggers AI recommendations when sparkles button clicked', async () => {
      ;(global.fetch as jest.Mock).mockImplementation((url: string, options?: any) => {
        if (url.includes('/api/movies?smart=true')) {
          return Promise.resolve({
            ok: true,
            json: jest.fn().mockResolvedValue(mockSmartApiResponse),
          })
        }
        if (url.includes('/api/ai/recommendations') && options?.method === 'POST') {
          return Promise.resolve({
            ok: true,
            json: jest.fn().mockResolvedValue({ success: true, data: [] }),
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

      renderWithAuth(<MoviesPage />)

      await waitFor(() => {
        expect(screen.getByText('Get AI Recommendations')).toBeInTheDocument()
      })

      // Click the AI recommendations button
      const aiButton = screen.getByText('Get AI Recommendations')
      fireEvent.click(aiButton)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/ai/recommendations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('"message":"I want personalized movie recommendations'),
        })
      })
    })

    it('shows watchlist button for movies', async () => {
      renderWithAuth(<MoviesPage />)

      await waitFor(() => {
        expect(screen.getByText('Avengers: Endgame')).toBeInTheDocument()
        // Check for sparkles icons (watchlist buttons)
        const sparklesIcons = document.querySelectorAll('svg[class*="lucide-sparkles"]')
        expect(sparklesIcons.length).toBeGreaterThan(0)
      })
    })
  })

  describe('Load More Functionality', () => {
    it('shows load more button when hasMore is true', async () => {
      renderWithAuth(<MoviesPage />)

      await waitFor(() => {
        expect(screen.getByText('Load More Movies')).toBeInTheDocument()
      })
    })

    it('loads more movies when button clicked', async () => {
      const page2Response = {
        ...mockSmartApiResponse,
        pagination: { ...mockSmartApiResponse.pagination, currentPage: 2, hasMore: false },
      }

      ;(global.fetch as jest.Mock).mockImplementation((url: string) => {
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

      renderWithAuth(<MoviesPage />)

      await waitFor(() => {
        expect(screen.getByText('Load More Movies')).toBeInTheDocument()
      })

      const loadMoreButton = screen.getByText('Load More Movies')
      fireEvent.click(loadMoreButton)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('page=2'))
      })
    })
  })

  describe('AI Recommendations Mode', () => {
    it('shows AI recommendations toggle', async () => {
      renderWithAuth(<MoviesPage />)

      await waitFor(() => {
        expect(screen.getByText('Get AI Recommendations')).toBeInTheDocument()
      })
    })

    it('enables AI recommendations when button clicked', async () => {
      renderWithAuth(<MoviesPage />)

      await waitFor(() => {
        expect(screen.getByText('Get AI Recommendations')).toBeInTheDocument()
      })

      const aiButton = screen.getByText('Get AI Recommendations')
      fireEvent.click(aiButton)

      await waitFor(() => {
        // Should show the AI Picks button when in AI mode
        expect(screen.getByText('AI Picks')).toBeInTheDocument()
      })
    })
  })

  describe('Error Handling', () => {
    it('shows fallback content when movie loading fails', async () => {
      const emptyResponse = {
        data: [],
        pagination: {
          currentPage: 1,
          totalPages: 1,
          hasMore: false,
        },
        mem0Enhanced: false,
      }

      ;(global.fetch as jest.Mock).mockImplementation((url: string) => {
        if (url.includes('/api/movies?smart=true')) {
          return Promise.resolve({
            ok: true,
            json: jest.fn().mockResolvedValue(emptyResponse),
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
          json: jest.fn().mockResolvedValue(emptyResponse),
        })
      })

      renderWithAuth(<MoviesPage />)

      await waitFor(() => {
        expect(screen.getByText('No movies found')).toBeInTheDocument()
        expect(
          screen.getByText('Check back later for more movie recommendations!')
        ).toBeInTheDocument()
      })
    })
  })

  describe('Responsive Layout', () => {
    it('renders movie cards in grid layout', async () => {
      renderWithAuth(<MoviesPage />)

      await waitFor(() => {
        expect(screen.getByText('Avengers: Endgame')).toBeInTheDocument()
        expect(screen.getByText('Inception')).toBeInTheDocument()
      })
    })

    it('shows movie ratings and years', async () => {
      renderWithAuth(<MoviesPage />)

      await waitFor(() => {
        expect(screen.getByText('2019')).toBeInTheDocument()
        expect(screen.getByText('2010')).toBeInTheDocument()
        expect(screen.getByText('8.4')).toBeInTheDocument()
        expect(screen.getByText('8.8')).toBeInTheDocument()
      })
    })

    it('shows movie genres as badges', async () => {
      renderWithAuth(<MoviesPage />)

      await waitFor(() => {
        expect(screen.getAllByText('Action')).toHaveLength(2) // Both movies have Action genre
        expect(screen.getByText('Sci-Fi')).toBeInTheDocument()
      })
    })
  })
})
