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

// Mock the dynamic components
jest.mock('@/components/dashboard/BehavioralInsightsPanel', () => ({
  BehavioralInsightsPanel: () => (
    <div data-testid="behavioral-insights">Behavioral Insights</div>
  ),
}))

jest.mock('@/components/dashboard/HyperPersonalizedSection', () => ({
  HyperPersonalizedSection: () => (
    <div data-testid="hyper-personalized">Hyper Personalized Section</div>
  ),
}))

jest.mock('@/components/movies/MovieDetailsModal', () => ({
  MovieDetailsModal: () => <div data-testid="movie-modal">Movie Modal</div>,
}))

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>
const mockToast = toast as jest.MockedFunction<typeof toast>

describe('DashboardPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    mockUseAuth.mockReturnValue({
      isLoading: false,
      user: {
        id: 'local-user',
        name: 'Test User',
        email: 'test@example.com',
        app_metadata: {},
        user_metadata: {},
        aud: 'authenticated',
        created_at: '2024-01-01T00:00:00Z',
        profile: {
          id: 'local-user',
          full_name: 'Test User',
          onboarding_completed: true,
        },
      },
      isSessionValid: true,
      signOut: jest.fn(),
      refreshUser: jest.fn(),
      isLocalMode: true,
      needsSetup: false,
      needsLocalSetup: false,
      createLocalUserAccount: jest.fn(),
    })

    // Mock toast methods
    mockToast.success = jest.fn()
    mockToast.error = jest.fn()
  })

  describe('Loading State', () => {
    it('shows loading content when auth is loading', () => {
      mockUseAuth.mockReturnValue({
        isLoading: true,
        user: null,
        isSessionValid: false,
        signOut: jest.fn(),
        refreshUser: jest.fn(),
        isLocalMode: true,
        needsSetup: false,
        needsLocalSetup: false,
        createLocalUserAccount: jest.fn(),
      })

      render(<DashboardPage />)

      expect(screen.getByText('Loading your dashboard...')).toBeInTheDocument()
    })
  })

  describe('Main Dashboard', () => {
    it('renders welcome message and description', () => {
      render(<DashboardPage />)

      expect(screen.getByText('Welcome to CineAI!')).toBeInTheDocument()
      expect(
        screen.getByText('Your personal AI movie companion with intelligent recommendations and conversation')
      ).toBeInTheDocument()
    })

    it('shows main dashboard sections', () => {
      render(<DashboardPage />)

      expect(screen.getByTestId('hyper-personalized')).toBeInTheDocument()
      expect(screen.getByTestId('behavioral-insights')).toBeInTheDocument()
    })
  })

  describe('Layout and Styling', () => {
    it('has proper max-width container', () => {
      render(<DashboardPage />)

      const container = document.querySelector('.max-w-7xl')
      expect(container).toBeInTheDocument()
    })

    it('has centered content layout', () => {
      render(<DashboardPage />)

      const centerContainer = document.querySelector('.text-center')
      expect(centerContainer).toBeInTheDocument()
    })

    it('has proper dashboard sections', () => {
      render(<DashboardPage />)

      expect(screen.getByTestId('hyper-personalized')).toBeInTheDocument()
      expect(screen.getByTestId('behavioral-insights')).toBeInTheDocument()
    })
  })

  describe('Responsive Design', () => {
    it('has responsive padding classes', () => {
      render(<DashboardPage />)

      const responsiveContainer = document.querySelector('.px-4.sm\\:px-6.lg\\:px-8')
      expect(responsiveContainer).toBeInTheDocument()
    })

    it('has responsive container layout', () => {
      render(<DashboardPage />)

      const cardContainer = document.querySelector('.max-w-7xl')
      expect(cardContainer).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('has proper heading hierarchy', () => {
      render(<DashboardPage />)

      const h1 = screen.getByRole('heading', { level: 1 })
      expect(h1).toHaveTextContent('Welcome to CineAI!')
    })

    it('has descriptive text for screen readers', () => {
      render(<DashboardPage />)

      expect(
        screen.getByText('Your personal AI movie companion with intelligent recommendations and conversation')
      ).toBeInTheDocument()
    })
  })
})
