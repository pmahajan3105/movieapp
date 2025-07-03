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

describe('useNetworkStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true,
    })
  })

  it('should return online status initially', () => {
    const { result } = renderHook(() => useNetworkStatus())
    
    expect(result.current.isOnline).toBe(true)
    expect(result.current.connectionType).toBeDefined()
    expect(result.current.effectiveType).toBeDefined()
  })

  it('should return offline status when navigator.onLine is false', () => {
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: false,
    })

    const { result } = renderHook(() => useNetworkStatus())
    
    expect(result.current.isOnline).toBe(false)
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
    
    // The hook should handle undefined navigator.onLine gracefully
    // It may return undefined or a default boolean value
    expect(result.current.isOnline === undefined || typeof result.current.isOnline === 'boolean').toBe(true)
  })

  it('should provide additional network information', () => {
    const { result } = renderHook(() => useNetworkStatus())
    
    expect(result.current).toHaveProperty('isSlowConnection')
    expect(result.current).toHaveProperty('isFastConnection')
    expect(result.current).toHaveProperty('shouldOptimizeForData')
    expect(result.current).toHaveProperty('connectionType')
    expect(result.current).toHaveProperty('effectiveType')
  })
})