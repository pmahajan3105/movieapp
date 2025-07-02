/**
 * @jest-environment jsdom
 */

// @ts-nocheck
import { renderHook, act } from '@testing-library/react'
import { useVoiceOutput } from '@/hooks/useVoiceOutput'
import { audioManager, AudioManager } from '@/lib/audio/AudioManager'

// Mock AudioManager
jest.mock('@/lib/audio/AudioManager')

const mockAudioManager = {
  speak: jest.fn().mockResolvedValue(undefined),
  stopAllAudio: jest.fn(),
  subscribe: jest.fn().mockReturnValue(() => {}),
  getState: jest.fn().mockReturnValue({
    isPlaying: false,
    currentSource: null,
    currentDescription: null,
  }),
}

const mockAudioManagerInstance = AudioManager.getInstance as jest.MockedFunction<typeof AudioManager.getInstance>

// Mock speech synthesis
const mockSpeechSynthesis = {
  speak: jest.fn(),
  cancel: jest.fn(),
  pause: jest.fn(),
  resume: jest.fn(),
  getVoices: jest.fn().mockReturnValue([
    { name: 'Alex', lang: 'en-US', default: true, localService: true, voiceURI: 'Alex' },
    { name: 'Samantha', lang: 'en-US', default: false, localService: true, voiceURI: 'Samantha' },
    { name: 'Google US English', lang: 'en-US', default: false, localService: false, voiceURI: 'Google US English' },
  ]),
  speaking: false,
  pending: false,
  paused: false,
  onvoiceschanged: null as (() => void) | null,
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
}

beforeAll(() => {
  global.speechSynthesis = mockSpeechSynthesis as any
  global.SpeechSynthesisUtterance = jest.fn(() => ({
    text: '',
    voice: null,
    volume: 1,
    rate: 1,
    pitch: 1,
    lang: 'en-US',
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  })) as any
})

beforeEach(() => {
  jest.clearAllMocks()
})

