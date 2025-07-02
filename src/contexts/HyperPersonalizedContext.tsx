'use client'

import React, { createContext, useContext, ReactNode, useEffect, useRef } from 'react'
import { 
  useHyperPersonalizedRecommendations, 
  type UseHyperPersonalizedRecommendationsReturn,
  type UseHyperPersonalizedRecommendationsOptions,
  type LearningSignalContext
} from '@/hooks/useHyperPersonalizedRecommendations'

interface HyperPersonalizedContextType {
  // Core recommendation functionality
  recommendations: UseHyperPersonalizedRecommendationsReturn['recommendations']
  isLoading: UseHyperPersonalizedRecommendationsReturn['isLoading']
  error: UseHyperPersonalizedRecommendationsReturn['error']
  metadata: UseHyperPersonalizedRecommendationsReturn['metadata']
  generateRecommendations: UseHyperPersonalizedRecommendationsReturn['generateRecommendations']
  refreshRecommendations: UseHyperPersonalizedRecommendationsReturn['refreshRecommendations']
  
  // Shared learning signal recording
  recordLearningSignal: (
    movieId: string | number,
    action: 'view' | 'click' | 'save' | 'rate' | 'skip' | 'remove' | 'watch_time',
    value?: number,
    context?: LearningSignalContext
  ) => Promise<void>
}

const HyperPersonalizedContext = createContext<HyperPersonalizedContextType | undefined>(undefined)

interface HyperPersonalizedProviderProps {
  children: ReactNode
  options?: UseHyperPersonalizedRecommendationsOptions
  autoLoad?: boolean
}

export function HyperPersonalizedProvider({ 
  children, 
  options = {},
  autoLoad = true
}: HyperPersonalizedProviderProps) {
  const hook = useHyperPersonalizedRecommendations(options)
  const hasLoadedRef = useRef(false)

  // Auto-load recommendations on mount
  useEffect(() => {
    if (autoLoad && !hasLoadedRef.current) {
      hasLoadedRef.current = true
      hook.generateRecommendations()
    }
  }, [autoLoad, hook])

  const value: HyperPersonalizedContextType = {
    recommendations: hook.recommendations,
    isLoading: hook.isLoading,
    error: hook.error,
    metadata: hook.metadata,
    generateRecommendations: hook.generateRecommendations,
    refreshRecommendations: hook.refreshRecommendations,
    recordLearningSignal: hook.recordLearningSignal
  }

  return (
    <HyperPersonalizedContext.Provider value={value}>
      {children}
    </HyperPersonalizedContext.Provider>
  )
}

/**
 * Hook to access the shared hyper-personalized recommendations context
 */
export function useHyperPersonalizedContext(): HyperPersonalizedContextType {
  const context = useContext(HyperPersonalizedContext)
  if (context === undefined) {
    throw new Error('useHyperPersonalizedContext must be used within a HyperPersonalizedProvider')
  }
  return context
}

/**
 * Hook for components that only need to record learning signals
 * This prevents unnecessary hook instances in movie cards
 */
export function useLearningSignals() {
  const context = useHyperPersonalizedContext()
  return {
    recordLearningSignal: context.recordLearningSignal
  }
}