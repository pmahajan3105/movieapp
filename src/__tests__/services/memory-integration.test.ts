/**
 * Memory Integration Tests
 * 
 * Comprehensive tests for UserMemoryService integration across endpoints
 */

import { UserMemoryService } from '@/lib/services/user-memory-service'
import { createRecommendationResponse } from '@/lib/utils/api-response'

// Mock the Supabase client
jest.mock('@/lib/supabase/server-client', () => ({
  createServerClient: jest.fn().mockResolvedValue({
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn()
        }),
        in: jest.fn().mockReturnValue({
          select: jest.fn()
        })
      })
    })
  })
}))

describe('Memory Integration Tests', () => {
  let memoryService: UserMemoryService
  let mockSupabaseClient: any

  beforeEach(() => {
    jest.clearAllMocks()
    memoryService = new UserMemoryService()
    
    // Get the mocked client
    const { createServerClient } = require('@/lib/supabase/server-client')
    mockSupabaseClient = createServerClient()
  })

  describe('UserMemoryService', () => {
    it('should get unified memory with all user data', async () => {
      const mockUserData = {
        id: 'user-1',
        preferences: {
          quality_threshold: 8.0,
          exploration_weight: 0.3
        },
        watchlist: [
          { movie_id: 'movie-1', added_at: '2024-01-01T00:00:00Z', watched: true },
          { movie_id: 'movie-2', added_at: '2024-01-15T00:00:00Z', watched: false }
        ],
        ratings: [
          { movie_id: 'movie-1', rating: 5, interested: true, rated_at: '2024-01-02T00:00:00Z' },
          { movie_id: 'movie-3', rating: 4, interested: true, rated_at: '2024-01-10T00:00:00Z' }
        ],
        behavior: [
          { interaction_type: 'view_details', movie_id: 'movie-1', metadata: {}, created_at: '2024-01-01T00:00:00Z' },
          { interaction_type: 'recommendation_click', movie_id: 'movie-2', metadata: {}, created_at: '2024-01-15T00:00:00Z' }
        ]
      }

      const mockMovies = [
        { id: 'movie-1', tmdb_id: 123 },
        { id: 'movie-2', tmdb_id: 456 },
        { id: 'movie-3', tmdb_id: 789 }
      ]

      // Mock the main query
      mockSupabaseClient.from().select().eq().single.mockResolvedValue({
        data: mockUserData,
        error: null
      })

      // Mock the movies query
      mockSupabaseClient.from().select().in.mockResolvedValue({
        data: mockMovies,
        error: null
      })

      const result = await memoryService.getUnifiedMemory('user-1')

      expect(result).toEqual({
        seenMovieIds: new Set([123, 456, 789]),
        seenRecent: new Set([123, 456]), // movie-1 and movie-2 are recent
        ratedMovies: mockUserData.ratings,
        watchlistMovies: mockUserData.watchlist,
        genrePreferences: expect.any(Map),
        recentInteractions: expect.any(Array),
        qualityThreshold: 8.0,
        explorationWeight: 0.3
      })
    })

    it('should filter unseen movies correctly', async () => {
      const movies = [
        { id: 'movie-1', tmdb_id: 123, title: 'Movie 1' },
        { id: 'movie-2', tmdb_id: 456, title: 'Movie 2' },
        { id: 'movie-3', tmdb_id: 789, title: 'Movie 3' }
      ]

      // Mock getUnifiedMemory to return seen movies
      jest.spyOn(memoryService, 'getUnifiedMemory').mockResolvedValue({
        seenMovieIds: new Set([123, 456]),
        seenRecent: new Set([123]),
        ratedMovies: [],
        watchlistMovies: [],
        genrePreferences: new Map(),
        recentInteractions: [],
        qualityThreshold: 7.0,
        explorationWeight: 0.2
      })

      const result = await memoryService.filterUnseenMovies('user-1', movies)

      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('movie-3')
    })

    it('should apply novelty penalties correctly', async () => {
      const recommendations = [
        { movie: { tmdb_id: 123, title: 'Movie 1' }, score: 0.9 },
        { movie: { tmdb_id: 456, title: 'Movie 2' }, score: 0.8 },
        { movie: { tmdb_id: 789, title: 'Movie 3' }, score: 0.7 }
      ]

      // Mock getUnifiedMemory to return recent movies
      jest.spyOn(memoryService, 'getUnifiedMemory').mockResolvedValue({
        seenMovieIds: new Set([123, 456, 789]),
        seenRecent: new Set([123, 456]), // Movies 1 and 2 are recent
        ratedMovies: [],
        watchlistMovies: [],
        genrePreferences: new Map(),
        recentInteractions: [],
        qualityThreshold: 7.0,
        explorationWeight: 0.2
      })

      const result = await memoryService.applyNoveltyPenalties('user-1', recommendations)

      expect(result).toHaveLength(3)
      
      // Movies 1 and 2 should have penalties applied
      expect(result[0].noveltyPenalty).toBe(true)
      expect(result[0].score).toBe(0.72) // 0.9 * 0.8
      expect(result[0].originalScore).toBe(0.9)
      
      expect(result[1].noveltyPenalty).toBe(true)
      expect(result[1].score).toBe(0.64) // 0.8 * 0.8
      expect(result[1].originalScore).toBe(0.8)
      
      // Movie 3 should not have penalty
      expect(result[2].noveltyPenalty).toBeUndefined()
      expect(result[2].score).toBe(0.7)
    })

    it('should handle errors gracefully', async () => {
      // Mock database error
      mockSupabaseClient.from().select().eq().single.mockResolvedValue({
        data: null,
        error: { message: 'Database connection failed' }
      })

      const result = await memoryService.getUnifiedMemory('user-1')

      expect(result).toEqual({
        seenMovieIds: new Set(),
        seenRecent: new Set(),
        ratedMovies: [],
        watchlistMovies: [],
        genrePreferences: new Map(),
        recentInteractions: [],
        qualityThreshold: 7.0,
        explorationWeight: 0.2
      })
    })
  })

  describe('API Response Integration', () => {
    it('should create recommendation response with transparency', () => {
      const recommendations = [
        { movie: { id: 'movie-1', title: 'Movie 1' }, score: 0.9 },
        { movie: { id: 'movie-2', title: 'Movie 2' }, score: 0.8 }
      ]

      const scoring = {
        algorithm: 'hyper-personalized',
        confidence: 0.85,
        factors: ['user_preferences', 'behavioral_signals'],
        userPreferences: { 'Drama': 0.8, 'Action': 0.6 },
        noveltyPenalty: true,
        recencyDecay: 0.95
      }

      const response = createRecommendationResponse(
        recommendations,
        scoring,
        'Generated 2 recommendations'
      )

      expect(response.status).toBe(200)
      expect(JSON.parse(response.body as string)).toEqual({
        success: true,
        recommendations,
        message: 'Generated 2 recommendations',
        scoring: {
          algorithm: 'hyper-personalized',
          confidence: 0.85,
          factors: ['user_preferences', 'behavioral_signals'],
          transparency: {
            userPreferences: { 'Drama': 0.8, 'Action': 0.6 },
            noveltyPenalty: true,
            recencyDecay: 0.95
          }
        },
        metadata: {
          timestamp: expect.any(String),
          version: '2.0.0'
        }
      })
    })
  })

  describe('Memory Service Edge Cases', () => {
    it('should handle empty user data', async () => {
      const mockEmptyData = {
        id: 'user-1',
        preferences: null,
        watchlist: [],
        ratings: [],
        behavior: []
      }

      mockSupabaseClient.from().select().eq().single.mockResolvedValue({
        data: mockEmptyData,
        error: null
      })

      mockSupabaseClient.from().select().in.mockResolvedValue({
        data: [],
        error: null
      })

      const result = await memoryService.getUnifiedMemory('user-1')

      expect(result.seenMovieIds.size).toBe(0)
      expect(result.seenRecent.size).toBe(0)
      expect(result.ratedMovies).toHaveLength(0)
      expect(result.watchlistMovies).toHaveLength(0)
      expect(result.genrePreferences.size).toBe(0)
      expect(result.recentInteractions).toHaveLength(0)
    })

    it('should handle null/undefined values gracefully', async () => {
      const mockDataWithNulls = {
        id: 'user-1',
        preferences: null,
        watchlist: null,
        ratings: null,
        behavior: null
      }

      mockSupabaseClient.from().select().eq().single.mockResolvedValue({
        data: mockDataWithNulls,
        error: null
      })

      const result = await memoryService.getUnifiedMemory('user-1')

      expect(result.ratedMovies).toEqual([])
      expect(result.watchlistMovies).toEqual([])
      expect(result.recentInteractions).toEqual([])
    })
  })
})
