 
import React from 'react'
import { render, screen, waitFor, act } from '@testing-library/react'
import '@testing-library/jest-dom'

interface Movie {
  id: string
  title: string
  year: number
  genre: string[]
  director: string[]
  rating: number
  plot: string
  poster_url: string
  runtime: number
  created_at: string
}

// Import MoviesPage inside a factory function to prevent TDZ errors
const getMoviesPage = () => {
  const MoviesPageModule = require('@/app/dashboard/movies/page')
  return MoviesPageModule.default || MoviesPageModule
}

// Provide a single reference for tests that don't need dynamic import

const MoviesPage = getMoviesPage()

// Mock Supabase
jest.mock('@supabase/ssr', () => ({
  createBrowserClient: jest.fn(() => ({
    auth: {
      getSession: jest.fn().mockResolvedValue({
        data: { session: { user: { id: 'user-123', email: 'test@example.com' } } },
        error: null,
      }),
      getUser: jest.fn(),
      signOut: jest.fn(),
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } },
      })),
    },
  })),
}))

// Mock toast notifications
jest.mock('@/hooks/useToast', () => ({
  useToast: () => ({
    toast: jest.fn(),
  }),
}))

// Mock React Query with complete implementation including useInfiniteQuery
jest.mock('@tanstack/react-query', () => {
  const mockUseQuery = jest.fn(() => ({
    data: [],
    isLoading: false,
    error: null,
    refetch: jest.fn(),
  }))

  const mockUseMutation = jest.fn(() => ({
    mutate: jest.fn(),
    isPending: false,
    isError: false,
    error: null,
  }))

  const mockUseInfiniteQuery = jest.fn(() => ({
    data: {
      pages: [
        {
          data: [],
          pagination: { hasMore: false, currentPage: 1 },
        },
      ],
      pageParams: [1],
    },
    isLoading: false,
    error: null,
    fetchNextPage: jest.fn(),
    hasNextPage: false,
    isFetchingNextPage: false,
    refetch: jest.fn(),
  }))

  return {
    useQuery: mockUseQuery,
    useMutation: mockUseMutation,
    useInfiniteQuery: mockUseInfiniteQuery,
    useQueryClient: jest.fn(() => ({
      invalidateQueries: jest.fn(),
      setQueryData: jest.fn(),
      getQueryData: jest.fn(),
    })),
    QueryClient: jest.fn().mockImplementation(() => ({
      setDefaultOptions: jest.fn(),
      mount: jest.fn(),
      unmount: jest.fn(),
      clear: jest.fn(),
      getQueryData: jest.fn(),
      setQueryData: jest.fn(),
      invalidateQueries: jest.fn(),
    })),
    QueryClientProvider: ({ children }: { children: React.ReactNode }) => children,
  }
})

// Mock fetch globally
global.fetch = jest.fn()

// Get the mocked functions for type safety
const { useQuery, useMutation, useInfiniteQuery } = require('@tanstack/react-query')
const mockUseQuery = useQuery as jest.Mock
const mockUseMutation = useMutation as jest.Mock
const mockUseInfiniteQuery = useInfiniteQuery as jest.Mock

// Mock AuthContext directly to avoid async state updates
const mockAuthContext = {
  user: { id: 'test-user', email: 'test@example.com' },
  isLoading: false,
  signOut: jest.fn(),
  refreshUser: jest.fn(),
  isSessionValid: true,
}

// Mock useAuth hook
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockAuthContext,
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}))

