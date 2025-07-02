/**
 * Smart Hybrid Cache Logic Tests
 * Tests the TMDB trending fetch + 24h cache system
 */

import { SmartRecommenderV2 } from '@/lib/ai/smart-recommender-v2'
import { createMockSupabaseClient } from '../../setupMocks'

// Mock the movie databases config
jest.mock('@/lib/movie-databases/config', () => ({
  tmdbConfig: {
    apiKey: 'test-key',
    baseUrl: 'https://api.themoviedb.org/3',
    imageBaseUrl: 'https://image.tmdb.org/t/p/'
  }
}))

// Mock fetch for TMDB API calls
global.fetch = jest.fn()

describe('SmartRecommenderV2 - Smart Hybrid Cache', () => {
  let recommender: SmartRecommenderV2
  let mockSupabase: any

  beforeEach(() => {
    recommender = SmartRecommenderV2.getInstance()
    mockSupabase = createMockSupabaseClient()
    
    // Reset fetch mock
    ;(global.fetch as jest.Mock).mockReset()
    
    // Mock successful responses by default
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        results: [
          {
            id: 1,
            title: 'Trending Movie 1',
            overview: 'A great trending movie',
            release_date: '2024-01-01',
            vote_average: 8.5,
            vote_count: 1000,
            genre_ids: [28, 12],
            poster_path: '/poster1.jpg',
            backdrop_path: '/backdrop1.jpg'
          },
          {
            id: 2, 
            title: 'Trending Movie 2',
            overview: 'Another trending movie',
            release_date: '2024-02-01',
            vote_average: 7.8,
            vote_count: 800,
            genre_ids: [18, 35],
            poster_path: '/poster2.jpg',
            backdrop_path: '/backdrop2.jpg'
          }
        ]
      })
    })
  })

  describe('getCachedTrendingMovies', () => {
    it('should return cached movies if available and not expired', async () => {
      // Mock cached trending movies (not expired)
      const cachedMovies = [
        {
          id: 'cached-1',
          title: 'Cached Movie 1',
          year: 2024,
          cached_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString() // 12 hours ago
        },
        {
          id: 'cached-2', 
          title: 'Cached Movie 2',
          year: 2024,
          cached_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString()
        }
      ]

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            gte: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue({
                  data: cachedMovies,
                  error: null
                })
              })
            })
          })
        })
      })

      // Access private method via type assertion
      const result = await (recommender as any).getCachedTrendingMovies()

      expect(result).toHaveLength(2)
      expect(result[0].title).toBe('Cached Movie 1')
      expect(mockSupabase.from).toHaveBeenCalledWith('trending_movies_cache')
    })

    it('should return empty array if cache is expired', async () => {
      // Mock no cached movies (expired or not found)
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            gte: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue({
                  data: [],
                  error: null
                })
              })
            })
          })
        })
      })

      const result = await (recommender as any).getCachedTrendingMovies()

      expect(result).toHaveLength(0)
    })

    it('should handle database errors gracefully', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            gte: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue({
                  data: null,
                  error: { message: 'Database error' }
                })
              })
            })
          })
        })
      })

      const result = await (recommender as any).getCachedTrendingMovies()

      expect(result).toHaveLength(0)
    })
  })

  describe('fetchLiveTMDBTrending', () => {
    it('should fetch trending movies from TMDB API', async () => {
      const result = await (recommender as any).fetchLiveTMDBTrending()

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('trending/movie/week'),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': expect.stringContaining('Bearer')
          })
        })
      )

      expect(result).toHaveLength(2)
      expect(result[0].title).toBe('Trending Movie 1')
      expect(result[1].title).toBe('Trending Movie 2')
    })

    it('should handle TMDB API errors', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized'
      })

      await expect((recommender as any).fetchLiveTMDBTrending()).rejects.toThrow('TMDB API error')
    })

    it('should handle network errors', async () => {
      ;(global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'))

      await expect((recommender as any).fetchLiveTMDBTrending()).rejects.toThrow('Network error')
    })
  })

  describe('cacheTrendingMoviesWithEmbeddings', () => {
    it('should cache movies with background embedding generation', async () => {
      const movies = [
        {
          id: 'test-1',
          title: 'Test Movie 1',
          plot: 'A test movie plot',
          year: 2024
        },
        {
          id: 'test-2',
          title: 'Test Movie 2', 
          plot: 'Another test movie plot',
          year: 2024
        }
      ]

      // Mock successful cache insertion
      mockSupabase.from.mockReturnValue({
        upsert: jest.fn().mockResolvedValue({
          data: movies,
          error: null
        })
      })

      await (recommender as any).cacheTrendingMoviesWithEmbeddings(movies)

      expect(mockSupabase.from).toHaveBeenCalledWith('trending_movies_cache')
      expect(mockSupabase.from().upsert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            id: 'test-1',
            title: 'Test Movie 1',
            source: 'tmdb-trending',
            cached_at: expect.any(String)
          })
        ])
      )
    })

    it('should handle cache insertion errors', async () => {
      const movies = [{ id: 'test-1', title: 'Test Movie' }]

      mockSupabase.from.mockReturnValue({
        upsert: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Insert failed' }
        })
      })

      // Should not throw, just log error
      await expect((recommender as any).cacheTrendingMoviesWithEmbeddings(movies)).resolves.not.toThrow()
    })
  })

  describe('getSmartHybridCandidates', () => {
    it('should return cached trending movies when available', async () => {
      const cachedMovies = [
        {
          id: 'cached-1',
          title: 'Cached Trending Movie',
          cached_at: new Date(Date.now() - 1000 * 60 * 60).toISOString() // 1 hour ago
        }
      ]

      // Mock successful cache retrieval
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            gte: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue({
                  data: cachedMovies,
                  error: null
                })
              })
            })
          })
        })
      })

      const result = await (recommender as any).getSmartHybridCandidates(10)

      expect(result).toHaveLength(1)
      expect(result[0].title).toBe('Cached Trending Movie')
    })

    it('should fall back to live TMDB fetch when cache is empty', async () => {
      // Mock empty cache
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            gte: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue({
                  data: [],
                  error: null
                })
              })
            })
          })
        })
      })

      // Mock successful TMDB fetch
      const result = await (recommender as any).getSmartHybridCandidates(10)

      expect(global.fetch).toHaveBeenCalled()
      expect(result).toHaveLength(2) // From mocked TMDB response
    })

    it('should handle both cache and TMDB failures gracefully', async () => {
      // Mock cache failure
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            gte: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                limit: jest.fn().mockRejectedValue(new Error('Cache error'))
              })
            })
          })
        })
      })

      // Mock TMDB failure
      ;(global.fetch as jest.Mock).mockRejectedValue(new Error('TMDB error'))

      const result = await (recommender as any).getSmartHybridCandidates(10)

      expect(result).toHaveLength(0)
    })
  })

  describe('blendMovieSources', () => {
    it('should blend trending and local movies with 70/30 ratio', async () => {
      const trendingMovies = Array(10).fill(0).map((_, i) => ({
        id: `trending-${i}`,
        title: `Trending Movie ${i}`,
        source: 'tmdb-trending'
      }))

      const localMovies = Array(10).fill(0).map((_, i) => ({
        id: `local-${i}`,
        title: `Local Movie ${i}`,
        source: 'local-db'
      }))

      const blended = (recommender as any).blendMovieSources(trendingMovies, localMovies)

      expect(blended).toHaveLength(10)
      
      // Should have approximately 70% trending, 30% local
      const trendingCount = blended.filter((m: any) => m.source === 'tmdb-trending').length
      const localCount = blended.filter((m: any) => m.source === 'local-db').length
      
      expect(trendingCount).toBeGreaterThanOrEqual(6) // At least 60%
      expect(localCount).toBeGreaterThanOrEqual(2) // At least 20%
      expect(trendingCount + localCount).toBe(10)
    })

    it('should handle empty trending movies', async () => {
      const trendingMovies: any[] = []
      const localMovies = Array(5).fill(0).map((_, i) => ({
        id: `local-${i}`,
        title: `Local Movie ${i}`
      }))

      const blended = (recommender as any).blendMovieSources(trendingMovies, localMovies)

      expect(blended).toHaveLength(5)
      expect(blended.every((m: any) => m.id.startsWith('local-'))).toBe(true)
    })

    it('should handle empty local movies', async () => {
      const trendingMovies = Array(5).fill(0).map((_, i) => ({
        id: `trending-${i}`,
        title: `Trending Movie ${i}`
      }))
      const localMovies: any[] = []

      const blended = (recommender as any).blendMovieSources(trendingMovies, localMovies)

      expect(blended).toHaveLength(5)
      expect(blended.every((m: any) => m.id.startsWith('trending-'))).toBe(true)
    })
  })

  describe('Integration: Smart Hybrid Flow', () => {
    it('should complete full smart hybrid flow when no user query provided', async () => {
      const userId = 'test-user-123'
      
      // Mock empty cache, forcing live fetch
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            gte: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue({
                  data: [],
                  error: null
                })
              })
            })
          })
        }),
        upsert: jest.fn().mockResolvedValue({ data: [], error: null })
      })

      const options = {
        userId,
        limit: 5
      }

      const result = await recommender.getSmartRecommendations(options)

      expect(result.movies).toBeDefined()
      expect(result.recommendations).toBeDefined()
      expect(result.insights).toBeDefined()
      
      // Should have called TMDB API for trending movies
      expect(global.fetch).toHaveBeenCalled()
    })
  })
}) 