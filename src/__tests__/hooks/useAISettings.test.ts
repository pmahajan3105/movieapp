/**
 * Tests for useAISettings hook
 * Tests AI settings business logic, API interactions, and state management
 */

import { renderHook, act, waitFor } from '@testing-library/react'
import { useAISettings, AIControlSettings } from '@/hooks/useAISettings'
import { useAuth } from '@/contexts/AuthContext'

// Mock dependencies
jest.mock('@/contexts/AuthContext')

// Mock console methods
const consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation()
const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()
const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation()

// Mock fetch
global.fetch = jest.fn()

const mockUser = { id: 'user123', email: 'test@example.com' }

describe('useAISettings', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(fetch as jest.Mock).mockClear()
    ;(useAuth as jest.Mock).mockReturnValue({ user: mockUser })
  })

  describe('initialization', () => {
    it('should initialize with default settings', () => {
      const { result } = renderHook(() => useAISettings())

      expect(result.current.settings.ai_provider).toBe('openai')
      expect(result.current.settings.auto_fallback).toBe(true)
      expect(result.current.settings.preferred_model).toBe('gpt-5-mini')
      expect(result.current.settings.recommendation_style).toBe('balanced')
      expect(result.current.settings.discovery_preference).toBe('mixed')
      expect(result.current.settings.genre_diversity).toBe(70)
      expect(result.current.isLoading).toBe(true)
      expect(result.current.hasChanges).toBe(false)
    })

    it('should not load settings when user is not present', () => {
      ;(useAuth as jest.Mock).mockReturnValue({ user: null })
      
      renderHook(() => useAISettings())

      expect(fetch).not.toHaveBeenCalled()
    })
  })

  describe('loadSettings', () => {
    it('should load settings successfully from API', async () => {
      const mockSettings = {
        recommendation_style: 'adventurous',
        genre_diversity: 90,
        learning_enabled: false,
      }

      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ settings: mockSettings }),
      })

      const { result } = renderHook(() => useAISettings())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.settings.recommendation_style).toBe('adventurous')
      expect(result.current.settings.genre_diversity).toBe(90)
      expect(result.current.settings.learning_enabled).toBe(false)
      // Should merge with defaults
      expect(result.current.settings.discovery_preference).toBe('mixed')
    })

    it('should handle API errors gracefully', async () => {
      ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'))

      const { result } = renderHook(() => useAISettings())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'AI settings fetch failed:',
        'Network error'
      )
      // Should still have default settings
      expect(result.current.settings.recommendation_style).toBe('balanced')
    })

    it('should handle non-OK response gracefully', async () => {
      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
      })

      const { result } = renderHook(() => useAISettings())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Should use default settings when API returns error
      expect(result.current.settings.recommendation_style).toBe('balanced')
    })
  })

  describe('saveSettings', () => {
    it('should save settings successfully', async () => {
      ;(fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true, json: async () => ({ settings: {} }) }) // Load
        .mockResolvedValueOnce({ ok: true }) // Save

      const { result } = renderHook(() => useAISettings())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Make a change first
      act(() => {
        result.current.updateSetting('recommendation_style', 'adventurous')
      })

      expect(result.current.hasChanges).toBe(true)

      // Save settings
      await act(async () => {
        await result.current.saveSettings()
      })

      expect(fetch).toHaveBeenCalledWith('/api/user/ai-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: expect.stringContaining('"recommendation_style":"adventurous"')
      })

      expect(result.current.hasChanges).toBe(false)
      expect(result.current.successMessage).toBe('AI settings saved successfully!')
      expect(consoleInfoSpy).toHaveBeenCalledWith('AI settings updated:', expect.any(Object))
    })

    it('should handle save errors', async () => {
      ;(fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true, json: async () => ({ settings: {} }) }) // Load
        .mockResolvedValueOnce({ ok: false, status: 500 }) // Save fails

      const { result } = renderHook(() => useAISettings())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Make a change
      act(() => {
        result.current.updateSetting('recommendation_style', 'adventurous')
      })

      // Try to save
      await act(async () => {
        await result.current.saveSettings()
      })

      expect(result.current.error).toMatch(/Failed to save settings|Server error: 500/)
      expect(result.current.hasChanges).toBe(true) // Should still have changes
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to save AI settings:',
        expect.stringMatching(/Failed to save settings|Server error: 500/)
      )
    })

    it('should handle network errors during save', async () => {
      ;(fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true, json: async () => ({ settings: {} }) }) // Load
        .mockRejectedValueOnce(new Error('Network timeout')) // Save fails

      const { result } = renderHook(() => useAISettings())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      act(() => {
        result.current.updateSetting('learning_enabled', false)
      })

      await act(async () => {
        await result.current.saveSettings()
      })

      expect(result.current.error).toBe('Network timeout')
      expect(result.current.hasChanges).toBe(true)
    })

    it('should clear success message after timeout', async () => {
      jest.useFakeTimers()

      ;(fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true, json: async () => ({ settings: {} }) })
        .mockResolvedValueOnce({ ok: true })

      const { result } = renderHook(() => useAISettings())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      act(() => {
        result.current.updateSetting('learning_enabled', false)
      })

      await act(async () => {
        await result.current.saveSettings()
      })

      expect(result.current.successMessage).toBe('AI settings saved successfully!')

      // Fast forward time
      act(() => {
        jest.advanceTimersByTime(3000)
      })

      expect(result.current.successMessage).toBe(null)

      jest.useRealTimers()
    })
  })

  describe('updateSetting', () => {
    it('should update simple settings', () => {
      const { result } = renderHook(() => useAISettings())

      act(() => {
        result.current.updateSetting('recommendation_style', 'conservative')
      })

      expect(result.current.settings.recommendation_style).toBe('conservative')
      expect(result.current.hasChanges).toBe(true)
    })

    it('should update nested settings', () => {
      const { result } = renderHook(() => useAISettings())

      act(() => {
        result.current.updateSetting('content_filtering.explicit_content', true)
      })

      expect(result.current.settings.content_filtering.explicit_content).toBe(true)
      expect(result.current.hasChanges).toBe(true)
    })

    it('should update numeric settings', () => {
      const { result } = renderHook(() => useAISettings())

      act(() => {
        result.current.updateSetting('genre_diversity', 25)
      })

      expect(result.current.settings.genre_diversity).toBe(25)
      expect(result.current.hasChanges).toBe(true)
    })

    it('should handle deep nested paths', () => {
      const { result } = renderHook(() => useAISettings())

      act(() => {
        result.current.updateSetting('content_filtering.violence_threshold', 75)
      })

      expect(result.current.settings.content_filtering.violence_threshold).toBe(75)
      expect(result.current.hasChanges).toBe(true)
    })
  })

  describe('resetToDefaults', () => {
    it('should reset all settings to defaults', () => {
      const { result } = renderHook(() => useAISettings())

      // Change some settings first
      act(() => {
        result.current.updateSetting('recommendation_style', 'adventurous')
        result.current.updateSetting('genre_diversity', 90)
        result.current.updateSetting('learning_enabled', false)
      })

      expect(result.current.settings.recommendation_style).toBe('adventurous')
      expect(result.current.settings.genre_diversity).toBe(90)
      expect(result.current.settings.learning_enabled).toBe(false)

      // Reset to defaults
      act(() => {
        result.current.resetToDefaults()
      })

      expect(result.current.settings.recommendation_style).toBe('balanced')
      expect(result.current.settings.genre_diversity).toBe(70)
      expect(result.current.settings.learning_enabled).toBe(true)
      expect(result.current.hasChanges).toBe(true)
    })
  })

  describe('state management', () => {
    it('should manage loading states correctly', async () => {
      ;(fetch as jest.Mock).mockImplementationOnce(
        () => new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          json: async () => ({ settings: {} })
        }), 100))
      )

      const { result } = renderHook(() => useAISettings())

      expect(result.current.isLoading).toBe(true)

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
    })

    it('should manage saving states correctly', async () => {
      ;(fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true, json: async () => ({ settings: {} }) })
        .mockImplementationOnce(
          () => new Promise(resolve => setTimeout(() => resolve({ ok: true }), 100))
        )

      const { result } = renderHook(() => useAISettings())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      act(() => {
        result.current.updateSetting('learning_enabled', false)
      })

      // Check that isSaving becomes true immediately after calling saveSettings
      let savePromise: Promise<void>
      act(() => {
        savePromise = result.current.saveSettings()
      })

      expect(result.current.isSaving).toBe(true)

      await act(async () => {
      await savePromise
      })

      expect(result.current.isSaving).toBe(false)
    })
  })

  describe('error handling', () => {
    it('should clear errors when saving successfully', async () => {
      ;(fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true, json: async () => ({ settings: {} }) })
        .mockResolvedValueOnce({ ok: false }) // First save fails
        .mockResolvedValueOnce({ ok: true })  // Second save succeeds

      const { result } = renderHook(() => useAISettings())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      act(() => {
        result.current.updateSetting('learning_enabled', false)
      })

      // First save - should fail
      await act(async () => {
        await result.current.saveSettings()
      })

      expect(result.current.error).toBeTruthy()

      // Second save - should succeed and clear error
      await act(async () => {
        await result.current.saveSettings()
      })

      expect(result.current.error).toBe(null)
    })
  })
}) 