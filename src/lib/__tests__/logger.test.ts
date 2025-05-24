// Mock environment functions before importing anything
const mockIsDevelopment = jest.fn()
const mockIsProduction = jest.fn()

jest.mock('../env', () => ({
  isDevelopment: () => mockIsDevelopment(),
  isProduction: () => mockIsProduction(),
}))

import { logger } from '../logger'

describe('Logger', () => {
  let consoleSpy: {
    debug: jest.SpyInstance
    info: jest.SpyInstance
    warn: jest.SpyInstance
    error: jest.SpyInstance
  }

  beforeEach(() => {
    consoleSpy = {
      debug: jest.spyOn(console, 'debug').mockImplementation(),
      info: jest.spyOn(console, 'info').mockImplementation(),
      warn: jest.spyOn(console, 'warn').mockImplementation(),
      error: jest.spyOn(console, 'error').mockImplementation(),
    }

    // Default to development mode
    mockIsDevelopment.mockReturnValue(true)
    mockIsProduction.mockReturnValue(false)
  })

  afterEach(() => {
    Object.values(consoleSpy).forEach(spy => spy.mockRestore())
    jest.clearAllMocks()
  })

  describe('in development mode', () => {
    it('logs debug messages', () => {
      logger.debug('Test debug message', { key: 'value' })

      expect(consoleSpy.debug).toHaveBeenCalledWith(
        expect.stringContaining('🔍 [DEBUG] Test debug message')
      )
    })

    it('logs info messages', () => {
      logger.info('Test info message')

      expect(consoleSpy.info).toHaveBeenCalledWith(
        expect.stringContaining('ℹ️ [INFO] Test info message')
      )
    })

    it('logs warn messages', () => {
      logger.warn('Test warning message')

      expect(consoleSpy.warn).toHaveBeenCalledWith(
        expect.stringContaining('⚠️ [WARN] Test warning message')
      )
    })

    it('logs error messages', () => {
      logger.error('Test error message')

      expect(consoleSpy.error).toHaveBeenCalledWith(
        expect.stringContaining('❌ [ERROR] Test error message')
      )
    })

    it('includes context in log messages', () => {
      const context = { userId: '123', action: 'login' }
      logger.info('User action', context)

      expect(consoleSpy.info).toHaveBeenCalledWith(expect.stringContaining('"userId": "123"'))
    })
  })

  describe('in production mode', () => {
    beforeEach(() => {
      mockIsDevelopment.mockReturnValue(false)
      mockIsProduction.mockReturnValue(true)
    })

    it('does not log debug messages', () => {
      logger.debug('Test debug message')

      expect(consoleSpy.debug).not.toHaveBeenCalled()
    })

    it('does not log info messages', () => {
      logger.info('Test info message')

      expect(consoleSpy.info).not.toHaveBeenCalled()
    })

    it('logs warn messages', () => {
      logger.warn('Test warning message')

      expect(consoleSpy.warn).toHaveBeenCalled()
    })

    it('logs error messages', () => {
      logger.error('Test error message')

      expect(consoleSpy.error).toHaveBeenCalled()
    })
  })

  describe('specialized logging methods', () => {
    it('logs API errors with correct context', () => {
      const error = new Error('API failed')
      logger.apiError('/api/test', error, { statusCode: 500 })

      expect(consoleSpy.error).toHaveBeenCalledWith(
        expect.stringContaining('API Error at /api/test')
      )
    })

    it('logs auth errors with correct context', () => {
      const error = new Error('Auth failed')
      logger.authError('login', error, { email: 'test@example.com' })

      expect(consoleSpy.error).toHaveBeenCalledWith(
        expect.stringContaining('Auth Error during login')
      )
    })

    it('logs database errors with correct context', () => {
      const error = new Error('DB connection failed')
      logger.dbError('user_insert', error, { table: 'users' })

      expect(consoleSpy.error).toHaveBeenCalledWith(
        expect.stringContaining('Database Error during user_insert')
      )
    })
  })
})
