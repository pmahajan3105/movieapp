'use client'

// Force dynamic rendering for authenticated pages
export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChatInterface } from '@/components/ai/ChatInterface'
import { PreferenceSummary } from '@/components/ai/PreferenceSummary'
import { OnboardingOnly } from '@/components/auth/ProtectedRoute'
import { useAuth } from '@/contexts/AuthContext'
import type { PreferenceData } from '@/types/chat'

export default function PreferencesPage() {
  const [showSummary, setShowSummary] = useState(false)
  const [extractedPreferences, setExtractedPreferences] = useState<PreferenceData | null>(null)
  const router = useRouter()
  const { refreshUser } = useAuth()

  const handlePreferencesExtracted = (preferences: PreferenceData) => {
    setExtractedPreferences(preferences)
    setShowSummary(true)
  }

  const handleContinue = async () => {
    // Refresh user to update onboarding status
    await refreshUser()
    router.push('/dashboard/swipe')
  }

  const handleEdit = () => {
    setShowSummary(false)
  }

  return (
    <OnboardingOnly>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Tell CineAI About Your Movie Taste
            </h1>
            <p className="text-lg text-gray-600">
              Have a conversation with our AI to discover your perfect movie recommendations
            </p>
          </div>

          {showSummary && extractedPreferences ? (
            <div className="max-w-2xl mx-auto">
              <PreferenceSummary
                preferences={extractedPreferences}
                onContinue={handleContinue}
                onEdit={handleEdit}
              />
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 h-[600px]">
              <ChatInterface onPreferencesExtracted={handlePreferencesExtracted} />
            </div>
          )}
        </div>
      </div>
    </OnboardingOnly>
  )
} 