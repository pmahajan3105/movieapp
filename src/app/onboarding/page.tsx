'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { OnboardingFlow } from '@/components/onboarding/OnboardingFlow'
import { useAuth } from '@/contexts/AuthContext'
import { useUserProfile } from '@/hooks/useUserProfile'

export default function OnboardingPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { data: userProfile, isLoading: profileLoading } = useUserProfile()

  // Redirect if not authenticated
  useEffect(() => {
    if (!profileLoading && !user) {
      router.push('/auth')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, profileLoading, router])

  // Redirect if already onboarded
  useEffect(() => {
    if (userProfile?.onboarding_completed) {
      router.push('/dashboard')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userProfile, router])

  const handleOnboardingComplete = () => {
    router.push('/dashboard')
  }

  if (profileLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="loading loading-spinner loading-lg text-primary"></div>
      </div>
    )
  }

  return (
    <div className="bg-base-100 min-h-screen py-8">
      <OnboardingFlow onComplete={handleOnboardingComplete} />
    </div>
  )
}
