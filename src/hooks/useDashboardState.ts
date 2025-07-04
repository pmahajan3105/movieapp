import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import type { User } from '@supabase/supabase-js'
import type { UserProfile } from '@/lib/supabase/browser-client'

interface AuthUser extends User {
  profile?: UserProfile
}

export interface DashboardState {
  mounted: boolean
  isLoading: boolean
  user: AuthUser | null
  shouldShowLoading: boolean
  shouldRedirect: boolean
}

export const useDashboardState = (): DashboardState => {
  const { user, isLoading } = useAuth()
  const [mounted, setMounted] = useState(false)

  // Prevent hydration issues by ensuring we're mounted
  useEffect(() => {
    setMounted(true)
  }, [])

  // Handle redirect for unauthenticated users
  useEffect(() => {
    if (mounted && !user && !isLoading) {
      if (typeof window !== 'undefined') {
        window.location.href = '/auth/login'
      }
    }
  }, [mounted, user, isLoading])

  const shouldShowLoading = !mounted || isLoading
  const shouldRedirect = mounted && !user && !isLoading

  return {
    mounted,
    isLoading,
    user,
    shouldShowLoading,
    shouldRedirect,
  }
} 