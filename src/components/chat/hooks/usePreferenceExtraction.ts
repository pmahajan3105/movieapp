import { useState, useCallback } from 'react'
import type { PreferenceData } from '@/types/chat'

export function usePreferenceExtraction() {
  const [isComplete, setIsComplete] = useState(false)
  const [extractedPreferences, setExtractedPreferences] = useState<PreferenceData | null>(null)

  const handlePreferencesExtracted = useCallback((preferences: PreferenceData) => {
    setIsComplete(true)
    setExtractedPreferences(preferences)
  }, [])

  const resetPreferences = useCallback(() => {
    setIsComplete(false)
    setExtractedPreferences(null)
  }, [])

  const confirmPreferences = useCallback((preferences: PreferenceData) => {
    setExtractedPreferences(preferences)
    // Keep isComplete true as preferences are confirmed
  }, [])

  return {
    isComplete,
    extractedPreferences,
    handlePreferencesExtracted,
    resetPreferences,
    confirmPreferences,
  }
}
