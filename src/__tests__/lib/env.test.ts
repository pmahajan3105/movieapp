 
// @ts-nocheck
 

// Store original process.env
const originalEnv = { ...process.env }

describe('Environment Configuration', () => {
  beforeEach(() => {
    // Restore original environment
    process.env = { ...originalEnv }

    // Set up valid test environment
    process.env.TMDB_API_KEY = 'test-tmdb-key'
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key'
    process.env.ANTHROPIC_API_KEY = 'test-anthropic-key'
    process.env.GROQ_API_KEY = 'test-groq-key'
    process.env.NODE_ENV = 'test'
    process.env.NEXT_PUBLIC_APP_ENV = 'development'

    // Clear module cache
    jest.resetModules()
  })

  afterEach(() => {
    // Restore original environment
    process.env = { ...originalEnv }
    jest.resetModules()
  })

  describe('getEnv', () => {
    it('returns valid environment configuration with all required fields', async () => {
      const env = await import('../../lib/env')
      const config = env.getEnv()

      expect(config).toMatchObject({
        TMDB_API_KEY: 'test-tmdb-key',
        NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
        SUPABASE_SERVICE_ROLE_KEY: 'test-service-key',
        ANTHROPIC_API_KEY: 'test-anthropic-key',
        GROQ_API_KEY: 'test-groq-key',
        NODE_ENV: 'test',
        NEXT_PUBLIC_APP_ENV: 'development',
      })
    })

    it('includes optional database configuration when provided', async () => {
      process.env.MOVIE_DEFAULT_DATABASE = 'tmdb'
      process.env.MOVIE_SEARCH_DATABASE = 'tmdb'
      jest.resetModules()

      const env = await import('../../lib/env')
      const config = env.getEnv()

      expect(config.MOVIE_DEFAULT_DATABASE).toBe('tmdb')
      expect(config.MOVIE_SEARCH_DATABASE).toBe('tmdb')
    })

    it('handles missing optional SUPABASE_SERVICE_ROLE_KEY', async () => {
      delete process.env.SUPABASE_SERVICE_ROLE_KEY
      jest.resetModules()

      const env = await import('../../lib/env')
      const config = env.getEnv()

      expect(config.SUPABASE_SERVICE_ROLE_KEY).toBeUndefined()
    })
  })

  describe.skip('Error Handling', () => {
    it('throws error for missing required TMDB API key', async () => {
      delete process.env.TMDB_API_KEY
      jest.resetModules()

      const env = await import('../../lib/env')
      expect(() => env.getEnv()).toThrow('Missing required environment variables')
    })

    it('throws error for invalid Supabase URL format', async () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'invalid-url'
      jest.resetModules()

      const env = await import('../../lib/env')
      expect(() => env.getEnv()).toThrow('Invalid environment variables')
    })

    it('throws error for empty required string values', async () => {
      process.env.TMDB_API_KEY = ''
      jest.resetModules()

      const env = await import('../../lib/env')
      expect(() => env.getEnv()).toThrow('Invalid environment variables')
    })
  })

  describe('Individual Getters', () => {
    it('getter functions return correct values', async () => {
      const env = await import('../../lib/env')

      expect(env.getSupabaseUrl()).toBe('https://test.supabase.co')
      expect(env.getSupabaseAnonKey()).toBe('test-anon-key')
      expect(env.getSupabaseServiceRoleKey()).toBe('test-service-key')
      expect(env.getAnthropicApiKey()).toBe('test-anthropic-key')
      expect(env.getGroqApiKey()).toBe('test-groq-key')
      expect(env.getTMDBApiKey()).toBe('test-tmdb-key')
    })

    it('getSupabaseServiceRoleKey returns undefined when not set', async () => {
      delete process.env.SUPABASE_SERVICE_ROLE_KEY
      jest.resetModules()

      const env = await import('../../lib/env')
      expect(env.getSupabaseServiceRoleKey()).toBeUndefined()
    })
  })

  describe('Environment Helpers', () => {
    it('isTest returns true for test environment', async () => {
      const env = await import('../../lib/env')
      expect(env.isTest()).toBe(true)
      expect(env.isDevelopment()).toBe(false)
      expect(env.isProduction()).toBe(false)
    })

    it('isDevelopment returns true for development environment', async () => {
      process.env.NODE_ENV = 'development'
      jest.resetModules()

      const env = await import('../../lib/env')
      expect(env.isDevelopment()).toBe(true)
      expect(env.isProduction()).toBe(false)
      expect(env.isTest()).toBe(false)
    })

    it('isProduction returns true for production environment', async () => {
      process.env.NODE_ENV = 'production'
      jest.resetModules()

      const env = await import('../../lib/env')
      expect(env.isDevelopment()).toBe(false)
      expect(env.isProduction()).toBe(true)
      expect(env.isTest()).toBe(false)
    })
  })

  describe('Validation Edge Cases', () => {
    it('accepts valid URL with different protocols', async () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321'
      jest.resetModules()

      const env = await import('../../lib/env')
      expect(() => env.getEnv()).not.toThrow()
      expect(env.getSupabaseUrl()).toBe('http://localhost:54321')
    })

    it('handles special characters in API keys', async () => {
      const specialKey = 'key-with-special-chars_123!@#$%^&*()'
      process.env.ANTHROPIC_API_KEY = specialKey
      jest.resetModules()

      const env = await import('../../lib/env')
      expect(() => env.getEnv()).not.toThrow()
      expect(env.getAnthropicApiKey()).toBe(specialKey)
    })
  })

  describe('Performance and Caching', () => {
    it('handles rapid successive calls efficiently', async () => {
      const env = await import('../../lib/env')
      const startTime = Date.now()

      for (let i = 0; i < 100; i++) {
        env.getEnv()
      }

      const endTime = Date.now()

      // Should complete very quickly due to caching
      expect(endTime - startTime).toBeLessThan(50)
    })
  })

  describe.skip('Error Message Quality', () => {
    it('provides helpful error message for missing variables', async () => {
      delete process.env.TMDB_API_KEY
      delete process.env.ANTHROPIC_API_KEY
      jest.resetModules()

      const env = await import('../../lib/env')

      try {
        env.getEnv()
        throw new Error('Should have thrown an error')
      } catch (error) {
        const errorMessage = (error as Error).message
        expect(errorMessage).toContain('Missing required environment variables')
        expect(errorMessage).toContain('Please check your .env.local file')
      }
    })

    it('provides helpful error message for invalid variables', async () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'not-a-url'
      jest.resetModules()

      const env = await import('../../lib/env')

      try {
        env.getEnv()
        throw new Error('Should have thrown an error')
      } catch (error) {
        const errorMessage = (error as Error).message
        expect(errorMessage).toContain('Invalid environment variables')
      }
    })
  })
})
