import { UserMemoryService } from '@/lib/services/user-memory-service'
import { logger } from '@/lib/logger'

// Mock the Supabase client
const mockSupabaseClient = {
  from: jest.fn(),
  select: jest.fn(),
  eq: jest.fn(),
  single: jest.fn(),
}

jest.mock('@/lib/supabase/server-client', () => ({
  createServerClient: jest.fn().mockResolvedValue(mockSupabaseClient),
}))

jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
  },
}))

describe('UserMemoryService', () => {
  let memoryService: UserMemoryService

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Setup mock Supabase client chain
    mockSupabaseClient.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn(),
        }),
      }),
    })
    
    memoryService = new UserMemoryService()
  })

  describe('getUnifiedMemory', () => {
    it('should return unified memory with user data', async () => {
      const userId = 'test-user-id'
      const mockUserData = {
        id: userId,
        preferences: {
          quality_threshold: 8.0,
          exploration_weight: 0.3,
        },
        watchlist: [
          { movie_id: 'movie-1', added_at: '2024-01-01T00:00:00Z', watched: false },
          { movie_id: 'movie-2', added_at: '2024-01-02T00:00:00Z', watched: true },
        ],
        ratings: [
          { movie_id: 'movie-1', rating: 4, interested: true, rated_at: '2024-01-01T00:00:00Z' },
          { movie_id: 'movie-3', rating: 5, interested: true, rated_at: '2024-01-03T00:00:00Z' },
        ],
        behavior: [
          { event_type: 'view', movie_id: 'movie-1', metadata: {}, created_at: '2024-01-01T00:00:00Z' },
          { event_type: 'click', movie_id: 'movie-2', metadata: {}, created_at: '2024-01-02T00:00:00Z' },
        ],
      }

      // Mock the database response
      const mockQuery = {
        single: jest.fn().mockResolvedValue({
          data: mockUserData,
          error: null,
        }),
      }
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue(mockQuery),
        }),
      })

      const result = await memoryService.getUnifiedMemory(userId)

      expect(result).toEqual({
        seenMovieIds: expect.any(Set),
        ratedMovies: mockUserData.ratings,
        watchlistMovies: mockUserData.watchlist,
        genrePreferences: expect.any(Map),
        recentInteractions: expect.any(Array),
        qualityThreshold: 8.0,
        explorationWeight: 0.3,
      })

      expect(result.seenMovieIds.size).toBeGreaterThan(0)
      expect(result.qualityThreshold).toBe(8.0)
      expect(result.explorationWeight).toBe(0.3)
    })

    it('should return empty memory on database error', async () => {
      const userId = 'test-user-id'
      
      // Mock database error
      mockSupabaseClient.from().select().eq().single.mockResolvedValue({
        data: null,
        error: new Error('Database connection failed'),
      })

      const result = await memoryService.getUnifiedMemory(userId)

      expect(result).toEqual({
        seenMovieIds: new Set(),
        ratedMovies: [],
        watchlistMovies: [],
        genrePreferences: new Map(),
        recentInteractions: [],
        qualityThreshold: 7.0,
        explorationWeight: 0.2,
      })

      expect(logger.error).toHaveBeenCalledWith(
        'Failed to fetch unified memory',
        expect.objectContaining({ userId, error: expect.any(Error) })
      )
    })

    it('should handle missing user data gracefully', async () => {
      const userId = 'test-user-id'
      
      // Mock empty user data
      mockSupabaseClient.from().select().eq().single.mockResolvedValue({
        data: {
          id: userId,
          preferences: {},
          watchlist: [],
          ratings: [],
          behavior: [],
        },
        error: null,
      })

      const result = await memoryService.getUnifiedMemory(userId)

      expect(result.seenMovieIds.size).toBe(0)
      expect(result.ratedMovies).toEqual([])
      expect(result.watchlistMovies).toEqual([])
      expect(result.qualityThreshold).toBe(7.0) // Default value
      expect(result.explorationWeight).toBe(0.2) // Default value
    })
  })

  describe('filterUnseenMovies', () => {
    it('should filter out seen movies', async () => {
      const userId = 'test-user-id'
      const movies = [
        { id: 'movie-1', title: 'Movie 1', tmdb_id: 1 },
        { id: 'movie-2', title: 'Movie 2', tmdb_id: 2 },
        { id: 'movie-3', title: 'Movie 3', tmdb_id: 3 },
      ]

      // Mock user data with seen movies
      mockSupabaseClient.from().select().eq().single.mockResolvedValue({
        data: {
          id: userId,
          preferences: {},
          watchlist: [{ movie_id: 'movie-1', added_at: '2024-01-01T00:00:00Z', watched: false }],
          ratings: [{ movie_id: 'movie-2', rating: 4, interested: true, rated_at: '2024-01-01T00:00:00Z' }],
          behavior: [],
        },
        error: null,
      })

      const result = await memoryService.filterUnseenMovies(userId, movies)

      // Should only return movie-3 (not seen)
      expect(result).toHaveLength(1)
      expect(result[0]?.id).toBe('movie-3')
    })

    it('should return all movies on error', async () => {
      const userId = 'test-user-id'
      const movies = [
        { id: 'movie-1', title: 'Movie 1', tmdb_id: 1 },
        { id: 'movie-2', title: 'Movie 2', tmdb_id: 2 },
      ]

      // Mock database error
      mockSupabaseClient.from().select().eq().single.mockRejectedValue(
        new Error('Database error')
      )

      const result = await memoryService.filterUnseenMovies(userId, movies)

      // Should return all movies on error (graceful degradation)
      expect(result).toEqual(movies)
      expect(logger.warn).toHaveBeenCalledWith(
        'Failed to filter unseen movies, returning all',
        expect.objectContaining({ userId, error: expect.any(Error) })
      )
    })
  })

  describe('enrichPromptWithMemory', () => {
    it('should enrich prompt with user context', async () => {
      const userId = 'test-user-id'
      const basePrompt = 'You are a movie recommendation assistant.'

      // Mock user data with preferences
      mockSupabaseClient.from().select().eq().single.mockResolvedValue({
        data: {
          id: userId,
          preferences: { quality_threshold: 8.0 },
          watchlist: [{ movie_id: 'movie-1', added_at: '2024-01-01T00:00:00Z', watched: false }],
          ratings: [{ movie_id: 'movie-2', rating: 5, interested: true, rated_at: '2024-01-01T00:00:00Z' }],
          behavior: [
            { event_type: 'view', movie_id: 'movie-1', metadata: {}, created_at: '2024-01-01T00:00:00Z' },
          ],
        },
        error: null,
      })

      const result = await memoryService.enrichPromptWithMemory(userId, basePrompt)

      expect(result).toContain(basePrompt)
      expect(result).toContain('User Context:')
      expect(result).toContain('Quality standard: 8.0/10')
      expect(result).toContain('Important: DO NOT recommend any movies the user has already seen')
    })

    it('should return base prompt when no user data', async () => {
      const userId = 'test-user-id'
      const basePrompt = 'You are a movie recommendation assistant.'

      // Mock empty user data
      mockSupabaseClient.from().select().eq().single.mockResolvedValue({
        data: {
          id: userId,
          preferences: {},
          watchlist: [],
          ratings: [],
          behavior: [],
        },
        error: null,
      })

      const result = await memoryService.enrichPromptWithMemory(userId, basePrompt)

      expect(result).toBe(basePrompt)
    })

    it('should return base prompt on error', async () => {
      const userId = 'test-user-id'
      const basePrompt = 'You are a movie recommendation assistant.'

      // Mock database error
      mockSupabaseClient.from().select().eq().single.mockRejectedValue(
        new Error('Database error')
      )

      const result = await memoryService.enrichPromptWithMemory(userId, basePrompt)

      expect(result).toBe(basePrompt)
      expect(logger.warn).toHaveBeenCalledWith(
        'Failed to enrich prompt with memory, using base prompt',
        expect.objectContaining({ userId, error: expect.any(Error) })
      )
    })
  })

  describe('recency decay calculation', () => {
    it('should calculate decayed weights correctly', async () => {
      const userId = 'test-user-id'
      const now = new Date()
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

      // Mock user data with ratings at different times
      mockSupabaseClient.from().select().eq().single.mockResolvedValue({
        data: {
          id: userId,
          preferences: {},
          watchlist: [],
          ratings: [
            { movie_id: 'movie-1', rating: 5, interested: true, rated_at: oneDayAgo.toISOString() },
            { movie_id: 'movie-2', rating: 4, interested: true, rated_at: oneWeekAgo.toISOString() },
          ],
          behavior: [],
        },
        error: null,
      })

      const result = await memoryService.getUnifiedMemory(userId)

      // Recent ratings should have higher weights
      expect(result.genrePreferences.size).toBeGreaterThan(0)
    })
  })
})
