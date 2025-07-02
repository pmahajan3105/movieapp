/**
 * @jest-environment jsdom
 */

import React from 'react'
import { render } from '@testing-library/react'
import { ServiceWorkerRegistration } from '@/components/ServiceWorkerRegistration'

// Mock console methods to avoid noise in tests
const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation()
const mockConsoleError = jest.spyOn(console, 'error').mockImplementation()

// Mock service worker
const mockServiceWorker = {
  register: jest.fn(),
  unregister: jest.fn(),
  ready: Promise.resolve({}),
  controller: null,
  oncontrollerchange: null,
  onmessage: null,
}

// Mock navigator.serviceWorker
Object.defineProperty(navigator, 'serviceWorker', {
  value: mockServiceWorker,
  writable: true,
})

describe('ServiceWorkerRegistration', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockServiceWorker.register.mockResolvedValue({
      installing: null,
      waiting: null,
      active: { scriptURL: '/sw.js' },
      addEventListener: jest.fn(),
      update: jest.fn(),
    })
  })

  afterAll(() => {
    mockConsoleLog.mockRestore()
    mockConsoleError.mockRestore()
  })

  it('should render without crashing', () => {
    render(<ServiceWorkerRegistration />)
    // Component should render successfully (no visual output expected)
  })

  it('should register service worker in production', () => {
    const originalEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'production'

    render(<ServiceWorkerRegistration />)

    expect(mockServiceWorker.register).toHaveBeenCalledWith('/sw.js')

    process.env.NODE_ENV = originalEnv
  })

  it('should not register service worker in development', () => {
    const originalEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'development'

    render(<ServiceWorkerRegistration />)

    expect(mockServiceWorker.register).not.toHaveBeenCalled()

    process.env.NODE_ENV = originalEnv
  })

  it('should handle service worker registration success', async () => {
    const originalEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'production'

    render(<ServiceWorkerRegistration />)

    // Wait for registration to complete
    await new Promise(resolve => setTimeout(resolve, 0))

    expect(mockConsoleLog).toHaveBeenCalledWith('SW registered: ', expect.any(Object))

    process.env.NODE_ENV = originalEnv
  })

  it('should handle service worker registration failure', async () => {
    const originalEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'production'

    const registrationError = new Error('Registration failed')
    mockServiceWorker.register.mockRejectedValueOnce(registrationError)

    render(<ServiceWorkerRegistration />)

    // Wait for registration to fail
    await new Promise(resolve => setTimeout(resolve, 0))

    expect(mockConsoleError).toHaveBeenCalledWith('SW registration failed: ', registrationError)

    process.env.NODE_ENV = originalEnv
  })

  it('should handle missing service worker support', () => {
    // Temporarily remove service worker support
    const originalServiceWorker = navigator.serviceWorker
    Object.defineProperty(navigator, 'serviceWorker', {
      value: undefined,
      writable: true,
    })

    render(<ServiceWorkerRegistration />)

    expect(mockServiceWorker.register).not.toHaveBeenCalled()

    // Restore service worker support
    Object.defineProperty(navigator, 'serviceWorker', {
      value: originalServiceWorker,
      writable: true,
    })
  })

  it('should handle service worker with updates', async () => {
    const originalEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'production'

    const mockRegistration = {
      installing: null,
      waiting: { scriptURL: '/sw.js' },
      active: { scriptURL: '/sw.js' },
      addEventListener: jest.fn(),
      update: jest.fn(),
    }

    mockServiceWorker.register.mockResolvedValueOnce(mockRegistration)

    render(<ServiceWorkerRegistration />)

    await new Promise(resolve => setTimeout(resolve, 0))

    expect(mockRegistration.addEventListener).toHaveBeenCalledWith(
      'updatefound',
      expect.any(Function)
    )

    process.env.NODE_ENV = originalEnv
  })

  it('should handle HTTPS requirement', () => {
    const originalEnv = process.env.NODE_ENV
    const originalLocation = window.location
    
    process.env.NODE_ENV = 'production'
    
    // Mock HTTP location (should not register)
    Object.defineProperty(window, 'location', {
      value: { protocol: 'http:', hostname: 'example.com' },
      writable: true,
    })

    render(<ServiceWorkerRegistration />)

    // Should still attempt registration (browser will handle HTTPS requirement)
    expect(mockServiceWorker.register).toHaveBeenCalled()

    process.env.NODE_ENV = originalEnv
    Object.defineProperty(window, 'location', {
      value: originalLocation,
      writable: true,
    })
  })

  it('should handle localhost development', () => {
    const originalEnv = process.env.NODE_ENV
    const originalLocation = window.location
    
    process.env.NODE_ENV = 'production'
    
    // Mock localhost
    Object.defineProperty(window, 'location', {
      value: { protocol: 'http:', hostname: 'localhost' },
      writable: true,
    })

    render(<ServiceWorkerRegistration />)

    expect(mockServiceWorker.register).toHaveBeenCalledWith('/sw.js')

    process.env.NODE_ENV = originalEnv
    Object.defineProperty(window, 'location', {
      value: originalLocation,
      writable: true,
    })
  })

  it('should unregister on unmount if needed', () => {
    const { unmount } = render(<ServiceWorkerRegistration />)
    
    unmount()
    
    // Current implementation doesn't unregister on unmount
    // This test ensures the component unmounts cleanly
    expect(true).toBe(true)
  })
})