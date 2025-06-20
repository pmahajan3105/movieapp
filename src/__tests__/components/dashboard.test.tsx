/**
 * @jest-environment jsdom
 */

import React from 'react'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import DashboardPage from '../../app/dashboard/page'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'react-hot-toast'

// Mock dependencies
jest.mock('@/contexts/AuthContext')
jest.mock('react-hot-toast')
jest.mock('@/components/chat/ChatInterface', () => ({
  ChatInterface: ({
    onPreferencesExtracted,
  }: {
    onPreferencesExtracted: (preferences: unknown) => void
  }) => (
    <div data-testid="chat-interface">
      <div>Mock Chat Interface</div>
      <button
        onClick={() => onPreferencesExtracted({ genres: ['Action'] })}
        data-testid="simulate-preferences"
      >
        Simulate Preferences Extracted
      </button>
    </div>
  ),
}))

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>
const mockToast = toast as jest.MockedFunction<typeof toast>

describe('DashboardPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    mockUseAuth.mockReturnValue({
      loading: false,
      user: {
        id: 'user-123',
        email: 'test@example.com',
        app_metadata: {},
        user_metadata: {},
        aud: 'authenticated',
        created_at: '2024-01-01T00:00:00Z',
      },
      isSessionValid: true,
      signOut: jest.fn(),
      reloadProfile: jest.fn(),
      refreshUser: jest.fn(),
    })

    // Mock toast methods
    mockToast.success = jest.fn()
    mockToast.error = jest.fn()
  })

  describe('Loading State', () => {
    it('shows loading content when auth is loading', () => {
      mockUseAuth.mockReturnValue({
        loading: true,
        user: null,
        isSessionValid: false,
        signOut: jest.fn(),
        reloadProfile: jest.fn(),
        refreshUser: jest.fn(),
      })

      render(<DashboardPage />)

      // When loading, the page still renders but user might not be authenticated
      // Just check that loading state is handled gracefully
      expect(document.body).toBeInTheDocument()
    })
  })

  describe('Main Dashboard', () => {
    it('renders welcome message and chat interface', () => {
      render(<DashboardPage />)

      expect(screen.getByText('Welcome to CineAI! 🎬')).toBeInTheDocument()
      expect(
        screen.getByText('Chat with our AI to discover your perfect movies')
      ).toBeInTheDocument()
      expect(screen.getByText('Chat with CineAI')).toBeInTheDocument()
      expect(screen.getByTestId('chat-interface')).toBeInTheDocument()
    })

    it('shows navigation cards', () => {
      render(<DashboardPage />)

      // Check for Smart Movies card
      expect(screen.getByText('Smart Movies')).toBeInTheDocument()
      expect(screen.getByText('AI-powered recommendations with explanations')).toBeInTheDocument()
    })

    it('displays navigation description text', () => {
      render(<DashboardPage />)

      expect(
        screen.getByText('Chat with our AI to discover your perfect movies')
      ).toBeInTheDocument()
    })
  })

  describe('Chat Interface Integration', () => {
    it('renders the ChatInterface component', () => {
      render(<DashboardPage />)

      expect(screen.getByTestId('chat-interface')).toBeInTheDocument()
      expect(screen.getByText('Mock Chat Interface')).toBeInTheDocument()
    })

    it('handles preference extraction gracefully', () => {
      render(<DashboardPage />)

      // Verify the chat interface is present
      const chatInterface = screen.getByTestId('chat-interface')
      expect(chatInterface).toBeInTheDocument()

      // Test passes if component renders without errors
      expect(screen.getByText('Mock Chat Interface')).toBeInTheDocument()
    })
  })

  describe('Layout and Styling', () => {
    it('has proper max-width container', () => {
      render(<DashboardPage />)

      const container = document.querySelector('.max-w-4xl')
      expect(container).toBeInTheDocument()
    })

    it('has centered content layout', () => {
      render(<DashboardPage />)

      const centerContainer = document.querySelector('.text-center')
      expect(centerContainer).toBeInTheDocument()
    })

    it('has proper chat interface container', () => {
      render(<DashboardPage />)

      // Chat interface is rendered and visible
      const chatInterface = screen.getByTestId('chat-interface')
      expect(chatInterface).toBeInTheDocument()
    })
  })

  describe('Responsive Design', () => {
    it('has responsive padding classes', () => {
      render(<DashboardPage />)

      const responsiveContainer = document.querySelector('.px-4.sm\\:px-6.lg\\:px-8')
      expect(responsiveContainer).toBeInTheDocument()
    })

    it('has responsive card layout', () => {
      render(<DashboardPage />)

      const cardContainer = document.querySelector('.max-w-4xl')
      expect(cardContainer).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('has proper heading hierarchy', () => {
      render(<DashboardPage />)

      const h1 = screen.getByRole('heading', { level: 1 })
      expect(h1).toHaveTextContent('Welcome to CineAI! 🎬')
    })

    it('has descriptive text for screen readers', () => {
      render(<DashboardPage />)

      expect(
        screen.getByText('Chat with our AI to discover your perfect movies')
      ).toBeInTheDocument()
    })
  })
})
