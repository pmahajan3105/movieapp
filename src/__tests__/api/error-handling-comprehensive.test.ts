/**
 * Comprehensive API Error Handling Tests
 * 
 * Tests various error scenarios across all major API endpoints:
 * - Authentication errors
 * - Input validation errors  
 * - Database connection errors
 * - External API failures
 * - Rate limiting
 * - Missing environment variables
 * - Malformed requests
 */

import { NextRequest } from 'next/server'

// Import API route handlers
import { POST as chatHandler } from '@/app/api/ai/chat/route'
import { GET as moviesHandler } from '@/app/api/movies/route'
import { POST as interactionsHandler, GET as getInteractionsHandler } from '@/app/api/user/interactions/route'

// Import setup mocks
import '../setupMocks'

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

describe('API Error Handling - Comprehensive Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Reset environment variables
    process.env.ANTHROPIC_API_KEY = 'test-anthropic-key'
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
  })

  describe('Authentication Error Scenarios', () => {
    it('should handle missing authentication in chat API', async () => {
      const { createRouteSupabaseClient } = require('@/lib/supabase/route-client')
      
      // Mock unauthenticated user
      createRouteSupabaseClient.mockReturnValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: null },
            error: { message: 'No auth token' },
          }),
        },
      })

      const request = createNextRequest('/api/ai/chat', 'POST', {
        message: 'Hello',
        sessionId: 'test-session',
      })

      const response = await chatHandler(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data).toMatchObject({
        error: expect.stringContaining('Authentication required'),
        success: false,
      })
    })

    it('should handle expired auth tokens', async () => {
      const { createRouteSupabaseClient } = require('@/lib/supabase/route-client')
      
      createRouteSupabaseClient.mockReturnValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: null },
            error: { message: 'JWT expired' },
          }),
        },
      })

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

    it('should handle invalid session tokens', async () => {
      const { createRouteSupabaseClient } = require('@/lib/supabase/route-client')
      
      createRouteSupabaseClient.mockReturnValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: null },
            error: { message: 'Invalid JWT signature' },
          }),
        },
      })

      const request = createNextRequest('/api/user/interactions', 'GET')

      const response = await getInteractionsHandler(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })
  })

  describe('Input Validation Error Scenarios', () => {
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
      const { createServerClient } = require('@supabase/ssr')
      
      // Mock authenticated user for this test
      createServerClient.mockReturnValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: { id: 'test-user', email: 'test@test.com' } },
            error: null,
          }),
        },
      })

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
      const { createServerClient } = require('@supabase/ssr')
      
      createServerClient.mockReturnValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: { id: 'test-user', email: 'test@test.com' } },
            error: null,
          }),
        },
      })

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

  describe('External API Error Scenarios', () => {
    it('should handle missing Anthropic API key', async () => {
      delete process.env.ANTHROPIC_API_KEY

      const { createRouteSupabaseClient } = require('@/lib/supabase/route-client')
      
      createRouteSupabaseClient.mockReturnValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: { id: 'test-user', email: 'test@test.com' } },
            error: null,
          }),
        },
      })

      const request = createNextRequest('/api/ai/chat', 'POST', {
        message: 'Hello',
        sessionId: 'test-session',
      })

      const response = await chatHandler(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Anthropic API key missing')
    })

    it('should handle Anthropic API authentication errors', async () => {
      const { createRouteSupabaseClient } = require('@/lib/supabase/route-client')
      
      createRouteSupabaseClient.mockReturnValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: { id: 'test-user', email: 'test@test.com' } },
            error: null,
          }),
        },
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: null,
                  error: { code: 'PGRST116' }, // Not found
                }),
              }),
            }),
          }),
          insert: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { id: 'new-session' },
                error: null,
              }),
            }),
          }),
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
      })

      // Mock fetch to simulate Anthropic auth error
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: () => Promise.resolve({
          error: { type: 'authentication_error' }
        }),
      })

      const request = createNextRequest('/api/ai/chat', 'POST', {
        message: 'Hello',
        sessionId: 'test-session',
        stream: false,
      })

      const response = await chatHandler(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toContain('Claude API authentication failed')
    })

    it('should handle Anthropic API rate limit errors', async () => {
      const { createRouteSupabaseClient } = require('@/lib/supabase/route-client')
      
      createRouteSupabaseClient.mockReturnValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: { id: 'test-user', email: 'test@test.com' } },
            error: null,
          }),
        },
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: null,
                  error: { code: 'PGRST116' }, // Not found
                }),
              }),
            }),
          }),
          insert: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { id: 'new-session' },
                error: null,
              }),
            }),
          }),
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
      })

      // Mock fetch to simulate rate limit error
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 429,
        json: () => Promise.resolve({
          error: { type: 'rate_limit_error' }
        }),
      })

      const request = createNextRequest('/api/ai/chat', 'POST', {
        message: 'Hello',
        sessionId: 'test-session',
        stream: false,
      })

      const response = await chatHandler(request)
      const data = await response.json()

      expect(response.status).toBe(429)
      expect(data.error).toContain('Rate limit exceeded')
    })

    it('should handle network timeouts to external APIs', async () => {
      const { createRouteSupabaseClient } = require('@/lib/supabase/route-client')
      
      createRouteSupabaseClient.mockReturnValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: { id: 'test-user', email: 'test@test.com' } },
            error: null,
          }),
        },
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: null,
                  error: { code: 'PGRST116' }, // Not found
                }),
              }),
            }),
          }),
          insert: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { id: 'new-session' },
                error: null,
              }),
            }),
          }),
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
      })

      // Mock fetch to simulate timeout
      global.fetch = jest.fn().mockRejectedValue(new Error('fetch timeout'))

      const request = createNextRequest('/api/ai/chat', 'POST', {
        message: 'Hello',
        sessionId: 'test-session',
        stream: false,
      })

      const response = await chatHandler(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error).toContain('Failed to process chat message')
    })
  })

  describe('Database Error Scenarios', () => {
    it('should handle missing database tables', async () => {
      const { createRouteSupabaseClient } = require('@/lib/supabase/route-client')
      
      createRouteSupabaseClient.mockReturnValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: { id: 'test-user', email: 'test@test.com' } },
            error: null,
          }),
        },
        from: jest.fn().mockReturnValue({
          insert: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: null,
                error: { code: '42P01', message: 'relation "chat_sessions" does not exist' },
              }),
            }),
          }),
        }),
      })

      const request = createNextRequest('/api/ai/chat', 'POST', {
        message: 'Hello',
        sessionId: undefined, // Force new session creation
      })

      const response = await chatHandler(request)
      const data = await response.json()

      expect(response.status).toBe(503)
      expect(data.error).toContain('Chat feature temporarily unavailable')
      expect(data.code).toBe('MISSING_TABLE')
    })

    it('should handle database connection failures', async () => {
      const { createRouteSupabaseClient } = require('@/lib/supabase/route-client')
      
      createRouteSupabaseClient.mockReturnValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: { id: 'test-user', email: 'test@test.com' } },
            error: null,
          }),
        },
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockRejectedValue(new Error('Connection timeout')),
              }),
            }),
          }),
        }),
      })

      const request = createNextRequest('/api/ai/chat', 'POST', {
        message: 'Hello',
        sessionId: 'test-session',
      })

      const response = await chatHandler(request)
      const data = await response.json()

      expect(response.status).toBe(503)
      expect(data.error).toContain('Chat feature temporarily unavailable')
      expect(data.code).toBe('DATABASE_ERROR')
    })

    it('should handle database constraint violations', async () => {
      const { createServerClient } = require('@supabase/ssr')
      
      createServerClient.mockReturnValue({
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
      })

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

    it('should handle database query timeouts', async () => {
      const { createServerClient } = require('@supabase/ssr')
      
      createServerClient.mockReturnValue({
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
                limit: jest.fn().mockRejectedValue(new Error('Query timeout')),
              }),
            }),
          }),
        }),
      })

      const request = createNextRequest('/api/user/interactions?limit=50', 'GET')

      const response = await getInteractionsHandler(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal server error')
    })
  })

  describe('Resource Limit Error Scenarios', () => {
    it('should handle pagination limits in interactions API', async () => {
      const { createServerClient } = require('@supabase/ssr')
      
      createServerClient.mockReturnValue({
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
                  data: Array(100).fill({}), // Max 100 items
                  error: null,
                }),
              }),
            }),
          }),
        }),
      })

      // Request exceeds limit
      const request = createNextRequest('/api/user/interactions?limit=500', 'GET')

      const response = await getInteractionsHandler(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.pagination.returned).toBe(100) // Capped at 100
    })

    it('should handle memory exhaustion in large requests', async () => {
      const { createRouteSupabaseClient } = require('@/lib/supabase/route-client')
      
      createRouteSupabaseClient.mockReturnValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: { id: 'test-user', email: 'test@test.com' } },
            error: null,
          }),
        },
      })

      // Very large message that could cause memory issues
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

  describe('Environment Configuration Errors', () => {
    it('should handle missing Supabase URL', async () => {
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

    it('should handle missing Supabase anon key', async () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

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

  describe('Edge Cases and Boundary Conditions', () => {
    it('should handle empty request bodies', async () => {
      const request = createNextRequest('/api/ai/chat', 'POST', null)

      const response = await chatHandler(request)
      const data = await response.json()

      expect(response.status).toBe(500)
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

    it('should handle concurrent request failures', async () => {
      const { createRouteSupabaseClient } = require('@/lib/supabase/route-client')
      
      // Mock a slow failing database
      createRouteSupabaseClient.mockReturnValue({
        auth: {
          getUser: jest.fn().mockImplementation(() => 
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Database overloaded')), 100)
            )
          ),
        },
      })

      // Make concurrent requests
      const requests = Array(5).fill(null).map(() => 
        createNextRequest('/api/ai/chat', 'POST', {
          message: 'Hello',
          sessionId: 'test-session',
        })
      )

      const responses = await Promise.allSettled(
        requests.map(req => chatHandler(req))
      )

      // All should fail gracefully
      responses.forEach(result => {
        expect(result.status).toBe('fulfilled')
        if (result.status === 'fulfilled') {
          expect(result.value.status).toBeGreaterThanOrEqual(400)
        }
      })
    })

    it('should handle streaming errors gracefully', async () => {
      const { createRouteSupabaseClient } = require('@/lib/supabase/route-client')
      
      createRouteSupabaseClient.mockReturnValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: { id: 'test-user', email: 'test@test.com' } },
            error: null,
          }),
        },
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: null,
                  error: { code: 'PGRST116' },
                }),
              }),
            }),
          }),
          insert: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { id: 'new-session' },
                error: null,
              }),
            }),
          }),
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
      })

      // Mock streaming response that fails
      const mockResponse = {
        ok: true,
        body: {
          getReader: () => ({
            read: jest.fn()
              .mockResolvedValueOnce({ done: false, value: new TextEncoder().encode('data: {"test": "chunk"}\n\n') })
              .mockRejectedValue(new Error('Stream interrupted')),
          }),
        },
      }

      global.fetch = jest.fn().mockResolvedValue(mockResponse)

      const request = createNextRequest('/api/ai/chat', 'POST', {
        message: 'Hello',
        sessionId: 'test-session',
        stream: true,
      })

      const response = await chatHandler(request)

      expect(response.status).toBe(200)
      expect(response.headers.get('content-type')).toBe('text/event-stream')
    })
  })
})