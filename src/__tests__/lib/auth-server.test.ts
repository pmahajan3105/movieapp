import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getAuthenticatedUser, getAuthenticatedUserId, requireAuth } from '../../lib/auth-server'

// Mock dependencies
jest.mock('@supabase/ssr')
jest.mock('next/headers')

const mockCreateServerClient = createServerClient as jest.MockedFunction<typeof createServerClient>
const mockCookies = cookies as jest.MockedFunction<typeof cookies>

describe('Auth Server Utilities', () => {
  const mockSupabaseClient = {
    auth: {
      getUser: jest.fn(),
    },
  }

  const mockCookieStore = {
    getAll: jest.fn(),
    set: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()

    // Setup default mocks
    mockCookies.mockResolvedValue(mockCookieStore as any)
    mockCreateServerClient.mockReturnValue(mockSupabaseClient as any)

    // Setup environment variables
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('getAuthenticatedUser', () => {
    it('returns user when authentication is successful', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        created_at: '2023-01-01T00:00:00Z',
      }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      const result = await getAuthenticatedUser()

      expect(result).toEqual(mockUser)
      expect(mockCreateServerClient).toHaveBeenCalledWith(
        'https://test.supabase.co',
        'test-anon-key',
        expect.objectContaining({
          cookies: expect.objectContaining({
            getAll: expect.any(Function),
            setAll: expect.any(Function),
          }),
        })
      )
    })

    it('returns null when user is not authenticated', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      const result = await getAuthenticatedUser()

      expect(result).toBeNull()
    })

    it('returns null when authentication error occurs', async () => {
      const mockError = { message: 'Invalid token' }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: mockError,
      })

      const result = await getAuthenticatedUser()

      expect(result).toBeNull()
    })

    it('returns null when exception is thrown', async () => {
      mockSupabaseClient.auth.getUser.mockRejectedValue(new Error('Network error'))

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

      const result = await getAuthenticatedUser()

      expect(result).toBeNull()
      expect(consoleSpy).toHaveBeenCalledWith(
        'Error getting authenticated user:',
        expect.any(Error)
      )

      consoleSpy.mockRestore()
    })

    it('handles cookies correctly', async () => {
      const mockCookieData = [
        { name: 'session', value: 'abc123' },
        { name: 'refresh', value: 'def456' },
      ]

      mockCookieStore.getAll.mockReturnValue(mockCookieData)

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      })

      await getAuthenticatedUser()

      // Verify cookie configuration
      const cookieConfig = mockCreateServerClient.mock.calls[0][2]
      expect(cookieConfig.cookies.getAll()).toEqual(mockCookieData)
    })

    it('handles cookie setting in setAll method', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      })

      await getAuthenticatedUser()

      // Get the setAll function from the cookie configuration
      const cookieConfig = mockCreateServerClient.mock.calls[0][2]
      const setAllFunction = cookieConfig.cookies.setAll

      // Test the setAll function
      const cookiesToSet = [{ name: 'test', value: 'value', options: { httpOnly: true } }]

      setAllFunction(cookiesToSet)

      expect(mockCookieStore.set).toHaveBeenCalledWith('test', 'value', { httpOnly: true })
    })

    it('handles multiple cookies in setAll', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      })

      await getAuthenticatedUser()

      const cookieConfig = mockCreateServerClient.mock.calls[0][2]
      const setAllFunction = cookieConfig.cookies.setAll

      const cookiesToSet = [
        { name: 'cookie1', value: 'value1', options: { secure: true } },
        { name: 'cookie2', value: 'value2', options: { sameSite: 'strict' } },
      ]

      setAllFunction(cookiesToSet)

      expect(mockCookieStore.set).toHaveBeenCalledTimes(2)
      expect(mockCookieStore.set).toHaveBeenCalledWith('cookie1', 'value1', { secure: true })
      expect(mockCookieStore.set).toHaveBeenCalledWith('cookie2', 'value2', { sameSite: 'strict' })
    })
  })

  describe('getAuthenticatedUserId', () => {
    it('returns user ID when user is authenticated', async () => {
      const mockUser = {
        id: 'user-456',
        email: 'test@example.com',
      }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      const result = await getAuthenticatedUserId()

      expect(result).toBe('user-456')
    })

    it('returns null when user is not authenticated', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      const result = await getAuthenticatedUserId()

      expect(result).toBeNull()
    })

    it('returns null when user object exists but has no ID', async () => {
      const mockUser = {
        email: 'test@example.com',
        // Missing id property
      }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      const result = await getAuthenticatedUserId()

      expect(result).toBeNull()
    })

    it('returns null when authentication error occurs', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Token expired' },
      })

      const result = await getAuthenticatedUserId()

      expect(result).toBeNull()
    })

    it('returns null when exception is thrown', async () => {
      mockSupabaseClient.auth.getUser.mockRejectedValue(new Error('Connection failed'))

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

      const result = await getAuthenticatedUserId()

      expect(result).toBeNull()
      expect(consoleSpy).toHaveBeenCalled()

      consoleSpy.mockRestore()
    })
  })

  describe('requireAuth', () => {
    it('returns user when authentication is successful', async () => {
      const mockUser = {
        id: 'user-789',
        email: 'required@example.com',
        role: 'authenticated',
      }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      const result = await requireAuth()

      expect(result).toEqual(mockUser)
    })

    it('throws error when user is not authenticated', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      await expect(requireAuth()).rejects.toThrow('Authentication required')
    })

    it('throws error when authentication error occurs', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid session' },
      })

      await expect(requireAuth()).rejects.toThrow('Authentication required')
    })

    it('throws error when exception occurs during authentication', async () => {
      mockSupabaseClient.auth.getUser.mockRejectedValue(new Error('Database error'))

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

      await expect(requireAuth()).rejects.toThrow('Authentication required')
      expect(consoleSpy).toHaveBeenCalled()

      consoleSpy.mockRestore()
    })

    it('preserves user data structure when authentication succeeds', async () => {
      const complexUser = {
        id: 'user-complex',
        email: 'complex@example.com',
        user_metadata: {
          name: 'John Doe',
          avatar_url: 'https://example.com/avatar.jpg',
        },
        app_metadata: {
          provider: 'email',
          providers: ['email'],
        },
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-02T00:00:00Z',
      }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: complexUser },
        error: null,
      })

      const result = await requireAuth()

      expect(result).toEqual(complexUser)
      expect(result.user_metadata).toEqual(complexUser.user_metadata)
      expect(result.app_metadata).toEqual(complexUser.app_metadata)
    })
  })

  describe('Environment Variable Handling', () => {
    it('uses environment variables correctly', async () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://custom.supabase.co'
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'custom-anon-key'

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      })

      await getAuthenticatedUser()

      expect(mockCreateServerClient).toHaveBeenCalledWith(
        'https://custom.supabase.co',
        'custom-anon-key',
        expect.any(Object)
      )
    })

    it('handles missing environment variables gracefully', async () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL
      delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

      // This should still work as the function uses the ! operator
      // which assumes the variables exist
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      })

      await getAuthenticatedUser()

      expect(mockCreateServerClient).toHaveBeenCalledWith(undefined, undefined, expect.any(Object))
    })
  })

  describe('Error Scenarios', () => {
    it('handles Supabase client creation failure', async () => {
      mockCreateServerClient.mockImplementation(() => {
        throw new Error('Failed to create client')
      })

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

      const result = await getAuthenticatedUser()

      expect(result).toBeNull()
      expect(consoleSpy).toHaveBeenCalledWith(
        'Error getting authenticated user:',
        expect.any(Error)
      )

      consoleSpy.mockRestore()
    })

    it('handles cookies() function failure', async () => {
      mockCookies.mockRejectedValue(new Error('Cookies not available'))

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

      const result = await getAuthenticatedUser()

      expect(result).toBeNull()
      expect(consoleSpy).toHaveBeenCalled()

      consoleSpy.mockRestore()
    })

    it('handles malformed user data', async () => {
      // Return malformed user data
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: 'invalid-user-data' },
        error: null,
      })

      const result = await getAuthenticatedUser()

      expect(result).toBe('invalid-user-data')
    })

    it('handles null data response', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: null,
        error: null,
      })

      const result = await getAuthenticatedUser()

      expect(result).toBeNull()
    })
  })

  describe('Performance and Concurrency', () => {
    it('handles multiple concurrent authentication requests', async () => {
      const mockUser = { id: 'user-concurrent', email: 'concurrent@example.com' }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      // Make multiple concurrent requests
      const promises = Array(10)
        .fill(0)
        .map(() => getAuthenticatedUser())
      const results = await Promise.all(promises)

      // All should return the same user
      results.forEach(result => {
        expect(result).toEqual(mockUser)
      })

      // Should have called getUser for each request
      expect(mockSupabaseClient.auth.getUser).toHaveBeenCalledTimes(10)
    })

    it('handles rapid sequential calls efficiently', async () => {
      const mockUser = { id: 'user-sequential', email: 'sequential@example.com' }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      const startTime = Date.now()

      for (let i = 0; i < 50; i++) {
        await getAuthenticatedUser()
      }

      const endTime = Date.now()

      // Should complete within reasonable time
      expect(endTime - startTime).toBeLessThan(1000)
      expect(mockSupabaseClient.auth.getUser).toHaveBeenCalledTimes(50)
    })
  })
})