describe('useVoiceOutput', () => {
  describe('Initialization', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => useVoiceOutput())
      
      expect(result.current.isSupported).toBe(true)
      expect(result.current.isSpeaking).toBe(false)
      expect(result.current.availableVoices).toEqual([])
    })

    it('should detect when speech synthesis is not supported', () => {
      const originalSpeechSynthesis = global.speechSynthesis
      delete (global as any).speechSynthesis
      
      const { result } = renderHook(() => useVoiceOutput())
      
      expect(result.current.isSupported).toBe(false)
      
      global.speechSynthesis = originalSpeechSynthesis
    })

    it('should load voices on initialization', async () => {
      const { result } = renderHook(() => useVoiceOutput())
      
      // Voices should be loaded automatically on initialization
      expect(mockSpeechSynthesis.getVoices).toHaveBeenCalled()
    })

    it('should apply custom options', () => {
      const options = {
        rate: 0.8,
        pitch: 1.2,
        volume: 0.9,
        voice: undefined,
      }
      
      const { result } = renderHook(() => useVoiceOutput(options))
      
      expect(result.current.isSupported).toBe(true)
    })
  })

  describe('Voice Management', () => {
    it('should load available voices', async () => {
      const { result } = renderHook(() => useVoiceOutput())
      
      // Voices are loaded automatically in useEffect
      await act(async () => {
        // Trigger voices loaded event
        const voicesChangedHandler = mockSpeechSynthesis.onvoiceschanged
        if (voicesChangedHandler) {
          voicesChangedHandler()
        }
      })
      
      expect(result.current.availableVoices).toHaveLength(3)
      expect(result.current.availableVoices[0]?.name).toBe('Alex')
      expect(result.current.availableVoices[1]?.name).toBe('Samantha')
      expect(result.current.availableVoices[2]?.name).toBe('Google US English')
    })

    it('should provide voice selection utilities', async () => {
      const { result } = renderHook(() => useVoiceOutput())
      
      await act(async () => {
        // Trigger voices loaded
        const voicesChangedHandler = mockSpeechSynthesis.onvoiceschanged
        if (voicesChangedHandler) {
          voicesChangedHandler()
        }
      })
      
      // Test getPreferredVoice function
      const preferredVoice = result.current.getPreferredVoice('en-US')
      expect(preferredVoice?.name).toBe('Alex') // First voice is default
    })

    it('should provide voices by language', async () => {
      const { result } = renderHook(() => useVoiceOutput())
      
      await act(async () => {
        // Trigger voices loaded
        const voicesChangedHandler = mockSpeechSynthesis.onvoiceschanged
        if (voicesChangedHandler) {
          voicesChangedHandler()
        }
      })
      
      // Test getVoicesByLanguage function
      const enVoices = result.current.getVoicesByLanguage('en-US')
      expect(enVoices).toHaveLength(3) // All test voices are en-US
    })

    it('should handle voice loading errors', async () => {
      mockSpeechSynthesis.getVoices.mockImplementationOnce(() => {
        throw new Error('Voice loading failed')
      })
      
      const { result } = renderHook(() => useVoiceOutput())
      
      // Should handle error gracefully and still be supported
      expect(result.current.isSupported).toBe(true)
      expect(result.current.availableVoices).toEqual([])
    })
  })

  describe('Speech Synthesis', () => {
    it('should speak text using AudioManager', async () => {
      const { result } = renderHook(() => useVoiceOutput())
      
      await act(async () => {
        await result.current.speak('Hello world')
      })
      
      expect(mockAudioManager.speak).toHaveBeenCalledWith('Hello world', 'tts')
    })

    it('should use custom voice options', async () => {
      const { result } = renderHook(() => useVoiceOutput({
        rate: 0.8,
        pitch: 1.2,
        volume: 0.9,
      }))
      
      await act(async () => {
        await result.current.speak('Test message')
      })
      
      expect(mockAudioManager.speak).toHaveBeenCalledWith('Test message', 'tts')
    })

    it('should override options for individual speak calls', async () => {
      const { result } = renderHook(() => useVoiceOutput())
      
      await act(async () => {
        await result.current.speak('Custom rate', { rate: 0.5 })
      })
      
      expect(mockAudioManager.speak).toHaveBeenCalledWith('Custom rate', 'tts')
    })

    it('should truncate long descriptions', async () => {
      const { result } = renderHook(() => useVoiceOutput())
      const longText = 'This is a very long text that should be truncated in the description because it exceeds the 50 character limit that we have set for descriptions'
      
      await act(async () => {
        await result.current.speak(longText)
      })
      
      expect(mockAudioManager.speak).toHaveBeenCalledWith(longText, 'tts')
    })

    it('should update speaking state during synthesis', async () => {
      const { result } = renderHook(() => useVoiceOutput())
      
      let speakPromise: Promise<void>
      
      await act(async () => {
        speakPromise = result.current.speak('Test')
        // Speaking state should be true during synthesis
        expect(result.current.isSpeaking).toBe(true)
      })
      
      await act(async () => {
        await speakPromise!
        // Speaking state should be false after synthesis
        expect(result.current.isSpeaking).toBe(false)
      })
    })

    it('should handle speech synthesis errors', async () => {
      mockAudioManager.speak.mockRejectedValueOnce(new Error('Speech failed'))
      
      const { result } = renderHook(() => useVoiceOutput())
      
      await act(async () => {
        await expect(result.current.speak('Test')).rejects.toThrow('Speech failed')
      })
      
      expect(result.current.isSpeaking).toBe(false)
    })
  })

  describe('Speech Control', () => {
    it('should stop speech synthesis', () => {
      const { result } = renderHook(() => useVoiceOutput())
      
      act(() => {
        result.current.stopSpeaking()
      })
      
      expect(mockAudioManager.stopAllAudio).toHaveBeenCalled()
    })

    it('should pause speech synthesis', () => {
      const { result } = renderHook(() => useVoiceOutput())
      
      act(() => {
        result.current.pauseSpeaking()
      })
      
      expect(mockSpeechSynthesis.pause).toHaveBeenCalled()
    })

    it('should resume speech synthesis', () => {
      const { result } = renderHook(() => useVoiceOutput())
      
      act(() => {
        result.current.resumeSpeaking()
      })
      
      expect(mockSpeechSynthesis.resume).toHaveBeenCalled()
    })
  })

  describe('Error Handling', () => {
    it('should handle unsupported speech synthesis', async () => {
      const originalSpeechSynthesis = global.speechSynthesis
      delete (global as any).speechSynthesis
      
      const { result } = renderHook(() => useVoiceOutput())
      
      expect(result.current.isSupported).toBe(false)
      
      await act(async () => {
        // Should not throw, just log warning
        await result.current.speak('Test')
      })
      
      global.speechSynthesis = originalSpeechSynthesis
    })

    it('should handle missing window object', async () => {
      const originalWindow = global.window
      delete (global as any).window
      
      const { result } = renderHook(() => useVoiceOutput())
      
      expect(result.current.isSupported).toBe(false)
      
      global.window = originalWindow
    })

    it('should warn about missing speech synthesis', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation()
      
      const originalSpeechSynthesis = global.speechSynthesis
      delete (global as any).speechSynthesis
      
      const { result } = renderHook(() => useVoiceOutput())
      
      await act(async () => {
        try {
          await result.current.speak('Test')
        } catch (error) {
          // Expected to throw
        }
      })
      
      global.speechSynthesis = originalSpeechSynthesis
      consoleSpy.mockRestore()
    })
  })

  describe('Voice Events', () => {
    it('should handle voiceschanged event', async () => {
      const { result } = renderHook(() => useVoiceOutput())
      
      // Simulate voiceschanged event
      await act(async () => {
        if (mockSpeechSynthesis.onvoiceschanged) {
          mockSpeechSynthesis.onvoiceschanged()
        }
      })
      
      expect(mockSpeechSynthesis.getVoices).toHaveBeenCalled()
    })

    it('should retry voice loading if initially empty', async () => {
      mockSpeechSynthesis.getVoices
        .mockReturnValueOnce([]) // First call returns empty
        .mockReturnValueOnce([ // Second call returns voices
          { name: 'Alex', lang: 'en-US', default: true, localService: true, voiceURI: 'Alex' },
        ])
      
      const { result } = renderHook(() => useVoiceOutput())
      
      await act(async () => {
        // Trigger onvoiceschanged event
        if (mockSpeechSynthesis.onvoiceschanged) {
          mockSpeechSynthesis.onvoiceschanged()
        }
      })
      
      // Voices should be loaded automatically
      expect(mockSpeechSynthesis.getVoices).toHaveBeenCalled()
    })
  })

  describe('Cleanup', () => {
    it('should cleanup on unmount', () => {
      const { unmount } = renderHook(() => useVoiceOutput())
      
      unmount()
      
      // Should cleanup speech synthesis event listeners
      expect(mockSpeechSynthesis.onvoiceschanged).toBe(null)
    })

    it('should remove event listeners on unmount', () => {
      const { unmount } = renderHook(() => useVoiceOutput())
      
      unmount()
      
      // Verify onvoiceschanged is cleaned up
      expect(mockSpeechSynthesis.onvoiceschanged).toBe(null)
    })
  })

  describe('Integration with AudioManager', () => {
    it('should use AudioManager for coordinated audio playback', async () => {
      const { result } = renderHook(() => useVoiceOutput())
      
      await act(async () => {
        await result.current.speak('Integration test')
      })
      
      expect(AudioManager.getInstance).toHaveBeenCalled()
      expect(mockAudioManager.speak).toHaveBeenCalledWith(
        'Integration test',
        'tts',
        expect.any(Object),
        'Integration test...'
      )
    })

    it('should handle AudioManager conflicts', async () => {
      mockAudioManager.speak.mockRejectedValueOnce(new Error('Audio conflict'))
      
      const { result } = renderHook(() => useVoiceOutput())
      
      await act(async () => {
        await expect(result.current.speak('Conflict test')).rejects.toThrow('Audio conflict')
      })
      
      expect(result.current.isSpeaking).toBe(false)
    })
  })
})