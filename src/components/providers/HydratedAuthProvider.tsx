'use client'

import React, { useState, useEffect } from 'react'
import { AuthProvider } from '@/contexts/AuthContext'
import { LoadingScreen } from '@/components/auth/LoadingScreen'

interface HydratedAuthProviderProps {
  children: React.ReactNode
}

export const HydratedAuthProvider: React.FC<HydratedAuthProviderProps> = ({ children }) => {
  const [isClientMounted, setIsClientMounted] = useState(false)

  useEffect(() => {
    // Only hydrate after the client has mounted to prevent SSR/client mismatch
    setIsClientMounted(true)
  }, [])

  // Show loading screen until client is fully mounted
  if (!isClientMounted) {
    return <LoadingScreen message="Initializing..." />
  }

  return (
    <AuthProvider>
      {children}
    </AuthProvider>
  )
}