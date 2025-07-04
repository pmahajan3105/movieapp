import React, { useState, useCallback, useMemo, useRef } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { logger } from '@/lib/logger'
import { createAPICache } from '@/lib/utils/request-cache'
import type {
  HyperPersonalizedRecommendation,
  PersonalizationFactors,
} from '@/lib/ai/hyper-personalized-engine'

export interface LearningSignalContext {
  page_type: string
  recommendation_type?: string
  position_in_list?: number
  session_id?: string
}

export interface UseHyperPersonalizedRecommendationsOptions {
  count?: number
  context?: string
  excludeWatched?: boolean
  factors?: Partial<PersonalizationFactors>
}

export interface RecommendationsMetadata {
  count: number
  averageConfidence: number
  engine: string
  generatedAt: string
}

export interface UseHyperPersonalizedRecommendationsReturn {
  recommendations: HyperPersonalizedRecommendation[]
  isLoading: boolean
  error: string | null
  metadata: RecommendationsMetadata | null
  generateRecommendations: (options?: UseHyperPersonalizedRecommendationsOptions) => Promise<void>
  recordLearningSignal: (
    movieId: string | number,
    action: 'view' | 'click' | 'save' | 'rate' | 'skip' | 'remove' | 'watch_time',
    value?: number,
    context?: LearningSignalContext
  ) => Promise<void>
  refreshRecommendations: () => Promise<void>
}

// Create cache instance for recommendations
const recommendationsCache = createAPICache('hyper-personalized-recommendations')

/**
 * React hook for hyper-personalized movie recommendations with real-time learning
 */
