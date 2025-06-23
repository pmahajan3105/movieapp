'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

interface ProtectedRouteProps {
  children: React.ReactNode
  requireOnboarding?: boolean
  redirectTo?: string
}

export function ProtectedRoute({
  children,
  requireOnboarding = false,
  redirectTo = '/auth/login',
}: ProtectedRouteProps) {
  const { user, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading) {
      // No user, redirect to login
      if (!user) {
        console.log('🔄 ProtectedRoute: No user found, redirecting to login')
        router.push(redirectTo)
        return
      }

      console.log('✅ ProtectedRoute: User authenticated, allowing access')

      // User exists but onboarding required and not completed
      if (requireOnboarding && !user.profile?.onboarding_completed) {
        router.push('/dashboard/preferences')
        return
      }

      // User exists, onboarding complete, but accessing onboarding page
      if (
        !requireOnboarding &&
        user.profile?.onboarding_completed &&
        typeof window !== 'undefined' &&
        window.location.pathname === '/dashboard/preferences'
      ) {
        router.push('/dashboard')
        return
      }
    }
  }, [user, isLoading, router, requireOnboarding, redirectTo])

  // Show loading spinner while checking auth
  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col justify-center bg-gray-50 py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="flex justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          </div>
          <p className="mt-4 text-center text-sm text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // Don't render anything while redirecting
  if (!user) {
    return null
  }

  // Check onboarding requirements
  if (requireOnboarding && !user.profile?.onboarding_completed) {
    return null
  }

  if (
    !requireOnboarding &&
    user.profile?.onboarding_completed &&
    typeof window !== 'undefined' &&
    window.location.pathname === '/dashboard/preferences'
  ) {
    return null
  }

  return <>{children}</>
}

// Helper components for specific protection levels
export function RequireAuth({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute>{children}</ProtectedRoute>
}

export function RequireOnboarding({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute requireOnboarding={true}>{children}</ProtectedRoute>
}

export function OnboardingOnly({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute requireOnboarding={false}>{children}</ProtectedRoute>
}
