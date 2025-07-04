// Centralized Jest mocks for CineAI tests
// -------------------------------------------------
// Importing this file sets up global mocks for Supabase, Next.js, Lucide icons
// and common browser APIs so individual test files don't need custom mocks.

//---------------------------------------------
// Mock React Query
//---------------------------------------------
jest.mock('@tanstack/react-query', () => ({
  useQuery: jest.fn(() => ({ data: null, error: null, isLoading: false })),
  useMutation: jest.fn(() => ({
    mutate: jest.fn(),
    mutateAsync: jest.fn(),
    isLoading: false,
    error: null,
  })),
  useQueryClient: jest.fn(() => ({
    invalidateQueries: jest.fn(),
    setQueryData: jest.fn(),
    getQueryData: jest.fn(),
  })),
  QueryClient: jest.fn(),
  QueryClientProvider: ({ children }: { children: React.ReactNode }) => children,
}))

//---------------------------------------------
// Helper: create a minimal Supabase client mock
//---------------------------------------------
export const createMockSupabaseClient = () => {
  // Create a comprehensive chainable builder that supports all Supabase query methods
  const createChainableBuilder = (defaultData = []) => {
    const builder = {
      // Query building methods (return this for chaining)
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      upsert: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      neq: jest.fn().mockReturnThis(),
      gt: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lt: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      like: jest.fn().mockReturnThis(),
      ilike: jest.fn().mockReturnThis(),
      is: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      contains: jest.fn().mockReturnThis(),
      containedBy: jest.fn().mockReturnThis(),
      overlaps: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      range: jest.fn().mockReturnThis(),
      or: jest.fn().mockReturnThis(),
      not: jest.fn().mockReturnThis(),
      filter: jest.fn().mockReturnThis(),

      // Terminal operations (return promises)
      single: jest.fn().mockResolvedValue({
        data: { id: 'mock-id', watched: false },
        error: null,
      }),
      maybeSingle: jest.fn().mockResolvedValue({
        data: { id: 'mock-id', watched: false },
        error: null,
      }),

      // Default execution (used when chain ends without explicit terminal)
      then: jest.fn(onFulfilled => {
        const result = { data: defaultData, error: null, count: defaultData.length }
        return Promise.resolve(onFulfilled ? onFulfilled(result) : result)
      }),
    }

    // upsert is already defined in the builder object above

    return builder
  }

  const builder = createChainableBuilder([])

  return {
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: { id: 'uid', email: 'test@example.com' } },
        error: null,
      }),
      getSession: jest.fn().mockResolvedValue({
        data: {
          session: {
            user: { id: 'uid', email: 'test@example.com' },
            access_token: 'mock-token',
            expires_at: Date.now() + 3600000,
          },
        },
        error: null,
      }),
      onAuthStateChange: jest.fn().mockReturnValue({
        data: {
          subscription: {
            unsubscribe: jest.fn(),
          },
        },
      }),
      signOut: jest.fn().mockResolvedValue({ error: null }),
    },
    from: jest.fn(() => builder),
    rpc: jest.fn().mockResolvedValue({ data: null, error: null }),
  }
}

//---------------------------------------------
// Mock Next.js navigation + server utilities
//---------------------------------------------
const mockRouter = { push: jest.fn(), replace: jest.fn(), refresh: jest.fn() }
const mockSearchParams = new URLSearchParams()

jest.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
  useSearchParams: () => mockSearchParams,
  usePathname: () => '/',
}))

jest.mock('next/server', () => {
  class MockNextResponse {
    private _data: any
    status: number

    constructor(data: any, status = 200) {
      this._data = data
      this.status = status
    }

    get ok() {
      return this.status >= 200 && this.status < 300
    }

    async json() {
      return this._data
    }

    async text() {
      return JSON.stringify(this._data)
    }
  }

  return {
    NextRequest: jest.fn(),
    NextResponse: {
      json: (data: any, init?: { status?: number }) => new MockNextResponse(data, init?.status),
    },
  }
})

//---------------------------------------------
// Supabase packages
//---------------------------------------------
jest.mock('@supabase/ssr', () => ({
  createBrowserClient: jest.fn(() => createMockSupabaseClient()),
  createServerClient: jest.fn(() => createMockSupabaseClient()),
}))

jest.mock('@supabase/auth-helpers-nextjs', () => ({
  createServerComponentClient: () => createMockSupabaseClient(),
  createClientComponentClient: () => createMockSupabaseClient(),
}))

jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(() => createMockSupabaseClient()),
}))

jest.mock('@/lib/supabase/server-client', () => ({
  createClient: jest.fn(() => createMockSupabaseClient()),
}))

