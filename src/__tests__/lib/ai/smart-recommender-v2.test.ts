/**
 * @jest-environment jsdom
 */

import { SmartRecommenderV2 } from '../../../lib/ai/smart-recommender-v2'
import type { Movie } from '../../../types'

// Mock the embedding service
const mockEmbeddingService = {
  generateEmbedding: jest.fn(),
  searchSimilarMovies: jest.fn(),
  searchUserMemories: jest.fn(),
  saveUserMemory: jest.fn(),
  getInstance: jest.fn(),
}

// Mock Supabase client with proper typing and full chain support
const createMockChain = () => {
  const chain = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn(),
    or: jest.fn().mockReturnThis(),
    not: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn(),
  }

  // Set default return values
  chain.single.mockResolvedValue({ data: null, error: null })
  chain.limit.mockResolvedValue({ data: [], error: null })

  return chain
}

const mockSupabaseClient = {
  from: jest.fn(() => createMockChain()),
} as any

// Mock environment variables
jest.mock('../../../lib/env', () => ({
  getSupabaseUrl: () => 'https://test.supabase.co',
  getSupabaseServiceRoleKey: () => 'test-service-role-key',
}))

// Mock embedding service with factory function to avoid TDZ
jest.mock('../../../lib/ai/embedding-service', () => ({
  embeddingService: {
    generateEmbedding: jest.fn(),
    generateMovieEmbeddings: jest.fn(),
    saveMovieEmbeddings: jest.fn(),
    searchSimilarMovies: jest.fn(),
    searchUserMemories: jest.fn(),
    saveUserMemory: jest.fn(),
    batchProcessMovies: jest.fn(),
    getInstance: jest.fn(),
  },
}))

// Mock Supabase client creation
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => mockSupabaseClient),
}))

