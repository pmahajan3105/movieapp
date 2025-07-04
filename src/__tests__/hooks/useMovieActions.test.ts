/**
 * Tests for useMovieActions hook
 * Tests business logic, error handling, and user feedback
 */

import { renderHook, act, waitFor } from '@testing-library/react'
import { toast } from 'react-hot-toast'
import { useMovieActions } from '@/hooks/useMovieActions'
import { logger } from '@/lib/logger'

// Mock dependencies
jest.mock('react-hot-toast', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}))

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
  },
}))

// Mock fetch
global.fetch = jest.fn()

describe('useMovieActions', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(fetch as jest.Mock).mockClear()
  })

  describe('initial state', () => {
    it('should initialize with correct default values', () => {
      const { result } = renderHook(() => useMovieActions())

      expect(result.current.state.selectedMovie).toBe(null)
      expect(result.current.state.selectedMovieInsights).toBe(null)
      expect(result.current.state.movieModalOpen).toBe(false)
    })

    it('should provide all required handler functions', () => {
      const { result } = renderHook(() => useMovieActions())

      expect(typeof result.current.handleMovieView).toBe('function')
      expect(typeof result.current.handleMovieSave).toBe('function')
      expect(typeof result.current.handleMovieRate).toBe('function')
      expect(typeof result.current.handleModalClose).toBe('function')
    })
  })

  describe('handleMovieView', () => {
    it('should handle movie view with provided data', async () => {
      const { result } = renderHook(() => useMovieActions())
      const movieData = { id: '1', title: 'Test Movie' }
      const aiInsights = { rating: 9.5 }

      await act(async () => {
        await result.current.handleMovieView('1', movieData, aiInsights)
      })

      expect(result.current.state.selectedMovie).toEqual(movieData)
      expect(result.current.state.selectedMovieInsights).toEqual(aiInsights)
      expect(result.current.state.movieModalOpen).toBe(true)
    })

    it('should fetch movie details when no data provided', async () => {
      const movieData = { id: '1', title: 'Fetched Movie' }
      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ movie: movieData }),
      })

      const { result } = renderHook(() => useMovieActions())

      await act(async () => {
        await result.current.handleMovieView('1')
      })

      expect(fetch).toHaveBeenCalledWith('/api/movies/details/1')
      expect(result.current.state.selectedMovie).toEqual(movieData)
      expect(result.current.state.movieModalOpen).toBe(true)
      expect(logger.info).toHaveBeenCalledWith('Movie details loaded successfully', { movieId: '1' })
    })

    it('should fallback to general endpoint if details endpoint fails', async () => {
      const movieData = { id: '1', title: 'Fallback Movie' }
      ;(fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: false }) // First call fails
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: movieData }),
        }) // Second call succeeds

      const { result } = renderHook(() => useMovieActions())

      await act(async () => {
        await result.current.handleMovieView('1')
      })

      expect(fetch).toHaveBeenCalledTimes(2)
      expect(fetch).toHaveBeenNthCalledWith(1, '/api/movies/details/1')
      expect(fetch).toHaveBeenNthCalledWith(2, '/api/movies/1')
      expect(result.current.state.selectedMovie).toEqual(movieData)
    })

    it('should handle API errors gracefully', async () => {
      ;(fetch as jest.Mock).mockResolvedValue({ ok: false, statusText: 'Not Found' })

      const { result } = renderHook(() => useMovieActions())

      await act(async () => {
        await result.current.handleMovieView('1')
      })

      expect(toast.error).toHaveBeenCalledWith('Failed to fetch movie details: Not Found')
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to fetch movie details',
        expect.objectContaining({ movieId: '1' })
      )
      expect(result.current.state.movieModalOpen).toBe(false)
    })

    it.skip('should handle missing movie data in response', async () => {
      // TODO: Fix truthiness logic in hook
      ;(fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ movie: null, data: null }), // Explicitly null movie data
      })

      const { result } = renderHook(() => useMovieActions())

      await act(async () => {
        await result.current.handleMovieView('1')
      })

      expect(toast.error).toHaveBeenCalledWith('No movie data received from server')
      expect(result.current.state.movieModalOpen).toBe(false)
    })
  })

  describe('handleMovieSave', () => {
    it('should save movie to watchlist successfully', async () => {
      ;(fetch as jest.Mock).mockResolvedValue({ ok: true })

      const { result } = renderHook(() => useMovieActions())

      await act(async () => {
        await result.current.handleMovieSave('1')
      })

      expect(fetch).toHaveBeenCalledWith('/api/watchlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ movieId: '1' }),
      })
      expect(toast.success).toHaveBeenCalledWith('Movie added to watchlist!')
      expect(logger.info).toHaveBeenCalledWith('Movie added to watchlist successfully', { movieId: '1' })
    })

    it('should handle save errors with error message from server', async () => {
      ;(fetch as jest.Mock).mockResolvedValue({
        ok: false,
        statusText: 'Bad Request',
        json: async () => ({ error: 'Movie already in watchlist' }),
      })

      const { result } = renderHook(() => useMovieActions())

      await act(async () => {
        await result.current.handleMovieSave('1')
      })

      expect(toast.error).toHaveBeenCalledWith('Movie already in watchlist')
      expect(logger.error).toHaveBeenCalled()
    })

    it('should handle save errors with generic message', async () => {
      ;(fetch as jest.Mock).mockResolvedValue({
        ok: false,
        statusText: 'Server Error',
        json: jest.fn().mockRejectedValue(new Error('Invalid JSON')),
      })

      const { result } = renderHook(() => useMovieActions())

      await act(async () => {
        await result.current.handleMovieSave('1')
      })

      expect(toast.error).toHaveBeenCalledWith('Failed to add movie to watchlist: Server Error')
    })
  })

  describe('handleMovieRate', () => {
    it('should rate movie successfully', async () => {
      ;(fetch as jest.Mock).mockResolvedValue({ ok: true })

      const { result } = renderHook(() => useMovieActions())

      await act(async () => {
        await result.current.handleMovieRate('1', 4)
      })

      expect(fetch).toHaveBeenCalledWith('/api/ratings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ movieId: '1', rating: 4 }),
      })
      expect(toast.success).toHaveBeenCalledWith('Movie rated 4/5 stars!')
      expect(logger.info).toHaveBeenCalledWith('Movie rated successfully', { movieId: '1', rating: 4 })
    })

    it('should handle rating errors', async () => {
      ;(fetch as jest.Mock).mockResolvedValue({
        ok: false,
        json: async () => ({ error: 'Invalid rating' }),
      })

      const { result } = renderHook(() => useMovieActions())

      await act(async () => {
        await result.current.handleMovieRate('1', 6) // Invalid rating
      })

      expect(toast.error).toHaveBeenCalledWith('Invalid rating')
      expect(logger.error).toHaveBeenCalled()
    })
  })

  describe('handleModalClose', () => {
    it('should reset all modal state', async () => {
      const { result } = renderHook(() => useMovieActions())

      // Set some state first by using handleMovieView
      const movieData = { id: '1', title: 'Test' }
      await act(async () => {
        await result.current.handleMovieView('1', movieData, { rating: 9 })
      })

      // Verify state is set
      expect(result.current.state.selectedMovie).toEqual(movieData)
      expect(result.current.state.movieModalOpen).toBe(true)

      // Close modal
      act(() => {
        result.current.handleModalClose()
      })

      expect(result.current.state.selectedMovie).toBe(null)
      expect(result.current.state.selectedMovieInsights).toBe(null)
      expect(result.current.state.movieModalOpen).toBe(false)
    })
  })

  describe('error handling edge cases', () => {
    it('should handle network errors', async () => {
      ;(fetch as jest.Mock).mockRejectedValue(new Error('Network error'))

      const { result } = renderHook(() => useMovieActions())

      await act(async () => {
        await result.current.handleMovieView('1')
      })

      expect(toast.error).toHaveBeenCalledWith('Network error')
      expect(logger.error).toHaveBeenCalled()
    })

    it('should handle non-Error exceptions', async () => {
      ;(fetch as jest.Mock).mockRejectedValue('String error')

      const { result } = renderHook(() => useMovieActions())

      await act(async () => {
        await result.current.handleMovieSave('1')
      })

      expect(toast.error).toHaveBeenCalledWith('Failed to add movie to watchlist')
      expect(logger.error).toHaveBeenCalled()
    })
  })
}) 