'use client'

import { useAuth } from '@/contexts/AuthContext'
import { LocalWelcomeScreen } from './LocalWelcomeScreen'

interface LocalUserGateProps {
  children: React.ReactNode
}

/**
 * Gate component that shows welcome screen for local users who haven't set up yet
 */
export function LocalUserGate({ children }: LocalUserGateProps) {
  const { isLocalMode, needsLocalSetup, createLocalUserAccount, isLoading } = useAuth()

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

  // Show welcome screen if local mode and needs setup
  if (isLocalMode && needsLocalSetup) {
    return <LocalWelcomeScreen onComplete={createLocalUserAccount} />
  }

  // Otherwise render the app
  return <>{children}</>
}

