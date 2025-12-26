import { NextRequest } from 'next/server'
import { POST as chatPOST } from '@/app/api/ai/chat/route'
import { GET as recommendationsGET } from '@/app/api/ai/recommend/route'
import { POST as searchPOST } from '@/app/api/movies/search/route'
import { UserMemoryService } from '@/lib/services/user-memory-service'

// Mock the memory service
jest.mock('@/lib/services/user-memory-service')
jest.mock('@/lib/supabase/server-client')
jest.mock('@/lib/logger')

const mockUserMemoryService = UserMemoryService as jest.MockedClass<typeof UserMemoryService>

describe('Memory Integration Tests', () => {
  let mockMemoryService: jest.Mocked<UserMemoryService>

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Setup mock memory service
    mockMemoryService = {
      getUnifiedMemory: jest.fn(),
      filterUnseenMovies: jest.fn(),
      enrichPromptWithMemory: jest.fn(),
    } as any

    mockUserMemoryService.mockImplementation(() => mockMemoryService)
  })

  describe('Chat API Memory Integration', () => {
    it('should enrich chat prompts with user memory', async () => {
      const userId = 'test-user-id'
      const enrichedPrompt = 'You are a movie assistant. User Context: Favorite genres: Action (0.8), Drama (0.6)'

      // Mock memory service response
      mockMemoryService.enrichPromptWithMemory.mockResolvedValue(enrichedPrompt)

      // Mock authentication
      const mockSupabase = {
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: { id: userId, email: 'test@example.com' } },
            error: null,
          }),
        },
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { preferences: { ai_settings: { ai_provider: 'openai' } } },
                error: null,
              }),
            }),
          }),
        }),
      }

      // Mock the Supabase client
      const { createServerClient } = require('@/lib/supabase/server-client')
      createServerClient.mockResolvedValue(mockSupabase)

      // Mock AI service
      const mockAIService = {
        chat: jest.fn().mockResolvedValue({
          content: 'Here are some movie recommendations...',
          provider: 'openai',
          model: 'gpt-5-mini',
          usage: { totalTokens: 100 },
        }),
      }

      jest.doMock('@/lib/ai/service', () => ({
        aiService: mockAIService,
      }))

      const request = new NextRequest('http://localhost:3000/api/ai/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: 'I want to watch a good action movie',
          stream: false,
        }),
      })

      const response = await chatPOST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(mockMemoryService.enrichPromptWithMemory).toHaveBeenCalledWith(
        userId,
        expect.any(String)
      )
    })
  })

  describe('Recommendations API Memory Integration', () => {
    it('should filter recommendations using memory service', async () => {
      const userId = 'test-user-id'
      const mockRecommendations = [
        { id: 'movie-1', title: 'Movie 1', tmdb_id: 1 },
        { id: 'movie-2', title: 'Movie 2', tmdb_id: 2 },
        { id: 'movie-3', title: 'Movie 3', tmdb_id: 3 },
      ]
      const filteredRecommendations = [
        { id: 'movie-2', title: 'Movie 2', tmdb_id: 2 },
        { id: 'movie-3', title: 'Movie 3', tmdb_id: 3 },
      ]

      // Mock memory service response
      mockMemoryService.filterUnseenMovies.mockResolvedValue(filteredRecommendations)

      // Mock authentication
      const mockSupabase = {
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: { id: userId, email: 'test@example.com' } },
            error: null,
          }),
        },
      }

      const { createServerClient } = require('@/lib/supabase/server-client')
      createServerClient.mockResolvedValue(mockSupabase)

      // Mock hyper-personalized engine
      const mockEngine = {
        generateRecommendations: jest.fn().mockResolvedValue(mockRecommendations),
      }

      jest.doMock('@/lib/ai/hyper-personalized-engine', () => ({
        hyperPersonalizedEngine: mockEngine,
      }))

      const request = new NextRequest('http://localhost:3000/api/ai/recommend?excludeWatched=true')
      const response = await recommendationsGET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(mockMemoryService.filterUnseenMovies).toHaveBeenCalledWith(
        userId,
        mockRecommendations
      )
      expect(data.recommendations).toEqual(filteredRecommendations)
    })
  })

  describe('Search API Memory Integration', () => {
    it('should apply user preferences to search results', async () => {
      const userId = 'test-user-id'
      const mockSearchResults = {
        movies: [
          { id: 'movie-1', title: 'Action Movie', genre: ['Action'], tmdb_id: 1 },
          { id: 'movie-2', title: 'Drama Movie', genre: ['Drama'], tmdb_id: 2 },
        ],
        searchContext: {},
        totalResults: 2,
      }
      const filteredResults = {
        movies: [
          { id: 'movie-2', title: 'Drama Movie', genre: ['Drama'], tmdb_id: 2 },
        ],
        searchContext: {},
        totalResults: 1,
      }

      // Mock memory service responses
      mockMemoryService.filterUnseenMovies.mockResolvedValue(filteredResults.movies)
      mockMemoryService.getUnifiedMemory.mockResolvedValue({
        seenMovieIds: new Set([1]),
        seenRecent: new Set([1]),
        ratedMovies: [],
        watchlistMovies: [],
        genrePreferences: new Map([['Drama', 0.8]]),
        recentInteractions: [],
        qualityThreshold: 7.0,
        explorationWeight: 0.2,
      })

      // Mock authentication
      const mockSupabase = {
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: { id: userId, email: 'test@example.com' } },
            error: null,
          }),
        },
      }

      const { createServerClient } = require('@/lib/supabase/server-client')
      createServerClient.mockResolvedValue(mockSupabase)

      // Mock search engine
      const mockSearchEngine = {
        executeSearch: jest.fn().mockResolvedValue(mockSearchResults),
      }

      jest.doMock('@/lib/ai/smart-search-engine', () => ({
        SmartSearchEngine: jest.fn().mockImplementation(() => mockSearchEngine),
      }))

      const request = new NextRequest('http://localhost:3000/api/movies/search', {
        method: 'POST',
        body: JSON.stringify({
          query: 'good drama movies',
          limit: 10,
        }),
      })

      const response = await searchPOST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(mockMemoryService.filterUnseenMovies).toHaveBeenCalledWith(
        userId,
        mockSearchResults.movies
      )
      expect(mockMemoryService.getUnifiedMemory).toHaveBeenCalledWith(userId)
    })
  })

  describe('Memory Service Error Handling', () => {
    it('should handle memory service errors gracefully in chat', async () => {
      const userId = 'test-user-id'

      // Mock memory service error
      mockMemoryService.enrichPromptWithMemory.mockRejectedValue(
        new Error('Memory service error')
      )

      // Mock authentication
      const mockSupabase = {
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: { id: userId, email: 'test@example.com' } },
            error: null,
          }),
        },
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { preferences: { ai_settings: { ai_provider: 'openai' } } },
                error: null,
              }),
            }),
          }),
        }),
      }

      const { createServerClient } = require('@/lib/supabase/server-client')
      createServerClient.mockResolvedValue(mockSupabase)

      // Mock AI service
      const mockAIService = {
        chat: jest.fn().mockResolvedValue({
          content: 'Here are some movie recommendations...',
          provider: 'openai',
          model: 'gpt-5-mini',
          usage: { totalTokens: 100 },
        }),
      }

      jest.doMock('@/lib/ai/service', () => ({
        aiService: mockAIService,
      }))

      const request = new NextRequest('http://localhost:3000/api/ai/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: 'I want to watch a good movie',
          stream: false,
        }),
      })

      const response = await chatPOST(request)
      const data = await response.json()

      // Should still work even with memory service error
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('should handle memory service errors gracefully in recommendations', async () => {
      const userId = 'test-user-id'
      const mockRecommendations = [
        { id: 'movie-1', title: 'Movie 1', tmdb_id: 1 },
      ]

      // Mock memory service error
      mockMemoryService.filterUnseenMovies.mockRejectedValue(
        new Error('Memory service error')
      )

      // Mock authentication
      const mockSupabase = {
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: { id: userId, email: 'test@example.com' } },
            error: null,
          }),
        },
      }

      const { createServerClient } = require('@/lib/supabase/server-client')
      createServerClient.mockResolvedValue(mockSupabase)

      // Mock hyper-personalized engine
      const mockEngine = {
        generateRecommendations: jest.fn().mockResolvedValue(mockRecommendations),
      }

      jest.doMock('@/lib/ai/hyper-personalized-engine', () => ({
        hyperPersonalizedEngine: mockEngine,
      }))

      const request = new NextRequest('http://localhost:3000/api/ai/recommend?excludeWatched=true')
      const response = await recommendationsGET(request)
      const data = await response.json()

      // Should still work even with memory service error
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.recommendations).toEqual(mockRecommendations)
    })
  })
})
