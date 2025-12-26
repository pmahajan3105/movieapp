import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'

interface LocalUser {
  id: string
  name: string
  email: string
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

export interface DashboardState {
  mounted: boolean
  isLoading: boolean
  user: LocalUser | null
  shouldShowLoading: boolean
  shouldRedirect: boolean
  needsSetup: boolean
}

export const useDashboardState = (): DashboardState => {
  const { user, isLoading, needsSetup } = useAuth()
  const [mounted, setMounted] = useState(false)

  // Prevent hydration issues by ensuring we're mounted
  useEffect(() => {
    setMounted(true)
  }, [])

  // Handle redirect for unauthenticated users (redirect to setup instead of login)
  useEffect(() => {
    if (mounted && !user && !isLoading && needsSetup) {
      if (typeof window !== 'undefined') {
        window.location.href = '/setup'
      }
    }
  }, [mounted, user, isLoading, needsSetup])

  const shouldShowLoading = !mounted || isLoading
  const shouldRedirect = mounted && !user && !isLoading

  return {
    mounted,
    isLoading,
    user,
    shouldShowLoading,
    shouldRedirect,
    needsSetup,
  }
}
