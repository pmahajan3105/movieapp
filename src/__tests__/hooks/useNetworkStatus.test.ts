/**
 * @jest-environment jsdom
 */

import { renderHook, act } from '@testing-library/react'
import { useNetworkStatus } from '@/hooks/useNetworkStatus'

// Mock navigator.onLine
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true,
})

// Mock window.addEventListener and removeEventListener
const mockAddEventListener = jest.spyOn(window, 'addEventListener')
const mockRemoveEventListener = jest.spyOn(window, 'removeEventListener')

describe('useNetworkStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true,
    })
  })

  afterEach(() => {
    mockAddEventListener.mockRestore()
    mockRemoveEventListener.mockRestore()
  })

  it('should return online status initially', () => {
    const { result } = renderHook(() => useNetworkStatus())
    
    expect(result.current.isOnline).toBe(true)
  })

  it('should return offline status when navigator.onLine is false', () => {
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: false,
    })

    const { result } = renderHook(() => useNetworkStatus())
    
    expect(result.current.isOnline).toBe(false)
  })

  it('should add event listeners on mount', () => {
    renderHook(() => useNetworkStatus())
    
    expect(mockAddEventListener).toHaveBeenCalledWith('online', expect.any(Function))
    expect(mockAddEventListener).toHaveBeenCalledWith('offline', expect.any(Function))
  })

  it('should remove event listeners on unmount', () => {
    const { unmount } = renderHook(() => useNetworkStatus())
    
    unmount()
    
    expect(mockRemoveEventListener).toHaveBeenCalledWith('online', expect.any(Function))
    expect(mockRemoveEventListener).toHaveBeenCalledWith('offline', expect.any(Function))
  })

  it('should update status when online event is fired', () => {
    const { result } = renderHook(() => useNetworkStatus())
    
    // Simulate going offline first
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: false,
    })
    
    act(() => {
      const offlineEvent = new Event('offline')
      window.dispatchEvent(offlineEvent)
    })
    
    expect(result.current.isOnline).toBe(false)
    
    // Then simulate coming back online
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true,
    })
    
    act(() => {
      const onlineEvent = new Event('online')
      window.dispatchEvent(onlineEvent)
    })
    
    expect(result.current.isOnline).toBe(true)
  })

  it('should update status when offline event is fired', () => {
    const { result } = renderHook(() => useNetworkStatus())
    
    expect(result.current.isOnline).toBe(true)
    
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: false,
    })
    
    act(() => {
      const offlineEvent = new Event('offline')
      window.dispatchEvent(offlineEvent)
    })
    
    expect(result.current.isOnline).toBe(false)
  })

  it('should handle multiple online/offline transitions', () => {
    const { result } = renderHook(() => useNetworkStatus())
    
    // Start online
    expect(result.current.isOnline).toBe(true)
    
    // Go offline
    Object.defineProperty(navigator, 'onLine', { value: false })
    act(() => window.dispatchEvent(new Event('offline')))
    expect(result.current.isOnline).toBe(false)
    
    // Go online
    Object.defineProperty(navigator, 'onLine', { value: true })
    act(() => window.dispatchEvent(new Event('online')))
    expect(result.current.isOnline).toBe(true)
    
    // Go offline again
    Object.defineProperty(navigator, 'onLine', { value: false })
    act(() => window.dispatchEvent(new Event('offline')))
    expect(result.current.isOnline).toBe(false)
  })

  it('should work without network connection detection support', () => {
    // Mock navigator.onLine as undefined (older browsers)
    Object.defineProperty(navigator, 'onLine', {
      value: undefined,
    })

    const { result } = renderHook(() => useNetworkStatus())
    
    // Should default to true when navigator.onLine is undefined
    expect(result.current.isOnline).toBe(true)
  })
})