import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useRouter } from 'next/navigation'
import { OtpForm } from '../OtpForm'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}))

// Mock AuthContext
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: jest.fn(),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

// Mock fetch globally
global.fetch = jest.fn()

const mockPush = jest.fn()
const mockRefreshUser = jest.fn()

// Test utilities
const createTestQueryClient = () => {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
}

const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = createTestQueryClient()
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>{component}</AuthProvider>
    </QueryClientProvider>
  )
}

describe('OtpForm - Real Implementation Tests', () => {
  const mockEmail = 'test@example.com'
  const mockOnBackToLogin = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
    })
    ;(useAuth as jest.Mock).mockReturnValue({
      refreshUser: mockRefreshUser,
    })
    ;(global.fetch as jest.Mock).mockClear()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  describe('Basic Functionality', () => {
    it('renders OTP form correctly', () => {
      renderWithProviders(<OtpForm email={mockEmail} onBackToLogin={mockOnBackToLogin} />)

      expect(screen.getByText('Verify your email')).toBeInTheDocument()
      expect(screen.getByText(mockEmail)).toBeInTheDocument()
      expect(screen.getByLabelText('Verification code')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Back to login' })).toBeInTheDocument()
    })

    it('focuses OTP input automatically', () => {
      renderWithProviders(<OtpForm email={mockEmail} onBackToLogin={mockOnBackToLogin} />)

      const otpInput = screen.getByLabelText('Verification code')
      expect(otpInput).toHaveFocus()
    })

    it('formats OTP input with spaces', async () => {
      const user = userEvent.setup()
      renderWithProviders(<OtpForm email={mockEmail} onBackToLogin={mockOnBackToLogin} />)

      const otpInput = screen.getByLabelText('Verification code')
      await user.type(otpInput, '123456')

      expect(otpInput).toHaveValue('1 2 3 4 5 6')
    })

    it('calls onBackToLogin when back button clicked', async () => {
      const user = userEvent.setup()
      renderWithProviders(<OtpForm email={mockEmail} onBackToLogin={mockOnBackToLogin} />)

      const backButton = screen.getByRole('button', { name: 'Back to login' })
      await user.click(backButton)

      expect(mockOnBackToLogin).toHaveBeenCalled()
    })
  })

  describe('OTP Verification', () => {
    it('auto-submits when valid 6-digit OTP is entered', async () => {
      const user = userEvent.setup()
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          user: { onboarding_completed: true },
        }),
      })

      renderWithProviders(<OtpForm email={mockEmail} onBackToLogin={mockOnBackToLogin} />)

      const otpInput = screen.getByLabelText('Verification code')
      await user.type(otpInput, '123456')

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/auth/verify-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: mockEmail,
            token: '123456',
          }),
        })
      })
    })

    it('redirects to dashboard when onboarding completed', async () => {
      const user = userEvent.setup()
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          user: { onboarding_completed: true },
        }),
      })

      renderWithProviders(<OtpForm email={mockEmail} onBackToLogin={mockOnBackToLogin} />)

      const otpInput = screen.getByLabelText('Verification code')
      await user.type(otpInput, '123456')

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/dashboard')
      })
    })

    it('redirects to preferences when onboarding not completed', async () => {
      const user = userEvent.setup()
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          user: { onboarding_completed: false },
        }),
      })

      renderWithProviders(<OtpForm email={mockEmail} onBackToLogin={mockOnBackToLogin} />)

      const otpInput = screen.getByLabelText('Verification code')
      await user.type(otpInput, '123456')

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/dashboard/preferences')
      })
    })

    it('shows loading state during verification', async () => {
      const user = userEvent.setup()
      ;(global.fetch as jest.Mock).mockImplementation(() => new Promise(() => {})) // Never resolves

      renderWithProviders(<OtpForm email={mockEmail} onBackToLogin={mockOnBackToLogin} />)

      const otpInput = screen.getByLabelText('Verification code')
      await user.type(otpInput, '123456')

      await waitFor(() => {
        expect(screen.getByText('Verifying...')).toBeInTheDocument()
      })
    })

    it('displays error when verification fails', async () => {
      const user = userEvent.setup()
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          error: 'Invalid verification code',
        }),
      })

      renderWithProviders(<OtpForm email={mockEmail} onBackToLogin={mockOnBackToLogin} />)

      const otpInput = screen.getByLabelText('Verification code')
      await user.type(otpInput, '123456')

      await waitFor(() => {
        expect(screen.getByText('Invalid verification code')).toBeInTheDocument()
      })
    })
  })

  describe('Resend Functionality', () => {
    beforeEach(() => {
      jest.useFakeTimers()
    })

    it('shows countdown initially', () => {
      renderWithProviders(<OtpForm email={mockEmail} onBackToLogin={mockOnBackToLogin} />)

      expect(screen.getByText(/Resend available in 60s/)).toBeInTheDocument()
      expect(screen.getByText("Didn't receive the code?")).toBeInTheDocument()
    })

    it('shows countdown timer functionality', () => {
      renderWithProviders(<OtpForm email={mockEmail} onBackToLogin={mockOnBackToLogin} />)

      // Fast-forward 30 seconds
      jest.advanceTimersByTime(30000)

      // Should still show countdown (would be 30s remaining)
      expect(screen.getByText(/Resend available in/)).toBeInTheDocument()
    })
  })

  describe('Input Validation', () => {
    it('only allows numeric input', async () => {
      const user = userEvent.setup()
      renderWithProviders(<OtpForm email={mockEmail} onBackToLogin={mockOnBackToLogin} />)

      const otpInput = screen.getByLabelText('Verification code')
      await user.type(otpInput, 'abc123def')

      expect(otpInput).toHaveValue('1 2 3')
    })

    it('limits input to 6 digits maximum', async () => {
      const user = userEvent.setup()
      renderWithProviders(<OtpForm email={mockEmail} onBackToLogin={mockOnBackToLogin} />)

      const otpInput = screen.getByLabelText('Verification code')
      await user.type(otpInput, '1234567890')

      expect(otpInput).toHaveValue('1 2 3 4 5 6')
    })
  })

  describe('Accessibility', () => {
    it('has proper input attributes for accessibility', () => {
      renderWithProviders(<OtpForm email={mockEmail} onBackToLogin={mockOnBackToLogin} />)

      const otpInput = screen.getByLabelText('Verification code')
      expect(otpInput).toHaveAttribute('inputMode', 'numeric')
      expect(otpInput).toHaveAttribute('type', 'text')
    })
  })
})