jest.mock('@/lib/supabase/browser-client', () => {
  const mockSubscription = { unsubscribe: jest.fn() }
  const mockAuthStateChange = {
    data: { subscription: mockSubscription },
  }

  return {
    supabase: {
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'uid', email: 'test@example.com' } },
          error: null,
        }),
        getSession: jest.fn().mockResolvedValue({
          data: {
            session: {
              user: { id: 'uid', email: 'test@example.com' },
              access_token: 'mock-token',
              expires_at: Date.now() + 3600000,
            },
          },
          error: null,
        }),
        onAuthStateChange: jest.fn().mockReturnValue(mockAuthStateChange),
        signOut: jest.fn().mockResolvedValue({ error: null }),
      },
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      }),
      rpc: jest.fn().mockResolvedValue({ data: null, error: null }),
    },
  }
})

// Use real supabase session helpers so unit tests validate actual behaviour
jest.mock('@/lib/supabase/session', () => {
  return jest.requireActual('@/lib/supabase/session')
})

// Mock repositories used by API routes
jest.mock('@/repositories/WatchlistRepository', () => ({
  WatchlistRepository: jest.fn().mockImplementation(() => ({
    getUserWatchlist: jest.fn().mockResolvedValue([
      {
        id: 'watchlist-1',
        added_at: '2024-01-01T00:00:00Z',
        watched: false,
        movies: {
          id: 'movie-1',
          title: 'Test Movie',
          year: 2024,
        },
      },
    ]),
    addToWatchlist: jest.fn().mockResolvedValue({
      id: 'watchlist-2',
      user_id: 'user-123',
      movie_id: 'movie-1',
      watched: false,
      notes: null,
      added_at: '2024-01-01T00:00:00Z',
    }),
    checkIfInWatchlist: jest.fn().mockResolvedValue(false),
    updateWatchlistItem: jest.fn().mockResolvedValue({
      id: 'watchlist-1',
      watched: true,
      watched_at: '2024-01-01T00:00:00Z',
    }),
    removeFromWatchlist: jest.fn().mockResolvedValue({ id: 'mock-removed-id' }),
  })),
}))

jest.mock('@/repositories/MovieRepository', () => ({
  MovieRepository: jest.fn().mockImplementation(() => ({
    findByTmdbId: jest.fn().mockResolvedValue(null),
    create: jest.fn().mockResolvedValue({ id: 'mock-movie-id', title: 'Mock Movie' }),
    update: jest.fn().mockResolvedValue({ id: 'mock-movie-id', title: 'Updated Mock Movie' }),
    findById: jest.fn().mockResolvedValue({
      id: 'movie-1',
      title: 'Avengers: Endgame',
      year: 2019,
      genre: ['Action', 'Adventure', 'Drama'],
      rating: 8.4,
      runtime: 181,
      director: ['Anthony Russo', 'Joe Russo'],
      plot: 'After devastating events, the Avengers assemble once more.',
      poster_url: 'https://example.com/poster1.jpg',
    }),
    search: jest.fn().mockResolvedValue({
      movies: [
        {
          id: 'movie-1',
          title: 'Avengers: Endgame',
          year: 2019,
          genre: ['Action', 'Adventure', 'Drama'],
          rating: 8.4,
          runtime: 181,
          director: ['Anthony Russo', 'Joe Russo'],
          plot: 'After devastating events, the Avengers assemble once more.',
          poster_url: 'https://example.com/poster1.jpg',
        },
        {
          id: 'movie-2',
          title: 'The Shawshank Redemption',
          year: 1994,
          genre: ['Drama'],
          rating: 9.3,
          runtime: 142,
          director: ['Frank Darabont'],
          plot: 'Two imprisoned men bond over a number of years.',
          poster_url: 'https://example.com/poster2.jpg',
        },
      ],
      totalCount: 2,
    }),
    findTrending: jest.fn().mockResolvedValue({
      movies: [
        {
          id: 'movie-1',
          title: 'Avengers: Endgame',
          year: 2019,
          genre: ['Action', 'Adventure', 'Drama'],
          rating: 8.4,
          runtime: 181,
          director: ['Anthony Russo', 'Joe Russo'],
          plot: 'After devastating events, the Avengers assemble once more.',
          poster_url: 'https://example.com/poster1.jpg',
        },
      ],
      totalCount: 1,
    }),
  })),
}))