describe('SmartRecommenderV2 - Tier 2 Intelligent Recommendations', () => {
  let smartRecommender: SmartRecommenderV2

  const mockMovies: Movie[] = [
    {
      id: 'movie-1',
      title: 'The Matrix',
      plot: 'A computer hacker learns about the true nature of reality',
      genre: ['Action', 'Sci-Fi'],
      director: ['Wachowski Sisters'],
      actors: ['Keanu Reeves', 'Laurence Fishburne'],
      year: 1999,
      rating: 8.7,
    },
    {
      id: 'movie-2',
      title: 'Blade Runner 2049',
      plot: 'A young blade runner discovers a secret that could plunge society into chaos',
      genre: ['Sci-Fi', 'Thriller'],
      director: ['Denis Villeneuve'],
      actors: ['Ryan Gosling', 'Harrison Ford'],
      year: 2017,
      rating: 8.0,
    },
    {
      id: 'movie-3',
      title: 'The Grand Budapest Hotel',
      plot: 'The adventures of a legendary concierge and his protégé',
      genre: ['Comedy', 'Drama'],
      director: ['Wes Anderson'],
      actors: ['Ralph Fiennes', 'F. Murray Abraham'],
      year: 2014,
      rating: 8.1,
    },
  ]

  beforeEach(async () => {
    smartRecommender = new SmartRecommenderV2()
    jest.clearAllMocks()

    // Get the mocked embedding service from the factory
    const { embeddingService } = await import('../../../lib/ai/embedding-service')
    const mockedEmbeddingService = embeddingService as jest.Mocked<typeof embeddingService>

    // Setup default mocks
    mockedEmbeddingService.generateEmbedding.mockResolvedValue({
      embedding: new Array(1536).fill(0.1),
      text: 'test',
      model: 'semantic-analyzer-v1',
      usage: { tokens: 10 },
    })

    mockedEmbeddingService.searchSimilarMovies.mockResolvedValue([
      { movieId: 'movie-1', title: 'The Matrix', similarity: 0.9 },
      { movieId: 'movie-2', title: 'Blade Runner 2049', similarity: 0.8 },
    ])

    mockedEmbeddingService.searchUserMemories.mockResolvedValue([
      {
        id: 'memory-1',
        content: 'User loves sci-fi movies',
        type: 'preference',
        metadata: { genre: 'sci-fi' },
        confidence: 0.9,
        similarity: 0.85,
        createdAt: '2023-01-01T00:00:00Z',
      },
    ])

    mockedEmbeddingService.saveUserMemory.mockResolvedValue(true)

    mockedEmbeddingService.generateMovieEmbeddings.mockResolvedValue({
      movieId: 'test-movie',
      title: 'Test Movie',
      plotEmbedding: new Array(1536).fill(0.1),
      metadataEmbedding: new Array(1536).fill(0.1),
      combinedEmbedding: new Array(1536).fill(0.1),
      contentText: 'test plot',
      metadataText: 'test metadata',
    })

    mockedEmbeddingService.saveMovieEmbeddings.mockResolvedValue(true)
    mockedEmbeddingService.batchProcessMovies.mockResolvedValue(3)

    // Mock movie data from Supabase - set up the chain to return mockMovies
    const chain1 = mockSupabaseClient.from()
    chain1.limit.mockResolvedValue({
      data: mockMovies,
      error: null,
    })

    const chain2 = mockSupabaseClient.from()
    chain2.limit.mockResolvedValue({
      data: mockMovies,
      error: null,
    })
  })

  describe('Smart Recommendations', () => {
    it('should generate recommendations based on user query', async () => {
      const options = {
        userId: 'test-user-1',
        userQuery: 'cyberpunk sci-fi movies',
        limit: 5,
        semanticThreshold: 0.7,
      }

      const result = await smartRecommender.getSmartRecommendations(options)

      // Get the mocked embedding service to check calls
      const { embeddingService } = await import('../../../lib/ai/embedding-service')
      const mockedEmbeddingService = embeddingService as jest.Mocked<typeof embeddingService>

      expect(result.movies).toBeDefined()
      expect(result.recommendations).toBeDefined()
      expect(result.insights).toBeDefined()
      expect(mockedEmbeddingService.generateEmbedding).toHaveBeenCalled()
    })

    it('should handle recommendations with preferred genres', async () => {
      const options = {
        userId: 'test-user-1',
        preferredGenres: ['Action', 'Sci-Fi'],
        limit: 3,
      }

      const result = await smartRecommender.getSmartRecommendations(options)

      // Get the mocked embedding service to check calls
      const { embeddingService } = await import('../../../lib/ai/embedding-service')
      const mockedEmbeddingService = embeddingService as jest.Mocked<typeof embeddingService>

      expect(result.movies).toBeDefined()
      expect(result.recommendations).toBeDefined()
      expect(mockedEmbeddingService.generateEmbedding).toHaveBeenCalled()
    })

    it('should incorporate mood into recommendations', async () => {
      const options = {
        userId: 'test-user-1',
        mood: 'dark and mysterious',
        limit: 5,
      }

      const result = await smartRecommender.getSmartRecommendations(options)

      // Get the mocked embedding service to check calls
      const { embeddingService } = await import('../../../lib/ai/embedding-service')
      const mockedEmbeddingService = embeddingService as jest.Mocked<typeof embeddingService>

      expect(result.movies).toBeDefined()
      expect(result.recommendations).toBeDefined()
      expect(mockedEmbeddingService.generateEmbedding).toHaveBeenCalled()
    })

    it('should handle empty results gracefully', async () => {
      mockSupabaseClient.from().select().or().limit.mockResolvedValue({
        data: [],
        error: null,
      })

      const options = {
        userId: 'test-user-1',
        userQuery: 'nonexistent genre',
        limit: 5,
      }

      const result = await smartRecommender.getSmartRecommendations(options)

      expect(result.movies).toBeDefined()
      expect(result.insights.semanticMatches).toBeDefined()
    })

    it('should apply diversity ranking', async () => {
      const options = {
        userId: 'test-user-1',
        userQuery: 'movies',
        limit: 10,
        diversityFactor: 0.5,
      }

      const result = await smartRecommender.getSmartRecommendations(options)

      expect(result.movies).toBeDefined()
      expect(result.insights.diversityScore).toBeGreaterThanOrEqual(0)
    })
  })

  describe('User Context Building', () => {
    it('should build user context from memories and preferences', async () => {
      const context = await (smartRecommender as any).buildUserContextVector({
        userId: 'test-user-1',
        userQuery: 'action movies',
      })

      expect(context).toBeDefined()
      expect(context.preferences).toBeDefined()
      expect(context.behavior).toBeDefined()
      expect(context.combined).toBeDefined()
      expect(context.confidence).toBeGreaterThan(0)
    })

    it('should handle users with no memories', async () => {
      mockEmbeddingService.searchUserMemories.mockResolvedValue([])

      const context = await (smartRecommender as any).buildUserContextVector({
        userId: 'new-user',
      })

      expect(context).toBeDefined()
      expect(context.preferences).toHaveLength(1536)
      expect(context.confidence).toBeGreaterThan(0)
    })
  })

  describe('Movie Enhancement', () => {
    it('should enhance movies with recommendation data', async () => {
      const userContext = {
        preferences: new Array(1536).fill(0.1),
        behavior: new Array(1536).fill(0.1),
        combined: new Array(1536).fill(0.1),
        confidence: 0.8,
      }

      const enhanced = await (smartRecommender as any).performSemanticMatching(
        mockMovies,
        userContext,
        { userId: 'test-user-1', userQuery: 'sci-fi movies' }
      )

      expect(enhanced).toHaveLength(mockMovies.length)
      expect(enhanced[0]).toHaveProperty('semanticSimilarity')
      expect(enhanced[0]).toHaveProperty('recommendationReason')
      expect(enhanced[0]).toHaveProperty('confidenceScore')
      expect(enhanced[0]).toHaveProperty('matchCategories')
    })

    it('should calculate semantic similarity correctly', async () => {
      const userContext = {
        preferences: new Array(1536).fill(0.5),
        behavior: new Array(1536).fill(0.5),
        combined: new Array(1536).fill(0.5),
        confidence: 0.8,
      }

      const enhanced = await (smartRecommender as any).performSemanticMatching(
        [mockMovies[0]], // The Matrix - Sci-Fi
        userContext,
        { userId: 'test-user-1', userQuery: 'sci-fi action movie' }
      )

      expect(enhanced[0]?.semanticSimilarity).toBeGreaterThanOrEqual(0)
      expect(enhanced[0]?.confidenceScore).toBeGreaterThan(0)
    })
  })

  describe('User Interaction Tracking', () => {
    it('should save user interactions', async () => {
      await smartRecommender.saveUserInteraction('test-user-1', 'movie-1', 'like', {
        rating: 5,
        timestamp: '2023-01-01T00:00:00Z',
      })

      // Get the mocked embedding service to check calls
      const { embeddingService } = await import('../../../lib/ai/embedding-service')
      const mockedEmbeddingService = embeddingService as jest.Mocked<typeof embeddingService>

      expect(mockedEmbeddingService.saveUserMemory).toHaveBeenCalledWith({
        userId: 'test-user-1',
        type: 'interaction',
        content: expect.stringContaining('liked'),
        metadata: expect.objectContaining({
          movieId: 'movie-1',
          interactionType: 'like',
        }),
        confidence: expect.any(Number),
      })
    })

    it('should handle different interaction types', async () => {
      const interactions = ['view', 'like', 'dislike', 'rate', 'search']

      for (const interaction of interactions) {
        await smartRecommender.saveUserInteraction('test-user-1', 'movie-1', interaction as any, {})
      }

      // Get the mocked embedding service to check calls
      const { embeddingService } = await import('../../../lib/ai/embedding-service')
      const mockedEmbeddingService = embeddingService as jest.Mocked<typeof embeddingService>

      expect(mockedEmbeddingService.saveUserMemory).toHaveBeenCalledTimes(interactions.length)
    })
  })

  describe('Recommendation Insights', () => {
    it('should generate meaningful insights', () => {
      const mockRecommendations = mockMovies.map(movie => ({
        ...movie,
        semanticSimilarity: 0.8,
        recommendationReason: 'Great sci-fi movie',
        confidenceScore: 0.9,
        matchCategories: ['semantic-match', 'genre-match'],
      }))

      const insights = (smartRecommender as any).generateInsights(mockRecommendations)

      expect(insights.primaryReasons).toHaveLength(3)
      expect(insights.semanticMatches).toBe(3) // All movies have similarity > 0.6
      expect(insights.memoryInfluences).toBe(3) // All have semantic-match category
      expect(insights.diversityScore).toBeGreaterThanOrEqual(0)
    })

    it('should calculate diversity score correctly', () => {
      const diverseMovies = [
        { ...mockMovies[0], genre: ['Action'] },
        { ...mockMovies[1], genre: ['Comedy'] },
        { ...mockMovies[2], genre: ['Drama'] },
      ].map(movie => ({
        ...movie,
        semanticSimilarity: 0.8,
        recommendationReason: 'Good movie',
        confidenceScore: 0.8,
        matchCategories: ['genre-match'],
      }))

      const insights = (smartRecommender as any).generateInsights(diverseMovies)

      expect(insights.diversityScore).toBe(1.0) // 3 unique genres / 3 movies
    })
  })

  describe('Error Handling', () => {
    it('should handle embedding service errors gracefully', async () => {
      // Get the mocked embedding service
      const { embeddingService } = await import('../../../lib/ai/embedding-service')
      const mockedEmbeddingService = embeddingService as jest.Mocked<typeof embeddingService>

      mockedEmbeddingService.generateEmbedding.mockRejectedValue(new Error('Embedding failed'))

      const options = {
        userId: 'test-user-1',
        userQuery: 'test query',
        limit: 5,
      }

      const result = await smartRecommender.getSmartRecommendations(options)

      // Should return fallback recommendations
      expect(result.movies).toBeDefined()
      expect(result.recommendations).toBeDefined()
      expect(result.insights).toBeDefined()
    })

    it('should handle database errors gracefully', async () => {
      mockSupabaseClient
        .from()
        .select()
        .or()
        .limit.mockResolvedValue({
          data: null,
          error: new Error('Database error'),
        })

      const options = {
        userId: 'test-user-1',
        userQuery: 'test query',
        limit: 5,
      }

      const result = await smartRecommender.getSmartRecommendations(options)

      // Should return fallback recommendations
      expect(result.movies).toBeDefined()
      expect(result.recommendations).toBeDefined()
    })

    it('should handle user memory save failures', async () => {
      // Get the mocked embedding service
      const { embeddingService } = await import('../../../lib/ai/embedding-service')
      const mockedEmbeddingService = embeddingService as jest.Mocked<typeof embeddingService>

      mockedEmbeddingService.saveUserMemory.mockResolvedValue(false)

      // Should not throw error, just log it
      await expect(
        smartRecommender.saveUserInteraction('test-user-1', 'movie-1', 'like', {})
      ).resolves.toBeUndefined()
    })
  })

  describe('Performance', () => {
    it('should handle large movie datasets efficiently', async () => {
      const largeMovieSet = Array.from({ length: 100 }, (_, i) => ({
        ...mockMovies[0],
        id: `movie-${i}`,
        title: `Movie ${i}`,
      }))

      mockSupabaseClient.from().select().or().limit.mockResolvedValue({
        data: largeMovieSet,
        error: null,
      })

      const startTime = Date.now()
      const result = await smartRecommender.getSmartRecommendations({
        userId: 'test-user-1',
        userQuery: 'action movies',
        limit: 20,
      })
      const endTime = Date.now()

      expect(result.movies).toBeDefined()
      expect(endTime - startTime).toBeLessThan(5000) // Should complete within 5 seconds
    })

    it('should limit memory searches appropriately', async () => {
      await (smartRecommender as any).buildUserContextVector({
        userId: 'test-user-1',
        userQuery: 'action movies',
      })

      // Get the mocked embedding service to check calls
      const { embeddingService } = await import('../../../lib/ai/embedding-service')
      const mockedEmbeddingService = embeddingService as jest.Mocked<typeof embeddingService>

      expect(mockedEmbeddingService.searchUserMemories).toHaveBeenCalledWith(
        'test-user-1',
        expect.any(String)
      )
    })
  })
})
