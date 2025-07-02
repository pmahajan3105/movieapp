/**
 * @jest-environment jsdom
 */

import React from 'react'
import { render, screen, act } from '@testing-library/react'
import { ThemeProvider, useTheme } from '@/contexts/ThemeContext'

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString()
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    },
  }
})()

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
})

// Test component to consume the theme context
const TestComponent: React.FC = () => {
  const { theme, setTheme, isDark } = useTheme()

  return (
    <div>
      <div data-testid="current-theme">{theme}</div>
      <div data-testid="is-dark">{isDark ? 'Dark' : 'Light'}</div>
      
      <button 
        onClick={() => setTheme('dark')}
        data-testid="set-dark"
      >
        Set Dark
      </button>
      
      <button 
        onClick={() => setTheme('light')}
        data-testid="set-light"
      >
        Set Light
      </button>
      
      <button 
        onClick={() => setTheme('system')}
        data-testid="set-system"
      >
        Set System
      </button>
    </div>
  )
}

describe('ThemeContext', () => {
  const renderWithProvider = (children: React.ReactNode) => {
    return render(
      <ThemeProvider>
        {children}
      </ThemeProvider>
    )
  }

  beforeEach(() => {
    localStorageMock.clear()
    // Mock window.matchMedia
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: jest.fn(), // deprecated
        removeListener: jest.fn(), // deprecated
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    })
  })

  it('should provide theme functions and state', () => {
    renderWithProvider(<TestComponent />)
    
    expect(screen.getByTestId('current-theme')).toBeInTheDocument()
    expect(screen.getByTestId('is-dark')).toBeInTheDocument()
    expect(screen.getByTestId('set-dark')).toBeInTheDocument()
    expect(screen.getByTestId('set-light')).toBeInTheDocument()
    expect(screen.getByTestId('set-system')).toBeInTheDocument()
  })

  it('should start with system theme by default', () => {
    renderWithProvider(<TestComponent />)
    
    expect(screen.getByTestId('current-theme')).toHaveTextContent('system')
  })

  it('should change theme when setTheme is called', () => {
    renderWithProvider(<TestComponent />)
    
    // Initial theme
    expect(screen.getByTestId('current-theme')).toHaveTextContent('system')
    
    // Set to dark
    act(() => {
      screen.getByTestId('set-dark').click()
    })
    
    expect(screen.getByTestId('current-theme')).toHaveTextContent('dark')
    expect(screen.getByTestId('is-dark')).toHaveTextContent('Dark')
    
    // Set to light
    act(() => {
      screen.getByTestId('set-light').click()
    })
    
    expect(screen.getByTestId('current-theme')).toHaveTextContent('light')
    expect(screen.getByTestId('is-dark')).toHaveTextContent('Light')
  })

  it('should persist theme in localStorage', () => {
    renderWithProvider(<TestComponent />)
    
    act(() => {
      screen.getByTestId('set-dark').click()
    })
    
    expect(localStorageMock.getItem('theme')).toBe('dark')
    
    act(() => {
      screen.getByTestId('set-light').click()
    })
    
    expect(localStorageMock.getItem('theme')).toBe('light')
  })

  it('should load theme from localStorage on initialization', () => {
    // Set theme in localStorage before rendering
    localStorageMock.setItem('theme', 'dark')
    
    renderWithProvider(<TestComponent />)
    
    expect(screen.getByTestId('current-theme')).toHaveTextContent('dark')
    expect(screen.getByTestId('is-dark')).toHaveTextContent('Dark')
  })

  it('should handle system theme with dark preference', () => {
    // Mock dark system preference
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation(query => ({
        matches: query === '(prefers-color-scheme: dark)',
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    })
    
    renderWithProvider(<TestComponent />)
    
    act(() => {
      screen.getByTestId('set-system').click()
    })
    
    expect(screen.getByTestId('current-theme')).toHaveTextContent('system')
    expect(screen.getByTestId('is-dark')).toHaveTextContent('Dark')
  })

  it('should handle system theme with light preference', () => {
    // Mock light system preference
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation(query => ({
        matches: query !== '(prefers-color-scheme: dark)',
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    })
    
    renderWithProvider(<TestComponent />)
    
    act(() => {
      screen.getByTestId('set-system').click()
    })
    
    expect(screen.getByTestId('current-theme')).toHaveTextContent('system')
    expect(screen.getByTestId('is-dark')).toHaveTextContent('Light')
  })

  it('should throw error when used outside provider', () => {
    // Suppress console.error for this test
    const originalError = console.error
    console.error = jest.fn()

    expect(() => {
      render(<TestComponent />)
    }).toThrow('useTheme must be used within a ThemeProvider')

    console.error = originalError
  })

  it('should handle invalid theme values gracefully', () => {
    // Set invalid theme in localStorage
    localStorageMock.setItem('theme', 'invalid-theme')
    
    renderWithProvider(<TestComponent />)
    
    // Should fallback to system theme
    expect(screen.getByTestId('current-theme')).toHaveTextContent('system')
  })

  it('should update document class when theme changes', () => {
    renderWithProvider(<TestComponent />)
    
    // Set dark theme
    act(() => {
      screen.getByTestId('set-dark').click()
    })
    
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    
    // Set light theme
    act(() => {
      screen.getByTestId('set-light').click()
    })
    
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })

  it('should handle multiple theme changes', () => {
    renderWithProvider(<TestComponent />)
    
    const themes = ['dark', 'light', 'system', 'dark', 'light']
    
    themes.forEach((theme, index) => {
      act(() => {
        screen.getByTestId(`set-${theme}`).click()
      })
      
      expect(screen.getByTestId('current-theme')).toHaveTextContent(theme)
      expect(localStorageMock.getItem('theme')).toBe(theme)
    })
  })
})