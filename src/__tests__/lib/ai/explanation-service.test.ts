/**
 * @jest-environment jsdom
 */

import { ExplanationService } from '@/lib/ai/explanation-service'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import Anthropic from '@anthropic-ai/sdk'

// Mock dependencies
jest.mock('@supabase/auth-helpers-nextjs')
jest.mock('@anthropic-ai/sdk')
jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}))

const mockSupabaseClient = {
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  upsert: jest.fn().mockReturnThis(),
  gte: jest.fn().mockReturnThis(),
  single: jest.fn(),
}

const mockAnthropic = {
  messages: {
    create: jest.fn(),
  },
}

const mockCreateRouteHandlerClient = createRouteHandlerClient as jest.MockedFunction<typeof createRouteHandlerClient>
const MockAnthropic = Anthropic as jest.MockedClass<typeof Anthropic>

beforeEach(() => {
  jest.clearAllMocks()
  mockCreateRouteHandlerClient.mockReturnValue(mockSupabaseClient as any)
  MockAnthropic.mockImplementation(() => mockAnthropic as any)
  
  // Mock environment variables
  process.env.ANTHROPIC_API_KEY = 'test-api-key'
})

describe('ExplanationService', () => {
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
  }

  const mockMovie = {
    id: 'movie-123',
    title: 'Test Movie',
    genre: ['Action', 'Thriller'],
    year: 2023,
    rating: 8.5,
    director: ['Test Director'],
    plot: 'A thrilling action movie',
  }

  const mockUserProfile = {
    favorite_genres: ['Action', 'Sci-Fi'],
    favorite_directors: ['Test Director'],
    quality_threshold: 7.0,
  }

  describe('Single Movie Explanation', () => {
    it('should generate explanation for a single movie', async () => {
      const mockExplanation = {
        confidence: 85,
        discovery_factor: 'safe' as const,
        primary_reason: 'Perfect match for your action preferences',
        supporting_evidence: ['High rating matches your quality standards', 'Director match'],
        optimal_viewing_time: 'Perfect for weekend evening',
      }

      mockAnthropic.messages.create.mockResolvedValueOnce({
        content: [{ text: JSON.stringify(mockExplanation) }],
      })

      // Mock cache miss
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: null,
        error: null,
      })

      // Mock cache insert
      mockSupabaseClient.insert.mockResolvedValueOnce({
        data: [{ id: 'explanation-123', ...mockExplanation }],
        error: null,
      })

      const service = new ExplanationService()
      const result = await service.getExplanation(
        mockUser.id,
        mockMovie.id,
        mockMovie
      )

      expect(result).toEqual(mockExplanation)
      expect(mockAnthropic.messages.create).toHaveBeenCalledWith({
        model: 'claude-3-haiku-20240307',
        max_tokens: 500,
        temperature: 0.3,
        messages: [
          {
            role: 'user',
            content: expect.stringContaining('Test Movie'),
          },
        ],
      })
    })

    it('should return cached explanation if available', async () => {
      const cachedExplanation = {
        confidence: 90,
        discovery_factor: 'stretch' as const,
        primary_reason: 'Cached explanation',
        supporting_evidence: ['Cached evidence'],
        optimal_viewing_time: 'Cached time',
      }

      // Mock cache hit
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: {
          explanation_data: cachedExplanation,
          created_at: new Date().toISOString(),
        },
        error: null,
      })

      const service = new ExplanationService()
      const result = await service.getExplanation(
        mockUser.id,
        mockMovie.id,
        mockMovie
      )

      expect(result).toEqual(cachedExplanation)
      expect(mockAnthropic.messages.create).not.toHaveBeenCalled()
    })

    it('should handle expired cached explanations', async () => {
      const expiredDate = new Date()
      expiredDate.setDate(expiredDate.getDate() - 8) // 8 days ago

      // Mock expired cache
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: {
          explanation_data: { confidence: 50 },
          created_at: expiredDate.toISOString(),
        },
        error: null,
      })

      const freshExplanation = {
        confidence: 88,
        discovery_factor: 'safe' as const,
        primary_reason: 'Fresh explanation',
        supporting_evidence: ['New evidence'],
        optimal_viewing_time: 'New time',
      }

      mockAnthropic.messages.create.mockResolvedValueOnce({
        content: [{ text: JSON.stringify(freshExplanation) }],
      })

      mockSupabaseClient.upsert.mockResolvedValueOnce({
        data: [freshExplanation],
        error: null,
      })

      const service = new ExplanationService()
      const result = await service.getExplanation(
        mockUser.id,
        mockMovie.id,
        mockMovie
      )

      expect(result).toEqual(freshExplanation)
      expect(mockAnthropic.messages.create).toHaveBeenCalled()
    })

    it('should handle API errors gracefully', async () => {
      // Mock cache miss
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: null,
        error: null,
      })

      mockAnthropic.messages.create.mockRejectedValueOnce(new Error('API Error'))

      const service = new ExplanationService()
      const result = await service.getExplanation(
        mockUser.id,
        mockMovie.id,
        mockMovie
      )

      expect(result).toEqual({
        confidence: 50,
        discovery_factor: 'safe',
        primary_reason: 'Movie recommendation based on your preferences',
        supporting_evidence: ['Matches your viewing history'],
        optimal_viewing_time: 'Great for any time',
      })
    })

    it('should handle invalid JSON response', async () => {
      // Mock cache miss
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: null,
        error: null,
      })

      mockAnthropic.messages.create.mockResolvedValueOnce({
        content: [{ text: 'Invalid JSON response' }],
      })

      const service = new ExplanationService()
      const result = await service.getExplanation(
        mockUser.id,
        mockMovie.id,
        mockMovie
      )

      expect(result).toEqual({
        confidence: 50,
        discovery_factor: 'safe',
        primary_reason: 'Movie recommendation based on your preferences',
        supporting_evidence: ['Matches your viewing history'],
        optimal_viewing_time: 'Great for any time',
      })
    })
  })

  describe('Batch Movie Explanations', () => {
    const mockMovies = [
      { ...mockMovie, id: 'movie-1', title: 'Movie 1' },
      { ...mockMovie, id: 'movie-2', title: 'Movie 2' },
      { ...mockMovie, id: 'movie-3', title: 'Movie 3' },
    ]

    it('should generate explanations for multiple movies', async () => {
      const mockBatchResponse = {
        explanations: [
          {
            movie_id: 'movie-1',
            confidence: 85,
            discovery_factor: 'safe',
            primary_reason: 'Perfect action match',
            supporting_evidence: ['High rating'],
            optimal_viewing_time: 'Evening',
          },
          {
            movie_id: 'movie-2',
            confidence: 75,
            discovery_factor: 'stretch',
            primary_reason: 'Different but interesting',
            supporting_evidence: ['Director match'],
            optimal_viewing_time: 'Weekend',
          },
          {
            movie_id: 'movie-3',
            confidence: 90,
            discovery_factor: 'safe',
            primary_reason: 'Excellent match',
            supporting_evidence: ['Genre and rating'],
            optimal_viewing_time: 'Anytime',
          },
        ],
      }

      mockAnthropic.messages.create.mockResolvedValueOnce({
        content: [{ text: JSON.stringify(mockBatchResponse) }],
      })

      // Mock no cached explanations
      mockSupabaseClient.single.mockResolvedValue({
        data: [],
        error: null,
      })

      mockSupabaseClient.insert.mockResolvedValueOnce({
        data: mockBatchResponse.explanations,
        error: null,
      })

      const service = new ExplanationService()
      const result = await service.getBatchExplanations(
        mockUser.id,
        mockMovies
      )

      expect(result.size).toBe(3)
      expect(result.has('movie-1')).toBe(true)
      expect(result.has('movie-2')).toBe(true)
      expect(result.has('movie-3')).toBe(true)

      expect(mockAnthropic.messages.create).toHaveBeenCalledWith({
        model: 'claude-3-haiku-20240307',
        max_tokens: 2000,
        temperature: 0.3,
        messages: [
          {
            role: 'user',
            content: expect.stringContaining('Movie 1'),
          },
        ],
      })
    })

    it('should mix cached and new explanations', async () => {
      // Mock one cached explanation
      const cachedExplanations = [
        {
          movie_id: 'movie-1',
          explanation_data: {
            confidence: 88,
            discovery_factor: 'safe',
            primary_reason: 'Cached explanation',
            supporting_evidence: ['Cached'],
            optimal_viewing_time: 'Cached time',
          },
          created_at: new Date().toISOString(),
        },
      ]

      mockSupabaseClient.select.mockResolvedValueOnce({
        data: cachedExplanations,
        error: null,
      })

      // Mock API response for remaining movies
      const newExplanations = {
        explanations: [
          {
            movie_id: 'movie-2',
            confidence: 75,
            discovery_factor: 'stretch',
            primary_reason: 'New explanation 2',
            supporting_evidence: ['New evidence 2'],
            optimal_viewing_time: 'New time 2',
          },
          {
            movie_id: 'movie-3',
            confidence: 80,
            discovery_factor: 'adventure',
            primary_reason: 'New explanation 3',
            supporting_evidence: ['New evidence 3'],
            optimal_viewing_time: 'New time 3',
          },
        ],
      }

      mockAnthropic.messages.create.mockResolvedValueOnce({
        content: [{ text: JSON.stringify(newExplanations) }],
      })

      mockSupabaseClient.insert.mockResolvedValueOnce({
        data: newExplanations.explanations,
        error: null,
      })

      const service = new ExplanationService()
      const result = await service.getBatchExplanations(
        mockUser.id,
        mockMovies
      )

      expect(result.size).toBe(3)
      expect(result.get('movie-1')?.primary_reason).toBe('Cached explanation')
      expect(result.get('movie-2')?.primary_reason).toBe('New explanation 2')
      expect(result.get('movie-3')?.primary_reason).toBe('New explanation 3')
    })

    it('should handle empty movie list', async () => {
      const service = new ExplanationService()
      const result = await service.getBatchExplanations(
        mockUser.id,
        []
      )

      expect(result.size).toBe(0)
      expect(mockAnthropic.messages.create).not.toHaveBeenCalled()
    })

    it('should handle batch API errors', async () => {
      // Mock no cached explanations
      mockSupabaseClient.select.mockResolvedValueOnce({
        data: [],
        error: null,
      })

      mockAnthropic.messages.create.mockRejectedValueOnce(new Error('Batch API Error'))

      const service = new ExplanationService()
      const result = await service.getBatchExplanations(
        mockUser.id,
        mockMovies
      )

      // Should return fallback explanations
      expect(result.size).toBe(3)
      result.forEach((explanation: any) => {
        expect(explanation.confidence).toBe(50)
        expect(explanation.discovery_factor).toBe('safe')
        expect(explanation.primary_reason).toBe('Movie recommendation based on your preferences')
      })
    })
  })

  describe('Rate Limiting', () => {
    it('should respect rate limiting', async () => {
      const rateLimitKey = `explanation_rate_limit:${mockUser.id}`
      
      // Mock cache to simulate rate limit hit
      mockSupabaseClient.single
        .mockResolvedValueOnce({
          data: null,
          error: null,
        })
        .mockResolvedValueOnce({
          data: { created_at: new Date().toISOString() },
          error: null,
        })

      const service = new ExplanationService()
      const result = await service.getExplanation(
        mockUser.id,
        mockMovie.id,
        mockMovie
      )

      expect(result).toEqual({
        confidence: 50,
        discovery_factor: 'safe',
        primary_reason: 'Movie recommendation based on your preferences',
        supporting_evidence: ['Matches your viewing history'],
        optimal_viewing_time: 'Great for any time',
      })

      expect(mockAnthropic.messages.create).not.toHaveBeenCalled()
    })

    it('should allow requests after rate limit expires', async () => {
      const expiredTime = new Date()
      expiredTime.setSeconds(expiredTime.getSeconds() - 11) // 11 seconds ago

      mockSupabaseClient.single
        .mockResolvedValueOnce({
          data: null,
          error: null,
        })
        .mockResolvedValueOnce({
          data: { created_at: expiredTime.toISOString() },
          error: null,
        })

      const mockExplanation = {
        confidence: 85,
        discovery_factor: 'safe' as const,
        primary_reason: 'Rate limit expired, generating new explanation',
        supporting_evidence: ['Fresh analysis'],
        optimal_viewing_time: 'Now available',
      }

      mockAnthropic.messages.create.mockResolvedValueOnce({
        content: [{ text: JSON.stringify(mockExplanation) }],
      })

      mockSupabaseClient.insert.mockResolvedValueOnce({
        data: [mockExplanation],
        error: null,
      })

      const service = new ExplanationService()
      const result = await service.getExplanation(
        mockUser.id,
        mockMovie.id,
        mockMovie
      )

      expect(result).toEqual(mockExplanation)
      expect(mockAnthropic.messages.create).toHaveBeenCalled()
    })
  })

  describe('Database Error Handling', () => {
    it('should handle database errors during cache lookup', async () => {
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database error' },
      })

      const mockExplanation = {
        confidence: 85,
        discovery_factor: 'safe' as const,
        primary_reason: 'Fallback explanation',
        supporting_evidence: ['Direct API call'],
        optimal_viewing_time: 'Available now',
      }

      mockAnthropic.messages.create.mockResolvedValueOnce({
        content: [{ text: JSON.stringify(mockExplanation) }],
      })

      const service = new ExplanationService()
      const result = await service.getExplanation(
        mockUser.id,
        mockMovie.id,
        mockMovie
      )

      expect(result).toEqual(mockExplanation)
    })

    it('should handle database errors during cache storage', async () => {
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: null,
        error: null,
      })

      const mockExplanation = {
        confidence: 85,
        discovery_factor: 'safe' as const,
        primary_reason: 'Generated explanation',
        supporting_evidence: ['API response'],
        optimal_viewing_time: 'Ready to watch',
      }

      mockAnthropic.messages.create.mockResolvedValueOnce({
        content: [{ text: JSON.stringify(mockExplanation) }],
      })

      mockSupabaseClient.insert.mockResolvedValueOnce({
        data: null,
        error: { message: 'Insert failed' },
      })

      const service = new ExplanationService()
      const result = await service.getExplanation(
        mockUser.id,
        mockMovie.id,
        mockMovie
      )

      // Should still return the explanation even if caching fails
      expect(result).toEqual(mockExplanation)
    })
  })

  describe('Configuration', () => {
    it('should use correct model configuration', async () => {
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: null,
        error: null,
      })

      mockAnthropic.messages.create.mockResolvedValueOnce({
        content: [{ text: '{"confidence": 85}' }],
      })

      const service = new ExplanationService()
      await service.getExplanation(mockUser.id, mockMovie.id, mockMovie)

      expect(mockAnthropic.messages.create).toHaveBeenCalledWith({
        model: 'claude-3-haiku-20240307',
        max_tokens: 500,
        temperature: 0.3,
        messages: expect.any(Array),
      })
    })

    it('should handle missing API key', async () => {
      delete process.env.ANTHROPIC_API_KEY

      const service = new ExplanationService()
      const result = await service.getExplanation(
        mockUser.id,
        mockMovie.id,
        mockMovie
      )

      expect(result).toEqual({
        confidence: 50,
        discovery_factor: 'safe',
        primary_reason: 'Movie recommendation based on your preferences',
        supporting_evidence: ['Matches your viewing history'],
        optimal_viewing_time: 'Great for any time',
      })
    })
  })
})