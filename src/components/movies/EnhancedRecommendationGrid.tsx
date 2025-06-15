'use client'

import React, { useState, useCallback } from 'react'
import { RecommendationCard } from './RecommendationCard'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { RefreshCw, Filter, TrendingUp, Brain, Heart } from 'lucide-react'
import type { EnhancedRecommendation } from '@/types'

interface EnhancedRecommendationGridProps {
  recommendations: EnhancedRecommendation[]
  onMovieClick: (movie: EnhancedRecommendation['movie']) => void
  onAddToWatchlist: (movieId: string) => void
  onRefresh?: () => void
  watchlistIds: Set<string>
  loading?: boolean
  title?: string
  subtitle?: string
  showFilters?: boolean
  className?: string
}

export function EnhancedRecommendationGrid({
  recommendations,
  onMovieClick,
  onAddToWatchlist,
  onRefresh,
  watchlistIds,
  loading = false,
  title = 'AI-Powered Recommendations',
  subtitle = 'Personalized picks based on your preferences',
  showFilters = true,
  className = '',
}: EnhancedRecommendationGridProps) {
  const [feedbackGiven, setFeedbackGiven] = useState<Record<string, 'like' | 'dislike'>>({})
  const [filterType, setFilterType] = useState<'all' | 'high-confidence' | 'semantic' | 'genre'>(
    'all'
  )

  // Handle user feedback on recommendations
  const handleFeedback = useCallback(
    async (movieId: string, feedback: 'like' | 'dislike', reason?: string) => {
      setFeedbackGiven(prev => ({
        ...prev,
        [movieId]: feedback,
      }))

      // Here you could trigger a re-fetch of recommendations based on feedback
      console.log(`User ${feedback}d movie ${movieId} because: ${reason}`)

      // Optionally refresh recommendations after feedback
      if (onRefresh && feedback === 'dislike') {
        // Small delay to show feedback was registered
        setTimeout(() => {
          onRefresh()
        }, 1500)
      }
    },
    [onRefresh]
  )

  // Filter recommendations based on selected filter
  const filteredRecommendations = recommendations.filter(rec => {
    switch (filterType) {
      case 'high-confidence':
        return rec.confidence >= 0.8
      case 'semantic':
        return (
          rec.reason.toLowerCase().includes('semantic') || rec.reason.toLowerCase().includes('ai')
        )
      case 'genre':
        return (
          rec.reason.toLowerCase().includes('genre') ||
          rec.reason.toLowerCase().includes('preference')
        )
      default:
        return true
    }
  })

  // Calculate stats
  const stats = {
    total: recommendations.length,
    highConfidence: recommendations.filter(r => r.confidence >= 0.8).length,
    semanticMatches: recommendations.filter(
      r => r.reason.toLowerCase().includes('semantic') || r.reason.toLowerCase().includes('ai')
    ).length,
    averageConfidence:
      recommendations.length > 0
        ? Math.round(
            (recommendations.reduce((sum, r) => sum + r.confidence, 0) / recommendations.length) *
              100
          )
        : 0,
  }

  if (loading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="text-center">
          <div className="inline-flex items-center gap-2 text-lg font-semibold">
            <RefreshCw className="h-5 w-5 animate-spin" />
            Generating personalized recommendations...
          </div>
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="mb-4 aspect-[2/3] rounded-lg bg-gray-200"></div>
              <div className="mb-2 h-4 rounded bg-gray-200"></div>
              <div className="h-3 w-3/4 rounded bg-gray-200"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="space-y-2 text-center">
        <h2 className="flex items-center justify-center gap-2 text-2xl font-bold">
          <Brain className="h-6 w-6 text-purple-600" />
          {title}
        </h2>
        <p className="text-gray-600">{subtitle}</p>

        {/* Stats */}
        <div className="flex items-center justify-center gap-4 text-sm">
          <Badge variant="outline" className="flex items-center gap-1">
            <TrendingUp className="h-3 w-3" />
            {stats.total} recommendations
          </Badge>
          <Badge variant="outline" className="flex items-center gap-1">
            <Brain className="h-3 w-3" />
            {stats.averageConfidence}% avg confidence
          </Badge>
          {stats.highConfidence > 0 && (
            <Badge className="border-green-200 bg-green-100 text-green-800">
              {stats.highConfidence} high-confidence matches
            </Badge>
          )}
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium">Filter by:</span>
            <div className="flex gap-1">
              {[
                { key: 'all', label: 'All', icon: null },
                {
                  key: 'high-confidence',
                  label: 'High Confidence',
                  icon: <TrendingUp className="h-3 w-3" />,
                },
                { key: 'semantic', label: 'AI Matches', icon: <Brain className="h-3 w-3" /> },
                { key: 'genre', label: 'Genre Matches', icon: <Heart className="h-3 w-3" /> },
              ].map(filter => (
                <Button
                  key={filter.key}
                  variant={filterType === filter.key ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilterType(filter.key as typeof filterType)}
                  className="flex items-center gap-1"
                >
                  {filter.icon}
                  {filter.label}
                </Button>
              ))}
            </div>
          </div>

          {onRefresh && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          )}
        </div>
      )}

      {/* Recommendations Grid */}
      {filteredRecommendations.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredRecommendations.map((recommendation, index) => (
            <RecommendationCard
              key={recommendation.movie.id}
              recommendation={{
                ...recommendation,
                position: index + 1,
              }}
              onMovieClick={onMovieClick}
              onAddToWatchlist={onAddToWatchlist}
              onFeedback={handleFeedback}
              isInWatchlist={watchlistIds.has(recommendation.movie.id)}
              showExplanation={true}
              showFeedbackButtons={true}
              className="h-full"
            />
          ))}
        </div>
      ) : (
        <div className="py-12 text-center">
          <div className="mb-4 text-gray-500">
            <Brain className="mx-auto mb-2 h-12 w-12 opacity-50" />
            <p>No recommendations match your current filter.</p>
            <p className="text-sm">Try adjusting your filters or refresh for new suggestions.</p>
          </div>
          {filterType !== 'all' && (
            <Button variant="outline" onClick={() => setFilterType('all')} className="mr-2">
              Show All Recommendations
            </Button>
          )}
          {onRefresh && (
            <Button onClick={onRefresh}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Get New Recommendations
            </Button>
          )}
        </div>
      )}

      {/* Feedback Summary */}
      {Object.keys(feedbackGiven).length > 0 && (
        <div className="mt-8 rounded-lg border border-blue-200 bg-blue-50 p-4">
          <h3 className="mb-2 font-medium text-blue-900">Your Feedback Helps Us Learn</h3>
          <div className="flex items-center gap-4 text-sm text-blue-700">
            <span>👍 {Object.values(feedbackGiven).filter(f => f === 'like').length} liked</span>
            <span>
              👎 {Object.values(feedbackGiven).filter(f => f === 'dislike').length} disliked
            </span>
            <span className="text-blue-600">
              We&apos;re using this to improve your future recommendations!
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
