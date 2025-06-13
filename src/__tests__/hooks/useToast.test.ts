import { renderHook, act } from '@testing-library/react'
import { useToast } from '../../hooks/useToast'

// Mock react-hot-toast
jest.mock('react-hot-toast', () => {
  const mockToast = jest.fn()
  const mockSuccess = jest.fn()
  const mockError = jest.fn()
  const mockLoading = jest.fn()
  const mockDismiss = jest.fn()

  return {
    __esModule: true,
    default: Object.assign(mockToast, {
      success: mockSuccess,
      error: mockError,
      loading: mockLoading,
      dismiss: mockDismiss,
    }),
    mockToast,
    mockSuccess,
    mockError,
    mockLoading,
    mockDismiss,
  }
})

const { mockToast, mockSuccess, mockError, mockLoading, mockDismiss } =
  jest.requireMock('react-hot-toast')

describe('useToast', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Hook Structure', () => {
    it('returns all expected methods', () => {
      const { result } = renderHook(() => useToast())

      expect(result.current).toHaveProperty('showSuccess')
      expect(result.current).toHaveProperty('showError')
      expect(result.current).toHaveProperty('showInfo')
      expect(result.current).toHaveProperty('showWarning')
      expect(result.current).toHaveProperty('showLoading')
      expect(result.current).toHaveProperty('dismiss')
    })

    it('returns functions for all methods', () => {
      const { result } = renderHook(() => useToast())

      expect(typeof result.current.showSuccess).toBe('function')
      expect(typeof result.current.showError).toBe('function')
      expect(typeof result.current.showInfo).toBe('function')
      expect(typeof result.current.showWarning).toBe('function')
      expect(typeof result.current.showLoading).toBe('function')
      expect(typeof result.current.dismiss).toBe('function')
    })
  })

  describe('Toast Methods', () => {
    it('showSuccess calls toast.success', () => {
      const { result } = renderHook(() => useToast())

      act(() => {
        result.current.showSuccess('Success message')
      })

      expect(mockSuccess).toHaveBeenCalledWith(
        'Success message',
        expect.objectContaining({
          duration: 4000,
          position: 'top-right',
        })
      )
    })

    it('showError calls toast.error', () => {
      const { result } = renderHook(() => useToast())

      act(() => {
        result.current.showError('Error message')
      })

      expect(mockError).toHaveBeenCalledWith(
        'Error message',
        expect.objectContaining({
          duration: 4000,
          position: 'top-right',
        })
      )
    })

    it('showInfo calls toast', () => {
      const { result } = renderHook(() => useToast())

      act(() => {
        result.current.showInfo('Info message')
      })

      expect(mockToast).toHaveBeenCalledWith(
        'Info message',
        expect.objectContaining({
          duration: 4000,
          position: 'top-right',
        })
      )
    })

    it('showWarning calls toast with warning icon', () => {
      const { result } = renderHook(() => useToast())

      act(() => {
        result.current.showWarning('Warning message')
      })

      expect(mockToast).toHaveBeenCalledWith(
        'Warning message',
        expect.objectContaining({
          duration: 4000,
          position: 'top-right',
          icon: '⚠️',
        })
      )
    })

    it('showLoading calls toast.loading', () => {
      const { result } = renderHook(() => useToast())

      act(() => {
        result.current.showLoading('Loading message')
      })

      expect(mockLoading).toHaveBeenCalledWith(
        'Loading message',
        expect.objectContaining({
          duration: 4000,
          position: 'top-right',
        })
      )
    })

    it('dismiss calls toast.dismiss', () => {
      const { result } = renderHook(() => useToast())

      act(() => {
        result.current.dismiss('toast-id')
      })

      expect(mockDismiss).toHaveBeenCalledWith('toast-id')
    })
  })

  describe('Custom Options', () => {
    it('merges custom options with defaults', () => {
      const { result } = renderHook(() => useToast())
      const customOptions = { duration: 6000, position: 'bottom-center' as const }

      act(() => {
        result.current.showSuccess('Success message', customOptions)
      })

      expect(mockSuccess).toHaveBeenCalledWith(
        'Success message',
        expect.objectContaining({
          duration: 6000,
          position: 'bottom-center',
        })
      )
    })

    it('allows custom icon override for warning', () => {
      const { result } = renderHook(() => useToast())
      const customOptions = { icon: '🚨' }

      act(() => {
        result.current.showWarning('Warning message', customOptions)
      })

      expect(mockToast).toHaveBeenCalledWith(
        'Warning message',
        expect.objectContaining({
          icon: '🚨',
        })
      )
    })
  })

  describe('Performance', () => {
    it('handles multiple rapid calls efficiently', () => {
      const { result } = renderHook(() => useToast())

      act(() => {
        for (let i = 0; i < 10; i++) {
          result.current.showSuccess(`Message ${i}`)
        }
      })

      expect(mockSuccess).toHaveBeenCalledTimes(10)
    })

    it('handles different toast types in sequence', () => {
      const { result } = renderHook(() => useToast())

      act(() => {
        result.current.showSuccess('Success')
        result.current.showError('Error')
        result.current.showInfo('Info')
        result.current.showWarning('Warning')
      })

      expect(mockSuccess).toHaveBeenCalledTimes(1)
      expect(mockError).toHaveBeenCalledTimes(1)
      expect(mockToast).toHaveBeenCalledTimes(2) // Info and Warning
    })
  })
})
