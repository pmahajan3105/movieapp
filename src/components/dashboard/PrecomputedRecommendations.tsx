/**
 * Precomputed Recommendations Component
 * Phase 1: Instant loading dashboard recommendations
 * 
 * This component loads pre-computed recommendations for sub-200ms performance
 */

'use client'

import React, { useState, useEffect } from 'react'
import { RefreshCw, Zap, Clock, TrendingUp, AlertCircle, Brain, Settings } from 'lucide-react'
import { MovieGridCard } from '@/components/movies/MovieGridCard'
import { useAuth } from '@/contexts/AuthContext'
import { logger } from '@/lib/logger'
import { RecommendationBehaviorSection } from '@/components/ai/RecommendationBehaviorSection'
import { useAISettings } from '@/hooks/useAISettings'
import { supabase } from '@/lib/supabase/browser-client'
import { NewUserEmptyState } from '@/components/dashboard/NewUserEmptyState'
import { QuickRatingWidget } from '@/components/dashboard/QuickRatingWidget'
import { fetchUserActivityData } from '@/lib/user-activity-fetcher'
import { assessUserOnboardingStatus } from '@/lib/user-onboarding-utils'

interface PrecomputedRecommendation {
  id: string
  movie: {
    id: string
    title: string
    year: number
    genre: string[]
    director: string[]
    plot: string
    poster_url?: string
    rating: number
    runtime: number
  }
  score: number
  confidence: number
  reason: string
  discoverySource: string
  analysisSource: string
  generatedAt: string
  enhancedAt?: string
  insights?: {
    emotional: any
    thematic: any
    cinematic: any
  }
}

interface RecommendationsResponse {
  recommendations: PrecomputedRecommendation[]
  total: number
  source: 'precomputed' | 'fallback'
  message?: string
  refreshTriggered?: boolean
  meta: {
    generatedAt: string
    analysisSourceBreakdown?: Record<string, number>
    isStale?: boolean
  }
}

interface PrecomputedRecommendationsProps {
  className?: string
  limit?: number
  showInsights?: boolean
  onMovieView?: (movieId: string, movieData?: any, aiInsights?: any) => void
  onMovieSave?: (movieId: string) => void
  onMovieRate?: (movieId: string, rating: number) => void
}

