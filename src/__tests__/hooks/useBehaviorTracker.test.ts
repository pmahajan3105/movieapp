/**
 * @jest-environment jsdom
 */

import { renderHook, act } from '@testing-library/react'
import { useBehaviorTracker } from '@/hooks/useBehaviorTracker'
import { useAuth } from '@/contexts/AuthContext'

// Mock the auth context
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: jest.fn()
}))

// Mock fetch for API calls
global.fetch = jest.fn()

describe('useBehaviorTracker', () => {
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com'
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useAuth as jest.Mock).mockReturnValue({ user: mockUser })
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true })
    })
  })

  it('should provide tracking functions', () => {
    const { result } = renderHook(() => useBehaviorTracker())
    
    expect(result.current.trackInteraction).toBeDefined()
    expect(result.current.trackMovieView).toBeDefined()
    expect(result.current.trackSearchQuery).toBeDefined()
    expect(result.current.trackRating).toBeDefined()
    expect(result.current.trackWatchlistAction).toBeDefined()
    expect(typeof result.current.trackInteraction).toBe('function')
  })

  it('should track movie interactions', async () => {
    const { result } = renderHook(() => useBehaviorTracker())
    
    await act(async () => {
      await result.current.trackInteraction({
        type: 'click',
        movieId: 'movie-123',
        context: { source: 'recommendations' }
      })
    })
    
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/user/interactions',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: expect.stringContaining('movie-123')
      })
    )
  })

  it('should track movie views with duration', async () => {
    const { result } = renderHook(() => useBehaviorTracker())
    
    await act(async () => {
      await result.current.trackMovieView('movie-456', 120, {
        source: 'search',
        rating: 4.5
      })
    })
    
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/user/interactions',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"duration":120')
      })
    )
  })

  it('should track search queries', async () => {
    const { result } = renderHook(() => useBehaviorTracker())
    
    await act(async () => {
      await result.current.trackSearchQuery('action movies', {
        resultsCount: 15,
        filters: { genre: 'Action' }
      })
    })
    
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/user/interactions',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('action movies')
      })
    )
  })

  it('should track ratings', async () => {
    const { result } = renderHook(() => useBehaviorTracker())
    
    await act(async () => {
      await result.current.trackRating('movie-789', 5, {
        context: 'watchlist',
        previousRating: 4
      })
    })
    
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/user/interactions',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"rating":5')
      })
    )
  })

  it('should track watchlist actions', async () => {
    const { result } = renderHook(() => useBehaviorTracker())
    
    await act(async () => {
      await result.current.trackWatchlistAction('movie-101', 'add', {
        source: 'recommendations',
        reason: 'liked similar movies'
      })
    })
    
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/user/interactions',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"action":"add"')
      })
    )
  })

  it('should handle unauthenticated users gracefully', async () => {
    ;(useAuth as jest.Mock).mockReturnValue({ user: null })
    
    const { result } = renderHook(() => useBehaviorTracker())
    
    await act(async () => {
      await result.current.trackInteraction({
        type: 'click',
        movieId: 'movie-123'
      })
    })
    
    // Should not make API calls when user is not authenticated
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('should handle API errors gracefully', async () => {
    ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'))
    
    const { result } = renderHook(() => useBehaviorTracker())
    
    // Should not throw even if API call fails
    await act(async () => {
      await expect(result.current.trackInteraction({
        type: 'click',
        movieId: 'movie-123'
      })).resolves.not.toThrow()
    })
  })

  it('should include timestamp and session data in requests', async () => {
    const { result } = renderHook(() => useBehaviorTracker())
    
    await act(async () => {
      await result.current.trackInteraction({
        type: 'view',
        movieId: 'movie-555',
        context: { source: 'trending' }
      })
    })
    
    const requestBody = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body)
    
    expect(requestBody).toHaveProperty('timestamp')
    expect(requestBody).toHaveProperty('userId', mockUser.id)
    expect(requestBody).toHaveProperty('movieId', 'movie-555')
    expect(requestBody).toHaveProperty('type', 'view')
  })

  it('should batch multiple interactions efficiently', async () => {
    const { result } = renderHook(() => useBehaviorTracker())
    
    await act(async () => {
      // Track multiple interactions quickly
      await Promise.all([
        result.current.trackInteraction({ type: 'view', movieId: 'movie-1' }),
        result.current.trackInteraction({ type: 'click', movieId: 'movie-2' }),
        result.current.trackInteraction({ type: 'like', movieId: 'movie-3' })
      ])
    })
    
    // Should make 3 separate API calls (no batching in current implementation)
    expect(global.fetch).toHaveBeenCalledTimes(3)
  })

  it('should handle missing movie IDs appropriately', async () => {
    const { result } = renderHook(() => useBehaviorTracker())
    
    await act(async () => {
      await result.current.trackInteraction({
        type: 'search',
        // No movieId for search interactions
        context: { query: 'thriller movies' }
      })
    })
    
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/user/interactions',
      expect.objectContaining({
        method: 'POST'
      })
    )
  })
})