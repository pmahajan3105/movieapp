'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { RefreshCw } from 'lucide-react'

interface AuthGuardProps {
  children: React.ReactNode
  requireAuth?: boolean
  redirectTo?: string
}

export function AuthGuard({
  children,
  requireAuth = true,
  redirectTo = '/auth/login',
}: AuthGuardProps) {
  const { user, isLoading, isSessionValid, signOut } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && requireAuth) {
      // If no user or session is invalid, sign out and redirect
      if (!user || !isSessionValid) {
        // Invalid session detected, redirecting to login

        // Sign out to clear any invalid session data
        if (user && !isSessionValid) {
          signOut().then(() => {
            router.push(redirectTo)
          })
        } else {
          router.push(redirectTo)
        }
      }
    }
  }, [user, isLoading, isSessionValid, requireAuth, redirectTo, router, signOut])

  // Show loading while checking authentication
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="h-8 w-8 animate-spin text-purple-600" />
          <p className="text-gray-600">Checking authentication...</p>
        </div>
      </div>
    )
  }

  // If auth is required but user is not authenticated, show loading
  // (redirect will happen in useEffect)
  if (requireAuth && (!user || !isSessionValid)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="h-8 w-8 animate-spin text-purple-600" />
          <p className="text-gray-600">Redirecting to login...</p>
        </div>
      </div>
    )
  }

  // If auth is not required or user is authenticated, render children
  return <>{children}</>
}