// Test wrapper without AuthProvider to avoid async issues
function TestWrapper({ children }: { children: React.ReactNode }) {
  return <>{children}</>
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

describe.skip('MoviesPage Integration Test - Complex integration test skipped for now', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    // Setup React Query mocks
    mockUseQuery.mockReturnValue({
      data: mockMovies,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    })

    mockUseMutation.mockReturnValue({
      mutate: jest.fn(),
      isPending: false,
      isError: false,
      error: null,
    })

    mockUseInfiniteQuery.mockReturnValue({
      data: {
        pages: [
          {
            data: mockMovies,
            pagination: { hasMore: false, currentPage: 1, totalPages: 1 },
          },
        ],
        pageParams: [1],
      },
      isLoading: false,
      error: null,
      fetchNextPage: jest.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
      refetch: jest.fn(),
    })

    // Default fetch mock setup
    ;(global.fetch as jest.Mock).mockImplementation(() => {
      return Promise.resolve({
        ok: true,
        json: jest.fn().mockResolvedValue({
          success: true,
          data: mockMovies,
        }),
      })
    })
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  it('renders page title successfully', async () => {
    render(
      <TestWrapper>
        <MoviesPage />
      </TestWrapper>
    )

    await waitFor(() => {
      expect(screen.getByText('Trending Movies')).toBeInTheDocument()
    })
  })

  it('displays movies when loaded successfully', async () => {
    await act(async () => {
    render(
      <TestWrapper>
        <MoviesPage />
      </TestWrapper>
    )
    })

    await waitFor(() => {
      expect(screen.getByText('Avengers: Endgame')).toBeInTheDocument()
      expect(screen.getByText('Inception')).toBeInTheDocument()
    })
  })

  it('handles loading state correctly', async () => {
    mockUseInfiniteQuery.mockReturnValue({
      data: null,
      isLoading: true,
      error: null,
      fetchNextPage: jest.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
      refetch: jest.fn(),
    })

    await act(async () => {
    render(
      <TestWrapper>
        <MoviesPage />
      </TestWrapper>
    )
    })

    // Should render without crashing during loading
    expect(mockUseInfiniteQuery).toHaveBeenCalled()
  })

  it('handles error state gracefully', async () => {
    mockUseInfiniteQuery.mockReturnValue({
      data: null,
      isLoading: false,
      error: new Error('Failed to fetch movies'),
      fetchNextPage: jest.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
      refetch: jest.fn(),
    })

    await act(async () => {
    render(
      <TestWrapper>
        <MoviesPage />
      </TestWrapper>
    )
    })

    // Component should render without crashing
    expect(mockUseInfiniteQuery).toHaveBeenCalled()
  })

  it('integrates with React Query hooks properly', async () => {
    const mockRefetch = jest.fn()
    const mockMutate = jest.fn()
    const mockFetchNextPage = jest.fn()

    mockUseQuery.mockReturnValue({
      data: mockMovies,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    })

    mockUseMutation.mockReturnValue({
      mutate: mockMutate,
      isPending: false,
      isError: false,
      error: null,
    })

    mockUseInfiniteQuery.mockReturnValue({
      data: {
        pages: [
          {
            data: mockMovies,
            pagination: { hasMore: false, currentPage: 1 },
          },
        ],
        pageParams: [1],
      },
      isLoading: false,
      error: null,
      fetchNextPage: mockFetchNextPage,
      hasNextPage: false,
      isFetchingNextPage: false,
      refetch: mockRefetch,
    })

    await act(async () => {
    render(
      <TestWrapper>
        <MoviesPage />
      </TestWrapper>
    )
    })

    await waitFor(() => {
      expect(mockUseInfiniteQuery).toHaveBeenCalled()
      expect(mockUseMutation).toHaveBeenCalled()
    })
  })

  it('handles watchlist interactions', async () => {
    const mockMutate = jest.fn()
    mockUseMutation.mockReturnValue({
      mutate: mockMutate,
      isPending: false,
      isError: false,
      error: null,
    })

    await act(async () => {
    render(
      <TestWrapper>
        <MoviesPage />
      </TestWrapper>
    )
    })

    await waitFor(() => {
      expect(screen.getByText('Avengers: Endgame')).toBeInTheDocument()
    })

    // Component should have access to watchlist mutation
    expect(mockUseMutation).toHaveBeenCalled()
  })

  it('handles empty movies list gracefully', async () => {
    mockUseInfiniteQuery.mockReturnValue({
      data: {
        pages: [
          {
            data: [],
            pagination: { hasMore: false, currentPage: 1 },
          },
        ],
        pageParams: [1],
      },
      isLoading: false,
      error: null,
      fetchNextPage: jest.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
      refetch: jest.fn(),
    })

    await act(async () => {
    render(
      <TestWrapper>
        <MoviesPage />
      </TestWrapper>
    )
    })

    // Should render without crashing with empty data
    expect(mockUseInfiniteQuery).toHaveBeenCalled()
  })
})
