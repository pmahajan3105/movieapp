import { UserMemoryService } from '@/lib/services/user-memory-service'

// Mock the Supabase client
jest.mock('@/lib/supabase/server-client', () => ({
  createServerClient: jest.fn().mockResolvedValue({
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn(),
        }),
      }),
    }),
  }),
}))

jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
  },
}))

describe('UserMemoryService - Simple Tests', () => {
  let memoryService: UserMemoryService
  let mockSupabaseClient: any

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Setup mock Supabase client
    mockSupabaseClient = {
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn()
          })
        })
      })
    }
    
    // Mock the createServerClient function
    jest.doMock('@/lib/supabase/server-client', () => ({
      createServerClient: jest.fn().mockResolvedValue(mockSupabaseClient)
    }))
    
    memoryService = new UserMemoryService()
  })

  describe('getUnifiedMemory', () => {
    it('should return empty memory when no user data', async () => {
      const userId = 'test-user-id'
      
      // Mock empty response
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

    it('should return empty memory on database error', async () => {
      const userId = 'test-user-id'
      
      // Mock database error
      mockSupabaseClient.from().select().eq().single.mockResolvedValue({
        data: null,
        error: new Error('Database connection failed'),
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
    it('should return all movies when no seen movies', async () => {
      const userId = 'test-user-id'
      const movies = [
        { id: 'movie-1', title: 'Movie 1', tmdb_id: 1 },
        { id: 'movie-2', title: 'Movie 2', tmdb_id: 2 },
      ]

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

      const result = await memoryService.filterUnseenMovies(userId, movies)

      expect(result).toEqual(movies)
    })

    it('should return all movies on error (graceful degradation)', async () => {
      const userId = 'test-user-id'
      const movies = [
        { id: 'movie-1', title: 'Movie 1', tmdb_id: 1 },
      ]

      // Mock database error
      mockSupabaseClient.from().select().eq().single.mockRejectedValue(
        new Error('Database error')
      )

      const result = await memoryService.filterUnseenMovies(userId, movies)

      expect(result).toEqual(movies)
    })
  })

  describe('enrichPromptWithMemory', () => {
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
    })
  })
})
