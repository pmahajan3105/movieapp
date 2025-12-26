'use client'

import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useEffect } from 'react'

interface LocalUserGateProps {
  children: React.ReactNode
}

/**
 * Gate component that redirects to setup if user hasn't completed setup
 */
export function LocalUserGate({ children }: LocalUserGateProps) {
  const { needsSetup, isLoading } = useAuth()
  const router = useRouter()

  // Redirect to setup if needed
  useEffect(() => {
    if (!isLoading && needsSetup) {
      router.push('/setup')
    }
  }, [isLoading, needsSetup, router])

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-base-100 flex items-center justify-center">
        <div className="text-center">
          <span className="loading loading-spinner loading-lg text-primary"></span>
          <p className="mt-4 text-base-content/60">Loading CineAI...</p>
        </div>
      </div>
    )
  }

  // If needs setup, show loading while redirect happens
  if (needsSetup) {
    return (
      <div className="min-h-screen bg-base-100 flex items-center justify-center">
        <div className="text-center">
          <span className="loading loading-spinner loading-lg text-primary"></span>
          <p className="mt-4 text-base-content/60">Redirecting to setup...</p>
        </div>
      </div>
    )
  }

  // Otherwise render the app
  return <>{children}</>
}
