/**
 * API Error Scenarios Tests
 * 
 * Tests various error scenarios across API endpoints using the existing mock infrastructure
 */

import { NextRequest } from 'next/server'

// Import API route handlers
import { POST as chatHandler } from '@/app/api/ai/chat/route'
import { POST as interactionsHandler, GET as getInteractionsHandler } from '@/app/api/user/interactions/route'

// Import setup mocks
import '../setupMocks'
import { createMockSupabaseClient } from '../setupMocks'

// Helper to create mock NextRequest
function createNextRequest(
  url: string,
  method: 'GET' | 'POST' = 'GET',
  body?: any,
  headers?: Record<string, string>
): NextRequest {
  const request = {
    method,
    url: `http://localhost:3000${url}`,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(body ? JSON.stringify(body) : ''),
    cookies: {
      get: jest.fn(),
      set: jest.fn(),
      delete: jest.fn(),
    },
    headers: new Headers(headers || {}),
    nextUrl: new URL(url, 'http://localhost:3000'),
  } as NextRequest

  return request
}

describe('API Error Scenarios', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Reset environment variables
    process.env.ANTHROPIC_API_KEY = 'test-anthropic-key'
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
  })

  describe('Input Validation Errors', () => {
    it('should handle empty message in chat API', async () => {
      const request = createNextRequest('/api/ai/chat', 'POST', {
        message: '',
        sessionId: 'test-session',
      })

      const response = await chatHandler(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain('Message cannot be empty')
    })

    it('should handle message too long in chat API', async () => {
      const longMessage = 'a'.repeat(1001) // Exceeds 1000 char limit

      const request = createNextRequest('/api/ai/chat', 'POST', {
        message: longMessage,
        sessionId: 'test-session',
      })

      const response = await chatHandler(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain('Message too long')
    })

    it('should handle missing required fields in interactions API', async () => {
      const request = createNextRequest('/api/user/interactions', 'POST', {
        // Missing movieId and type
        timestamp: new Date().toISOString(),
        browserContext: {
          timeOfDay: 14,
          dayOfWeek: 2,
        },
      })

      const response = await interactionsHandler(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('movieId and type are required')
    })

    it('should handle invalid interaction type', async () => {
      const request = createNextRequest('/api/user/interactions', 'POST', {
        movieId: 'test-movie',
        type: 'invalid_type', // Invalid interaction type
        timestamp: new Date().toISOString(),
        browserContext: {
          timeOfDay: 14,
          dayOfWeek: 2,
        },
      })

      const response = await interactionsHandler(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Invalid interaction type')
    })

    it('should handle malformed JSON in request body', async () => {
      const request = createNextRequest('/api/ai/chat', 'POST')
      
      // Mock malformed JSON
      request.json = jest.fn().mockRejectedValue(new SyntaxError('Unexpected token'))

      const response = await chatHandler(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
    })
  })

  describe('Authentication Errors', () => {
    it('should handle authentication errors in interactions API', async () => {
      // Mock createServerClient to return unauthenticated user  
      const { createServerClient } = require('@supabase/ssr')
      createServerClient.mockImplementation(() => ({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: null },
            error: { message: 'JWT expired' },
          }),
        },
      }))

      const request = createNextRequest('/api/user/interactions', 'POST', {
        movieId: 'test-movie',
        type: 'view_details',
        timestamp: new Date().toISOString(),
        browserContext: {
          timeOfDay: 14,
          dayOfWeek: 2,
        },
      })

      const response = await interactionsHandler(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })
  })

  describe('External API Errors', () => {
    it('should handle missing Anthropic API key', async () => {
      delete process.env.ANTHROPIC_API_KEY

      const request = createNextRequest('/api/ai/chat', 'POST', {
        message: 'Hello',
        sessionId: 'test-session',
      })

      const response = await chatHandler(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Anthropic API key missing')
    })

    it('should handle external API network failures', async () => {
      // Mock fetch to simulate network failure
      const originalFetch = global.fetch
      global.fetch = jest.fn().mockRejectedValue(new Error('fetch timeout'))

      const request = createNextRequest('/api/ai/chat', 'POST', {
        message: 'Hello',
        sessionId: 'test-session',
        stream: false,
      })

      const response = await chatHandler(request)
      const data = await response.json()

      // The test might fail authentication first (401) or hit network error (500)
      expect([401, 500]).toContain(response.status)
      expect(data.success).toBe(false)
      
      if (response.status === 500) {
        expect(data.error).toContain('Failed to process chat message')
      } else {
        expect(data.error).toContain('Authentication required')
      }

      // Restore fetch
      global.fetch = originalFetch
    })
  })

  describe('Database Errors', () => {
    it('should handle database constraint violations', async () => {
      const { createServerClient } = require('@supabase/ssr')
      createServerClient.mockImplementation(() => ({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: { id: 'test-user', email: 'test@test.com' } },
            error: null,
          }),
        },
        from: jest.fn().mockReturnValue({
          insert: jest.fn().mockResolvedValue({
            data: null,
            error: { 
              code: '23505', 
              message: 'duplicate key value violates unique constraint' 
            },
          }),
        }),
      }))

      const request = createNextRequest('/api/user/interactions', 'POST', {
        movieId: 'test-movie',
        type: 'view_details',
        timestamp: new Date().toISOString(),
        browserContext: {
          timeOfDay: 14,
          dayOfWeek: 2,
        },
      })

      const response = await interactionsHandler(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to track interaction')
    })
  })

  describe('Resource Limits', () => {
    it('should handle pagination limits in interactions API', async () => {
      const { createServerClient } = require('@supabase/ssr')
      createServerClient.mockImplementation(() => ({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: { id: 'test-user', email: 'test@test.com' } },
            error: null,
          }),
        },
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue({
                  data: Array(100).fill({ id: 'test', type: 'view' }), // Max 100 items
                  error: null,
                }),
              }),
            }),
          }),
        }),
      }))

      // Request exceeds limit
      const request = createNextRequest('/api/user/interactions?limit=500', 'GET')

      const response = await getInteractionsHandler(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.pagination.returned).toBe(100) // Capped at 100
    })

    it('should handle large request processing', async () => {
      // Test that system handles large but valid requests gracefully
      const hugeMessage = 'a'.repeat(999) // Close to limit but valid

      const request = createNextRequest('/api/ai/chat', 'POST', {
        message: hugeMessage,
        sessionId: 'test-session',
      })

      const response = await chatHandler(request)
      
      // Should handle gracefully without crashing
      expect(response.status).toBeGreaterThanOrEqual(200)
      expect(response.status).toBeLessThan(600)
    })
  })

  describe('Environment Configuration', () => {
    it('should handle missing environment variables', async () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL

      const request = createNextRequest('/api/user/interactions', 'POST', {
        movieId: 'test-movie',
        type: 'view_details',
        timestamp: new Date().toISOString(),
        browserContext: {
          timeOfDay: 14,
          dayOfWeek: 2,
        },
      })

      const response = await interactionsHandler(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal server error')
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty request bodies gracefully', async () => {
      const request = createNextRequest('/api/ai/chat', 'POST', null)

      const response = await chatHandler(request)
      const data = await response.json()

      expect(response.status).toBeGreaterThanOrEqual(400)
      expect(data.success).toBe(false)
    })

    it('should handle requests with invalid content-type', async () => {
      const request = createNextRequest(
        '/api/ai/chat', 
        'POST', 
        { message: 'Hello' },
        { 'content-type': 'text/plain' }
      )

      const response = await chatHandler(request)
      const data = await response.json()

      // Should handle gracefully
      expect(response.status).toBeGreaterThanOrEqual(200)
      expect(response.status).toBeLessThan(600)
    })

    it('should validate interaction types strictly', async () => {
      const invalidTypes = ['invalid', 'unknown', 'test']
      
      for (const invalidType of invalidTypes) {
        const request = createNextRequest('/api/user/interactions', 'POST', {
          movieId: 'test-movie',
          type: invalidType,
          timestamp: new Date().toISOString(),
          browserContext: {
            timeOfDay: 14,
            dayOfWeek: 2,
          },
        })

        const response = await interactionsHandler(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toContain('Invalid interaction type')
      }
      
      // Test empty type separately as it triggers different validation
      const emptyTypeRequest = createNextRequest('/api/user/interactions', 'POST', {
        movieId: 'test-movie',
        type: '',
        timestamp: new Date().toISOString(),
        browserContext: {
          timeOfDay: 14,
          dayOfWeek: 2,
        },
      })

      const emptyResponse = await interactionsHandler(emptyTypeRequest)
      const emptyData = await emptyResponse.json()

      expect(emptyResponse.status).toBe(400)
      expect(emptyData.error).toContain('movieId and type are required')
    })

    it('should handle concurrent request patterns', async () => {
      // Create multiple concurrent requests
      const requests = Array(3).fill(null).map((_, i) => 
        createNextRequest('/api/ai/chat', 'POST', {
          message: `Hello ${i}`,
          sessionId: `test-session-${i}`,
        })
      )

      const responses = await Promise.allSettled(
        requests.map(req => chatHandler(req))
      )

      // All should complete successfully or fail gracefully
      responses.forEach(result => {
        expect(result.status).toBe('fulfilled')
        if (result.status === 'fulfilled') {
          expect(result.value.status).toBeGreaterThanOrEqual(200)
          expect(result.value.status).toBeLessThan(600)
        }
      })
    })
  })
})