'use client'

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { logger } from '@/lib/logger'

interface LocalUser {
  id: string
  name: string
  email: string
  // Compatibility fields for components that expect Supabase User type
  app_metadata?: Record<string, unknown>
  user_metadata?: Record<string, unknown>
  aud?: string
  created_at?: string
  last_sign_in_at?: string
  profile?: {
    id: string
    full_name?: string
    onboarding_completed?: boolean
  }
}

interface AuthContextType {
  user: LocalUser | null
  isLoading: boolean
  signOut: () => Promise<void>
  refreshUser: () => Promise<void>
  isSessionValid: boolean
  isLocalMode: boolean
  needsSetup: boolean
  // Legacy compatibility
  needsLocalSetup?: boolean
  createLocalUserAccount?: (name: string) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<LocalUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [needsSetup, setNeedsSetup] = useState(false)
  const router = useRouter()

  // Check setup status and load user
  const checkSetupStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/setup')
      const data = await response.json()

      if (data.success) {
        if (data.status.setupCompleted) {
          // User is set up, load their profile
          const userName = data.config?.userName || 'User'
          setUser({
            id: 'local-user',
            name: userName,
            email: 'local@cineai.app',
            app_metadata: {},
            user_metadata: { name: userName },
            aud: 'authenticated',
            created_at: new Date().toISOString(),
            profile: {
              id: 'local-user',
              full_name: userName,
              onboarding_completed: true,
            },
          })
          setNeedsSetup(false)
        } else {
          // Setup not completed
          setUser(null)
          setNeedsSetup(true)
        }
      } else {
        // API error - assume needs setup
        setUser(null)
        setNeedsSetup(true)
      }
    } catch (error) {
      logger.error('Error checking setup status', {
        error: error instanceof Error ? error.message : String(error),
      })
      // On error, assume needs setup
      setUser(null)
      setNeedsSetup(true)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Initial load
  useEffect(() => {
    checkSetupStatus()
  }, [checkSetupStatus])

  // Refresh user data
  const refreshUser = useCallback(async () => {
    await checkSetupStatus()
  }, [checkSetupStatus])

  // Sign out (reset setup for local mode)
  const signOut = useCallback(async () => {
    try {
      // Reset setup status
      await fetch('/api/setup', { method: 'DELETE' })
      setUser(null)
      setNeedsSetup(true)
      router.push('/setup')
    } catch (error) {
      logger.error('Error signing out', {
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }, [router])

  // Legacy compatibility: createLocalUserAccount redirects to setup
  const createLocalUserAccount = useCallback(async (name: string) => {
    router.push('/setup')
  }, [router])

  const value = React.useMemo(
    () => ({
      user,
      isLoading,
      signOut,
      refreshUser,
      isSessionValid: !!user,
      isLocalMode: true, // Always local mode now
      needsSetup,
      // Legacy compatibility
      needsLocalSetup: needsSetup,
      createLocalUserAccount,
    }),
    [user, isLoading, signOut, refreshUser, needsSetup, createLocalUserAccount]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
