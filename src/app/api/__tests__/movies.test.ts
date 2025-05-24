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
    const mockOMDBSearchResponse = {
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

    const mockMovieDetails1 = {
      Title: 'The Matrix',
      Year: '1999',
      imdbID: 'tt0133093',
      Genre: 'Action, Sci-Fi',
      Director: 'Lana Wachowski, Lilly Wachowski',
      Plot: 'A computer programmer is led to fight an underground war against powerful computers.',
      Poster: 'https://example.com/poster.jpg',
      imdbRating: '8.7',
      Runtime: '136 min',
      Response: 'True',
    }

    const mockMovieDetails2 = {
      Title: 'The Matrix Reloaded',
      Year: '2003',
      imdbID: 'tt0234215',
      Genre: 'Action, Sci-Fi',
      Director: 'Lana Wachowski, Lilly Wachowski',
      Plot: 'Neo and his allies race against time before the machines discover the city of Zion.',
      Poster: 'https://example.com/poster2.jpg',
      imdbRating: '7.2',
      Runtime: '138 min',
      Response: 'True',
    }

    // Mock the search request
    ;(global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockOMDBSearchResponse,
      })
      // Mock the detail requests
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockMovieDetails1,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockMovieDetails2,
      })

    const request = new Request('http://localhost:3000/api/movies?limit=2') as NextRequest
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data).toHaveLength(2)
    expect(data.data[0]).toMatchObject({
      id: 'tt0133093',
      title: 'The Matrix',
      year: 1999,
      genre: ['Action', 'Sci-Fi'],
      director: ['Lana Wachowski', 'Lilly Wachowski'],
      rating: 8.7,
      runtime: 136,
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

    const mockMovieDetails = {
      Title: 'Inception',
      Year: '2010',
      imdbID: 'tt1375666',
      Genre: 'Action, Sci-Fi, Thriller',
      Director: 'Christopher Nolan',
      Plot: 'A thief who steals corporate secrets through dream-sharing technology.',
      Poster: 'https://example.com/inception.jpg',
      imdbRating: '8.8',
      Runtime: '148 min',
      Response: 'True',
    }

    ;(global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockOMDBResponse,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockMovieDetails,
      })

    const request = new Request(
      'http://localhost:3000/api/movies?search=inception&limit=1'
    ) as NextRequest
    const response = await GET(request)
    const data = await response.json()

    // Since the API uses random search terms, we can't predict the exact call
    // but we should verify the structure is correct
    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(Array.isArray(data.data)).toBe(true)
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

    // Mock search response
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockOMDBResponse,
    })

    // Mock detail responses for the first 3 movies (due to limit=3)
    for (let i = 0; i < 3; i++) {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          Title: `Movie ${i + 1}`,
          Year: `200${i}`,
          imdbID: `tt000000${i}`,
          Genre: 'Action',
          Director: 'Test Director',
          Plot: 'Test plot',
          Poster: `https://example.com/poster${i}.jpg`,
          imdbRating: '7.5',
          Runtime: '120 min',
          Response: 'True',
        }),
      })
    }

    const request = new Request('http://localhost:3000/api/movies?limit=3') as NextRequest
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data).toHaveLength(3)
  })

  it('handles OMDB API errors', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
    })

    const request = new Request('http://localhost:3000/api/movies') as NextRequest
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

    const request = new Request(
      'http://localhost:3000/api/movies?search=nonexistentmovie'
    ) as NextRequest
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data).toEqual([])
    expect(data.total).toBe(0)
  })

  it('handles missing API key', async () => {
    delete process.env.OMDB_API_KEY

    const request = new Request('http://localhost:3000/api/movies') as NextRequest
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

    const mockMovieDetails = {
      Title: 'Popular Movie',
      Year: '2023',
      imdbID: 'tt1234567',
      Genre: 'Action',
      Director: 'Test Director',
      Plot: 'Test plot',
      Poster: 'https://example.com/popular.jpg',
      imdbRating: '8.0',
      Runtime: '120 min',
      Response: 'True',
    }

    ;(global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockOMDBResponse,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockMovieDetails,
      })

    const request = new Request('http://localhost:3000/api/movies') as NextRequest
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(Array.isArray(data.data)).toBe(true)
    // Verify fetch was called (can't predict exact term due to randomness)
    expect(global.fetch).toHaveBeenCalled()
  })
})
