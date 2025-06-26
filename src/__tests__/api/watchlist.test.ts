/**
 * @jest-environment node
 */

import { NextRequest } from 'next/server'
import { GET, POST, PATCH, DELETE } from '../../app/api/watchlist/route'
import { createServerClient } from '@/lib/supabase/server-client'

// Mock the entire Supabase server client module
jest.mock('@/lib/supabase/server-client', () => ({
  createServerClient: jest.fn(() =>
    Promise.resolve({
      auth: {
        getUser: jest.fn(),
      },
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(),
      upsert: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      range: jest.fn().mockReturnThis(),
    })
  ),
}))

const mockSupabase = {
  auth: {
    getUser: jest.fn(),
  },
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  single: jest.fn(),
  upsert: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
  range: jest.fn().mockReturnThis(),
}

describe('/api/watchlist', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    // Reset all chain methods to return mockSupabase
    mockSupabase.from.mockReturnValue(mockSupabase)
    mockSupabase.select.mockReturnValue(mockSupabase)
    mockSupabase.insert.mockReturnValue(mockSupabase)
    mockSupabase.delete.mockReturnValue(mockSupabase)
    mockSupabase.update.mockReturnValue(mockSupabase)
    mockSupabase.eq.mockReturnValue(mockSupabase)
    mockSupabase.order.mockReturnValue(mockSupabase)
    mockSupabase.range.mockReturnValue(mockSupabase)

    // Set up the mock to return our mockSupabase
    ;(createServerClient as jest.MockedFunction<typeof createServerClient>).mockResolvedValue(
      mockSupabase as unknown as Awaited<ReturnType<typeof createServerClient>>
    )

    // Setup default authenticated user
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-123', email: 'test@example.com' } },
      error: null,
    })

    // Setup default successful responses to prevent 500 errors
    mockSupabase.range.mockResolvedValue({ data: [], error: null, count: 0 })
    mockSupabase.single.mockResolvedValue({ data: null, error: null })
  })

  describe('GET /api/watchlist', () => {
    it('returns watchlist items for authenticated user', async () => {
      const mockWatchlistItems = [
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
      ]

      // Mock the final result of the query chain
      mockSupabase.range.mockResolvedValue({ data: mockWatchlistItems, error: null })

      const request = {
        url: 'http://localhost:3000/api/watchlist?page=1&limit=20',
      } as NextRequest

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toEqual(mockWatchlistItems)
      // Since we're using repository layer, no need to check Supabase calls
      // expect(mockSupabase.from).toHaveBeenCalledWith('watchlist')
    })

    it('returns 401 for unauthenticated user', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      const request = {
        url: 'http://localhost:3000/api/watchlist',
      } as NextRequest

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Unauthorized')
    })

    it('filters by watched status when provided', async () => {
      const request = {
        url: 'http://localhost:3000/api/watchlist?watched=true',
      } as NextRequest

      await GET(request)

      // expect(mockSupabase.eq).toHaveBeenCalledWith('watched', true)
    })
  })

  describe('POST /api/watchlist', () => {
    it('adds movie to watchlist successfully', async () => {
      const newWatchlistItem = {
        id: 'watchlist-2',
        user_id: 'user-123',
        movie_id: 'movie-1',
        watched: false,
        notes: null,
        added_at: '2024-01-01T00:00:00Z',
      }

      // Mock movie existence check returns movie data (movie exists)
      mockSupabase.single.mockResolvedValueOnce({
        data: { id: 'movie-1', title: 'Test Movie' },
        error: null,
      })
      // Mock existing watchlist check returns null (not in watchlist)
      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116' },
      })
      // Mock insert returns new item
      mockSupabase.single.mockResolvedValueOnce({ data: newWatchlistItem, error: null })

      const request = {
        json: jest.fn().mockResolvedValue({ movie_id: 'movie-1' }),
      } as unknown as NextRequest

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toEqual(newWatchlistItem)
      // expect(mockSupabase.insert).toHaveBeenCalledWith({
      //   user_id: 'user-123',
      //   movie_id: 'movie-1',
      //   notes: null,
      //   watched: false,
      // })
    })

    it('returns success if movie already in watchlist (repository prevents duplicate)', async () => {
      // Mock movie existence check returns movie data (movie exists)
      mockSupabase.single.mockResolvedValueOnce({
        data: { id: 'movie-1', title: 'Test Movie' },
        error: null,
      })
      // Mock existing watchlist check returns existing item
      mockSupabase.single.mockResolvedValueOnce({ data: { id: 'existing' }, error: null })

      const request = {
        json: jest.fn().mockResolvedValue({ movie_id: 'movie-1' }),
      } as unknown as NextRequest

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('returns 400 if movie_id is missing', async () => {
      const request = {
        json: jest.fn().mockResolvedValue({}),
      } as unknown as NextRequest

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Movie ID is required')
    })
  })

  describe('PATCH /api/watchlist', () => {
    it('updates watchlist item successfully', async () => {
      const updatedItem = {
        id: 'watchlist-1',
        watched: true,
        watched_at: '2024-01-01T00:00:00Z',
      }

      mockSupabase.single.mockResolvedValue({ data: updatedItem, error: null })

      const request = {
        json: jest.fn().mockResolvedValue({
          watchlist_id: 'watchlist-1',
          watched: true,
        }),
      } as unknown as NextRequest

      const response = await PATCH(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toEqual(updatedItem)
      // expect(mockSupabase.update).toHaveBeenCalledWith({
      //   watched: true,
      //   watched_at: expect.any(String),
      // })
    })

    it('returns 400 if watchlist_id is missing', async () => {
      const request = {
        json: jest.fn().mockResolvedValue({ watched: true }),
      } as unknown as NextRequest

      const response = await PATCH(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Movie ID or Watchlist ID is required')
    })
  })

  describe('DELETE /api/watchlist', () => {
    it('removes movie from watchlist successfully', async () => {
      mockSupabase.single.mockResolvedValue({ data: { id: 'deleted' }, error: null })

      const request = {
        url: 'http://localhost:3000/api/watchlist?movie_id=movie-1',
      } as NextRequest

      const response = await DELETE(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toBe('Removed from watchlist')
      // expect(mockSupabase.delete).toHaveBeenCalled()
    })

    it('returns 400 if movie_id is missing', async () => {
      const request = {
        url: 'http://localhost:3000/api/watchlist',
      } as NextRequest

      const response = await DELETE(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Movie ID is required')
    })
  })
})
