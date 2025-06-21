import React from 'react'
import { render, screen, waitFor, act } from '@testing-library/react'
import '@testing-library/jest-dom'
import { AuthProvider, useAuth } from '../../contexts/AuthContext'

// Mock Supabase
const mockSupabase = {
  auth: {
    getSession: jest.fn(),
    getUser: jest.fn(),
    signOut: jest.fn(),
    onAuthStateChange: jest.fn(),
  },
}

jest.mock('@supabase/ssr', () => ({
  createBrowserClient: jest.fn(() => mockSupabase),
}))

// Test component that uses auth
function TestComponent() {
  const { user, isLoading, signOut } = useAuth()

  if (isLoading) {
    return <div>Loading...</div>
  }

  return (
    <div>
      {user ? (
        <div>
          <span>Welcome {user.email}</span>
          <button onClick={signOut}>Sign Out</button>
        </div>
      ) : (
        <span>Not authenticated</span>
      )}
    </div>
  )
}

describe('Auth Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Setup default mock returns
    mockSupabase.auth.onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: jest.fn() } },
    })
  })

  it('shows loading state initially', async () => {
    // Create a promise that we can control
    let resolveSession: (value: { data: { session: null }; error: null }) => void
    const sessionPromise = new Promise(resolve => {
      resolveSession = resolve
    })

    mockSupabase.auth.getSession.mockReturnValue(sessionPromise)

    await act(async () => {
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )
    })

    // Should show loading initially
    expect(screen.getByText('Loading...')).toBeInTheDocument()

    // Now resolve the session
    await act(async () => {
      resolveSession({
        data: { session: null },
        error: null,
      })
    })

    // Wait for the loading to finish
    await waitFor(() => {
      expect(screen.getByText('Not authenticated')).toBeInTheDocument()
    })
  })

  it('shows authenticated user when session exists', async () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
    }

    mockSupabase.auth.getSession.mockResolvedValue({
      data: {
        session: {
          user: mockUser,
        },
      },
      error: null,
    })

    await act(async () => {
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )
    })

    await waitFor(() => {
      expect(screen.getByText('Welcome test@example.com')).toBeInTheDocument()
    })
  })

  it('shows not authenticated when no session', async () => {
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: null },
      error: null,
    })

    await act(async () => {
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )
    })

    await waitFor(() => {
      expect(screen.getByText('Not authenticated')).toBeInTheDocument()
    })
  })

  it('handles sign out correctly', async () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
    }

    mockSupabase.auth.getSession.mockResolvedValue({
      data: {
        session: {
          user: mockUser,
        },
      },
      error: null,
    })

    mockSupabase.auth.signOut.mockResolvedValue({
      error: null,
    })

    await act(async () => {
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )
    })

    await waitFor(() => {
      expect(screen.getByText('Welcome test@example.com')).toBeInTheDocument()
    })

    const signOutButton = screen.getByText('Sign Out')

    await act(async () => {
      signOutButton.click()
    })

    expect(mockSupabase.auth.signOut).toHaveBeenCalled()
  })

  it('handles auth state changes', async () => {
    let authStateCallback: (
      event: string,
      session: { user?: { id: string; email: string } } | null
    ) => void

    mockSupabase.auth.onAuthStateChange.mockImplementation(callback => {
      authStateCallback = callback
      return {
        data: { subscription: { unsubscribe: jest.fn() } },
      }
    })

    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: null },
      error: null,
    })

    await act(async () => {
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )
    })

    await waitFor(() => {
      expect(screen.getByText('Not authenticated')).toBeInTheDocument()
    })

    // Simulate sign in
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
    }

    await act(async () => {
      authStateCallback('SIGNED_IN', { user: mockUser })
    })

    await waitFor(() => {
      expect(screen.getByText('Welcome test@example.com')).toBeInTheDocument()
    })

    // Simulate sign out
    await act(async () => {
      authStateCallback('SIGNED_OUT', null)
    })

    await waitFor(() => {
      expect(screen.getByText('Not authenticated')).toBeInTheDocument()
    })
  })

  it('handles session errors gracefully', async () => {
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: null },
      error: new Error('Session error'),
    })

    await act(async () => {
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )
    })

    await waitFor(() => {
      expect(screen.getByText('Not authenticated')).toBeInTheDocument()
    })
  })

  it('cleans up subscription on unmount', async () => {
    const unsubscribeMock = jest.fn()

    mockSupabase.auth.onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: unsubscribeMock } },
    })

    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: null },
      error: null,
    })

    let unmount: () => void

    await act(async () => {
      const result = render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )
      unmount = result.unmount
    })

    unmount!()

    expect(unsubscribeMock).toHaveBeenCalled()
  })
})
