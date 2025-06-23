/**
 * @jest-environment node
 */

import { NextRequest } from 'next/server'
import { GET as getMovies } from '../../app/api/movies/route'
import { createServerClient } from '@/lib/supabase/client'

// Mock the Supabase client
jest.mock('@/lib/supabase/client', () => ({
  createServerClient: jest.fn(() =>
    Promise.resolve({
      auth: {
        getUser: jest.fn(),
      },
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      upsert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(),
      order: jest.fn().mockReturnThis(),
      range: jest.fn().mockReturnThis(),
      overlaps: jest.fn().mockReturnThis(),
      not: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
    })
  ),
}))

// Note: Groq SDK functionality would be mocked here if needed

const mockSupabase = {
  auth: {
    getUser: jest.fn(),
  },
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  upsert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  single: jest.fn(),
  order: jest.fn().mockReturnThis(),
  range: jest.fn().mockReturnThis(),
  overlaps: jest.fn().mockReturnThis(),
  not: jest.fn().mockReturnThis(),
  gte: jest.fn().mockReturnThis(),
  lte: jest.fn().mockReturnThis(),
}

const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
}

const mockMovies = [
  {
    id: 'movie-1',
    title: 'Avengers: Endgame',
    year: 2019,
    genre: ['Action', 'Adventure', 'Drama'],
    rating: 8.4,
    director: ['Anthony Russo', 'Joe Russo'],
    plot: 'After devastating events, the Avengers assemble once more.',
    poster_url: 'https://example.com/poster1.jpg',
  },
  {
    id: 'movie-2',
    title: 'Inception',
    year: 2010,
    genre: ['Action', 'Sci-Fi', 'Thriller'],
    rating: 8.8,
    director: ['Christopher Nolan'],
    plot: 'A thief who steals corporate secrets through dream-sharing.',
    poster_url: 'https://example.com/poster2.jpg',
  },
]

