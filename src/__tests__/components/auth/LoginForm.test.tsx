import { render } from '@testing-library/react'
import { screen } from '@testing-library/dom'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { LoginForm } from '@/components/auth/LoginForm'

// Mock fetch for API calls
global.fetch = jest.fn()

describe('LoginForm Component', () => {
  const mockOnOtpSent = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders login form with email input', () => {
    render(<LoginForm onOtpSent={mockOnOtpSent} />)
    
    expect(screen.getByText('Welcome to CineAI')).toBeInTheDocument()
    expect(screen.getByLabelText('Email address')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /send verification code/i })).toBeInTheDocument()
  })

  it('has proper form structure', () => {
    render(<LoginForm onOtpSent={mockOnOtpSent} />)
    
    const emailInput = screen.getByLabelText('Email address')
    const submitButton = screen.getByRole('button', { name: /send verification code/i })
    
    expect(emailInput).toHaveAttribute('type', 'email')
    expect(emailInput).toHaveAttribute('placeholder', 'Enter your email')
    expect(submitButton).toHaveAttribute('type', 'submit')
  })

  it('can accept user input', async () => {
    const user = userEvent.setup()
    render(<LoginForm onOtpSent={mockOnOtpSent} />)
    
    const emailInput = screen.getByLabelText('Email address')
    
    await user.type(emailInput, 'test@example.com')
    expect(emailInput).toHaveValue('test@example.com')
  })

  it('shows loading state when submitting', async () => {
    const user = userEvent.setup()
    
    // Mock delayed API response
    ;(global.fetch as jest.Mock).mockImplementationOnce(
      () => new Promise(resolve => setTimeout(() => resolve({
        ok: true,
        json: async () => ({ success: true })
      }), 100))
    )
    
    render(<LoginForm onOtpSent={mockOnOtpSent} />)
    
    const emailInput = screen.getByLabelText('Email address')
    const submitButton = screen.getByRole('button', { name: /send verification code/i })
    
    await user.type(emailInput, 'test@example.com')
    await user.click(submitButton)
    
    expect(screen.getByText('Sending verification code...')).toBeInTheDocument()
    expect(submitButton).toBeDisabled()
  })

  it('displays helper text', () => {
    render(<LoginForm onOtpSent={mockOnOtpSent} />)
    
    // Use partial text matching since text is split by <br>
    expect(screen.getByText(/6-digit verification code via email/)).toBeInTheDocument()
    expect(screen.getByText(/No password required/)).toBeInTheDocument()
  })
}) 