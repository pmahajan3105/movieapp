/**
 * @jest-environment jsdom
 */

import { UnifiedAIService } from '@/lib/ai/unified-ai-service'
import { SmartRecommenderV2 } from '@/lib/ai/smart-recommender-v2'
import { ExplanationService } from '@/lib/ai/explanation-service'

// Mock dependencies
jest.mock('@/lib/ai/smart-recommender-v2')
jest.mock('@/lib/ai/explanation-service')
jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}))

const MockSmartRecommenderV2 = SmartRecommenderV2 as jest.MockedClass<typeof SmartRecommenderV2>
const mockExplanationService = ExplanationService as jest.Mocked<typeof ExplanationService>

const mockRecommenderInstance = {
  getSmartRecommendations: jest.fn(),
  analyzeBehavior: jest.fn(),
  computePersonalizedScores: jest.fn(),
}

beforeEach(() => {
  jest.clearAllMocks()
  // Mock the static getInstance method properly
  ;(MockSmartRecommenderV2.getInstance as jest.MockedFunction<typeof SmartRecommenderV2.getInstance>).mockReturnValue(mockRecommenderInstance as any)
})

describe('UnifiedAIService', () => {
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    profile: {
      id: 'profile-123',
      user_id: 'user-123',
      favorite_genres: ['Action', 'Sci-Fi'],
      favorite_directors: ['Christopher Nolan'],
      quality_threshold: 7.0,
      onboarding_completed: true,
    },
  }

  const mockMovies = [
    {
      id: 'movie-1',
      title: 'Inception',
      genre: ['Action', 'Sci-Fi'],
      year: 2010,
      rating: 8.8,
      director: ['Christopher Nolan'],
      plot: 'A thief who steals corporate secrets...',
    },
    {
      id: 'movie-2',
      title: 'The Matrix',
      genre: ['Action', 'Sci-Fi'],
      year: 1999,
      rating: 8.7,
      director: ['Lana Wachowski', 'Lilly Wachowski'],
      plot: 'A computer hacker learns...',
    },
  ]

  const mockRecommendations = {
    movies: mockMovies,
    metadata: {
      source: 'smart',
      personalization_applied: true,
      confidence_scores: { 'movie-1': 0.9, 'movie-2': 0.85 },
      diversity_score: 0.7,
    },
  }

  describe('Unified Recommendations', () => {
    it('should get recommendations with default parameters', async () => {
      mockRecommenderInstance.getSmartRecommendations.mockResolvedValueOnce(mockRecommendations)
      
      mockExplanationService.getBatchExplanations.mockResolvedValueOnce([
        {
          movie_id: 'movie-1',
          primary_reason: 'Perfect sci-fi match',
          explanation_type: 'similarity',
          confidence_score: 90,
          discovery_factor: 'safe',
          optimal_viewing_time: 'Evening',
          supporting_movies: ['Interstellar'],
        },
        {
          movie_id: 'movie-2',
          primary_reason: 'Classic sci-fi choice',
          explanation_type: 'similarity',
          confidence_score: 85,
          discovery_factor: 'safe',
          optimal_viewing_time: 'Weekend',
          supporting_movies: ['Blade Runner'],
        },
      ])

      const service = UnifiedAIService.getInstance()
      const result = await service.getRecommendations({
        userId: mockUser.id,
        algorithm: 'smart',
        context: {
          limit: 10,
          includeExplanations: true,
        },
      })

      expect(result.movies).toHaveLength(2)
      expect(result.algorithm).toBe('smart')
      expect(result.explanations?.size).toBe(2)
      expect(result.explanations?.has('movie-1')).toBe(true)
      expect(result.explanations?.has('movie-2')).toBe(true)

      expect(mockRecommenderInstance.getSmartRecommendations).toHaveBeenCalledWith(
        mockUser,
        expect.objectContaining({
          limit: 10,
          includeExplanations: false, // Should be false for recommender, handled separately
        })
      )
    })

    it('should handle hybrid strategy', async () => {
      mockRecommenderInstance.getSmartRecommendations.mockResolvedValueOnce(mockRecommendations)

      const service = UnifiedAIService.getInstance()
      const result = await service.getRecommendations(mockUser, {
        strategy: 'hybrid',
        limit: 15,
        diversityFactor: 0.8,
      })

      expect(result.movies).toHaveLength(2)
      expect(result.metadata.source).toBe('smart')
      expect(mockRecommenderInstance.getSmartRecommendations).toHaveBeenCalledWith(
        mockUser,
        expect.objectContaining({
          limit: 15,
          diversityFactor: 0.8,
        })
      )
    })

    it('should handle behavioral strategy', async () => {
      mockRecommenderInstance.analyzeBehavior.mockResolvedValueOnce({
        behavioral_patterns: {
          preferred_genres: ['Action', 'Sci-Fi'],
          quality_preference: 8.0,
          temporal_patterns: { preferred_times: ['evening'] },
        },
        confidence: 0.85,
      })

      mockRecommenderInstance.getSmartRecommendations.mockResolvedValueOnce(mockRecommendations)

      const service = UnifiedAIService.getInstance()
      const result = await service.getRecommendations(mockUser, {
        strategy: 'behavioral',
        limit: 12,
      })

      expect(result.movies).toHaveLength(2)
      expect(mockRecommenderInstance.analyzeBehavior).toHaveBeenCalledWith(mockUser.id)
    })

    it('should handle hyper-personalized strategy', async () => {
      mockRecommenderInstance.computePersonalizedScores.mockResolvedValueOnce({
        scores: { 'movie-1': 0.95, 'movie-2': 0.88 },
        factors: {
          genre_affinity: 0.9,
          quality_match: 0.85,
          director_preference: 0.8,
        },
      })

      mockRecommenderInstance.getSmartRecommendations.mockResolvedValueOnce(mockRecommendations)

      const service = UnifiedAIService.getInstance()
      const result = await service.getRecommendations(mockUser, {
        strategy: 'hyper-personalized',
        limit: 8,
      })

      expect(result.movies).toHaveLength(2)
      expect(mockRecommenderInstance.computePersonalizedScores).toHaveBeenCalled()
    })

    it('should handle query-based recommendations', async () => {
      mockRecommenderInstance.getSmartRecommendations.mockResolvedValueOnce(mockRecommendations)

      const service = UnifiedAIService.getInstance()
      const result = await service.getRecommendations(mockUser, {
        strategy: 'smart',
        query: 'sci-fi movies like Blade Runner',
        limit: 10,
      })

      expect(result.movies).toHaveLength(2)
      expect(mockRecommenderInstance.getSmartRecommendations).toHaveBeenCalledWith(
        mockUser,
        expect.objectContaining({
          query: 'sci-fi movies like Blade Runner',
        })
      )
    })

    it('should handle mood-based recommendations', async () => {
      mockRecommenderInstance.getSmartRecommendations.mockResolvedValueOnce(mockRecommendations)

      const service = UnifiedAIService.getInstance()
      const result = await service.getRecommendations(mockUser, {
        strategy: 'smart',
        mood: 'adventurous',
        limit: 10,
      })

      expect(result.movies).toHaveLength(2)
      expect(mockRecommenderInstance.getSmartRecommendations).toHaveBeenCalledWith(
        mockUser,
        expect.objectContaining({
          mood: 'adventurous',
        })
      )
    })

    it('should handle genre filtering', async () => {
      mockRecommenderInstance.getSmartRecommendations.mockResolvedValueOnce(mockRecommendations)

      const service = UnifiedAIService.getInstance()
      const result = await service.getRecommendations(mockUser, {
        strategy: 'smart',
        genres: ['Action', 'Thriller'],
        limit: 10,
      })

      expect(result.movies).toHaveLength(2)
      expect(mockRecommenderInstance.getSmartRecommendations).toHaveBeenCalledWith(
        mockUser,
        expect.objectContaining({
          genres: ['Action', 'Thriller'],
        })
      )
    })
  })

  describe('Error Handling', () => {
    it('should handle recommender service errors', async () => {
      mockRecommenderInstance.getSmartRecommendations.mockRejectedValueOnce(
        new Error('Recommendation service unavailable')
      )

      const service = UnifiedAIService.getInstance()
      const result = await service.getRecommendations(mockUser, {
        strategy: 'smart',
        limit: 10,
      })

      expect(result.movies).toEqual([])
      expect(result.metadata.source).toBe('error_fallback')
      expect(result.metadata.error).toBe('Recommendation service unavailable')
    })

    it('should handle explanation service errors gracefully', async () => {
      mockRecommenderInstance.getSmartRecommendations.mockResolvedValueOnce(mockRecommendations)
      mockExplanationService.getBatchExplanations.mockRejectedValueOnce(
        new Error('Explanation service failed')
      )

      const service = UnifiedAIService.getInstance()
      const result = await service.getRecommendations({
        userId: mockUser.id,
        algorithm: 'smart',
        context: {
          limit: 10,
          includeExplanations: true,
        },
      })

      expect(result.movies).toHaveLength(2)
      expect(result.explanations).toBeUndefined()
      expect(result.metadata.explanation_error).toBe('Explanation service failed')
    })

    it('should handle behavioral analysis errors', async () => {
      mockRecommenderInstance.analyzeBehavior.mockRejectedValueOnce(
        new Error('Behavioral analysis failed')
      )
      mockRecommenderInstance.getSmartRecommendations.mockResolvedValueOnce(mockRecommendations)

      const service = UnifiedAIService.getInstance()
      const result = await service.getRecommendations(mockUser, {
        strategy: 'behavioral',
        limit: 10,
      })

      expect(result.movies).toHaveLength(2)
      expect(result.metadata.behavioral_analysis_error).toBe('Behavioral analysis failed')
    })

    it('should handle personalized scoring errors', async () => {
      mockRecommenderInstance.computePersonalizedScores.mockRejectedValueOnce(
        new Error('Scoring failed')
      )
      mockRecommenderInstance.getSmartRecommendations.mockResolvedValueOnce(mockRecommendations)

      const service = UnifiedAIService.getInstance()
      const result = await service.getRecommendations(mockUser, {
        strategy: 'hyper-personalized',
        limit: 10,
      })

      expect(result.movies).toHaveLength(2)
      expect(result.metadata.personalization_error).toBe('Scoring failed')
    })
  })

  describe('Response Enhancement', () => {
    it('should enhance recommendations with confidence scores', async () => {
      const recommendationsWithScores = {
        ...mockRecommendations,
        metadata: {
          ...mockRecommendations.metadata,
          confidence_scores: { 'movie-1': 0.92, 'movie-2': 0.87 },
        },
      }

      mockRecommenderInstance.getSmartRecommendations.mockResolvedValueOnce(recommendationsWithScores)

      const service = UnifiedAIService.getInstance()
      const result = await service.getRecommendations(mockUser, {
        strategy: 'smart',
        limit: 10,
      })

      expect(result.metadata.confidence_scores).toEqual({
        'movie-1': 0.92,
        'movie-2': 0.87,
      })
    })

    it('should calculate overall confidence score', async () => {
      const recommendationsWithScores = {
        ...mockRecommendations,
        metadata: {
          ...mockRecommendations.metadata,
          confidence_scores: { 'movie-1': 0.9, 'movie-2': 0.8 },
        },
      }

      mockRecommenderInstance.getSmartRecommendations.mockResolvedValueOnce(recommendationsWithScores)

      const service = UnifiedAIService.getInstance()
      const result = await service.getRecommendations(mockUser, {
        strategy: 'smart',
        limit: 10,
      })

      expect(result.metadata.overall_confidence).toBe(0.85) // Average of 0.9 and 0.8
    })

    it('should include diversity metrics', async () => {
      const recommendationsWithDiversity = {
        ...mockRecommendations,
        metadata: {
          ...mockRecommendations.metadata,
          diversity_score: 0.75,
          genre_diversity: 0.8,
          year_diversity: 0.7,
        },
      }

      mockRecommenderInstance.getSmartRecommendations.mockResolvedValueOnce(recommendationsWithDiversity)

      const service = UnifiedAIService.getInstance()
      const result = await service.getRecommendations(mockUser, {
        strategy: 'smart',
        limit: 10,
      })

      expect(result.metadata.diversity_score).toBe(0.75)
      expect(result.metadata.genre_diversity).toBe(0.8)
      expect(result.metadata.year_diversity).toBe(0.7)
    })
  })

  describe('Performance and Caching', () => {
    it('should handle concurrent requests efficiently', async () => {
      mockRecommenderInstance.getSmartRecommendations.mockResolvedValue(mockRecommendations)

      const requests = Array(5).fill(null).map(() =>
        UnifiedAIService.getRecommendations(mockUser, {
          strategy: 'smart',
          limit: 10,
        })
      )

      const results = await Promise.all(requests)

      expect(results).toHaveLength(5)
      results.forEach(result => {
        expect(result.movies).toHaveLength(2)
      })
    })

    it('should respect timeout limits', async () => {
      mockRecommenderInstance.getSmartRecommendations.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 10000))
      )

      const startTime = Date.now()
      
      const service = UnifiedAIService.getInstance()
      const result = await service.getRecommendations(mockUser, {
        strategy: 'smart',
        limit: 10,
      })

      const duration = Date.now() - startTime
      
      expect(duration).toBeLessThan(10000) // Should timeout before 10 seconds
      expect(result.movies).toEqual([])
      expect(result.metadata.source).toBe('error_fallback')
    })

    it('should handle memory-efficient large responses', async () => {
      const largeMovieSet = Array(1000).fill(null).map((_, index) => ({
        ...mockMovies[0],
        id: `movie-${index}`,
        title: `Movie ${index}`,
      }))

      const largeRecommendations = {
        movies: largeMovieSet,
        metadata: {
          source: 'smart',
          personalization_applied: true,
          confidence_scores: Object.fromEntries(
            largeMovieSet.map(movie => [movie.id, Math.random()])
          ),
        },
      }

      mockRecommenderInstance.getSmartRecommendations.mockResolvedValueOnce(largeRecommendations)

      const service = UnifiedAIService.getInstance()
      const result = await service.getRecommendations(mockUser, {
        strategy: 'smart',
        limit: 1000,
      })

      expect(result.movies).toHaveLength(1000)
      expect(Object.keys(result.metadata.confidence_scores!)).toHaveLength(1000)
    })
  })

  describe('Configuration and Validation', () => {
    it('should validate request parameters', async () => {
      mockRecommenderInstance.getSmartRecommendations.mockResolvedValueOnce(mockRecommendations)

      const service = UnifiedAIService.getInstance()
      const result = await service.getRecommendations(mockUser, {
        strategy: 'smart',
        limit: -5, // Invalid limit
      })

      expect(mockRecommenderInstance.getSmartRecommendations).toHaveBeenCalledWith(
        mockUser,
        expect.objectContaining({
          limit: 10, // Should default to 10
        })
      )
    })

    it('should handle missing user profile', async () => {
      const userWithoutProfile = {
        ...mockUser,
        profile: undefined,
      }

      mockRecommenderInstance.getSmartRecommendations.mockResolvedValueOnce(mockRecommendations)

      const service = UnifiedAIService.getInstance()
      const result = await service.getRecommendations(userWithoutProfile, {
        strategy: 'smart',
        limit: 10,
      })

      expect(result.movies).toHaveLength(2)
      expect(result.metadata.profile_warning).toBe('User profile incomplete')
    })

    it('should handle unknown strategy gracefully', async () => {
      mockRecommenderInstance.getSmartRecommendations.mockResolvedValueOnce(mockRecommendations)

      const service = UnifiedAIService.getInstance()
      const result = await service.getRecommendations(mockUser, {
        strategy: 'unknown' as any,
        limit: 10,
      })

      expect(result.movies).toHaveLength(2)
      expect(mockRecommenderInstance.getSmartRecommendations).toHaveBeenCalledWith(
        mockUser,
        expect.objectContaining({
          // Should default to smart strategy behavior
        })
      )
    })
  })

  describe('Metadata and Analytics', () => {
    it('should include request timing information', async () => {
      mockRecommenderInstance.getSmartRecommendations.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(mockRecommendations), 100))
      )

      const service = UnifiedAIService.getInstance()
      const result = await service.getRecommendations(mockUser, {
        strategy: 'smart',
        limit: 10,
      })

      expect(result.metadata.processing_time_ms).toBeGreaterThan(90)
      expect(result.metadata.processing_time_ms).toBeLessThan(200)
    })

    it('should include component timing breakdown', async () => {
      mockRecommenderInstance.getSmartRecommendations.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(mockRecommendations), 50))
      )

      mockExplanationService.getBatchExplanations.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve([]), 30))
      )

      const service = UnifiedAIService.getInstance()
      const result = await service.getRecommendations({
        userId: mockUser.id,
        algorithm: 'smart',
        context: {
          limit: 10,
          includeExplanations: true,
        },
      })

      expect(result.metadata.component_timing).toMatchObject({
        recommendation_ms: expect.any(Number),
        explanation_ms: expect.any(Number),
      })
    })
  })
})