export const PrecomputedRecommendations: React.FC<PrecomputedRecommendationsProps> = ({
  className = '',
  limit = 12,
  showInsights = false,
  onMovieView,
  onMovieSave,
  onMovieRate
}) => {
  const { user } = useAuth()
  const [data, setData] = useState<RecommendationsResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [loadTime, setLoadTime] = useState<number | null>(null)
  const [showControls, setShowControls] = useState(false)

  // AI Settings for fallback recommendations
  const { settings, updateSetting, isLoading: settingsLoading } = useAISettings()

  // Load recommendations
  const loadRecommendations = async (force = false) => {
    if (!user) return

    const startTime = performance.now()
    setIsLoading(!force) // Don't show loading state for manual refresh
    setError(null)

    try {
      // Get the session token from Supabase for authenticated requests
      const { data: sessionData } = await supabase.auth.getSession()
      
      if (!sessionData.session) {
        throw new Error('No active session')
      }

      const response = await fetch(
        `/api/recommendations/precomputed?limit=${limit}&includeInsights=${showInsights}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${sessionData.session.access_token}`,
          },
        }
      )

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const apiResponse = await response.json()
      const endTime = performance.now()
      const duration = endTime - startTime

      // Handle wrapped API response
      const result: RecommendationsResponse = apiResponse.success ? apiResponse.data : apiResponse

      setData(result)
      setLoadTime(duration)
      
      logger.info('Loaded precomputed recommendations', {
        count: result.recommendations?.length || 0,
        source: result.source,
        loadTime: duration,
        isStale: result.meta?.isStale
      })

      // Show success message for fallback mode
      if (result.source === 'fallback' && result.message) {
        // Could show a toast notification here
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load recommendations'
      setError(errorMessage)
      logger.error('Failed to load precomputed recommendations', { error: errorMessage })
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  // Manual refresh
  const handleRefresh = async () => {
    setIsRefreshing(true)
    await loadRecommendations(true)
  }

  // Load on mount and when user changes
  useEffect(() => {
    if (user) {
      loadRecommendations()
    }
  }, [user, limit, showInsights])

  // Auto-refresh when coming back to page (visibility change)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && user && data?.meta?.isStale) {
        loadRecommendations(true)
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [user, data?.meta?.isStale])

  // Auto-refresh when AI settings change (for fallback recommendations)
  useEffect(() => {
    if (user && data?.source === 'fallback' && !settingsLoading) {
      // Debounce settings changes to avoid too many API calls
      const timeoutId = setTimeout(() => {
        loadRecommendations(true)
      }, 1000)

      return () => clearTimeout(timeoutId)
    }
    return undefined
  }, [settings, user, data?.source, settingsLoading])

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-base-content/60">Please log in to see recommendations</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className={`precomputed-recommendations ${className}`}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Zap className="w-6 h-6 text-primary" />
            Your Recommendations
          </h2>
        </div>
        
        {/* Loading skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-base-200 animate-pulse rounded-lg h-96" />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`precomputed-recommendations ${className}`}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Zap className="w-6 h-6 text-primary" />
            Your Recommendations
          </h2>
          <button 
            onClick={handleRefresh}
            className="btn btn-sm btn-primary"
            disabled={isRefreshing}
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Retry
          </button>
        </div>
        
        <div className="alert alert-error">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
        </div>
      </div>
    )
  }



  if (!data || !data.recommendations || data.recommendations.length === 0) {
    return (
      <div className={`precomputed-recommendations ${className}`}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Zap className="w-6 h-6 text-primary" />
            Your Recommendations
          </h2>
          <button 
            onClick={handleRefresh}
            className="btn btn-sm btn-primary"
            disabled={isRefreshing}
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Generate
          </button>
        </div>

        {/* Show fallback message if we have data but no recommendations */}
        {data?.source === 'fallback' && data.message && (
          <div className="alert alert-info mb-6">
            <TrendingUp className="w-5 h-5" />
            <span>{data.message}</span>
          </div>
        )}

        {/* Show recommendation controls for fallback mode even with no recommendations */}
        {data?.source === 'fallback' && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Settings className="w-5 h-5 text-primary" />
                Customize Your Recommendations
              </h3>
              <button
                onClick={() => setShowControls(!showControls)}
                className="btn btn-sm btn-outline"
              >
                {showControls ? 'Hide Controls' : 'Show Controls'}
              </button>
            </div>
            
            {showControls && !settingsLoading && (
              <div className="bg-base-100 rounded-lg p-4 border border-base-300">
                <RecommendationBehaviorSection
                  settings={settings}
                  updateSetting={updateSetting}
                />
                <div className="mt-4 text-sm text-base-content/60">
                  <p>💡 Tip: Adjust these settings to get better recommendations while we learn your preferences</p>
                </div>
              </div>
            )}
            
            {settingsLoading && showControls && (
              <div className="bg-base-100 rounded-lg p-8 border border-base-300">
                <div className="flex items-center justify-center">
                  <span className="loading loading-spinner loading-md mr-2"></span>
                  Loading settings...
                </div>
              </div>
            )}
          </div>
        )}
        
        <div className="text-center py-12">
          <TrendingUp className="w-16 h-16 text-base-content/30 mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">No recommendations yet</h3>
          <p className="text-base-content/60 mb-4">
            {data?.source === 'fallback' 
              ? "Try adjusting the settings above or generate new recommendations."
              : "We're analyzing trending movies to find perfect matches for you."
            }
          </p>
          <button 
            onClick={handleRefresh}
            className="btn btn-primary"
            disabled={isRefreshing}
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Get Recommendations
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={`precomputed-recommendations ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Zap className="w-6 h-6 text-primary" />
            Your Recommendations
          </h2>
          
          {/* Performance badge */}
          {loadTime && (
            <div className="badge badge-success gap-1">
              <Clock className="w-3 h-3" />
              {loadTime.toFixed(0)}ms
            </div>
          )}
          
          {/* Source indicator */}
          <div className={`badge gap-1 ${
            data.source === 'precomputed' ? 'badge-primary' : 'badge-warning'
          }`}>
            {data.source === 'precomputed' ? 'AI Enhanced' : 'Popular Picks'}
          </div>
        </div>

        <button 
          onClick={handleRefresh}
          className="btn btn-sm btn-ghost"
          disabled={isRefreshing}
          title="Refresh recommendations"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Fallback message */}
      {data.source === 'fallback' && data.message && (
        <div className="alert alert-info mb-6">
          <TrendingUp className="w-5 h-5" />
          <span>{data.message}</span>
        </div>
      )}

      {/* Recommendation Controls for Fallback Mode */}
      {data.source === 'fallback' && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Settings className="w-5 h-5 text-primary" />
              Customize Your Recommendations
            </h3>
            <button
              onClick={() => setShowControls(!showControls)}
              className="btn btn-sm btn-outline"
            >
              {showControls ? 'Hide Controls' : 'Show Controls'}
            </button>
          </div>
          
          {showControls && !settingsLoading && (
            <div className="bg-base-100 rounded-lg p-4 border border-base-300">
              <RecommendationBehaviorSection
                settings={settings}
                updateSetting={updateSetting}
              />
              <div className="mt-4 text-sm text-base-content/60">
                <p>💡 Tip: Adjust these settings to get better recommendations while we learn your preferences</p>
              </div>
            </div>
          )}
          
          {settingsLoading && showControls && (
            <div className="bg-base-100 rounded-lg p-8 border border-base-300">
              <div className="flex items-center justify-center">
                <span className="loading loading-spinner loading-md mr-2"></span>
                Loading settings...
              </div>
            </div>
          )}
        </div>
      )}

      {/* Stale recommendations notice */}
      {data?.meta?.isStale && data.source === 'precomputed' && (
        <div className="alert alert-warning mb-6">
          <Clock className="w-5 h-5" />
          <span>Refreshing recommendations in background with latest trends...</span>
        </div>
      )}

      {/* Analysis source breakdown */}
      {data?.meta?.analysisSourceBreakdown && showInsights && (
        <div className="stats shadow mb-6">
          <div className="stat">
            <div className="stat-title">Analysis Quality</div>
            <div className="stat-value text-sm">
              {Object.entries(data.meta.analysisSourceBreakdown).map(([source, count]) => (
                <div key={source} className="badge badge-outline mr-2">
                  {source}: {count}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Movie grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {data.recommendations.map((rec) => (
          <div key={rec.id} className="relative">
            <MovieGridCard
              movie={rec.movie}
              onAddToWatchlist={() => onMovieSave?.(rec.movie.id)}
              onRate={(movieId, interested, rating) => {
                if (rating) {
                  onMovieRate?.(movieId, rating)
                }
              }}
              className="h-full"
            />
            
            {/* Recommendation metadata overlay */}
            <div className="absolute top-2 right-2 z-10">
              <div 
                className="badge badge-primary badge-sm opacity-90"
                title={`${(rec.confidence * 100).toFixed(0)}% match: ${rec.reason}`}
              >
                {(rec.confidence * 100).toFixed(0)}%
              </div>
            </div>

            {/* AI insights tooltip/modal */}
            {rec.insights && showInsights && (
              <div className="absolute bottom-2 left-2 z-10">
                <div className="tooltip tooltip-top" data-tip="AI Analysis Available">
                  <div className="badge badge-secondary badge-sm">
                    <Brain className="w-3 h-3" />
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Load more button if there are more recommendations */}
      {data.total > (data.recommendations?.length || 0) && (
        <div className="text-center mt-8">
          <button 
            className="btn btn-outline"
            onClick={() => {
              // Could implement pagination here
              console.log('Load more recommendations')
            }}
          >
            Load More ({data.total - (data.recommendations?.length || 0)} remaining)
          </button>
        </div>
      )}

      {/* Metadata footer */}
      <div className="text-center text-sm text-base-content/60 mt-8">
        Generated {data?.meta?.generatedAt ? new Date(data.meta.generatedAt).toLocaleString() : 'Unknown'} • 
        {data.recommendations?.length || 0} of {data.total} recommendations
      </div>
    </div>
  )
}