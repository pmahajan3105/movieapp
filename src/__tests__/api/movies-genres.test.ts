import { GET } from '@/app/api/movies/genres/route'
import { createServerClient } from '@/lib/supabase/client'
import { NextRequest } from 'next/server'

// Mock the Supabase client
jest.mock('@/lib/supabase/client', () => ({
  createServerClient: jest.fn(),
}))

describe('GET /api/movies/genres', () => {
  it('should return a list of genres with their counts', async () => {
    const mockMovies = [
      { genre: ['Action', 'Adventure'] },
      { genre: ['Action', 'Sci-Fi'] },
      { genre: ['Adventure', 'Fantasy'] },
      { genre: ['Comedy'] },
      { genre: null },
      { genre: ['Action'] },
    ]

    const mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      not: jest.fn().mockResolvedValue({ data: mockMovies, error: null }),
    }

    ;(createServerClient as jest.Mock).mockResolvedValue(mockSupabase)

    const req = new NextRequest('http://localhost/api/movies/genres')
    const response = await GET(req)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.data).toEqual([
      { name: 'Action', count: 3 },
      { name: 'Adventure', count: 2 },
      { name: 'Sci-Fi', count: 1 },
      { name: 'Fantasy', count: 1 },
      { name: 'Comedy', count: 1 },
    ])
  })

  it('should return a 500 error if fetching movies fails', async () => {
    const mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      not: jest.fn().mockResolvedValue({ data: null, error: { message: 'DB Error', code: '500' } }),
    }

    ;(createServerClient as jest.Mock).mockResolvedValue(mockSupabase)

    const req = new NextRequest('http://localhost/api/movies/genres')
    const response = await GET(req)
    const body = await response.json()

    expect(response.status).toBe(500)
    expect(body.success).toBe(false)
    expect(body.error.message).toBe('Internal server error')
    expect(body.error.code).toBe('INTERNAL_ERROR')
    expect(body.error.details.message).toBe('Failed to fetch movies')
  })
})
