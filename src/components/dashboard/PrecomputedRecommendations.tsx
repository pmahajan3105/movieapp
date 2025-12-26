/**
 * Precomputed Recommendations Component
 * Phase 1: Instant loading dashboard recommendations
 * 
 * This component loads pre-computed recommendations for sub-200ms performance
 */

'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { RefreshCw, Zap, Clock, TrendingUp, AlertCircle, Settings, Star, MessageCircle, Bookmark, BookmarkCheck } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Image from 'next/image'
import { MovieDetailsModal } from '@/components/movies/MovieDetailsModal'
import { useAuth } from '@/contexts/AuthContext'
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
  source: 'precomputed' | 'fallback' | 'smart-recommendations'
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
  onMovieSave?: (movieId: string) => Promise<void>
}

// Enhanced Movie Card Component (same style as TrendingMoviesGrid)
const RecommendationMovieCard = ({
  recommendation,
  onAddToWatchlist,
  onMovieClick,
  isInWatchlist = false,
}: {
  recommendation: PrecomputedRecommendation
  onAddToWatchlist: (movieId: string) => void
  onMovieClick: (movie: any) => void
  isInWatchlist?: boolean
}) => {
  const { movie, confidence, reason } = recommendation

  return (
    <Card className="group overflow-hidden rounded-xl transition-all duration-200 hover:shadow-lg">
      <div className="relative aspect-[2/3] overflow-hidden rounded-t-xl">
        <Image
          src={
            movie.poster_url ||
            `data:image/svg+xml;base64,${btoa(`
            <svg width="300" height="450" xmlns="http://www.w3.org/2000/svg">
              <rect width="100%" height="100%" fill="#f3f4f6"/>
              <text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="#9ca3af" font-family="Arial, sans-serif" font-size="16">
                ${movie.title}
              </text>
            </svg>
          `)}`
          }
          alt={movie.title}
          fill
          className="rounded-t-xl object-cover transition-transform duration-200 group-hover:scale-105"
          sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
        />

        {/* Rating badge */}
        {movie.rating !== null && movie.rating !== undefined && (
          <div className="absolute top-2 right-2 rounded-full bg-black/70 px-2 py-1 text-xs font-medium text-white">
            ⭐ {Number(movie.rating).toFixed(1)}
          </div>
        )}

        {/* Confidence badge */}
        <div className="absolute top-2 left-2 rounded-full bg-primary/90 px-2 py-1 text-xs font-medium text-white">
          {(confidence * 100).toFixed(0)}% match
        </div>
      </div>

      <CardContent className="flex flex-col p-3">
        <h3
          className="hover:text-primary mb-2 line-clamp-2 cursor-pointer text-sm leading-tight font-semibold text-slate-800 transition-colors"
          onClick={() => onMovieClick(movie)}
        >
          {movie.title} ({movie.year})
        </h3>

        {movie.genre && movie.genre.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1">
            {movie.genre.slice(0, 2).map((genre: string) => (
              <Badge key={genre} variant="outline" className="h-5 px-1.5 py-0 text-xs">
                {genre}
              </Badge>
            ))}
            {movie.genre.length > 2 && (
              <Badge variant="outline" className="h-5 px-1.5 py-0 text-xs">
                +{movie.genre.length - 2}
              </Badge>
            )}
          </div>
        )}

        {/* Plot/Overview */}
        {movie.plot && (
          <div className="mb-2">
            <p className="line-clamp-2 text-xs leading-relaxed text-slate-700">{movie.plot}</p>
          </div>
        )}

        {/* AI Reason */}
        {reason && (
          <div className="mb-2">
            <p className="line-clamp-1 text-xs text-primary font-medium italic">&quot;{reason}&quot;</p>
          </div>
        )}

        <div className="mt-4 flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-7 flex-1 text-xs"
            onClick={() => onMovieClick(movie)}
          >
            View Details
          </Button>
          <Button
            variant={isInWatchlist ? 'default' : 'outline'}
            size="sm"
            onClick={() => onAddToWatchlist(movie.id)}
            className="h-7 px-2 text-xs"
          >
            {isInWatchlist ? (
              <BookmarkCheck className="h-3 w-3" />
            ) : (
              <Bookmark className="h-3 w-3" />
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export const PrecomputedRecommendations: React.FC<PrecomputedRecommendationsProps> = ({
  className = '',
  limit = 12,
  showInsights = false,
  onMovieView,
  onMovieSave
}) => {
  const { user, isLocalMode } = useAuth()
  const [data, setData] = useState<RecommendationsResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [showControls, setShowControls] = useState(false)
  const [userActivityData, setUserActivityData] = useState<any>(null)
  const [showNewUserExperience, setShowNewUserExperience] = useState(false)
  const [showQuickRating, setShowQuickRating] = useState(false)
  const [selectedMovie, setSelectedMovie] = useState<any>(null)

  // AI Settings for fallback recommendations
  const { settings, updateSetting, isLoading: settingsLoading } = useAISettings()

  // Load recommendations
  const loadRecommendations = useCallback(async (force = false) => {
    if (!user) return
    
    // In local mode, recommendations require backend
    if (isLocalMode) {
      setIsLoading(false)
      setShowQuickRating(true) // Show quick rating instead
      return
    }

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
        `/api/ai/recommend?count=${limit}&excludeWatched=true`,
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
      
      console.info('Loaded precomputed recommendations', {
        count: result.recommendations?.length || 0,
        source: result.source,
        loadTime: duration,
        isStale: result.meta?.isStale
      })

      // Load user activity data to check for new user experience
      if (user?.id) {
        try {
          const activityData = await fetchUserActivityData(user.id)
          setUserActivityData(activityData)
          
          // Show new user experience if they have no recommendations and are new
          const onboardingStatus = assessUserOnboardingStatus(
            activityData.aiProfile,
            activityData.interactions
          )
          
          if (onboardingStatus.interactionLevel === 'new' && (!result.recommendations || result.recommendations.length === 0)) {
            setShowNewUserExperience(true)
          }
        } catch (err) {
          console.error('Failed to load user activity data', { error: err })
        }
      }

      // Show success message for fallback mode
      if (result.source === 'fallback' && result.message) {
        // Could show a toast notification here
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load recommendations'
      setError(errorMessage)
      console.error('Failed to load precomputed recommendations', { error: errorMessage })
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [user, limit, showInsights])

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
  }, [user, loadRecommendations])

  // Auto-refresh when coming back to page (visibility change)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && user && data?.meta?.isStale) {
        loadRecommendations(true)
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [user, data?.meta?.isStale, loadRecommendations])

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
  }, [settings, user, data?.source, settingsLoading, loadRecommendations])

  // Event handlers for new user experience
  const handleStartOnboarding = () => {
    window.location.href = '/onboarding'
  }

  const handleStartRating = () => {
    setShowQuickRating(true)
  }

  const handleOpenChat = () => {
    const chatWidget = document.querySelector('[data-floating-chat-widget]')
    if (chatWidget) {
      (chatWidget as any).click?.()
    }
  }

  const handleRatingComplete = () => {
    // Refresh recommendations after rating
    loadRecommendations(true)
    setShowQuickRating(false)
  }

  const handleMovieClick = (movie: any) => {
    setSelectedMovie(movie)
    onMovieView?.(movie.id, movie)
  }

  const handleCloseModal = () => {
    setSelectedMovie(null)
  }

  const handleAddToWatchlist = async (movieId: string) => {
    if (onMovieSave) {
      await onMovieSave(movieId)
    }
  }

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

        {/* Show new user experience if applicable */}
        {showNewUserExperience && userActivityData && (
          <NewUserEmptyState
            userProfile={userActivityData.aiProfile}
            userInteractions={userActivityData.interactions}
            onStartOnboarding={handleStartOnboarding}
            onStartRating={handleStartRating}
            onOpenChat={handleOpenChat}
            className="mb-6"
          />
        )}

        {/* Show quick rating widget if triggered */}
        {showQuickRating && (
          <QuickRatingWidget
            onRatingComplete={handleRatingComplete}
            onSkip={() => setShowQuickRating(false)}
            className="mb-6"
          />
        )}

        {/* Show fallback message if we have data but no recommendations */}
        {data?.source === 'fallback' && data.message && !showNewUserExperience && !showQuickRating && (
          <div className="alert alert-info mb-6 border-blue-200 bg-blue-50">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            <span className="text-blue-800 font-medium">{data.message}</span>
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
        
        {!showNewUserExperience && !showQuickRating && (
          <div className="text-center py-12 space-y-6">
            <div>
              <TrendingUp className="w-16 h-16 text-slate-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2 text-slate-800">No recommendations yet</h3>
              <p className="text-slate-600 mb-4 font-medium">
                {data?.source === 'fallback' 
                  ? "Try adjusting the settings above or generate new recommendations."
                  : "We're analyzing trending movies to find perfect matches for you."
                }
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button 
                onClick={handleRefresh}
                className="btn btn-primary"
                disabled={isRefreshing}
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                Get Recommendations
              </button>
              
              {userActivityData && (
                <>
                  <button 
                    onClick={handleStartRating}
                    className="btn btn-outline"
                  >
                    <Star className="w-4 h-4" />
                    Rate Movies
                  </button>
                  
                  <button 
                    onClick={handleOpenChat}
                    className="btn btn-ghost"
                  >
                    <MessageCircle className="w-4 h-4" />
                    Chat with AI
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={`precomputed-recommendations ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold flex items-center gap-2 text-slate-800">
            <Zap className="w-6 h-6 text-primary" />
            Your Recommendations
          </h2>
          
          {/* Source indicator */}
          <div className={`badge gap-1 text-white font-medium ${
            data.source === 'smart-recommendations' 
              ? 'bg-gradient-to-r from-green-500 to-blue-500' 
              : data.source === 'precomputed'
              ? 'bg-gradient-to-r from-purple-500 to-blue-500' 
              : 'bg-gradient-to-r from-orange-500 to-red-500'
          }`}>
            {data.source === 'smart-recommendations' ? 'Personalized' : 
             data.source === 'precomputed' ? 'AI Enhanced' : 'Popular Picks'}
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

      {/* Success/Info message for any source */}
      {data.message && (
        <div className={`alert mb-6 ${
          data.source === 'smart-recommendations' 
            ? 'alert-success border-green-200 bg-green-50'
            : data.source === 'fallback'
            ? 'alert-info border-blue-200 bg-blue-50'
            : 'alert-info'
        }`}>
          <TrendingUp className={`w-5 h-5 ${
            data.source === 'smart-recommendations' ? 'text-green-600' : 'text-blue-600'
          }`} />
          <span className={
            data.source === 'smart-recommendations' ? 'text-green-800 font-medium' : 'text-blue-800'
          }>{data.message}</span>
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
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4">
        {data.recommendations.map((rec) => (
          <RecommendationMovieCard
            key={rec.id}
            recommendation={rec}
            onAddToWatchlist={handleAddToWatchlist}
            onMovieClick={handleMovieClick}
            isInWatchlist={false} // TODO: Add watchlist check
          />
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

      {/* Movie Details Modal */}
      {selectedMovie && (
        <MovieDetailsModal
          movie={selectedMovie}
          open={!!selectedMovie}
          onClose={handleCloseModal}
          onAddToWatchlist={handleAddToWatchlist}
        />
      )}
    </div>
  )
}