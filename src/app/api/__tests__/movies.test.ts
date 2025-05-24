import { NextRequest } from 'next/server'
import { GET } from '../movies/route'

// Mock fetch for OMDB API
global.fetch = jest.fn()

// Mock environment variables
process.env.OMDB_API_KEY = 'test-api-key'

describe('/api/movies', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(global.fetch as jest.Mock).mockClear()
  })

  it('returns movies from OMDB API', async () => {
    const mockOMDBResponse = {
      Search: [
        {
          Title: 'The Matrix',
          Year: '1999',
          imdbID: 'tt0133093',
          Type: 'movie',
          Poster: 'https://example.com/poster.jpg',
        },
        {
          Title: 'The Matrix Reloaded',
          Year: '2003',
          imdbID: 'tt0234215',
          Type: 'movie',
          Poster: 'https://example.com/poster2.jpg',
        },
      ],
      totalResults: '2',
      Response: 'True',
    }

    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockOMDBResponse,
    })

    const request = new NextRequest('http://localhost:3000/api/movies?limit=2')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.movies).toHaveLength(2)
    expect(data.movies[0]).toEqual({
      id: 'tt0133093',
      title: 'The Matrix',
      year: 1999,
      poster: 'https://example.com/poster.jpg',
      type: 'movie',
    })
  })

  it('handles search query parameter', async () => {
    const mockOMDBResponse = {
      Search: [
        {
          Title: 'Inception',
          Year: '2010',
          imdbID: 'tt1375666',
          Type: 'movie',
          Poster: 'https://example.com/inception.jpg',
        },
      ],
      totalResults: '1',
      Response: 'True',
    }

    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockOMDBResponse,
    })

    const request = new NextRequest('http://localhost:3000/api/movies?search=inception&limit=1')
    const response = await GET(request)

    expect(global.fetch).toHaveBeenCalledWith(
      'http://www.omdbapi.com/?apikey=test-api-key&s=inception&type=movie&page=1'
    )

    const data = await response.json()
    expect(data.movies[0].title).toBe('Inception')
  })

  it('handles limit parameter', async () => {
    const mockOMDBResponse = {
      Search: Array.from({ length: 5 }, (_, i) => ({
        Title: `Movie ${i + 1}`,
        Year: `200${i}`,
        imdbID: `tt000000${i}`,
        Type: 'movie',
        Poster: `https://example.com/poster${i}.jpg`,
      })),
      totalResults: '5',
      Response: 'True',
    }

    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockOMDBResponse,
    })

    const request = new NextRequest('http://localhost:3000/api/movies?limit=3')
    const response = await GET(request)
    const data = await response.json()

    expect(data.movies).toHaveLength(3)
  })

  it('handles OMDB API errors', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
    })

    const request = new NextRequest('http://localhost:3000/api/movies')
    const response = await GET(request)

    expect(response.status).toBe(500)
    const data = await response.json()
    expect(data.error).toBe('Failed to fetch movies')
  })

  it('handles OMDB no results response', async () => {
    const mockOMDBResponse = {
      Response: 'False',
      Error: 'Movie not found!',
    }

    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockOMDBResponse,
    })

    const request = new NextRequest('http://localhost:3000/api/movies?search=nonexistentmovie')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.movies).toEqual([])
    expect(data.total).toBe(0)
  })

  it('handles missing API key', async () => {
    delete process.env.OMDB_API_KEY

    const request = new NextRequest('http://localhost:3000/api/movies')
    const response = await GET(request)

    expect(response.status).toBe(500)
    const data = await response.json()
    expect(data.error).toBe('OMDB API key not configured')

    // Restore for other tests
    process.env.OMDB_API_KEY = 'test-api-key'
  })

  it('defaults to popular movies when no search query', async () => {
    const mockOMDBResponse = {
      Search: [
        {
          Title: 'Popular Movie',
          Year: '2023',
          imdbID: 'tt1234567',
          Type: 'movie',
          Poster: 'https://example.com/popular.jpg',
        },
      ],
      totalResults: '1',
      Response: 'True',
    }

    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockOMDBResponse,
    })

    const request = new NextRequest('http://localhost:3000/api/movies')
    await GET(request)

    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('s=movie'))
  })
})
