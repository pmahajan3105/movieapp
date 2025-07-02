/**
 * @jest-environment jsdom
 */

import React from 'react'
import { render, screen, act, waitFor } from '@testing-library/react'
import { HyperPersonalizedProvider, useHyperPersonalized } from '@/contexts/HyperPersonalizedContext'
import { useAuth } from '@/contexts/AuthContext'

// Mock the auth context
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: jest.fn()
}))

// Mock fetch for API calls
global.fetch = jest.fn()

// Test component to consume the context
const TestComponent: React.FC = () => {
  const { 
    recommendations, 
    isLoading, 
    error,
    refreshRecommendations,
    getPersonalizedRecommendations,
    enhancedMode,
    toggleEnhancedMode
  } = useHyperPersonalized()

  return (
    <div>
      <div data-testid="loading">{isLoading ? 'Loading' : 'Not Loading'}</div>
      <div data-testid="error">{error || 'No Error'}</div>
      <div data-testid="recommendations-count">{recommendations.length}</div>
      <div data-testid="enhanced-mode">{enhancedMode ? 'Enhanced' : 'Basic'}</div>
      
      <button 
        onClick={() => refreshRecommendations()}
        data-testid="refresh-button"
      >
        Refresh
      </button>
      
      <button 
        onClick={() => toggleEnhancedMode()}
        data-testid="toggle-enhanced"
      >
        Toggle Enhanced
      </button>
      
      <button 
        onClick={() => getPersonalizedRecommendations({ limit: 5 })}
        data-testid="get-personalized"
      >
        Get Personalized
      </button>
    </div>
  )
}

describe('HyperPersonalizedContext', () => {
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com'
  }

  const mockRecommendations = [
    {
      id: 'movie-1',
      title: 'Test Movie 1',
      year: 2023,
      genre: ['Action'],
      rating: 8.5,
      confidence: 0.9,
      recommendationReason: 'Based on your preferences'
    },
    {
      id: 'movie-2', 
      title: 'Test Movie 2',
      year: 2022,
      genre: ['Drama'],
      rating: 7.8,
      confidence: 0.8,
      recommendationReason: 'Popular among similar users'
    }
  ]

  const renderWithProvider = (children: React.ReactNode) => {
    return render(
      <HyperPersonalizedProvider>
        {children}
      </HyperPersonalizedProvider>
    )
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useAuth as jest.Mock).mockReturnValue({ user: mockUser })
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: { movies: mockRecommendations }
      })
    })
  })

  it('should provide hyperpersonalized functions and state', () => {
    renderWithProvider(<TestComponent />)
    
    expect(screen.getByTestId('loading')).toBeInTheDocument()
    expect(screen.getByTestId('error')).toBeInTheDocument()
    expect(screen.getByTestId('recommendations-count')).toBeInTheDocument()
    expect(screen.getByTestId('enhanced-mode')).toBeInTheDocument()
    expect(screen.getByTestId('refresh-button')).toBeInTheDocument()
    expect(screen.getByTestId('toggle-enhanced')).toBeInTheDocument()
  })

  it('should start with default state', () => {
    renderWithProvider(<TestComponent />)
    
    expect(screen.getByTestId('loading')).toHaveTextContent('Not Loading')
    expect(screen.getByTestId('error')).toHaveTextContent('No Error')
    expect(screen.getByTestId('recommendations-count')).toHaveTextContent('0')
    expect(screen.getByTestId('enhanced-mode')).toHaveTextContent('Basic')
  })

  it('should toggle enhanced mode', async () => {
    renderWithProvider(<TestComponent />)
    
    expect(screen.getByTestId('enhanced-mode')).toHaveTextContent('Basic')
    
    act(() => {
      screen.getByTestId('toggle-enhanced').click()
    })
    
    await waitFor(() => {
      expect(screen.getByTestId('enhanced-mode')).toHaveTextContent('Enhanced')
    })
  })

  it('should handle refresh recommendations', async () => {
    renderWithProvider(<TestComponent />)
    
    act(() => {
      screen.getByTestId('refresh-button').click()
    })
    
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('Loading')
    })

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('Not Loading')
      expect(screen.getByTestId('recommendations-count')).toHaveTextContent('2')
    })
    
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/recommendations/hyper-personalized',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json'
        })
      })
    )
  })

  it('should handle API errors', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ error: 'Server error' })
    })
    
    renderWithProvider(<TestComponent />)
    
    act(() => {
      screen.getByTestId('refresh-button').click()
    })
    
    await waitFor(() => {
      expect(screen.getByTestId('error')).not.toHaveTextContent('No Error')
    })
  })

  it('should handle get personalized recommendations', async () => {
    renderWithProvider(<TestComponent />)
    
    act(() => {
      screen.getByTestId('get-personalized').click()
    })
    
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/recommendations/hyper-personalized',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"limit":5')
        })
      )
    })
  })

  it('should handle unauthenticated user', () => {
    ;(useAuth as jest.Mock).mockReturnValue({ user: null })
    
    renderWithProvider(<TestComponent />)
    
    act(() => {
      screen.getByTestId('refresh-button').click()
    })
    
    // Should not make API call when user is not authenticated
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('should throw error when used outside provider', () => {
    // Suppress console.error for this test
    const originalError = console.error
    console.error = jest.fn()

    expect(() => {
      render(<TestComponent />)
    }).toThrow('useHyperPersonalized must be used within a HyperPersonalizedProvider')

    console.error = originalError
  })

  it('should handle loading states correctly', async () => {
    // Mock a delayed response
    ;(global.fetch as jest.Mock).mockImplementationOnce(
      () => new Promise(resolve => 
        setTimeout(() => resolve({
          ok: true,
          json: async () => ({ success: true, data: { movies: [] } })
        }), 100)
      )
    )
    
    renderWithProvider(<TestComponent />)
    
    act(() => {
      screen.getByTestId('refresh-button').click()
    })
    
    // Should show loading immediately
    expect(screen.getByTestId('loading')).toHaveTextContent('Loading')
    
    // Should stop loading after response
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('Not Loading')
    }, { timeout: 200 })
  })
})