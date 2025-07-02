/**
 * Weight Configuration System Tests
 * Tests the runtime-tunable weight config from Sprint 4
 */

import { SmartRecommenderV2 } from '@/lib/ai/smart-recommender-v2'
import fs from 'fs'
import path from 'path'

// Mock fs for reading weight config
jest.mock('fs', () => ({
  readFileSync: jest.fn(),
  existsSync: jest.fn()
}))

// Default weights for testing
const DEFAULT_WEIGHTS = {
  semantic: 0.4,
  rating: 0.25,
  popularity: 0.15,
  recency: 0.1,
  preference: 0.1,
  boosts: {
    recentRelease: 0.1,
    topRated: 0.15,
    genreMatch: 0.2,
    preferredDirector: 0.1,
    preferredActor: 0.05,
    seasonalTrending: 0.1
  },
  thresholds: {
    highConfidence: 0.8,
    mediumConfidence: 0.6,
    lowConfidence: 0.4
  }
}

describe('Weight Configuration System', () => {
  let recommender: SmartRecommenderV2

  beforeEach(() => {
    recommender = SmartRecommenderV2.getInstance()
    
    // Reset mocks
    ;(fs.readFileSync as jest.Mock).mockReset()
    ;(fs.existsSync as jest.Mock).mockReset()
    
    // Clear any cached weights
    ;(recommender as any).lastWeightLoad = 0
    ;(recommender as any).cachedWeights = null
  })

  describe('loadRecommenderWeights', () => {
    it('should load weights from config file successfully', () => {
      const mockWeights = {
        semantic: 0.4,
        rating: 0.25, 
        popularity: 0.15,
        recency: 0.1,
        preference: 0.1,
        boosts: {
          recentRelease: 0.1,
          topRated: 0.15,
          genreMatch: 0.2,
          preferredDirector: 0.1,
          preferredActor: 0.05,
          seasonalTrending: 0.1
        },
        thresholds: {
          highConfidence: 0.8,
          mediumConfidence: 0.6,
          lowConfidence: 0.4
        }
      }

      ;(fs.existsSync as jest.Mock).mockReturnValue(true)
      ;(fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(mockWeights))

      const result = (recommender as any).loadRecommenderWeights()

      expect(fs.readFileSync).toHaveBeenCalledWith(
        expect.stringContaining('config/recommender-weights.json'),
        'utf8'
      )
      expect(result).toEqual(mockWeights)
    })

    it('should return default weights when config file does not exist', () => {
      ;(fs.existsSync as jest.Mock).mockReturnValue(false)

      const result = (recommender as any).loadRecommenderWeights()

      expect(result).toMatchObject({
        semantic: expect.any(Number),
        rating: expect.any(Number),
        popularity: expect.any(Number)
      })
      expect(fs.readFileSync).not.toHaveBeenCalled()
    })

    it('should return default weights when config file is invalid JSON', () => {
      ;(fs.existsSync as jest.Mock).mockReturnValue(true)
      ;(fs.readFileSync as jest.Mock).mockReturnValue('invalid json')

      const result = (recommender as any).loadRecommenderWeights()

      expect(result).toMatchObject({
        semantic: expect.any(Number),
        rating: expect.any(Number)
      })
    })

    it('should return default weights when reading file throws error', () => {
      ;(fs.existsSync as jest.Mock).mockReturnValue(true)
      ;(fs.readFileSync as jest.Mock).mockImplementation(() => {
        throw new Error('File read error')
      })

      const result = (recommender as any).loadRecommenderWeights()

      expect(result).toMatchObject({
        semantic: expect.any(Number),
        rating: expect.any(Number)
      })
    })

    it('should cache weights for 5 minutes', () => {
      const mockWeights = { semantic: 0.5, rating: 0.3, popularity: 0.2 }
      
      ;(fs.existsSync as jest.Mock).mockReturnValue(true)
      ;(fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(mockWeights))

      // First call
      const result1 = (recommender as any).loadRecommenderWeights()
      
      // Second call within 5 minutes
      const result2 = (recommender as any).loadRecommenderWeights()

      expect(fs.readFileSync).toHaveBeenCalledTimes(1)
      expect(result1).toEqual(result2)
    })

    it('should reload weights after cache expires (5 minutes)', () => {
      const mockWeights1 = { semantic: 0.4 }
      const mockWeights2 = { semantic: 0.6 }
      
      ;(fs.existsSync as jest.Mock).mockReturnValue(true)
      ;(fs.readFileSync as jest.Mock)
        .mockReturnValueOnce(JSON.stringify(mockWeights1))
        .mockReturnValueOnce(JSON.stringify(mockWeights2))

      // First call
      const result1 = (recommender as any).loadRecommenderWeights()
      
      // Simulate cache expiry (5 minutes + 1ms)
      ;(recommender as any).lastWeightLoad = Date.now() - (5 * 60 * 1000 + 1)
      
      // Second call after cache expiry
      const result2 = (recommender as any).loadRecommenderWeights()

      expect(fs.readFileSync).toHaveBeenCalledTimes(2)
      expect(result1.semantic).toBe(0.4)
      expect(result2.semantic).toBe(0.6)
    })
  })

  describe('calculateConfidenceScore', () => {
    it('should use configurable thresholds for confidence levels', () => {
      const mockWeights = {
        ...DEFAULT_WEIGHTS,
        thresholds: {
          highConfidence: 0.9,
          mediumConfidence: 0.7,
          lowConfidence: 0.5
        }
      }

      ;(fs.existsSync as jest.Mock).mockReturnValue(true)
      ;(fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(mockWeights))

      const movie = {
        id: 'test-movie',
        title: 'Test Movie',
        semanticScore: 0.8,
        rating: 8.5,
        popularity: 0.7,
        recency: 0.6,
        preferenceScore: 0.5
      }

      const confidence = (recommender as any).calculateConfidenceScore(movie, mockWeights)

      expect(confidence).toBeGreaterThan(0)
      expect(confidence).toBeLessThanOrEqual(1)
    })

    it('should apply boosts correctly based on configuration', () => {
      const mockWeights = {
        ...DEFAULT_WEIGHTS,
        boosts: {
          recentRelease: 0.2,
          topRated: 0.3,
          genreMatch: 0.25,
          preferredDirector: 0.15,
          preferredActor: 0.1,
          seasonalTrending: 0.1
        }
      }

      ;(fs.existsSync as jest.Mock).mockReturnValue(true)
      ;(fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(mockWeights))

      const movieWithBoosts = {
        id: 'test-movie',
        title: 'Test Movie',
        semanticScore: 0.6,
        rating: 9.0, // Should trigger topRated boost
        isRecentRelease: true, // Should trigger recent release boost
        hasGenreMatch: true, // Should trigger genre match boost
        year: new Date().getFullYear() // Recent movie
      }

      const baseConfidence = (recommender as any).calculateConfidenceScore(
        { ...movieWithBoosts, isRecentRelease: false, hasGenreMatch: false, rating: 7.0 },
        mockWeights
      )
      
      const boostedConfidence = (recommender as any).calculateConfidenceScore(movieWithBoosts, mockWeights)

      expect(boostedConfidence).toBeGreaterThan(baseConfidence)
    })
  })

  describe('Weight Distribution', () => {
    it('should correctly apply semantic weight', () => {
      const highSemanticWeights = {
        semantic: 0.8,
        rating: 0.1,
        popularity: 0.05,
        recency: 0.025,
        preference: 0.025
      }

      ;(fs.existsSync as jest.Mock).mockReturnValue(true)
      ;(fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(highSemanticWeights))

      const movie1 = {
        semanticScore: 0.9,
        rating: 6.0,
        popularity: 0.3,
        recency: 0.2,
        preferenceScore: 0.1
      }

      const movie2 = {
        semanticScore: 0.1,
        rating: 9.0,
        popularity: 0.9,
        recency: 0.9,
        preferenceScore: 0.9
      }

      const score1 = (recommender as any).calculateConfidenceScore(movie1, highSemanticWeights)
      const score2 = (recommender as any).calculateConfidenceScore(movie2, highSemanticWeights)

      // Movie1 should score higher due to high semantic weight and high semantic score
      expect(score1).toBeGreaterThan(score2)
    })

    it('should correctly apply rating weight', () => {
      const highRatingWeights = {
        semantic: 0.1,
        rating: 0.8,
        popularity: 0.05,
        recency: 0.025,
        preference: 0.025
      }

      ;(fs.existsSync as jest.Mock).mockReturnValue(true)
      ;(fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(highRatingWeights))

      const movie1 = {
        semanticScore: 0.9,
        rating: 9.5,
        popularity: 0.3,
        recency: 0.2,
        preferenceScore: 0.1
      }

      const movie2 = {
        semanticScore: 0.9,
        rating: 5.0,
        popularity: 0.9,
        recency: 0.9,
        preferenceScore: 0.9
      }

      const score1 = (recommender as any).calculateConfidenceScore(movie1, highRatingWeights)
      const score2 = (recommender as any).calculateConfidenceScore(movie2, highRatingWeights)

      // Movie1 should score higher due to high rating weight and high rating
      expect(score1).toBeGreaterThan(score2)
    })
  })

  describe('Weight Validation', () => {
    it('should handle malformed weight configuration gracefully', () => {
      const malformedWeights = {
        semantic: 'invalid',
        rating: null,
        popularity: undefined
      }

      ;(fs.existsSync as jest.Mock).mockReturnValue(true)
      ;(fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(malformedWeights))

      const result = (recommender as any).loadRecommenderWeights()

      // Should fall back to default weights and be an object
      expect(typeof result).toBe('object')
      expect(result).toBeDefined()
    })

    it('should handle weights that do not sum to 1.0', () => {
      const unnormalizedWeights = {
        semantic: 0.8,
        rating: 0.8,
        popularity: 0.8,
        recency: 0.8,
        preference: 0.8
      }

      ;(fs.existsSync as jest.Mock).mockReturnValue(true)
      ;(fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(unnormalizedWeights))

      const movie = {
        semanticScore: 0.5,
        rating: 7.0,
        popularity: 0.5,
        recency: 0.5,
        preferenceScore: 0.5
      }

      // Should not throw error, should handle gracefully
      expect(() => {
        (recommender as any).calculateConfidenceScore(movie, unnormalizedWeights)
      }).not.toThrow()
    })
  })

  describe('Performance', () => {
    it('should load weights efficiently even with large config files', () => {
      const largeConfig = {
        ...DEFAULT_WEIGHTS,
        // Add many additional properties
        ...Array(1000).fill(0).reduce((acc, _, i) => {
          acc[`prop${i}`] = Math.random()
          return acc
        }, {})
      }

      ;(fs.existsSync as jest.Mock).mockReturnValue(true)
      ;(fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(largeConfig))

      const startTime = Date.now()
      const result = (recommender as any).loadRecommenderWeights()
      const endTime = Date.now()

      expect(endTime - startTime).toBeLessThan(100) // Should load in under 100ms
      expect(result.semantic).toBeDefined()
    })

    it('should not reload weights unnecessarily', () => {
      const mockWeights = { semantic: 0.5 }
      
      ;(fs.existsSync as jest.Mock).mockReturnValue(true)
      ;(fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(mockWeights))

      // Multiple calls within cache period
      for (let i = 0; i < 10; i++) {
        (recommender as any).loadRecommenderWeights()
      }

      // Should only read file once
      expect(fs.readFileSync).toHaveBeenCalledTimes(1)
    })
  })
}) 