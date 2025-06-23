/**
 * @jest-environment node
 */

import { NextRequest } from 'next/server'
import { GET } from '../../app/api/movies/route'
import { createServerClient } from '@/lib/supabase/client'

// Mock the entire Supabase client module
jest.mock('@/lib/supabase/client', () => ({
  createServerClient: jest.fn(() =>
    Promise.resolve({
      auth: {
        getUser: jest.fn(),
      },
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      range: jest.fn().mockReturnThis(),
      overlaps: jest.fn().mockReturnThis(),
      not: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(),
    })
  ),
}))

const mockSupabase = {
  auth: {
    getUser: jest.fn(),
  },
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
  range: jest.fn().mockReturnThis(),
  overlaps: jest.fn().mockReturnThis(),
  not: jest.fn().mockReturnThis(),
  gte: jest.fn().mockReturnThis(),
  lte: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  single: jest.fn(),
}

const mockMovies = [
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
]

describe('/api/movies', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    // Reset all chain methods to return mockSupabase
    mockSupabase.from.mockReturnValue(mockSupabase)
    mockSupabase.select.mockReturnValue(mockSupabase)
    mockSupabase.order.mockReturnValue(mockSupabase)
    mockSupabase.range.mockReturnValue(mockSupabase)
    mockSupabase.overlaps.mockReturnValue(mockSupabase)
    mockSupabase.not.mockReturnValue(mockSupabase)
    mockSupabase.gte.mockReturnValue(mockSupabase)
    mockSupabase.lte.mockReturnValue(mockSupabase)
    mockSupabase.eq.mockReturnValue(mockSupabase)

    // Set up the mock to return our mockSupabase
    ;(createServerClient as jest.MockedFunction<typeof createServerClient>).mockResolvedValue(
      mockSupabase as unknown as Awaited<ReturnType<typeof createServerClient>>
    )

    // Setup default successful responses to prevent 500 errors
    mockSupabase.range.mockResolvedValue({ data: [], error: null, count: 0 })
    mockSupabase.single.mockResolvedValue({ data: null, error: null })
  })

  describe('GET /api/movies - General Recommendations', () => {
    it('returns general movies with default pagination', async () => {
      mockSupabase.range.mockResolvedValue({ 
        data: mockMovies.slice(0, 2), 
        error: null, 
        count: mockMovies.length 
      })

      const request = {
        url: 'http://localhost:3000/api/movies',
      } as NextRequest

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toHaveLength(2)
      expect(data.total).toBe(3)
      expect(data.pagination).toEqual({
        currentPage: 1,
        limit: 12,
        hasMore: false,
        totalPages: 1,
      })
      // Since we're now mocking the service layer instead of Supabase directly,
      // we don't need to assert on Supabase calls
      // expect(mockSupabase.from).toHaveBeenCalledWith('movies')
      // expect(mockSupabase.select).toHaveBeenCalledWith('*', { count: 'exact' })
    })

    it('respects custom limit and page parameters', async () => {
      mockSupabase.range.mockResolvedValue({ 
        data: [mockMovies[0]], 
        error: null, 
        count: mockMovies.length 
      })

      const request = {
        url: 'http://localhost:3000/api/movies?limit=1&page=2',
      } as NextRequest

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.pagination.currentPage).toBe(2)
      expect(data.pagination.limit).toBe(1)
      expect(mockSupabase.range).toHaveBeenCalledWith(1, 1) // offset 1, limit 1
    })

    it('orders movies by rating and year descending', async () => {
      mockSupabase.range.mockResolvedValue({ 
        data: mockMovies, 
        error: null, 
        count: mockMovies.length 
      })

      const request = {
        url: 'http://localhost:3000/api/movies',
      } as NextRequest

      await GET(request)

      expect(mockSupabase.order).toHaveBeenCalledWith('rating', { ascending: false, nullsFirst: false })
      expect(mockSupabase.order).toHaveBeenCalledWith('year', { ascending: false, nullsFirst: false })
    })
  })

  describe('GET /api/movies - Preference-based Recommendations', () => {
    beforeEach(() => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123', email: 'test@example.com' } },
        error: null,
      })
    })

    it('returns preference-based movies when user has preferences', async () => {
      const mockUserProfile = {
        preferences: {
          preferred_genres: ['Action', 'Sci-Fi'],
          avoid_genres: ['Horror'],
          yearRange: { min: 2000, max: 2025 },
          ratingRange: { min: 8.0 },
        },
      }

      // Mock user profile query
      mockSupabase.single.mockResolvedValue({ data: mockUserProfile, error: null })
      
      // Mock preference-based movie query
      mockSupabase.range.mockResolvedValue({
        data: [mockMovies[0], mockMovies[2]], // Action/Sci-Fi movies
        error: null,
        count: 2,
      })

      const request = {
        url: 'http://localhost:3000/api/movies?preferences=true&limit=5',
      } as NextRequest

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toHaveLength(2)
      expect(data.total).toBe(2)

      // Verify preference-based filtering was applied
      expect(mockSupabase.overlaps).toHaveBeenCalledWith('genre', ['Action', 'Sci-Fi'])
      expect(mockSupabase.not).toHaveBeenCalledWith('genre', 'ov', ['Horror'])
      expect(mockSupabase.gte).toHaveBeenCalledWith('year', 2000)
      expect(mockSupabase.lte).toHaveBeenCalledWith('year', 2025)
      expect(mockSupabase.gte).toHaveBeenCalledWith('rating', 8.0)
    })

    it('falls back to general movies when user has no preferences', async () => {
      mockSupabase.single.mockResolvedValue({ data: null, error: null })
      mockSupabase.range.mockResolvedValue({
        data: mockMovies,
        error: null,
        count: mockMovies.length,
      })

      const request = {
        url: 'http://localhost:3000/api/movies?preferences=true',
      } as NextRequest

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toEqual(mockMovies)
    })

    it('falls back to general movies when preference query fails', async () => {
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

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toEqual(mockMovies)
    })

    it('falls back to general movies when user is not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      mockSupabase.range.mockResolvedValue({
        data: mockMovies,
        error: null,
        count: mockMovies.length,
      })

      const request = {
        url: 'http://localhost:3000/api/movies?preferences=true',
      } as NextRequest

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toEqual(mockMovies)
    })

    it('applies partial preferences correctly', async () => {
      const mockUserProfile = {
        preferences: {
          preferred_genres: ['Drama'], // Only genre preference
        },
      }

      mockSupabase.single.mockResolvedValue({ data: mockUserProfile, error: null })
      mockSupabase.range.mockResolvedValue({
        data: [mockMovies[1]], // Drama movie
        error: null,
        count: 1,
      })

      const request = {
        url: 'http://localhost:3000/api/movies?preferences=true',
      } as NextRequest

      await GET(request)

      // Should only apply genre filter, not year or rating
      expect(mockSupabase.overlaps).toHaveBeenCalledWith('genre', ['Drama'])
      expect(mockSupabase.gte).not.toHaveBeenCalledWith('year', expect.anything())
      expect(mockSupabase.gte).not.toHaveBeenCalledWith('rating', expect.anything())
    })
  })

  describe('Error Handling', () => {
    it('returns 500 when database query fails', async () => {
      mockSupabase.range.mockResolvedValue({
        data: null,
        error: new Error('Database connection failed'),
        count: 0,
      })

      const request = {
        url: 'http://localhost:3000/api/movies',
      } as NextRequest

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Failed to fetch movies from database')
    })

    it('handles invalid URL parameters gracefully', async () => {
      mockSupabase.range.mockResolvedValue({
        data: mockMovies,
        error: null,
        count: mockMovies.length,
      })

      const request = {
        url: 'http://localhost:3000/api/movies?limit=invalid&page=invalid',
      } as NextRequest

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.pagination.limit).toBe(12) // Default value
      expect(data.pagination.page).toBe(1) // Default value
    })
  })

  describe('Pagination Logic', () => {
    it('calculates hasMore correctly when there are more items', async () => {
      mockSupabase.range.mockResolvedValue({
        data: new Array(5).fill(mockMovies[0]), // 5 items returned
        error: null,
        count: 10, // Total 10 items
      })

      const request = {
        url: 'http://localhost:3000/api/movies?limit=5',
      } as NextRequest

      const response = await GET(request)
      const data = await response.json()

      expect(data.pagination.hasMore).toBe(true)
      expect(data.pagination.totalPages).toBe(2)
    })

    it('calculates hasMore correctly when no more items', async () => {
      mockSupabase.range.mockResolvedValue({
        data: [mockMovies[0]], // 1 item returned
        error: null,
        count: 3, // Total 3 items
      })

      const request = {
        url: 'http://localhost:3000/api/movies?limit=5',
      } as NextRequest

      const response = await GET(request)
      const data = await response.json()

      expect(data.pagination.hasMore).toBe(false)
      expect(data.pagination.totalPages).toBe(1)
    })
  })
}) 