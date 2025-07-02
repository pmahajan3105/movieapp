/**
 * @jest-environment jsdom
 */

// Mock the dynamic imports before importing the module
const mockAxe = jest.fn()
const mockReact = {}
const mockReactDOM = {}

// Mock the dynamic imports
jest.mock('@axe-core/react', () => ({
  default: mockAxe
}), { virtual: true })

// Mock console methods to suppress output during tests
const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation()
const mockConsoleError = jest.spyOn(console, 'error').mockImplementation()

describe('initReactAxe', () => {
  const originalEnv = process.env.NODE_ENV
  const originalWindow = global.window

  beforeEach(() => {
    jest.clearAllMocks()
    jest.resetModules()
    
    // Mock require for React and ReactDOM
    jest.doMock('react', () => mockReact)
    jest.doMock('react-dom', () => mockReactDOM)
  })

  afterEach(() => {
    process.env.NODE_ENV = originalEnv
    global.window = originalWindow
    mockConsoleLog.mockRestore()
    mockConsoleError.mockRestore()
  })

  it('should initialize axe-core in development mode', async () => {
    process.env.NODE_ENV = 'development'
    
    // Import the module to trigger initialization
    await import('@/utils/initReactAxe')
    
    // Wait for dynamic import to resolve
    await new Promise(resolve => setTimeout(resolve, 0))
    
    expect(mockAxe).toHaveBeenCalledWith(mockReact, mockReactDOM, 1000)
  })

  it('should not initialize axe-core in production mode', async () => {
    process.env.NODE_ENV = 'production'
    
    // Import the module
    await import('@/utils/initReactAxe')
    
    // Wait a bit to ensure no async operations occur
    await new Promise(resolve => setTimeout(resolve, 100))
    
    expect(mockAxe).not.toHaveBeenCalled()
  })

  it('should not initialize axe-core in test environment', async () => {
    process.env.NODE_ENV = 'test'
    
    // Import the module
    await import('@/utils/initReactAxe')
    
    // Wait a bit to ensure no async operations occur
    await new Promise(resolve => setTimeout(resolve, 100))
    
    expect(mockAxe).not.toHaveBeenCalled()
  })

  it('should handle missing window object (SSR)', async () => {
    process.env.NODE_ENV = 'development'
    
    // Remove window object to simulate SSR
    delete (global as any).window
    
    // Import the module
    await import('@/utils/initReactAxe')
    
    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 100))
    
    // Should not initialize when window is undefined
    expect(mockAxe).not.toHaveBeenCalled()
  })

  it('should handle dynamic import failures gracefully', async () => {
    process.env.NODE_ENV = 'development'
    
    // Mock dynamic import to fail
    jest.doMock('@axe-core/react', () => {
      throw new Error('Module not found')
    }, { virtual: true })
    
    // Import should not throw
    await expect(import('@/utils/initReactAxe')).resolves.toBeDefined()
  })

  it('should use correct timeout value', async () => {
    process.env.NODE_ENV = 'development'
    
    // Import the module
    await import('@/utils/initReactAxe')
    
    // Wait for dynamic import
    await new Promise(resolve => setTimeout(resolve, 0))
    
    expect(mockAxe).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      1000 // Verify timeout is 1000ms
    )
  })

  it('should only run in browser environment', async () => {
    process.env.NODE_ENV = 'development'
    
    // Ensure window exists
    Object.defineProperty(global, 'window', {
      value: {},
      writable: true
    })
    
    // Import the module
    await import('@/utils/initReactAxe')
    
    // Wait for initialization
    await new Promise(resolve => setTimeout(resolve, 0))
    
    expect(mockAxe).toHaveBeenCalled()
  })

  it('should handle React require failure', async () => {
    process.env.NODE_ENV = 'development'
    
    // Mock require to throw for React
    jest.doMock('react', () => {
      throw new Error('React not found')
    })
    
    // Should not crash the application
    await expect(import('@/utils/initReactAxe')).resolves.toBeDefined()
  })

  it('should handle ReactDOM require failure', async () => {
    process.env.NODE_ENV = 'development'
    
    // Mock require to throw for ReactDOM
    jest.doMock('react-dom', () => {
      throw new Error('ReactDOM not found')
    })
    
    // Should not crash the application
    await expect(import('@/utils/initReactAxe')).resolves.toBeDefined()
  })

  it('should be istanbul ignored', () => {
    // Verify the file has proper istanbul ignore comments
    const fs = require('fs')
    const path = require('path')
    const filePath = path.join(process.cwd(), 'src/utils/initReactAxe.ts')
    const fileContent = fs.readFileSync(filePath, 'utf-8')
    
    expect(fileContent).toContain('/* istanbul ignore file */')
  })

  it('should be eslint disabled', () => {
    // Verify the file has proper eslint disable comments
    const fs = require('fs')
    const path = require('path')
    const filePath = path.join(process.cwd(), 'src/utils/initReactAxe.ts')
    const fileContent = fs.readFileSync(filePath, 'utf-8')
    
    expect(fileContent).toContain('/* eslint-disable */')
  })
})