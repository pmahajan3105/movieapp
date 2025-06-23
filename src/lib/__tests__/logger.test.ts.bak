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

      expect(consoleSpy.debug).toHaveBeenCalled()
      const loggedMessage = consoleSpy.debug.mock.calls[0][0]
      expect(loggedMessage).toContain('🔍')
      expect(loggedMessage).toContain('[DEBUG]')
      expect(loggedMessage).toContain('Test debug message')
      expect(loggedMessage).toContain('"key": "value"')
    })

    it('logs info messages', () => {
      logger.info('Test info message')

      expect(consoleSpy.info).toHaveBeenCalled()
      const loggedMessage = consoleSpy.info.mock.calls[0][0]
      expect(loggedMessage).toContain('ℹ️')
      expect(loggedMessage).toContain('[INFO]')
      expect(loggedMessage).toContain('Test info message')
    })

    it('logs warn messages', () => {
      logger.warn('Test warning message')

      expect(consoleSpy.warn).toHaveBeenCalled()
      const loggedMessage = consoleSpy.warn.mock.calls[0][0]
      expect(loggedMessage).toContain('⚠️')
      expect(loggedMessage).toContain('[WARN]')
      expect(loggedMessage).toContain('Test warning message')
    })

    it('logs error messages', () => {
      logger.error('Test error message')

      expect(consoleSpy.error).toHaveBeenCalled()
      const loggedMessage = consoleSpy.error.mock.calls[0][0]
      expect(loggedMessage).toContain('❌')
      expect(loggedMessage).toContain('[ERROR]')
      expect(loggedMessage).toContain('Test error message')
    })

    it('includes context in log messages', () => {
      const context = { userId: '123', action: 'login' }
      logger.info('User action', context)

      expect(consoleSpy.info).toHaveBeenCalled()
      const loggedMessage = consoleSpy.info.mock.calls[0][0]
      expect(loggedMessage).toContain('"userId": "123"')
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
      const loggedMessage = consoleSpy.warn.mock.calls[0][0]
      expect(loggedMessage).toContain('⚠️')
      expect(loggedMessage).toContain('[WARN]')
      expect(loggedMessage).toContain('Test warning message')
    })

    it('logs error messages', () => {
      logger.error('Test error message')

      expect(consoleSpy.error).toHaveBeenCalled()
      const loggedMessage = consoleSpy.error.mock.calls[0][0]
      expect(loggedMessage).toContain('❌')
      expect(loggedMessage).toContain('[ERROR]')
      expect(loggedMessage).toContain('Test error message')
    })
  })

  describe('specialized logging methods', () => {
    it('logs API errors with correct context', () => {
      const error = new Error('API failed')
      logger.apiError('/api/test', error, { statusCode: 500 })

      expect(consoleSpy.error).toHaveBeenCalled()
      const loggedMessage = consoleSpy.error.mock.calls[0][0]
      expect(loggedMessage).toContain('API Error at /api/test')
    })

    it('logs auth errors with correct context', () => {
      const error = new Error('Auth failed')
      logger.authError('login', error, { email: 'test@example.com' })

      expect(consoleSpy.error).toHaveBeenCalled()
      const loggedMessage = consoleSpy.error.mock.calls[0][0]
      expect(loggedMessage).toContain('Auth Error during login')
    })

    it('logs database errors with correct context', () => {
      const error = new Error('DB connection failed')
      logger.dbError('user_insert', error, { table: 'users' })

      expect(consoleSpy.error).toHaveBeenCalled()
      const loggedMessage = consoleSpy.error.mock.calls[0][0]
      expect(loggedMessage).toContain('Database Error during user_insert')
    })
  })
})
