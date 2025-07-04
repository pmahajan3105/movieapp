/**
 * Custom hook for AI Settings management
 * Separates business logic from UI components
 */

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { logger } from '@/lib/logger'

export interface AIControlSettings {
  recommendation_style: 'conservative' | 'balanced' | 'adventurous'
  discovery_preference: 'safe' | 'mixed' | 'exploratory'
  genre_diversity: number
  temporal_preference: 'recent' | 'mixed' | 'classic'
  learning_enabled: boolean
  conversation_memory: boolean
  rating_weight: number
  behavioral_analysis: boolean
  content_filtering: {
    explicit_content: boolean
    violence_threshold: number
    adult_themes: boolean
  }
  explanation_detail: 'minimal' | 'standard' | 'detailed'
  show_confidence_scores: boolean
  show_reasoning: boolean
  recommendation_speed: 'fast' | 'balanced' | 'thorough'
  cache_preferences: boolean
  background_learning: boolean
}

const DEFAULT_SETTINGS: AIControlSettings = {
  recommendation_style: 'balanced',
  discovery_preference: 'mixed',
  genre_diversity: 70,
  temporal_preference: 'mixed',
  learning_enabled: true,
  conversation_memory: true,
  rating_weight: 80,
  behavioral_analysis: true,
  content_filtering: {
    explicit_content: false,
    violence_threshold: 50,
    adult_themes: true
  },
  explanation_detail: 'standard',
  show_confidence_scores: true,
  show_reasoning: true,
  recommendation_speed: 'balanced',
  cache_preferences: true,
  background_learning: true
}

export const useAISettings = () => {
  const { user } = useAuth()
  const [settings, setSettings] = useState<AIControlSettings>(DEFAULT_SETTINGS)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  useEffect(() => {
    if (user) {
      loadSettings()
    }
  }, [user])

  const loadSettings = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch('/api/user/ai-settings')
      if (response.ok) {
        const data = await response.json()
        if (data.settings) {
          setSettings({ ...DEFAULT_SETTINGS, ...data.settings })
        }
      }
    } catch (err) {
      logger.error('Failed to load AI settings', { 
        error: err instanceof Error ? err.message : String(err) 
      })
    } finally {
      setIsLoading(false)
    }
  }

  const saveSettings = async () => {
    try {
      setIsSaving(true)
      setError(null)
      setSuccessMessage(null)

      const response = await fetch('/api/user/ai-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings })
      })

      if (response.ok) {
        setHasChanges(false)
        setSuccessMessage('AI settings saved successfully!')
        setTimeout(() => setSuccessMessage(null), 3000)
        logger.info('AI settings updated successfully')
      } else {
        throw new Error('Failed to save settings')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save settings'
      setError(errorMessage)
      logger.error('Failed to save AI settings', { error: errorMessage })
    } finally {
      setIsSaving(false)
    }
  }

  const resetToDefaults = () => {
    setSettings(DEFAULT_SETTINGS)
    setHasChanges(true)
  }

  const updateSetting = (path: string, value: any) => {
    setSettings(prev => {
      const newSettings = { ...prev }
      const keys = path.split('.')
      let current: any = newSettings
      
      for (let i = 0; i < keys.length - 1; i++) {
        const key = keys[i]
        if (key && !(key in current)) {
          current[key] = {}
        }
        if (key) {
          current = current[key]
        }
      }
      
      const lastKey = keys[keys.length - 1]
      if (lastKey && current) {
        current[lastKey] = value
      }
      return newSettings
    })
    setHasChanges(true)
  }

  return {
    settings,
    isLoading,
    isSaving,
    hasChanges,
    error,
    successMessage,
    saveSettings,
    resetToDefaults,
    updateSetting
  }
}