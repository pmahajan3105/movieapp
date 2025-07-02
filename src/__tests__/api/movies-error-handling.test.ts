/**
 * Movies API Error Handling Tests
 * 
 * Tests error scenarios specific to the movies API:
 * - Smart recommendations failures
 * - Behavioral analysis errors
 * - Real-time data fetch failures
 * - Movie service integration errors
 */

import { NextRequest } from 'next/server'

// Import API route handler
import { GET as moviesHandler } from '@/app/api/movies/route'

// Import setup mocks
import '../setupMocks'

// Mock handlers
jest.mock('@/app/api/movies/handlers', () => ({
  handleLegacyRequest: jest.fn(),
  handleRealTimeMovies: jest.fn(),
  handleSmartRecommendations: jest.fn(),
  handleBehavioralRecommendations: jest.fn(),
}))

jest.mock('@/lib/error-handling', () => ({
  APIErrorHandler: {
    handle: jest.fn().mockImplementation((error, context) => {
      return new Response(JSON.stringify({
        error: 'API Error',
        message: error.message,
        context: context.endpoint,
      }), { 
        status: 500,
        headers: { 'content-type': 'application/json' }
      })
    }),
  },
}))

// Helper to create mock NextRequest
function createNextRequest(url: string): NextRequest {
  const request = {
    method: 'GET',
    url: `http://localhost:3000${url}`,
    nextUrl: new URL(url, 'http://localhost:3000'),
  } as NextRequest

  return request
}

