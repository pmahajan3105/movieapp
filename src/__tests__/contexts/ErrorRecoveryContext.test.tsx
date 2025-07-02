/**
 * @jest-environment jsdom
 */

import React from 'react'
import { render, screen, act, waitFor } from '@testing-library/react'
import { ErrorRecoveryProvider, useErrorRecovery } from '@/contexts/ErrorRecoveryContext'

// Test component to consume the context
const TestComponent: React.FC = () => {
  const { 
    addError, 
    markResolved, 
    getRecentErrors, 
    getCriticalErrors,
    retryOperation 
  } = useErrorRecovery()

  return (
    <div>
      <button 
        onClick={() => addError({
          id: 'test-error-1',
          message: 'Test error message',
          type: 'api',
          severity: 'medium',
          timestamp: new Date(),
          context: { operation: 'test' },
          recovered: false
        })}
        data-testid="add-error"
      >
        Add Error
      </button>
      
      <button 
        onClick={() => markResolved('test-error-1')}
        data-testid="mark-resolved"
      >
        Mark Resolved
      </button>
      
      <button 
        onClick={() => retryOperation('test-operation', async () => 'success')}
        data-testid="retry-operation"
      >
        Retry Operation
      </button>
      
      <div data-testid="recent-errors">
        Recent: {getRecentErrors().length}
      </div>
      
      <div data-testid="critical-errors">
        Critical: {getCriticalErrors().length}
      </div>
    </div>
  )
}

describe('ErrorRecoveryContext', () => {
  const renderWithProvider = (children: React.ReactNode) => {
    return render(
      <ErrorRecoveryProvider>
        {children}
      </ErrorRecoveryProvider>
    )
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should provide error recovery functions', () => {
    renderWithProvider(<TestComponent />)
    
    expect(screen.getByTestId('add-error')).toBeInTheDocument()
    expect(screen.getByTestId('mark-resolved')).toBeInTheDocument()
    expect(screen.getByTestId('retry-operation')).toBeInTheDocument()
  })

  it('should add and track errors', async () => {
    renderWithProvider(<TestComponent />)
    
    // Initially no errors
    expect(screen.getByTestId('recent-errors')).toHaveTextContent('Recent: 0')
    
    // Add an error
    act(() => {
      screen.getByTestId('add-error').click()
    })
    
    await waitFor(() => {
      expect(screen.getByTestId('recent-errors')).toHaveTextContent('Recent: 1')
    })
  })

  it('should mark errors as resolved', async () => {
    renderWithProvider(<TestComponent />)
    
    // Add an error
    act(() => {
      screen.getByTestId('add-error').click()
    })
    
    await waitFor(() => {
      expect(screen.getByTestId('recent-errors')).toHaveTextContent('Recent: 1')
    })
    
    // Mark as resolved
    act(() => {
      screen.getByTestId('mark-resolved').click()
    })
    
    // Error should still be tracked but marked as resolved
    await waitFor(() => {
      expect(screen.getByTestId('recent-errors')).toHaveTextContent('Recent: 1')
    })
  })

  it('should handle retry operations', async () => {
    const mockOperation = jest.fn().mockResolvedValue('success')
    
    const RetryTestComponent: React.FC = () => {
      const { retryOperation } = useErrorRecovery()
      
      return (
        <button 
          onClick={() => retryOperation('test-operation', mockOperation)}
          data-testid="retry-test"
        >
          Retry Test
        </button>
      )
    }
    
    renderWithProvider(<RetryTestComponent />)
    
    act(() => {
      screen.getByTestId('retry-test').click()
    })
    
    await waitFor(() => {
      expect(mockOperation).toHaveBeenCalledTimes(1)
    })
  })

  it('should categorize critical errors', async () => {
    const CriticalErrorTestComponent: React.FC = () => {
      const { addError, getCriticalErrors } = useErrorRecovery()

      return (
        <div>
          <button 
            onClick={() => addError({
              id: 'critical-error-1',
              message: 'Critical error message',
              type: 'database',
              severity: 'high',
              timestamp: new Date(),
              context: { operation: 'critical-test' },
              recovered: false
            })}
            data-testid="add-critical-error"
          >
            Add Critical Error
          </button>
          
          <div data-testid="critical-count">
            Critical: {getCriticalErrors().length}
          </div>
        </div>
      )
    }
    
    renderWithProvider(<CriticalErrorTestComponent />)
    
    // Initially no critical errors
    expect(screen.getByTestId('critical-count')).toHaveTextContent('Critical: 0')
    
    // Add a critical error
    act(() => {
      screen.getByTestId('add-critical-error').click()
    })
    
    await waitFor(() => {
      expect(screen.getByTestId('critical-count')).toHaveTextContent('Critical: 1')
    })
  })

  it('should throw error when used outside provider', () => {
    // Suppress console.error for this test
    const originalError = console.error
    console.error = jest.fn()

    expect(() => {
      render(<TestComponent />)
    }).toThrow('useErrorRecovery must be used within an ErrorRecoveryProvider')

    console.error = originalError
  })

  it('should handle error context properly', async () => {
    const ContextTestComponent: React.FC = () => {
      const { addError, getRecentErrors } = useErrorRecovery()

      React.useEffect(() => {
        addError({
          id: 'context-error-1',
          message: 'Error with context',
          type: 'api',
          severity: 'medium',
          timestamp: new Date(),
          context: { 
            endpoint: '/api/test',
            userId: 'user123',
            operation: 'fetch-data'
          },
          recovered: false
        })
      }, [addError])

      const errors = getRecentErrors()
      const errorWithContext = errors.find(e => e.id === 'context-error-1')

      return (
        <div data-testid="error-context">
          {errorWithContext?.context?.endpoint || 'No context'}
        </div>
      )
    }
    
    renderWithProvider(<ContextTestComponent />)
    
    await waitFor(() => {
      expect(screen.getByTestId('error-context')).toHaveTextContent('/api/test')
    })
  })
})