'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Brain, Zap, TrendingUp, Settings, RefreshCw, Trash2 } from 'lucide-react'
import { HyperPersonalizedMovieGrid } from '@/components/movies/HyperPersonalizedMovieCard'
import { HyperPersonalizedProvider, useHyperPersonalizedContext } from '@/contexts/HyperPersonalizedContext'
import type { PersonalizationFactors } from '@/lib/ai/hyper-personalized-engine'
import { useAuth } from '@/contexts/AuthContext'

interface HyperPersonalizedSectionProps {
  className?: string
  onMovieView?: (movieId: string, movieData?: any) => void
  onMovieSave?: (movieId: string) => void
  onMovieRate?: (movieId: string, rating: number) => void
}

// Internal component that uses the context
const HyperPersonalizedSectionInternal: React.FC<HyperPersonalizedSectionProps> = ({
  className = '',
  onMovieView,
  onMovieSave,
  onMovieRate
}) => {
  const { user } = useAuth()
  const [showSettings, setShowSettings] = useState(false)
  const [enableExploration, setEnableExploration] = useState(false)
  const [customFactors, setCustomFactors] = useState<Partial<PersonalizationFactors>>({})
  const [debouncedFactors, setDebouncedFactors] = useState<Partial<PersonalizationFactors>>({})

  const {
    recommendations,
    isLoading,
    error,
    metadata,
    generateRecommendations,
    refreshRecommendations
  } = useHyperPersonalizedContext()

  // Load recommendations on mount (removed manual loading since autoLoad is enabled)

  // Debounce custom factors to prevent excessive API calls
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedFactors(customFactors)
    }, 800) // 800ms debounce for settings changes

    return () => clearTimeout(timer)
  }, [customFactors])

  // Consolidated effect for regenerating recommendations when debounced settings change
  useEffect(() => {
    const hasCustomFactors = Object.keys(debouncedFactors).length > 0
    
    if (hasCustomFactors || enableExploration) {
      let finalFactors = { ...debouncedFactors }
      
      // Apply exploration mode factors if enabled
      if (enableExploration) {
        finalFactors = {
          ...finalFactors,
          exploration_weight: 0.25,
          behavioral_weight: 0.35
        }
      }
      
      generateRecommendations({
        factors: finalFactors,
        count: 8,
        context: 'dashboard'
      })
    }
  }, [debouncedFactors, enableExploration, generateRecommendations])

  const handleFactorChange = (factor: keyof PersonalizationFactors, value: number) => {
    setCustomFactors(prev => ({
      ...prev,
      [factor]: value / 100 // Convert percentage to 0-1
    }))
  }

  const resetFactors = useCallback(() => {
    setCustomFactors({})
    setDebouncedFactors({}) // Clear debounced state immediately for reset
    generateRecommendations({
      count: 8,
      context: 'dashboard'
    })
  }, [generateRecommendations])

  const toggleExploration = () => {
    setEnableExploration(!enableExploration)
  }

  const forceRefreshRecommendations = useCallback(() => {
    if (user?.id) {
      // Clear cache first, then refresh recommendations
      // TODO: Re-implement cache clearing once issue is resolved
      refreshRecommendations()
    }
  }, [user?.id, refreshRecommendations])

  if (error) {
    return (
      <div className={`${className}`}>
        <div className="card bg-error/10 border border-error/20">
          <div className="card-body text-center">
            <Brain className="w-12 h-12 text-error mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-error">AI Engine Error</h3>
            <p className="text-error/80">{error}</p>
            <button
              onClick={() => refreshRecommendations()}
              className="btn btn-error btn-sm mt-4"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Brain className="w-6 h-6 text-primary" />
            <h2 className="text-2xl font-bold text-base-content">F-1 Hyper-Personalized</h2>
          </div>
          <div className="badge badge-primary badge-sm gap-1">
            <Zap className="w-3 h-3" />
            AI Powered
          </div>
        </div>

        <div className="flex items-center gap-2">
          {metadata && (
            <div className="stats stats-horizontal shadow-sm">
              <div className="stat py-2 px-3">
                <div className="stat-title text-xs">Confidence</div>
                <div className="stat-value text-sm">{metadata.averageConfidence}%</div>
              </div>
              <div className="stat py-2 px-3">
                <div className="stat-title text-xs">Movies</div>
                <div className="stat-value text-sm">{metadata.count}</div>
              </div>
            </div>
          )}

          <button
            onClick={() => setShowSettings(!showSettings)}
            className="btn btn-ghost btn-sm"
            title="AI Settings"
          >
            <Settings className="w-4 h-4" />
          </button>

          <div className="dropdown dropdown-end">
            <button type="button" className="btn btn-primary btn-sm" disabled={isLoading}>
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <ul tabIndex={0} className="dropdown-content menu bg-base-100 rounded-box z-[1] w-52 p-2 shadow">
              <li>
                <a onClick={() => refreshRecommendations()} className="text-sm">
                  <RefreshCw className="w-4 h-4" />
                  Refresh
                </a>
              </li>
              <li>
                <a onClick={forceRefreshRecommendations} className="text-sm">
                  <Trash2 className="w-4 h-4" />
                  Clear Cache & Refresh
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* AI Settings Panel */}
      {showSettings && (
        <div className="card bg-base-200 mb-6">
          <div className="card-body">
            <h3 className="card-title text-lg mb-4">
              <Brain className="w-5 h-5" />
              AI Personalization Settings
            </h3>

            {/* Exploration Toggle */}
            <div className="form-control mb-4">
              <label className="label cursor-pointer">
                <span className="label-text">
                  <TrendingUp className="w-4 h-4 inline mr-2" />
                  Enable Exploration Mode
                  <span className="text-xs text-base-content/70 block">
                    Discover new genres and directors you might enjoy
                  </span>
                </span>
                <input
                  type="checkbox"
                  className="toggle toggle-primary"
                  checked={enableExploration}
                  onChange={toggleExploration}
                />
              </label>
            </div>

            {/* Custom Factors */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text text-sm">Behavioral Weight</span>
                  <span className="label-text-alt">{Math.round((customFactors.behavioral_weight || 0.4) * 100)}%</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={(customFactors.behavioral_weight || 0.4) * 100}
                  className="range range-primary range-xs"
                  onChange={(e) => handleFactorChange('behavioral_weight', parseInt(e.target.value))}
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text text-sm">Quality Threshold</span>
                  <span className="label-text-alt">{Math.round((customFactors.quality_threshold_weight || 0.15) * 100)}%</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={(customFactors.quality_threshold_weight || 0.15) * 100}
                  className="range range-secondary range-xs"
                  onChange={(e) => handleFactorChange('quality_threshold_weight', parseInt(e.target.value))}
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text text-sm">Exploration Weight</span>
                  <span className="label-text-alt">{Math.round((customFactors.exploration_weight || 0.15) * 100)}%</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={(customFactors.exploration_weight || 0.15) * 100}
                  className="range range-accent range-xs"
                  onChange={(e) => handleFactorChange('exploration_weight', parseInt(e.target.value))}
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text text-sm">Temporal Weight</span>
                  <span className="label-text-alt">{Math.round((customFactors.temporal_weight || 0.2) * 100)}%</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={(customFactors.temporal_weight || 0.2) * 100}
                  className="range range-warning range-xs"
                  onChange={(e) => handleFactorChange('temporal_weight', parseInt(e.target.value))}
                />
              </div>
            </div>

            <div className="card-actions justify-end mt-4">
              <button
                onClick={resetFactors}
                className="btn btn-ghost btn-sm"
              >
                Reset to Defaults
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loading State with Skeleton */}
      {isLoading && (
        <div>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="w-64 h-6 bg-base-300 rounded animate-pulse mb-2"></div>
              <div className="w-96 h-4 bg-base-300 rounded animate-pulse"></div>
            </div>
            <div className="w-24 h-4 bg-base-300 rounded animate-pulse"></div>
          </div>
          
          {/* Skeleton Movie Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="card bg-base-100 shadow-lg">
                <figure className="relative">
                  <div className="w-full h-64 bg-base-300 animate-pulse"></div>
                  <div className="absolute top-2 right-2 w-16 h-6 bg-base-300 rounded animate-pulse"></div>
                </figure>
                <div className="card-body p-4">
                  <div className="w-full h-6 bg-base-300 rounded animate-pulse mb-2"></div>
                  <div className="w-3/4 h-4 bg-base-300 rounded animate-pulse mb-2"></div>
                  <div className="flex gap-2 mb-2">
                    <div className="w-16 h-5 bg-base-300 rounded animate-pulse"></div>
                    <div className="w-16 h-5 bg-base-300 rounded animate-pulse"></div>
                  </div>
                  <div className="w-full h-16 bg-base-300 rounded animate-pulse mb-4"></div>
                  <div className="flex justify-between">
                    <div className="w-24 h-6 bg-base-300 rounded animate-pulse"></div>
                    <div className="w-12 h-6 bg-base-300 rounded animate-pulse"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {/* AI Processing Message */}
          <div className="flex flex-col items-center justify-center py-8 mt-6">
            <Brain className="w-8 h-8 text-primary animate-pulse mb-2" />
            <div className="text-center">
              <p className="text-base-content/70 text-sm mb-2">
                AI is analyzing your preferences and generating personalized recommendations...
              </p>
              <div className="flex items-center justify-center gap-2">
                <span className="loading loading-spinner loading-sm text-primary"></span>
                <span className="text-xs text-base-content/60">Learning from your viewing history</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recommendations Grid */}
      {!isLoading && recommendations.length > 0 && (
        <div>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Your Personalized Recommendations</h3>
              <p className="text-sm text-base-content/70">
                Based on advanced behavioral analysis and real-time learning
              </p>
            </div>
            {metadata && (
              <div className="text-xs text-base-content/60">
                Generated: {new Date(metadata.generatedAt).toLocaleTimeString()}
              </div>
            )}
          </div>

          <HyperPersonalizedMovieGrid
            recommendations={recommendations}
            context={{
              page_type: 'dashboard',
              recommendation_type: 'hyper-personalized',
              session_id: crypto.randomUUID()
            }}
            showPersonalizationDetails={true}
            onMovieView={onMovieView}
            onMovieSave={onMovieSave}
            onMovieRate={onMovieRate}
          />
        </div>
      )}

      {/* Empty State */}
      {!isLoading && recommendations.length === 0 && (
        <div className="text-center py-12">
          <Brain className="w-16 h-16 text-base-content/30 mx-auto mb-6" />
          <h3 className="text-xl font-semibold mb-4">Ready to Learn Your Taste</h3>
          <p className="text-base-content/70 mb-6 max-w-md mx-auto">
            The F-1 Hyper-Personalized Engine needs some data to work its magic. 
            Rate a few movies or add some to your watchlist to get started!
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a href="/dashboard/movies" className="btn btn-primary">
              <TrendingUp className="w-4 h-4 mr-2" />
              Browse Movies
            </a>
            <button
              onClick={() => generateRecommendations({ count: 8 })}
              className="btn btn-outline"
            >
              Try Sample Recommendations
            </button>
          </div>
        </div>
      )}

      {/* AI Info Footer */}
      <div className="mt-8 p-4 bg-primary/5 rounded-lg border border-primary/10">
        <div className="flex items-start gap-3">
          <Zap className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="font-medium text-primary mb-1">How the F-1 Engine Works</h4>
            <p className="text-sm text-base-content/80">
              Our advanced AI analyzes your behavioral patterns, temporal preferences, and quality standards 
              to generate hyper-personalized recommendations. Every interaction helps the engine learn and 
              improve its suggestions for you.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// Main component that provides the context
export const HyperPersonalizedSection: React.FC<HyperPersonalizedSectionProps> = (props) => {
  return (
    <HyperPersonalizedProvider
      options={{
        context: 'dashboard',
        count: 8,
        excludeWatched: true
      }}
      autoLoad={true} // Enable auto-loading
    >
      <HyperPersonalizedSectionInternal {...props} />
    </HyperPersonalizedProvider>
  )
} 