describe('Movies API Error Handling', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Smart Recommendations Error Scenarios', () => {
    it('should handle AI service unavailable', async () => {
      const { handleSmartRecommendations } = require('@/app/api/movies/handlers')
      
      handleSmartRecommendations.mockRejectedValue(
        new Error('AI service temporarily unavailable')
      )

      const request = createNextRequest('/api/movies?smart=true&query=action movies')

      const response = await moviesHandler(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('API Error')
      expect(data.message).toContain('AI service temporarily unavailable')
    })

    it('should handle invalid query parameters for smart mode', async () => {
      const { handleSmartRecommendations } = require('@/app/api/movies/handlers')
      
      handleSmartRecommendations.mockRejectedValue(
        new Error('Invalid query format')
      )

      const request = createNextRequest('/api/movies?smart=true&query=&mood=invalid')

      const response = await moviesHandler(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.message).toContain('Invalid query format')
    })

    it('should handle memory allocation errors in smart recommendations', async () => {
      const { handleSmartRecommendations } = require('@/app/api/movies/handlers')
      
      handleSmartRecommendations.mockRejectedValue(
        new Error('JavaScript heap out of memory')
      )

      const request = createNextRequest('/api/movies?smart=true&limit=1000')

      const response = await moviesHandler(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.message).toContain('JavaScript heap out of memory')
    })
  })

  describe('Behavioral Recommendations Error Scenarios', () => {
    it('should handle missing user behavior data', async () => {
      const { handleBehavioralRecommendations } = require('@/app/api/movies/handlers')
      
      handleBehavioralRecommendations.mockRejectedValue(
        new Error('No behavioral data available for user')
      )

      const request = createNextRequest('/api/movies?behavioral=true')

      const response = await moviesHandler(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.message).toContain('No behavioral data available for user')
    })

    it('should handle behavioral analysis service timeout', async () => {
      const { handleBehavioralRecommendations } = require('@/app/api/movies/handlers')
      
      handleBehavioralRecommendations.mockRejectedValue(
        new Error('Behavioral analysis timeout after 30s')
      )

      const request = createNextRequest('/api/movies?behavioral=true&limit=50')

      const response = await moviesHandler(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.message).toContain('Behavioral analysis timeout')
    })

    it('should handle corrupted user preference data', async () => {
      const { handleBehavioralRecommendations } = require('@/app/api/movies/handlers')
      
      handleBehavioralRecommendations.mockRejectedValue(
        new Error('Cannot parse user preference data: malformed JSON')
      )

      const request = createNextRequest('/api/movies?behavioral=true&includePreferenceInsights=true')

      const response = await moviesHandler(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.message).toContain('Cannot parse user preference data')
    })
  })

  describe('Real-time Data Error Scenarios', () => {
    it('should handle external movie database connection failure', async () => {
      const { handleRealTimeMovies } = require('@/app/api/movies/handlers')
      
      handleRealTimeMovies.mockRejectedValue(
        new Error('TMDB API connection refused')
      )

      const request = createNextRequest('/api/movies?realtime=true&database=tmdb')

      const response = await moviesHandler(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.message).toContain('TMDB API connection refused')
    })

    it('should handle rate limiting from external APIs', async () => {
      const { handleRealTimeMovies } = require('@/app/api/movies/handlers')
      
      handleRealTimeMovies.mockRejectedValue(
        new Error('TMDB API rate limit exceeded: 40 requests per 10 seconds')
      )

      const request = createNextRequest('/api/movies?realtime=true&query=popular')

      const response = await moviesHandler(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.message).toContain('rate limit exceeded')
    })

    it('should handle invalid database identifier', async () => {
      const { handleRealTimeMovies } = require('@/app/api/movies/handlers')
      
      handleRealTimeMovies.mockRejectedValue(
        new Error('Unknown database identifier: invalid_db')
      )

      const request = createNextRequest('/api/movies?realtime=true&database=invalid_db')

      const response = await moviesHandler(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.message).toContain('Unknown database identifier')
    })

    it('should handle partial data corruption in real-time feed', async () => {
      const { handleRealTimeMovies } = require('@/app/api/movies/handlers')
      
      handleRealTimeMovies.mockRejectedValue(
        new Error('Data integrity check failed: missing required fields')
      )

      const request = createNextRequest('/api/movies?realtime=true&limit=20')

      const response = await moviesHandler(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.message).toContain('Data integrity check failed')
    })
  })

  describe('Legacy Request Error Scenarios', () => {
    it('should handle legacy database schema incompatibility', async () => {
      const { handleLegacyRequest } = require('@/app/api/movies/handlers')
      
      handleLegacyRequest.mockRejectedValue(
        new Error('Legacy schema column "old_rating" not found')
      )

      const request = createNextRequest('/api/movies?genre=action')

      const response = await moviesHandler(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.message).toContain('Legacy schema column')
    })

    it('should handle legacy data migration errors', async () => {
      const { handleLegacyRequest } = require('@/app/api/movies/handlers')
      
      handleLegacyRequest.mockRejectedValue(
        new Error('Cannot migrate legacy movie format to new schema')
      )

      const request = createNextRequest('/api/movies?sort=legacy_rating')

      const response = await moviesHandler(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.message).toContain('Cannot migrate legacy movie format')
    })
  })

  describe('Parameter Validation Edge Cases', () => {
    it('should handle extremely large limit values', async () => {
      const { handleLegacyRequest } = require('@/app/api/movies/handlers')
      
      handleLegacyRequest.mockRejectedValue(
        new Error('Limit value 999999 exceeds maximum allowed (1000)')
      )

      const request = createNextRequest('/api/movies?limit=999999')

      const response = await moviesHandler(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.message).toContain('Limit value 999999 exceeds maximum')
    })

    it('should handle negative page numbers', async () => {
      const { handleLegacyRequest } = require('@/app/api/movies/handlers')
      
      handleLegacyRequest.mockRejectedValue(
        new Error('Page number must be positive')
      )

      const request = createNextRequest('/api/movies?page=-1')

      const response = await moviesHandler(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.message).toContain('Page number must be positive')
    })

    it('should handle malformed genre arrays', async () => {
      const { handleSmartRecommendations } = require('@/app/api/movies/handlers')
      
      handleSmartRecommendations.mockRejectedValue(
        new Error('Invalid genre format: expected comma-separated values')
      )

      const request = createNextRequest('/api/movies?smart=true&genres=[invalid]')

      const response = await moviesHandler(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.message).toContain('Invalid genre format')
    })

    it('should handle special characters in query parameters', async () => {
      const { handleSmartRecommendations } = require('@/app/api/movies/handlers')
      
      handleSmartRecommendations.mockRejectedValue(
        new Error('Query contains unsafe characters')
      )

      const request = createNextRequest('/api/movies?smart=true&query=<script>alert("xss")</script>')

      const response = await moviesHandler(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.message).toContain('Query contains unsafe characters')
    })
  })

  describe('Multiple Mode Conflicts', () => {
    it('should handle conflicting mode parameters', async () => {
      const { handleSmartRecommendations } = require('@/app/api/movies/handlers')
      
      handleSmartRecommendations.mockRejectedValue(
        new Error('Cannot use smart and behavioral modes simultaneously')
      )

      const request = createNextRequest('/api/movies?smart=true&behavioral=true')

      const response = await moviesHandler(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.message).toContain('Cannot use smart and behavioral modes simultaneously')
    })

    it('should handle realtime and smart mode combination issues', async () => {
      const { handleRealTimeMovies } = require('@/app/api/movies/handlers')
      
      handleRealTimeMovies.mockRejectedValue(
        new Error('Smart mode processing not available for real-time data')
      )

      const request = createNextRequest('/api/movies?realtime=true&smart=true')

      const response = await moviesHandler(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.message).toContain('Smart mode processing not available for real-time data')
    })
  })

  describe('Resource Exhaustion Scenarios', () => {
    it('should handle database connection pool exhaustion', async () => {
      const { createRouteSupabaseClient } = require('@/lib/supabase/route-client')
      
      createRouteSupabaseClient.mockImplementation(() => {
        throw new Error('Connection pool exhausted: all 20 connections in use')
      })

      const request = createNextRequest('/api/movies?behavioral=true')

      const response = await moviesHandler(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.message).toContain('Connection pool exhausted')
    })

    it('should handle concurrent request overload', async () => {
      const { handleBehavioralRecommendations } = require('@/app/api/movies/handlers')
      
      handleBehavioralRecommendations.mockRejectedValue(
        new Error('Server overloaded: too many concurrent requests')
      )

      const request = createNextRequest('/api/movies?behavioral=true&limit=100')

      const response = await moviesHandler(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.message).toContain('Server overloaded')
    })

    it('should handle memory pressure during large responses', async () => {
      const { handleLegacyRequest } = require('@/app/api/movies/handlers')
      
      handleLegacyRequest.mockRejectedValue(
        new Error('Response size exceeds memory limit: 50MB')
      )

      const request = createNextRequest('/api/movies?limit=10000')

      const response = await moviesHandler(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.message).toContain('Response size exceeds memory limit')
    })
  })

  describe('Error Handler Testing', () => {
    it('should properly invoke APIErrorHandler with context', async () => {
      const { APIErrorHandler } = require('@/lib/error-handling')
      const { handleLegacyRequest } = require('@/app/api/movies/handlers')
      
      const testError = new Error('Test error for handler')
      handleLegacyRequest.mockRejectedValue(testError)

      const request = createNextRequest('/api/movies?test=true')

      await moviesHandler(request)

      expect(APIErrorHandler.handle).toHaveBeenCalledWith(testError, {
        endpoint: '/api/movies',
        method: 'GET',
        metadata: expect.objectContaining({
          smartMode: false,
          behavioralMode: false,
          realTime: false,
          query: '',
          mood: '',
        }),
      })
    })

    it('should include all relevant metadata in error context', async () => {
      const { APIErrorHandler } = require('@/lib/error-handling')
      const { handleSmartRecommendations } = require('@/app/api/movies/handlers')
      
      const testError = new Error('Metadata test error')
      handleSmartRecommendations.mockRejectedValue(testError)

      const request = createNextRequest('/api/movies?smart=true&query=action&mood=excited&genres=action,comedy&limit=25&page=3')

      await moviesHandler(request)

      expect(APIErrorHandler.handle).toHaveBeenCalledWith(testError, {
        endpoint: '/api/movies',
        method: 'GET',
        metadata: expect.objectContaining({
          smartMode: true,
          behavioralMode: false,
          realTime: false,
          databaseId: null,
          query: 'action',
          mood: 'excited',
          genres: 'action,comedy',
          limit: 25,
          page: 3,
        }),
      })
    })
  })
})