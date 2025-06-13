import { logger } from '../../lib/logger'
import * as env from '../../lib/env'

// Mock the env module
jest.mock('../../lib/env', () => ({
  isDevelopment: jest.fn(),
  isProduction: jest.fn(),
}))

// Mock console methods
const mockConsole = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}

describe('Logger', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Replace console methods with mocks
    global.console = mockConsole as any
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('Environment-based Logging', () => {
    it('logs all levels in development environment', () => {
      ;(env.isDevelopment as jest.Mock).mockReturnValue(true)
      ;(env.isProduction as jest.Mock).mockReturnValue(false)

      logger.debug('Debug message')
      logger.info('Info message')
      logger.warn('Warning message')
      logger.error('Error message')

      expect(mockConsole.debug).toHaveBeenCalledWith('🔍 [DEBUG] Debug message')
      expect(mockConsole.info).toHaveBeenCalledWith('ℹ️ [INFO] Info message')
      expect(mockConsole.warn).toHaveBeenCalledWith('⚠️ [WARN] Warning message')
      expect(mockConsole.error).toHaveBeenCalledWith('❌ [ERROR] Error message')
    })

    it('only logs warn and error in production environment', () => {
      ;(env.isDevelopment as jest.Mock).mockReturnValue(false)
      ;(env.isProduction as jest.Mock).mockReturnValue(true)

      logger.debug('Debug message')
      logger.info('Info message')
      logger.warn('Warning message')
      logger.error('Error message')

      expect(mockConsole.debug).not.toHaveBeenCalled()
      expect(mockConsole.info).not.toHaveBeenCalled()
      expect(mockConsole.warn).toHaveBeenCalledWith('⚠️ [WARN] Warning message')
      expect(mockConsole.error).toHaveBeenCalledWith('❌ [ERROR] Error message')
    })

    it('does not log anything when not in development or production', () => {
      ;(env.isDevelopment as jest.Mock).mockReturnValue(false)
      ;(env.isProduction as jest.Mock).mockReturnValue(false)

      logger.debug('Debug message')
      logger.info('Info message')
      logger.warn('Warning message')
      logger.error('Error message')

      expect(mockConsole.debug).not.toHaveBeenCalled()
      expect(mockConsole.info).not.toHaveBeenCalled()
      expect(mockConsole.warn).not.toHaveBeenCalled()
      expect(mockConsole.error).not.toHaveBeenCalled()
    })
  })

  describe('Message Formatting', () => {
    beforeEach(() => {
      ;(env.isDevelopment as jest.Mock).mockReturnValue(true)
      ;(env.isProduction as jest.Mock).mockReturnValue(false)
    })

    it('formats messages with correct emoji and level', () => {
      logger.debug('Test debug')
      logger.info('Test info')
      logger.warn('Test warn')
      logger.error('Test error')

      expect(mockConsole.debug).toHaveBeenCalledWith('🔍 [DEBUG] Test debug')
      expect(mockConsole.info).toHaveBeenCalledWith('ℹ️ [INFO] Test info')
      expect(mockConsole.warn).toHaveBeenCalledWith('⚠️ [WARN] Test warn')
      expect(mockConsole.error).toHaveBeenCalledWith('❌ [ERROR] Test error')
    })

    it('includes context when provided', () => {
      const context = { userId: '123', action: 'login' }
      logger.info('User action', context)

      expect(mockConsole.info).toHaveBeenCalledWith(
        'ℹ️ [INFO] User action | Context: {\n  "userId": "123",\n  "action": "login"\n}'
      )
    })

    it('handles empty context object', () => {
      logger.info('Message', {})
      expect(mockConsole.info).toHaveBeenCalledWith('ℹ️ [INFO] Message')
    })

    it('handles undefined context', () => {
      logger.info('Message', undefined)
      expect(mockConsole.info).toHaveBeenCalledWith('ℹ️ [INFO] Message')
    })

    it('handles complex context objects', () => {
      const complexContext = {
        user: { id: '123', name: 'John' },
        metadata: { timestamp: Date.now(), version: '1.0' },
        nested: { deep: { value: 'test' } },
      }

      logger.error('Complex error', complexContext)

      const expectedMessage = mockConsole.error.mock.calls[0][0]
      expect(expectedMessage).toContain('❌ [ERROR] Complex error | Context:')
      expect(expectedMessage).toContain('"user"')
      expect(expectedMessage).toContain('"metadata"')
      expect(expectedMessage).toContain('"nested"')
    })
  })

  describe('Specialized Logging Methods', () => {
    beforeEach(() => {
      ;(env.isDevelopment as jest.Mock).mockReturnValue(true)
      ;(env.isProduction as jest.Mock).mockReturnValue(false)
    })

    describe('apiError', () => {
      it('logs API errors with endpoint and error details', () => {
        const error = new Error('Network timeout')
        error.stack = 'Error stack trace'

        logger.apiError('/api/movies', error)

        const loggedMessage = mockConsole.error.mock.calls[0][0]
        expect(loggedMessage).toContain('❌ [ERROR] API Error at /api/movies: Network timeout')
        expect(loggedMessage).toContain('"endpoint": "/api/movies"')
        expect(loggedMessage).toContain('"error": "Network timeout"')
        expect(loggedMessage).toContain('"stack": "Error stack trace"')
      })

      it('includes additional context in API errors', () => {
        const error = new Error('Validation failed')
        const context = { requestId: 'req-123', userId: 'user-456' }

        logger.apiError('/api/auth', error, context)

        const loggedMessage = mockConsole.error.mock.calls[0][0]
        expect(loggedMessage).toContain('"requestId": "req-123"')
        expect(loggedMessage).toContain('"userId": "user-456"')
      })
    })

    describe('authError', () => {
      it('logs authentication errors with operation details', () => {
        const error = new Error('Invalid token')
        error.stack = 'Auth error stack'

        logger.authError('login', error)

        const loggedMessage = mockConsole.error.mock.calls[0][0]
        expect(loggedMessage).toContain('❌ [ERROR] Auth Error during login: Invalid token')
        expect(loggedMessage).toContain('"operation": "login"')
        expect(loggedMessage).toContain('"error": "Invalid token"')
        expect(loggedMessage).toContain('"stack": "Auth error stack"')
      })

      it('includes additional context in auth errors', () => {
        const error = new Error('Session expired')
        const context = { sessionId: 'sess-789', attemptCount: 3 }

        logger.authError('refresh', error, context)

        const loggedMessage = mockConsole.error.mock.calls[0][0]
        expect(loggedMessage).toContain('"sessionId": "sess-789"')
        expect(loggedMessage).toContain('"attemptCount": 3')
      })
    })

    describe('dbError', () => {
      it('logs database errors with operation details', () => {
        const error = new Error('Connection timeout')
        error.stack = 'DB error stack'

        logger.dbError('query', error)

        const loggedMessage = mockConsole.error.mock.calls[0][0]
        expect(loggedMessage).toContain(
          '❌ [ERROR] Database Error during query: Connection timeout'
        )
        expect(loggedMessage).toContain('"operation": "query"')
        expect(loggedMessage).toContain('"error": "Connection timeout"')
        expect(loggedMessage).toContain('"stack": "DB error stack"')
      })

      it('includes additional context in database errors', () => {
        const error = new Error('Constraint violation')
        const context = { table: 'users', query: 'INSERT INTO users...' }

        logger.dbError('insert', error, context)

        const loggedMessage = mockConsole.error.mock.calls[0][0]
        expect(loggedMessage).toContain('"table": "users"')
        expect(loggedMessage).toContain('"query": "INSERT INTO users..."')
      })
    })
  })

  describe('Error Handling', () => {
    beforeEach(() => {
      ;(env.isDevelopment as jest.Mock).mockReturnValue(true)
      ;(env.isProduction as jest.Mock).mockReturnValue(false)
    })

    it('handles errors without stack traces', () => {
      const error = new Error('Simple error')
      delete error.stack

      logger.apiError('/api/test', error)

      const loggedMessage = mockConsole.error.mock.calls[0][0]
      expect(loggedMessage).toContain('"error": "Simple error"')
      expect(loggedMessage).toContain('/api/test')
    })

    it('handles non-Error objects', () => {
      const errorLike = { message: 'Custom error', name: 'CustomError' }

      logger.apiError('/api/test', errorLike as Error)

      const loggedMessage = mockConsole.error.mock.calls[0][0]
      expect(loggedMessage).toContain('"error": "Custom error"')
    })

    it('handles circular references in context', () => {
      const circularContext: any = { name: 'test' }
      circularContext.self = circularContext

      // Should not throw an error
      expect(() => {
        logger.info('Test with circular reference', circularContext)
      }).not.toThrow()
    })
  })

  describe('Performance and Memory', () => {
    beforeEach(() => {
      ;(env.isDevelopment as jest.Mock).mockReturnValue(true)
      ;(env.isProduction as jest.Mock).mockReturnValue(false)
    })

    it('handles large context objects efficiently', () => {
      const largeContext = {
        data: new Array(1000).fill(0).map((_, i) => ({ id: i, value: `item-${i}` })),
      }

      const startTime = Date.now()
      logger.info('Large context test', largeContext)
      const endTime = Date.now()

      // Should complete within reasonable time (less than 100ms)
      expect(endTime - startTime).toBeLessThan(100)
      expect(mockConsole.info).toHaveBeenCalled()
    })

    it('handles multiple rapid log calls', () => {
      const startTime = Date.now()

      for (let i = 0; i < 100; i++) {
        logger.info(`Message ${i}`, { iteration: i })
      }

      const endTime = Date.now()

      // Should handle 100 log calls quickly
      expect(endTime - startTime).toBeLessThan(200)
      expect(mockConsole.info).toHaveBeenCalledTimes(100)
    })
  })

  describe('Type Safety', () => {
    beforeEach(() => {
      ;(env.isDevelopment as jest.Mock).mockReturnValue(true)
      ;(env.isProduction as jest.Mock).mockReturnValue(false)
    })

    it('accepts various context value types', () => {
      const mixedContext = {
        string: 'text',
        number: 42,
        boolean: true,
        null: null,
        undefined: undefined,
        array: [1, 2, 3],
        object: { nested: 'value' },
        date: new Date(),
        function: () => 'test',
      }

      expect(() => {
        logger.info('Mixed types', mixedContext)
      }).not.toThrow()

      expect(mockConsole.info).toHaveBeenCalled()
    })

    it('handles empty strings and special characters', () => {
      logger.info('')
      logger.info('Special chars: !@#$%^&*()_+-=[]{}|;:,.<>?')
      logger.info('Unicode: 🎬🍿🎭🎪')

      expect(mockConsole.info).toHaveBeenCalledTimes(3)
    })
  })
})
