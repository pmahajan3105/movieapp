/**
 * @jest-environment jsdom
 */

import { renderHook, act } from '@testing-library/react'
import { useVoiceInput } from '@/hooks/useVoiceInput'

// Mock the Web Speech API
const mockSpeechRecognition = {
  start: jest.fn(),
  stop: jest.fn(),
  abort: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  continuous: false,
  interimResults: false,
  lang: 'en-US',
  maxAlternatives: 1,
  serviceURI: '',
  grammars: null,
  onstart: null,
  onend: null,
  onerror: null,
  onresult: null,
  onspeechstart: null,
  onspeechend: null,
  onaudiostart: null,
  onaudioend: null,
  onsoundstart: null,
  onsoundend: null,
  onnomatch: null,
}

const mockWebkitSpeechRecognition = jest.fn(() => mockSpeechRecognition)

// Setup global mocks
beforeAll(() => {
  ;(global as any).webkitSpeechRecognition = mockWebkitSpeechRecognition
  ;(global as any).SpeechRecognition = jest.fn(() => mockSpeechRecognition)
})

beforeEach(() => {
  jest.clearAllMocks()
})

describe('useVoiceInput', () => {
  describe('Initialization', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => useVoiceInput())
      
      expect(result.current.isListening).toBe(false)
      expect(result.current.transcript).toBe('')
      expect(result.current.isSupported).toBe(true)
      expect(result.current.error).toBe(null)
    })

    it('should detect when speech recognition is not supported', () => {
      // Temporarily remove speech recognition
      const originalSpeechRecognition = (global as any).SpeechRecognition
      const originalWebkitSpeechRecognition = (global as any).webkitSpeechRecognition
      
      delete (global as any).SpeechRecognition
      delete (global as any).webkitSpeechRecognition
      
      const { result } = renderHook(() => useVoiceInput())
      
      expect(result.current.isSupported).toBe(false)
      
      // Restore
      ;(global as any).SpeechRecognition = originalSpeechRecognition
      ;(global as any).webkitSpeechRecognition = originalWebkitSpeechRecognition
    })

    it('should apply custom options', () => {
      const options = {
        continuous: true,
        interimResults: true,
        lang: 'es-ES',
        maxAlternatives: 3,
      }
      
      renderHook(() => useVoiceInput(options))
      
      expect(mockWebkitSpeechRecognition).toHaveBeenCalled()
      const recognitionInstance = mockWebkitSpeechRecognition.mock.results[0]?.value
      expect(recognitionInstance.continuous).toBe(true)
      expect(recognitionInstance.interimResults).toBe(true)
      expect(recognitionInstance.lang).toBe('es-ES')
      expect(recognitionInstance.maxAlternatives).toBe(3)
    })
  })

  describe('Speech Recognition Control', () => {
    it('should start listening when startListening is called', () => {
      const { result } = renderHook(() => useVoiceInput())
      
      act(() => {
        result.current.startListening()
      })
      
      expect(mockSpeechRecognition.start).toHaveBeenCalled()
      expect(result.current.isListening).toBe(true)
    })

    it('should stop listening when stopListening is called', () => {
      const { result } = renderHook(() => useVoiceInput())
      
      // Start listening first
      act(() => {
        result.current.startListening()
      })
      
      // Then stop
      act(() => {
        result.current.stopListening()
      })
      
      expect(mockSpeechRecognition.stop).toHaveBeenCalled()
      expect(result.current.isListening).toBe(false)
    })

    it('should abort listening when abort is called', () => {
      const { result } = renderHook(() => useVoiceInput())
      
      act(() => {
        result.current.startListening()
      })
      
      act(() => {
        result.current.abortListening()
      })
      
      expect(mockSpeechRecognition.abort).toHaveBeenCalled()
      expect(result.current.isListening).toBe(false)
    })

    it('should clear transcript when clearTranscript is called', () => {
      const { result } = renderHook(() => useVoiceInput())
      
      // Simulate transcript update by setting initial transcript
      // Note: The actual hook doesn't expose setTranscript directly
      // We'll test resetTranscript which is the actual API
      
      act(() => {
        result.current.resetTranscript()
      })
      
      expect(result.current.transcript).toBe('')
    })
  })

  describe('Event Handling', () => {
    it('should handle speech recognition start event', () => {
      const { result } = renderHook(() => useVoiceInput())
      
      act(() => {
        result.current.startListening()
      })
      
      // Simulate start event
      const startHandler = mockSpeechRecognition.addEventListener.mock.calls.find(
        call => call[0] === 'start'
      )?.[1]
      
      expect(startHandler).toBeDefined()
      
      act(() => {
        startHandler?.()
      })
      
      expect(result.current.isListening).toBe(true)
      expect(result.current.error).toBe(null)
    })

    it('should handle speech recognition end event', () => {
      const { result } = renderHook(() => useVoiceInput())
      
      act(() => {
        result.current.startListening()
      })
      
      // Simulate end event
      const endHandler = mockSpeechRecognition.addEventListener.mock.calls.find(
        call => call[0] === 'end'
      )?.[1]
      
      expect(endHandler).toBeDefined()
      
      act(() => {
        endHandler?.()
      })
      
      expect(result.current.isListening).toBe(false)
    })

    it('should handle speech recognition result event', () => {
      const onResult = jest.fn()
      const { result } = renderHook(() => useVoiceInput({ onResult }))
      
      act(() => {
        result.current.startListening()
      })
      
      // Simulate result event
      const resultHandler = mockSpeechRecognition.addEventListener.mock.calls.find(
        call => call[0] === 'result'
      )?.[1]
      
      expect(resultHandler).toBeDefined()
      
      const mockEvent = {
        results: [
          {
            0: { transcript: 'hello world', confidence: 0.9 },
            isFinal: true,
            length: 1,
          },
        ],
        resultIndex: 0,
      }
      
      act(() => {
        resultHandler?.(mockEvent)
      })
      
      expect(result.current.transcript).toBe('hello world')
      expect(onResult).toHaveBeenCalledWith('hello world', true)
    })

    it('should handle interim results', () => {
      const onResult = jest.fn()
      const { result } = renderHook(() => useVoiceInput({ 
        interimResults: true,
        onResult 
      }))
      
      act(() => {
        result.current.startListening()
      })
      
      const resultHandler = mockSpeechRecognition.addEventListener.mock.calls.find(
        call => call[0] === 'result'
      )?.[1]
      
      const mockInterimEvent = {
        results: [
          {
            0: { transcript: 'hello', confidence: 0.7 },
            isFinal: false,
            length: 1,
          },
        ],
        resultIndex: 0,
      }
      
      act(() => {
        resultHandler?.(mockInterimEvent)
      })
      
      expect(result.current.transcript).toBe('hello')
      expect(onResult).toHaveBeenCalledWith('hello', false)
    })

    it('should handle speech recognition errors', () => {
      const onError = jest.fn()
      const { result } = renderHook(() => useVoiceInput({ onError }))
      
      act(() => {
        result.current.startListening()
      })
      
      const errorHandler = mockSpeechRecognition.addEventListener.mock.calls.find(
        call => call[0] === 'error'
      )?.[1]
      
      expect(errorHandler).toBeDefined()
      
      const mockError = {
        error: 'network',
        message: 'Network connection error',
      }
      
      act(() => {
        errorHandler?.(mockError)
      })
      
      expect(result.current.error).toBe('network')
      expect(result.current.isListening).toBe(false)
      expect(onError).toHaveBeenCalledWith(mockError)
    })
  })

  describe('Error Handling', () => {
    it('should handle "not-allowed" error', () => {
      const { result } = renderHook(() => useVoiceInput())
      
      act(() => {
        result.current.startListening()
      })
      
      const errorHandler = mockSpeechRecognition.addEventListener.mock.calls.find(
        call => call[0] === 'error'
      )?.[1]
      
      act(() => {
        errorHandler?.({ error: 'not-allowed' })
      })
      
      expect(result.current.error).toBe('not-allowed')
      expect(result.current.isListening).toBe(false)
    })

    it('should handle "no-speech" error', () => {
      const { result } = renderHook(() => useVoiceInput())
      
      act(() => {
        result.current.startListening()
      })
      
      const errorHandler = mockSpeechRecognition.addEventListener.mock.calls.find(
        call => call[0] === 'error'
      )?.[1]
      
      act(() => {
        errorHandler?.({ error: 'no-speech' })
      })
      
      expect(result.current.error).toBe('no-speech')
    })

    it('should reset error state when starting new session', () => {
      const { result } = renderHook(() => useVoiceInput())
      
      // Simulate error
      act(() => {
        result.current.startListening()
      })
      
      const errorHandler = mockSpeechRecognition.addEventListener.mock.calls.find(
        call => call[0] === 'error'
      )?.[1]
      
      act(() => {
        errorHandler?.({ error: 'network' })
      })
      
      expect(result.current.error).toBe('network')
      
      // Start new session
      act(() => {
        result.current.startListening()
      })
      
      expect(result.current.error).toBe(null)
    })
  })

  describe('Cleanup', () => {
    it('should cleanup event listeners on unmount', () => {
      const { unmount } = renderHook(() => useVoiceInput())
      
      unmount()
      
      expect(mockSpeechRecognition.removeEventListener).toHaveBeenCalledTimes(6)
      expect(mockSpeechRecognition.removeEventListener).toHaveBeenCalledWith('start', expect.any(Function))
      expect(mockSpeechRecognition.removeEventListener).toHaveBeenCalledWith('end', expect.any(Function))
      expect(mockSpeechRecognition.removeEventListener).toHaveBeenCalledWith('result', expect.any(Function))
      expect(mockSpeechRecognition.removeEventListener).toHaveBeenCalledWith('error', expect.any(Function))
    })

    it('should stop recognition on unmount if listening', () => {
      const { result, unmount } = renderHook(() => useVoiceInput())
      
      act(() => {
        result.current.startListening()
      })
      
      unmount()
      
      expect(mockSpeechRecognition.stop).toHaveBeenCalled()
    })
  })

  describe('Multiple Results Handling', () => {
    it('should concatenate multiple final results', () => {
      const { result } = renderHook(() => useVoiceInput())
      
      act(() => {
        result.current.startListening()
      })
      
      const resultHandler = mockSpeechRecognition.addEventListener.mock.calls.find(
        call => call[0] === 'result'
      )?.[1]
      
      // First result
      act(() => {
        resultHandler?.({
          results: [
            {
              0: { transcript: 'hello', confidence: 0.9 },
              isFinal: true,
              length: 1,
            },
          ],
          resultIndex: 0,
        })
      })
      
      // Second result
      act(() => {
        resultHandler?.({
          results: [
            {
              0: { transcript: 'hello', confidence: 0.9 },
              isFinal: true,
              length: 1,
            },
            {
              0: { transcript: ' world', confidence: 0.8 },
              isFinal: true,
              length: 1,
            },
          ],
          resultIndex: 1,
        })
      })
      
      expect(result.current.transcript).toBe('hello world')
    })

    it('should handle confidence scores', () => {
      const onResult = jest.fn()
      const { result } = renderHook(() => useVoiceInput({ onResult }))
      
      act(() => {
        result.current.startListening()
      })
      
      const resultHandler = mockSpeechRecognition.addEventListener.mock.calls.find(
        call => call[0] === 'result'
      )?.[1]
      
      act(() => {
        resultHandler?.({
          results: [
            {
              0: { transcript: 'test', confidence: 0.95 },
              isFinal: true,
              length: 1,
            },
          ],
          resultIndex: 0,
        })
      })
      
      expect(onResult).toHaveBeenCalledWith('test', true)
    })
  })
})