// Mock movieService functions that API routes actually call
jest.mock('@/lib/services/movie-service', () => ({
  getMovieService: jest.fn(() => ({
    getMoviesByPreferences: jest.fn().mockImplementation((userId, options) => {
      const { limit = 12, page = 1 } = options || {}
      return Promise.resolve({
        movies: [
          {
            id: 'movie-1',
            title: 'Avengers: Endgame',
            year: 2019,
            genre: ['Action', 'Adventure', 'Drama'],
            rating: 8.4,
            runtime: 181,
            director: ['Anthony Russo', 'Joe Russo'],
            plot: 'After devastating events, the Avengers assemble once more.',
            poster_url: 'https://example.com/poster1.jpg',
          },
          {
            id: 'movie-3',
            title: 'Inception',
            year: 2010,
            genre: ['Action', 'Sci-Fi', 'Thriller'],
            rating: 8.8,
            runtime: 148,
            director: ['Christopher Nolan'],
            plot: 'A thief who steals corporate secrets through dream-sharing.',
            poster_url: 'https://example.com/poster3.jpg',
          },
        ],
        totalResults: 2,
        totalPages: Math.ceil(2 / limit),
        page: page,
        source: 'local-preferences',
      })
    }),
    getPopularMovies: jest.fn().mockImplementation(options => {
      const { limit = 12, page = 1 } = options || {}
      return Promise.resolve({
        movies: [
          {
            id: 'movie-1',
            title: 'Avengers: Endgame',
            year: 2019,
            genre: ['Action', 'Adventure', 'Drama'],
            rating: 8.4,
            runtime: 181,
            director: ['Anthony Russo', 'Joe Russo'],
            plot: 'After devastating events, the Avengers assemble once more.',
            poster_url: 'https://example.com/poster1.jpg',
          },
          {
            id: 'movie-3',
            title: 'Inception',
            year: 2010,
            genre: ['Action', 'Sci-Fi', 'Thriller'],
            rating: 8.8,
            runtime: 148,
            director: ['Christopher Nolan'],
            plot: 'A thief who steals corporate secrets through dream-sharing.',
            poster_url: 'https://example.com/poster3.jpg',
          },
        ],
        totalResults: 3,
        totalPages: Math.ceil(3 / limit),
        page: page,
        source: 'local-popular',
      })
    }),
    getMovieRecommendations: jest.fn().mockResolvedValue([]),
    calculateMatchScore: jest.fn().mockReturnValue(0.8),
    generateRelevanceReason: jest.fn().mockReturnValue('Great match for your preferences'),
    healthCheck: jest.fn().mockResolvedValue({
      tmdb: { status: 'healthy', message: 'TMDB API is accessible' },
      local: { status: 'healthy', message: 'Local database is accessible' },
    }),
  })),
  movieService: {
    getMovieRecommendations: jest.fn().mockResolvedValue([]),
    getPopularMovies: jest.fn().mockResolvedValue([]),
    calculateMatchScore: jest.fn().mockReturnValue(0.8),
    generateRelevanceReason: jest.fn().mockReturnValue('Great match for your preferences'),
  },
}))

//---------------------------------------------
// Mock Lucide React icons
//---------------------------------------------
jest.mock('lucide-react', () => {
  const MockIcon = () => null
  return new Proxy({}, { get: () => MockIcon })
})

//---------------------------------------------
// Browser API shims (jsdom lacks these)
//---------------------------------------------

// TextEncoder/TextDecoder polyfill for Node test environment
if (typeof TextEncoder === 'undefined') {
  ;(global as any).TextEncoder = class {
    encode(input: string): Uint8Array {
      return new Uint8Array(Buffer.from(input, 'utf8'))
    }
  }
  ;(global as any).TextDecoder = class {
    decode(input: Uint8Array): string {
      return Buffer.from(input).toString('utf8')
    }
  }
}

;(global as any).ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}))

// Safely set up window.matchMedia only if window exists (JSDOM environment)
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  })
}

// Mock fetch for tests that call external APIs
if (!(global as any).fetch) {
  ;(global as any).fetch = jest.fn(() =>
    Promise.resolve({
      ok: true,
      status: 200,
      json: async () => ({ success: true }),
      text: async () => JSON.stringify({ success: true }),
    })
  )
}

//---------------------------------------------
// Utility exports for tests
//---------------------------------------------
export { mockRouter, mockSearchParams }

//---------------------------------------------
// Mock environment helpers (isProduction, isDevelopment)
//---------------------------------------------
// jest.mock('@/lib/env', () => ({
//   isProduction: () => false,
//   isDevelopment: () => true,
// }))

//---------------------------------------------
// Polyfill NextResponse.json() for route unit tests
//---------------------------------------------
// next/server exports NextResponse which extends Response but route tests treat returned instance
// like fetch Response and call .json(). Add a shim when running in Jest.
import { NextResponse } from 'next/server'
if (
  (NextResponse as any)?.prototype &&
  typeof (NextResponse as any).prototype.json !== 'function'
) {
  ;(NextResponse as any).prototype.json = async function () {
    // Work with internal body or fallback to text()
    // body is a ReadableStream in web Response; easiest: use this.text()
    const text = await (this as Response).text()
    try {
      return JSON.parse(text || '{}')
    } catch {
      return {}
    }
  }
}

// Dummy test to prevent Jest "no tests" error
describe('setupMocks', () => {
  it('should setup mocks correctly', () => {
    expect(true).toBe(true)
  })
})

//---------------------------------------------
// Supabase packages
//---------------------------------------------
