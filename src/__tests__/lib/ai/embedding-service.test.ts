/**
 * @jest-environment node
 */

import { EmbeddingService } from '@/lib/ai/embedding-service'
import type { Movie } from '@/types'

// Mock Supabase client with proper typing
const mockSupabaseClient = {
  from: jest.fn(() => ({
    insert: jest.fn(() => ({ select: jest.fn(() => Promise.resolve({ data: [], error: null })) })),
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        single: jest.fn(() =>
          Promise.resolve({ data: { combined_embedding: new Array(1536).fill(0.1) }, error: null })
        ),
      })),
      rpc: jest.fn(),
    })),
  })),
}

// Mock environment variables
jest.mock('@/lib/env', () => ({
  getSupabaseUrl: () => 'https://test.supabase.co',
  getSupabaseServiceRoleKey: () => 'test-service-role-key',
}))

// Mock Supabase client creation
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => mockSupabaseClient),
}))

describe('EmbeddingService - Tier 2 Vector Embeddings', () => {
  let embeddingService: EmbeddingService

  beforeEach(() => {
    embeddingService = EmbeddingService.getInstance()
    jest.clearAllMocks()
  })

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = EmbeddingService.getInstance()
      const instance2 = EmbeddingService.getInstance()
      expect(instance1).toBe(instance2)
    })
  })

  describe('Embedding Generation', () => {
    it('should generate embeddings with correct dimensions', async () => {
      const result = await embeddingService.generateEmbedding('Test movie plot', 'movie')

      expect(result.embedding).toHaveLength(1536)
      expect(result.text).toBe('Test movie plot')
      expect(result.model).toBe('semantic-analyzer-v1')
      expect(result.usage?.tokens).toBeGreaterThan(0)
    })

    it('should handle empty text gracefully', async () => {
      const result = await embeddingService.generateEmbedding('', 'movie')

      expect(result.embedding).toHaveLength(1536)
      expect(result.model).toBe('semantic-analyzer-v1')
    })

    it('should generate different embeddings for different text', async () => {
      const result1 = await embeddingService.generateEmbedding(
        'Action movie with explosions',
        'movie'
      )
      const result2 = await embeddingService.generateEmbedding(
        'Romantic comedy with humor',
        'movie'
      )

      expect(result1.embedding).not.toEqual(result2.embedding)
    })

    it('should fallback to basic embedding on error', async () => {
      // Force an error in semantic embedding
      const originalMethod = (embeddingService as any)['createSemanticEmbedding']
      ;(embeddingService as any)['createSemanticEmbedding'] = jest
        .fn()
        .mockRejectedValue(new Error('Test error'))

      const result = await embeddingService.generateEmbedding('Test text', 'movie')

      expect(result.embedding).toHaveLength(1536)
      expect(result.model).toBe('basic-fallback')

      // Restore original method
      ;(embeddingService as any)['createSemanticEmbedding'] = originalMethod
    })
  })

  describe('Movie Embeddings', () => {
    const mockMovie: Movie = {
      id: 'test-movie-1',
      title: 'Test Movie',
      plot: 'A thrilling action movie with explosions and car chases',
      genre: ['Action', 'Thriller'],
      director: ['Test Director'],
      actors: ['Test Actor 1', 'Test Actor 2'],
      year: 2023,
      rating: 8.5,
    }

    it('should generate movie embeddings with all vector types', async () => {
      const result = await embeddingService.generateMovieEmbeddings(mockMovie)

      expect(result.movieId).toBe('test-movie-1')
      expect(result.title).toBe('Test Movie')
      expect(result.plotEmbedding).toHaveLength(1536)
      expect(result.metadataEmbedding).toHaveLength(1536)
      expect(result.combinedEmbedding).toHaveLength(1536)
      expect(result.contentText).toContain('thrilling action movie')
      expect(result.metadataText).toContain('Action, Thriller')
    })

    it('should handle movies with missing fields', async () => {
      const incompleteMovie: Movie = {
        id: 'incomplete-movie',
        title: 'Incomplete Movie',
      }

      const result = await embeddingService.generateMovieEmbeddings(incompleteMovie)

      expect(result.movieId).toBe('incomplete-movie')
      expect(result.plotEmbedding).toHaveLength(1536)
      expect(result.metadataEmbedding).toHaveLength(1536)
      expect(result.combinedEmbedding).toHaveLength(1536)
    })
  })

  describe('Semantic Feature Extraction', () => {
    it('should extract genre features correctly', () => {
      const features = (embeddingService as any)['extractSemanticFeatures'](
        'This is an action movie with comedy elements'
      )

      // Should detect action and comedy genres
      expect(features[0]).toBe(1.0) // action
      expect(features[1]).toBe(1.0) // comedy
      expect(features[2]).toBe(0.0) // drama (not present)
    })

    it('should extract mood features', () => {
      const features = (embeddingService as any)['extractSemanticFeatures'](
        'A dark and mysterious thriller'
      )

      // Should detect dark and mysterious moods
      expect(features.slice(10, 20)).toContain(0.8) // dark mood
      expect(features.slice(10, 20)).toContain(0.8) // mysterious mood
    })

    it('should extract quality indicators', () => {
      const features = (embeddingService as any)['extractSemanticFeatures'](
        'An award-winning masterpiece'
      )

      // Should detect quality words
      const qualityFeature = features[features.length - 3] // Quality score is near the end
      expect(qualityFeature).toBeGreaterThan(0)
    })
  })

  describe('User Memory System', () => {
    const mockUserMemory = {
      userId: 'test-user-1',
      type: 'preference' as const,
      content: 'User loves action movies with strong female leads',
      metadata: { genre: 'action', preference: 'strong-female-leads' },
      confidence: 0.9,
    }

    it('should save user memory successfully', async () => {
      const result = await embeddingService.saveUserMemory(mockUserMemory)

      expect(result).toBe(true)
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('user_memories')
    })

    it('should search user memories with similarity', async () => {
      const mockSearchResults = [
        {
          id: 'memory-1',
          memory_type: 'preference',
          content: 'User loves action movies',
          metadata: { genre: 'action' },
          confidence: 0.9,
          similarity: 0.85,
          created_at: '2023-01-01T00:00:00Z',
        },
      ]

      // Mock the RPC call properly
      const mockRpc = jest.fn(() => Promise.resolve({ data: mockSearchResults, error: null }))
      mockSupabaseClient.from().select().rpc = mockRpc

      const results = await embeddingService.searchUserMemories(
        'test-user-1',
        'action movies',
        ['preference'],
        0.7,
        5
      )

      expect(results).toHaveLength(1)
      expect(results[0]?.content).toBe('User loves action movies')
      expect(results[0]?.similarity).toBe(0.85)
    })
  })

  describe('Movie Similarity Search', () => {
    it('should search for similar movies', async () => {
      const mockSearchResults = [
        {
          movie_id: 'movie-1',
          title: 'Similar Movie',
          similarity: 0.92,
        },
      ]

      // Mock the RPC call properly
      const mockRpc = jest.fn(() => Promise.resolve({ data: mockSearchResults, error: null }))
      mockSupabaseClient.from().select().rpc = mockRpc

      const results = await embeddingService.searchSimilarMovies('cyberpunk thriller', 0.8, 10)

      expect(results).toHaveLength(1)
      expect(results[0]?.movieId).toBe('movie-1')
      expect(results[0]?.title).toBe('Similar Movie')
      expect(results[0]?.similarity).toBe(0.92)
    })

    it('should handle search errors gracefully', async () => {
      // Mock the RPC call to return error
      const mockRpc = jest.fn(() =>
        Promise.resolve({ data: null, error: new Error('Search failed') })
      )
      mockSupabaseClient.from().select().rpc = mockRpc

      const results = await embeddingService.searchSimilarMovies('test query')

      expect(results).toEqual([])
    })
  })

  describe('Batch Processing', () => {
    it('should process movies in batches', async () => {
      const movies: Movie[] = Array.from({ length: 12 }, (_, i) => ({
        id: `movie-${i}`,
        title: `Movie ${i}`,
        plot: `Plot for movie ${i}`,
      }))

      const processedCount = await embeddingService.batchProcessMovies(movies, 5)

      expect(processedCount).toBe(12)
      // Should have made 3 batch calls (5 + 5 + 2)
      expect(mockSupabaseClient.from).toHaveBeenCalledTimes(12) // One call per movie
    })
  })

  describe('Error Handling', () => {
    it('should handle database connection errors', async () => {
      mockSupabaseClient.from = jest.fn(() => {
        throw new Error('Database connection failed')
      })

      const result = await embeddingService.saveUserMemory({
        userId: 'test-user',
        type: 'preference',
        content: 'test content',
        metadata: {},
        confidence: 0.8,
      })

      expect(result).toBe(false)
    })

    it('should handle malformed embedding data', async () => {
      const result = await embeddingService.generateEmbedding('test', 'movie')

      // Should still return valid embedding structure
      expect(result).toHaveProperty('embedding')
      expect(result).toHaveProperty('text')
      expect(result).toHaveProperty('model')
    })
  })
})
