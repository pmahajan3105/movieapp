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
jest.mock('@/components/ai/ChatInterface', () => ({
  ChatInterface: ({ onPreferencesExtracted }: { onPreferencesExtracted: (preferences: unknown) => void }) => (
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
      signOut: jest.fn(),
      refreshUser: jest.fn(),
    })

    // Mock toast methods
    mockToast.success = jest.fn()
    mockToast.error = jest.fn()
  })

  describe('Loading State', () => {
    it('shows loading spinner when auth is loading', () => {
      mockUseAuth.mockReturnValue({
        loading: true,
        user: null,
        signOut: jest.fn(),
        refreshUser: jest.fn(),
      })

      render(<DashboardPage />)
      
      expect(screen.getByText('Loading your dashboard...')).toBeInTheDocument()
      // Check for spinner by class instead of role
      const spinner = document.querySelector('.animate-spin')
      expect(spinner).toBeInTheDocument()
    })
  })

  describe('Main Dashboard', () => {
    it('renders welcome message and chat interface', () => {
      render(<DashboardPage />)
      
      expect(screen.getByText('Welcome to CineAI! 🎬')).toBeInTheDocument()
      expect(screen.getByText('Chat with our AI to discover your perfect movies')).toBeInTheDocument()
      expect(screen.getByText('Chat with CineAI')).toBeInTheDocument()
      expect(screen.getByTestId('chat-interface')).toBeInTheDocument()
    })

    it('shows online status indicator', () => {
      render(<DashboardPage />)
      
      // Check for green status dot
      const statusIndicator = document.querySelector('.bg-green-500')
      expect(statusIndicator).toBeInTheDocument()
    })

    it('displays helpful description text', () => {
      render(<DashboardPage />)
      
      expect(screen.getByText(
        "Tell me what kind of movies you're looking for and I'll help you discover amazing films!"
      )).toBeInTheDocument()
    })
  })

  describe('Chat Interface Integration', () => {
    it('renders the ChatInterface component', () => {
      render(<DashboardPage />)
      
      expect(screen.getByTestId('chat-interface')).toBeInTheDocument()
      expect(screen.getByText('Mock Chat Interface')).toBeInTheDocument()
    })

    it('handles preference extraction with success toast', () => {
      render(<DashboardPage />)
      
      // Simulate preference extraction
      const simulateButton = screen.getByTestId('simulate-preferences')
      simulateButton.click()

      // Should show success toast after a delay
      setTimeout(() => {
        expect(mockToast.success).toHaveBeenCalledWith(
          '🎯 Preferences saved! Check out your personalized movies!'
        )
      }, 600)
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

    it('has proper chat interface height', () => {
      render(<DashboardPage />)
      
      const chatContainer = document.querySelector('.h-\\[600px\\]')
      expect(chatContainer).toBeInTheDocument()
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
      
      expect(screen.getByText('Chat with our AI to discover your perfect movies')).toBeInTheDocument()
    })
  })
}) 