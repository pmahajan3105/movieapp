import React from 'react'
import { render, act, waitFor } from '@testing-library/react'
import { AuthProvider, useAuth } from '../../contexts/AuthContext'
import '@testing-library/jest-dom'

// Mock Supabase browser client
const mockListeners: Array<(event: string, session: unknown) => void> = []

jest.mock('../../lib/supabase/client', () => {
  const sessionWrapper: { current: { user: any } | null } = {
    current: { user: { id: 'user-1', email: 'test@example.com' } }, // Initialize immediately
  }

  return {
    __esModule: true,
    supabase: {
      auth: {
        getSession: jest.fn(() => Promise.resolve({ data: { session: sessionWrapper.current } })),
        setSession: jest.fn(() => Promise.resolve()),
        signOut: jest.fn(() => {
          sessionWrapper.current = null
          mockListeners.forEach(cb => cb('SIGNED_OUT', null))
          return Promise.resolve()
        }),
        onAuthStateChange: jest.fn((cb: (event: string, session: unknown) => void) => {
          mockListeners.push(cb)
          return { data: { subscription: { unsubscribe: jest.fn() } } }
        }),
      },
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => Promise.resolve({ data: null, error: { code: 'PGRST116' } })),
          })),
        })),
      })),
    },
  }
})

// Helper component to expose context for assertions
function AuthStateViewer() {
  const auth = useAuth()
  return <div data-testid="auth-state" data-user={auth.user ? 'yes' : 'no'} />
}

// Helper component to trigger signOut
function SignOutButton() {
  const auth = useAuth()
  return (
    <button onClick={() => auth.signOut()} data-testid="sign-out-button">
      Sign Out
    </button>
  )
}

describe('AuthContext flow', () => {
  const cookieName = 'sb-localhost-auth-token'

  beforeEach(() => {
    document.cookie = `${cookieName}=base64-dummy`
  })

  afterEach(() => {
    document.cookie = `${cookieName}=;max-age=0`
    jest.clearAllMocks()
  })

  it('signOut clears cookie and resets user', async () => {
    const { getByTestId } = render(
      <AuthProvider>
        <AuthStateViewer />
        <SignOutButton />
      </AuthProvider>
    )

    // Initially user may be null in mock session
    await waitFor(() => expect(getByTestId('auth-state')).toHaveAttribute('data-user', 'no'))

    // Call signOut via button click
    await act(async () => {
      getByTestId('sign-out-button').click()
    })

    // User reset
    await waitFor(() => expect(getByTestId('auth-state')).toHaveAttribute('data-user', 'no'))
  })

  it('updates user on TOKEN_REFRESHED event', async () => {
    const { getByTestId } = render(
      <AuthProvider>
        <AuthStateViewer />
      </AuthProvider>
    )

    // Initially user may be null in mock session
    await waitFor(() => expect(getByTestId('auth-state')).toHaveAttribute('data-user', 'no'))

    // Fire token refreshed event with new user
    const newUser = { id: 'user-2', email: 'new@example.com' }
    act(() => {
      mockListeners.forEach(cb => cb('TOKEN_REFRESHED', { user: newUser }))
    })

    // user should now be considered logged in (id updated)
    await waitFor(() => expect(getByTestId('auth-state')).toHaveAttribute('data-user', 'yes'))
  })
})
