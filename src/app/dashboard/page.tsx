'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

export default function DashboardPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && user) {
      // Redirect based on onboarding status
      if (user.onboarding_completed) {
        router.push('/dashboard/swipe')
      } else {
        router.push('/dashboard/preferences')
      }
    } else if (!loading && !user) {
      // Not authenticated, redirect to login
      router.push('/auth/login')
    }
  }, [user, loading, router])

  // Show loading while redirecting
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
        <p className="mt-4 text-center text-sm text-gray-600">
          Loading dashboard...
        </p>
      </div>
    </div>
  )
} 