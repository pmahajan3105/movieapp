import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LoginForm } from '../LoginForm'

// Mock fetch
global.fetch = jest.fn()

const mockOnMagicLinkSent = jest.fn()

describe('LoginForm', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(global.fetch as jest.Mock).mockClear()
  })

  it('renders login form correctly', () => {
    render(<LoginForm onMagicLinkSent={mockOnMagicLinkSent} />)

    expect(screen.getByText('Welcome to CineAI')).toBeInTheDocument()
    expect(screen.getByText('Your personal AI movie recommendation assistant')).toBeInTheDocument()
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /send magic link/i })).toBeInTheDocument()
  })

  it('validates email field is required', async () => {
    const user = userEvent.setup()
    render(<LoginForm onMagicLinkSent={mockOnMagicLinkSent} />)

    const submitButton = screen.getByRole('button', { name: /send magic link/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument()
    })
  })

  it('validates email format', async () => {
    const user = userEvent.setup()
    render(<LoginForm onMagicLinkSent={mockOnMagicLinkSent} />)

    const emailInput = screen.getByLabelText(/email address/i)
    const submitButton = screen.getByRole('button', { name: /send magic link/i })

    await user.type(emailInput, 'invalid-email')
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument()
    })
  })

  it('submits form with valid email', async () => {
    const user = userEvent.setup()
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    })

    render(<LoginForm onMagicLinkSent={mockOnMagicLinkSent} />)

    const emailInput = screen.getByLabelText(/email address/i)
    const submitButton = screen.getByRole('button', { name: /send magic link/i })

    await user.type(emailInput, 'test@example.com')
    await user.click(submitButton)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/auth/request-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: 'test@example.com' }),
      })
    })

    await waitFor(() => {
      expect(mockOnMagicLinkSent).toHaveBeenCalledWith('test@example.com')
    })
  })

  it('handles API error gracefully', async () => {
    const user = userEvent.setup()
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Server error' }),
    })

    render(<LoginForm onMagicLinkSent={mockOnMagicLinkSent} />)

    const emailInput = screen.getByLabelText(/email address/i)
    const submitButton = screen.getByRole('button', { name: /send magic link/i })

    await user.type(emailInput, 'test@example.com')
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('Server error')).toBeInTheDocument()
    })

    expect(mockOnMagicLinkSent).not.toHaveBeenCalled()
  })

  it('shows loading state during submission', async () => {
    const user = userEvent.setup()
    ;(global.fetch as jest.Mock).mockImplementationOnce(
      () =>
        new Promise(resolve =>
          setTimeout(
            () =>
              resolve({
                ok: true,
                json: async () => ({ success: true }),
              }),
            100
          )
        )
    )

    render(<LoginForm onMagicLinkSent={mockOnMagicLinkSent} />)

    const emailInput = screen.getByLabelText(/email address/i)
    const submitButton = screen.getByRole('button', { name: /send magic link/i })

    await user.type(emailInput, 'test@example.com')
    await user.click(submitButton)

    expect(screen.getByText('Sending magic link...')).toBeInTheDocument()
    expect(submitButton).toBeDisabled()

    await waitFor(() => {
      expect(mockOnMagicLinkSent).toHaveBeenCalledWith('test@example.com')
    })
  })
})