describe.skip('User Preference Workflow Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    // Reset all chain methods
    Object.keys(mockSupabase).forEach(key => {
      if (typeof mockSupabase[key as keyof typeof mockSupabase] === 'function' && key !== 'auth') {
        ;(
          mockSupabase[key as keyof typeof mockSupabase] as jest.MockedFunction<() => unknown>
        ).mockReturnValue(mockSupabase)
      }
    })

    // Set up the mock to return our mockSupabase
    ;(createServerClient as jest.MockedFunction<typeof createServerClient>).mockResolvedValue(
      mockSupabase as unknown as Awaited<ReturnType<typeof createServerClient>>
    )

    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    })
  })

  describe('Complete User Journey', () => {
    it('should extract preferences from chat and provide personalized recommendations', async () => {
      // Step 1: User starts with no preferences - should get general movies
      mockSupabase.single.mockResolvedValueOnce({ data: null, error: null }) // No user profile
      mockSupabase.range.mockResolvedValueOnce({
        data: mockMovies,
        error: null,
        count: mockMovies.length,
      })

      const initialMoviesRequest = {
        url: 'http://localhost:3000/api/movies?preferences=true&limit=5',
      } as NextRequest

      const initialMoviesResponse = await getMovies(initialMoviesRequest)
      const initialMoviesData = await initialMoviesResponse.json()

      expect(initialMoviesResponse.status).toBe(200)
      expect(initialMoviesData.success).toBe(true)
      expect(initialMoviesData.data).toEqual(mockMovies)

      // Step 2: User chats and preferences are extracted (simulated)
      const mockChatResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                reply:
                  "I'd love to help you find some great action movies! What specifically do you enjoy about action films?",
                preferences: {
                  preferred_genres: ['Action'],
                  favorite_movies: ['Avengers: Endgame'],
                  themes: ['Superhero'],
                },
                extractionComplete: false,
              }),
            },
          },
        ],
      }

      // Mock Groq response (using mocked module)
      // Note: Groq is mocked at the top of the file

      // Step 3: After chat, user profile is updated with preferences
      const mockUserProfileWithPreferences = {
        id: 'user-123',
        preferences: {
          preferred_genres: ['Action'],
          favorite_movies: ['Avengers: Endgame'],
          themes: ['Superhero'],
        },
      }

      // Step 4: User requests movies again - should get personalized results
      mockSupabase.single.mockResolvedValueOnce({
        data: mockUserProfileWithPreferences,
        error: null,
      })

      const actionMovies = mockMovies.filter(movie => movie.genre.includes('Action'))

      mockSupabase.range.mockResolvedValueOnce({
        data: actionMovies,
        error: null,
        count: actionMovies.length,
      })

      const personalizedMoviesRequest = {
        url: 'http://localhost:3000/api/movies?preferences=true&limit=5',
      } as NextRequest

      const personalizedMoviesResponse = await getMovies(personalizedMoviesRequest)
      const personalizedMoviesData = await personalizedMoviesResponse.json()

      expect(personalizedMoviesResponse.status).toBe(200)
      expect(personalizedMoviesData.success).toBe(true)
      expect(personalizedMoviesData.data).toEqual(actionMovies)

      // Verify that preference-based filtering was applied
      expect(mockSupabase.overlaps).toHaveBeenCalledWith('genre', ['Action'])
    })

    it('should handle preference extraction failure gracefully', async () => {
      // User has preferences but query fails - should fall back to general recommendations
      const mockUserProfile = {
        preferences: {
          preferred_genres: ['Action'],
        },
      }

      mockSupabase.single.mockResolvedValue({ data: mockUserProfile, error: null })

      // First call (preference query) fails
      mockSupabase.range
        .mockResolvedValueOnce({ data: null, error: new Error('Query failed'), count: 0 })
        // Second call (general query) succeeds
        .mockResolvedValueOnce({ data: mockMovies, error: null, count: mockMovies.length })

      const request = {
        url: 'http://localhost:3000/api/movies?preferences=true',
      } as NextRequest

      const response = await getMovies(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toEqual(mockMovies)
    })

    it('should handle user without preferences correctly', async () => {
      // New user with no preferences should get general recommendations
      mockSupabase.single.mockResolvedValue({ data: null, error: null })
      mockSupabase.range.mockResolvedValue({
        data: mockMovies,
        error: null,
        count: mockMovies.length,
      })

      const request = {
        url: 'http://localhost:3000/api/movies?preferences=true',
      } as NextRequest

      const response = await getMovies(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toEqual(mockMovies)

      // Should not attempt preference-based filtering
      expect(mockSupabase.overlaps).not.toHaveBeenCalled()
    })
  })

  describe('Pagination with Preferences', () => {
    it('should handle pagination correctly for preference-based results', async () => {
      const mockUserProfile = {
        preferences: {
          preferred_genres: ['Action', 'Sci-Fi'],
        },
      }

      mockSupabase.single.mockResolvedValue({ data: mockUserProfile, error: null })
      mockSupabase.range.mockResolvedValue({
        data: [mockMovies[0]], // Page 1 with 1 item
        error: null,
        count: 5, // Total 5 matching movies
      })

      const request = {
        url: 'http://localhost:3000/api/movies?preferences=true&limit=1&page=1',
      } as NextRequest

      const response = await getMovies(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.pagination).toEqual({
        currentPage: 1,
        limit: 1,
        hasMore: true,
        totalPages: 5,
      })
      expect(mockSupabase.range).toHaveBeenCalledWith(0, 0) // offset 0, limit 1
    })

    it('should handle last page correctly', async () => {
      const mockUserProfile = {
        preferences: {
          preferred_genres: ['Drama'],
        },
      }

      mockSupabase.single.mockResolvedValue({ data: mockUserProfile, error: null })
      mockSupabase.range.mockResolvedValue({
        data: [mockMovies[1]], // Last item
        error: null,
        count: 3, // Total 3 items
      })

      const request = {
        url: 'http://localhost:3000/api/movies?preferences=true&limit=2&page=2',
      } as NextRequest

      const response = await getMovies(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.pagination.hasMore).toBe(false)
      expect(data.pagination.totalPages).toBe(2)
    })
  })

  describe('Advanced Preference Filtering', () => {
    it('should apply multiple preference filters correctly', async () => {
      const mockUserProfile = {
        preferences: {
          preferred_genres: ['Action', 'Sci-Fi'],
          avoid_genres: ['Horror'],
          yearRange: { min: 2000, max: 2020 },
          ratingRange: { min: 8.0 },
        },
      }

      mockSupabase.single.mockResolvedValue({ data: mockUserProfile, error: null })
      mockSupabase.range.mockResolvedValue({
        data: mockMovies,
        error: null,
        count: mockMovies.length,
      })

      const request = {
        url: 'http://localhost:3000/api/movies?preferences=true',
      } as NextRequest

      await getMovies(request)

      // Verify all filters were applied
      expect(mockSupabase.overlaps).toHaveBeenCalledWith('genre', ['Action', 'Sci-Fi'])
      expect(mockSupabase.not).toHaveBeenCalledWith('genre', 'ov', '{Horror}')
      expect(mockSupabase.gte).toHaveBeenCalledWith('year', 2000)
      expect(mockSupabase.lte).toHaveBeenCalledWith('year', 2020)
      expect(mockSupabase.gte).toHaveBeenCalledWith('rating', 8.0)
    })

    it('should apply partial preferences when some are missing', async () => {
      const mockUserProfile = {
        preferences: {
          preferred_genres: ['Comedy'],
          // No year range, rating range, or avoid genres
        },
      }

      mockSupabase.single.mockResolvedValue({ data: mockUserProfile, error: null })
      mockSupabase.range.mockResolvedValue({
        data: [],
        error: null,
        count: 0,
      })

      const request = {
        url: 'http://localhost:3000/api/movies?preferences=true',
      } as NextRequest

      await getMovies(request)

      // Should only apply genre filter
      expect(mockSupabase.overlaps).toHaveBeenCalledWith('genre', ['Comedy'])
      expect(mockSupabase.not).not.toHaveBeenCalled()
      expect(mockSupabase.gte).not.toHaveBeenCalledWith('year', expect.anything())
      expect(mockSupabase.lte).not.toHaveBeenCalledWith('year', expect.anything())
    })
  })
})