export const useHyperPersonalizedRecommendations = (
  initialOptions: UseHyperPersonalizedRecommendationsOptions = {}
): UseHyperPersonalizedRecommendationsReturn => {
  const { user } = useAuth()
  const [recommendations, setRecommendations] = useState<HyperPersonalizedRecommendation[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [metadata, setMetadata] = useState<RecommendationsMetadata | null>(null)

  // Stabilize initialOptions to prevent unnecessary re-renders
  const stableInitialOptions = useMemo(() => {
    // Deep serialize for stable comparison
    return JSON.parse(JSON.stringify(initialOptions))
  }, [initialOptions])

  const [lastOptions, setLastOptions] =
    useState<UseHyperPersonalizedRecommendationsOptions>(stableInitialOptions)

  // Stable user ID reference to prevent unnecessary re-renders
  const userIdRef = useRef<string | null>(null)
  const stableUserId = useMemo(() => {
    const currentUserId = user?.id || null
    if (currentUserId !== userIdRef.current) {
      userIdRef.current = currentUserId
    }
    return userIdRef.current
  }, [user?.id])

  /**
   * Generate hyper-personalized recommendations
   */
  const generateRecommendations = useCallback(
    async (options: UseHyperPersonalizedRecommendationsOptions = {}) => {
      if (!stableUserId) {
        setError('User not authenticated')
        return
      }
      setIsLoading(true)
      setError(null)
      try {
        const finalOptions = { ...stableInitialOptions, ...options }
        setLastOptions(finalOptions)

        // Build query parameters
        const params = new URLSearchParams()
        params.append('count', String(finalOptions.count || 10))
        params.append('excludeWatched', String(finalOptions.excludeWatched !== false))

        if (finalOptions.context) {
          params.append('context', finalOptions.context)
        }

        // Add custom personalization factors if provided
        if (finalOptions.factors) {
          if (finalOptions.factors.behavioral_weight !== undefined) {
            params.append('behavioral_weight', String(finalOptions.factors.behavioral_weight))
          }
          if (finalOptions.factors.temporal_weight !== undefined) {
            params.append('temporal_weight', String(finalOptions.factors.temporal_weight))
          }
          if (finalOptions.factors.exploration_weight !== undefined) {
            params.append('exploration_weight', String(finalOptions.factors.exploration_weight))
          }
          if (finalOptions.factors.quality_threshold_weight !== undefined) {
            params.append(
              'quality_threshold_weight',
              String(finalOptions.factors.quality_threshold_weight)
            )
          }
          if (finalOptions.factors.recency_weight !== undefined) {
            params.append('recency_weight', String(finalOptions.factors.recency_weight))
          }
        }

        const url = `/api/recommendations/hyper-personalized?${params.toString()}`
        const cacheKey = `${stableUserId}:${params.toString()}`

        logger.info('🤖 Requesting hyper-personalized recommendations', {
          userId: stableUserId,
          options: finalOptions,
          cacheKey,
          excludeWatched: finalOptions.excludeWatched,
        })

        // Use cache to prevent duplicate requests
        const data = await recommendationsCache.get(
          cacheKey,
          async () => {
            const response = await fetch(url, {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
              },
              credentials: 'include', // Include cookies for authentication
            })

            if (!response.ok) {
              const errorData = await response.json()
              throw new Error(
                errorData.details || errorData.error || 'Failed to generate recommendations'
              )
            }

            return response.json()
          },
          {
            ttl: 2 * 60 * 1000, // 2 minutes cache
            deduplicationWindow: 2000, // 2 second deduplication
          }
        )

        if (!data.success) {
          throw new Error(data.error || 'Failed to generate recommendations')
        }

        setRecommendations(data.recommendations || [])
        setMetadata(data.metadata || null)

        logger.info('✅ Hyper-personalized recommendations received', {
          userId: stableUserId,
          count: data.recommendations?.length || 0,
          averageConfidence: data.metadata?.averageConfidence,
        })
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
        setError(errorMessage)
        logger.error('❌ Failed to generate hyper-personalized recommendations', {
          userId: stableUserId,
          errorMessage,
        })
      } finally {
        setIsLoading(false)
      }
    },
    [stableUserId, stableInitialOptions, setLastOptions]
  )

  /**
   * Record a learning signal for real-time adaptation
   */
  const recordLearningSignal = useCallback(
    async (
      movieId: string | number,
      action: 'view' | 'click' | 'save' | 'rate' | 'skip' | 'remove' | 'watch_time',
      value?: number,
      context: LearningSignalContext = { page_type: 'unknown' }
    ) => {
      if (!stableUserId) {
        logger.warn('Cannot record learning signal: user not authenticated')
        return
      }

      try {
        logger.info('📊 Recording learning signal', {
          userId: stableUserId,
          movieId: String(movieId),
          action,
          value: value || 0,
          pageType: context.page_type,
        })

        const response = await fetch('/api/recommendations/hyper-personalized', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include', // Include cookies for authentication
          body: JSON.stringify({
            movieId: String(movieId),
            action,
            value,
            context,
          }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(
            errorData.details || errorData.error || 'Failed to record learning signal'
          )
        }

        const data = await response.json()

        if (!data.success) {
          throw new Error(data.error || 'Failed to record learning signal')
        }

        logger.info('✅ Learning signal recorded successfully', {
          userId: stableUserId,
          movieId,
          action,
        })
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
        logger.warn('⚠️ Failed to record learning signal', {
          userId: stableUserId,
          movieId,
          action,
          errorMessage,
        })
        // Don't throw - learning signals are non-critical
      }
    },
    [stableUserId]
  )

  /**
   * Refresh recommendations using the last options
   */
  const refreshRecommendations = useCallback(async () => {
    await generateRecommendations(lastOptions)
  }, [generateRecommendations, lastOptions])

  return {
    recommendations,
    isLoading,
    error,
    metadata,
    generateRecommendations,
    recordLearningSignal,
    refreshRecommendations,
  }
}

// Convenience hook for common scenarios
export const useSmartRecommendations = (
  options: {
    context?: 'dashboard' | 'movie_page' | 'search' | 'watchlist'
    count?: number
    autoLoad?: boolean
    enableExploration?: boolean
  } = {}
) => {
  const { context = 'dashboard', count = 10, autoLoad = true, enableExploration = false } = options

  // Memoize personalized factors to prevent object recreation
  const personalizedFactors = useMemo<Partial<PersonalizationFactors> | undefined>(
    () =>
      enableExploration
        ? {
            exploration_weight: 0.25,
            behavioral_weight: 0.35,
          }
        : undefined,
    [enableExploration]
  )

  // Memoize hook options to prevent object recreation
  const hookOptions = useMemo(
    () => ({
      count,
      context,
      excludeWatched: true,
      factors: personalizedFactors,
    }),
    [count, context, personalizedFactors]
  )

  const hook = useHyperPersonalizedRecommendations(hookOptions)

  // Auto-load recommendations on mount with stabilized dependencies
  const { generateRecommendations } = hook
  const hasLoadedRef = useRef(false)

  React.useEffect(() => {
    if (autoLoad && !hasLoadedRef.current) {
      hasLoadedRef.current = true
      generateRecommendations()
    }
  }, [autoLoad, generateRecommendations])

  return hook
}
