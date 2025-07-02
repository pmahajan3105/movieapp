'use client'

import React, { useState } from 'react'
import Image from 'next/image'
import {
  Star,
  Clock,
  Calendar,
  Play,
  Bookmark,
  BookmarkCheck,
  ChevronDown,
  ChevronUp,
  Target,
  Sparkles,
  ThumbsUp,
  ThumbsDown,
  Award,
  Brain,
  Heart,
  Zap,
  Users,
  TrendingUp,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import type { EnhancedRecommendation } from '@/types'

interface RecommendationCardProps {
  recommendation: EnhancedRecommendation
  onMovieClick: (movie: EnhancedRecommendation['movie']) => void
  onAddToWatchlist: (movieId: string) => void
  onFeedback?: (movieId: string, feedback: 'like' | 'dislike', reason?: string) => void
  isInWatchlist: boolean
  showExplanation?: boolean
  showFeedbackButtons?: boolean
  className?: string
}

export function RecommendationCard({
  recommendation,
  onMovieClick,
  onAddToWatchlist,
  onFeedback,
  isInWatchlist,
  showExplanation = true,
  showFeedbackButtons = true,
  className = '',
}: RecommendationCardProps) {
  const [showDetailedExplanation, setShowDetailedExplanation] = useState(false)
  const [feedbackGiven, setFeedbackGiven] = useState<'like' | 'dislike' | null>(null)
  const { movie, reason, confidence, explanation } = recommendation

  const getConfidenceColor = (conf: number) => {
    if (conf >= 0.9) return 'text-emerald-700 bg-emerald-100 border-emerald-200'
    if (conf >= 0.8) return 'text-green-700 bg-green-100 border-green-200'
    if (conf >= 0.7) return 'text-blue-700 bg-blue-100 border-blue-200'
    if (conf >= 0.6) return 'text-yellow-700 bg-yellow-100 border-yellow-200'
    return 'text-orange-700 bg-orange-100 border-orange-200'
  }

  const getConfidenceText = (conf: number) => {
    if (conf >= 0.95) return 'Perfect Match'
    if (conf >= 0.9) return 'Excellent Match'
    if (conf >= 0.8) return 'Great Match'
    if (conf >= 0.7) return 'Good Match'
    if (conf >= 0.6) return 'Decent Match'
    return 'Possible Match'
  }

  const handleFeedback = async (feedback: 'like' | 'dislike') => {
    if (feedbackGiven || !onFeedback) return

    setFeedbackGiven(feedback)

    // Call the feedback handler
    onFeedback(movie.id, feedback, reason)

    // Save interaction via API
    try {
      await fetch('/api/user/interactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          movieId: movie.id,
          interactionType: feedback === 'like' ? 'like' : 'dislike',
          context: {
            source: 'recommendation-feedback',
            reason,
            confidence,
            timestamp: new Date().toISOString(),
          },
        }),
      })
    } catch (error) {
      console.warn('Failed to save feedback interaction:', error)
    }
  }

  const getReasonIcon = (reasonText: string) => {
    const lowerReason = reasonText.toLowerCase()
    if (
      lowerReason.includes('semantic') ||
      lowerReason.includes('ai') ||
      lowerReason.includes('similar')
    ) {
      return <Brain className="h-4 w-4 text-purple-600" />
    }
    if (lowerReason.includes('genre') || lowerReason.includes('category')) {
      return <Heart className="h-4 w-4 text-pink-600" />
    }
    if (lowerReason.includes('mood') || lowerReason.includes('feeling')) {
      return <Zap className="h-4 w-4 text-yellow-600" />
    }
    if (lowerReason.includes('popular') || lowerReason.includes('trending')) {
      return <TrendingUp className="h-4 w-4 text-green-600" />
    }
    if (lowerReason.includes('user') || lowerReason.includes('people')) {
      return <Users className="h-4 w-4 text-blue-600" />
    }
    return <Sparkles className="h-4 w-4 text-indigo-600" />
  }

  return (
    <Card
      className={`group overflow-hidden border border-gray-200 transition-all hover:shadow-lg rounded-xl ${className}`}
    >
      <div className="relative">
        {/* Position Badge */}
        <div className="absolute top-2 left-2 z-10">
          <div className="badge badge-primary text-primary-content text-xs font-bold">
            #{recommendation.position}
          </div>
        </div>

        {/* Confidence Badge */}
        <div className="absolute top-2 right-2 z-10">
          <div className={`badge border text-xs font-medium ${getConfidenceColor(confidence)}`}>
            <Target className="mr-1 h-3 w-3" />
            {Math.round(confidence * 100)}%
          </div>
        </div>

        {/* Movie Poster */}
        <div className="aspect-[2/3] w-full overflow-hidden rounded-t-xl">
          {movie.poster_url ? (
            <Image
              src={movie.poster_url}
              alt={movie.title}
              fill
              className="cursor-pointer object-cover transition-transform group-hover:scale-105 rounded-t-xl"
              onClick={() => onMovieClick(movie)}
              sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
              loading="lazy"
            />
          ) : (
            <div
              className="flex h-full w-full cursor-pointer items-center justify-center bg-gray-200 transition-colors group-hover:bg-gray-300 rounded-t-xl"
              onClick={() => onMovieClick(movie)}
            >
              <Play className="h-12 w-12 text-gray-400" />
            </div>
          )}
        </div>

        {/* Movie Rating */}
        {movie.rating && (
          <div className="absolute right-2 bottom-2 rounded bg-black/70 px-2 py-1 text-xs text-white backdrop-blur-sm">
            <Star className="mr-1 inline h-3 w-3 fill-yellow-400 text-yellow-400" />
            {movie.rating.toFixed(1)}
          </div>
        )}
      </div>

      <CardContent className="p-4">
        {/* Movie Title & Year */}
        <h3
          className="hover:text-primary mb-2 line-clamp-2 cursor-pointer text-lg font-semibold transition-colors"
          onClick={() => onMovieClick(movie)}
        >
          {movie.title}
        </h3>

        {/* Movie Meta Info */}
        <div className="mb-3 flex items-center justify-between text-sm text-gray-600">
          <div className="flex items-center gap-3">
            {movie.year && (
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {movie.year}
              </div>
            )}
            {movie.runtime && (
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {movie.runtime}m
              </div>
            )}
          </div>
          <div className={`rounded border px-2 py-1 text-xs ${getConfidenceColor(confidence)}`}>
            {getConfidenceText(confidence)}
          </div>
        </div>

        {/* Genres */}
        {movie.genre && movie.genre.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-1">
            {movie.genre.slice(0, 3).map(g => (
              <Badge key={g} variant="outline" className="bg-gray-50 text-xs">
                {g}
              </Badge>
            ))}
            {movie.genre.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{movie.genre.length - 3}
              </Badge>
            )}
          </div>
        )}

        {/* Primary Recommendation Reason */}
        {showExplanation && (
          <div className="mb-4 rounded-lg border border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-3">
            <div className="flex items-start gap-2">
              {getReasonIcon(reason)}
              <div className="flex-1">
                <p className="mb-1 text-sm font-medium text-blue-800">Why we recommend this:</p>
                <p className="text-sm text-blue-700">{reason}</p>

                {/* Confidence Explanation */}
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <Target className="h-3 w-3 text-blue-600" />
                    <span className="text-xs font-medium text-blue-600">
                      {Math.round(confidence * 100)}% confidence
                    </span>
                  </div>
                  {confidence >= 0.8 && (
                    <Badge className="border-green-200 bg-green-100 text-xs text-green-800">
                      <Award className="mr-1 h-2 w-2" />
                      High Quality
                    </Badge>
                  )}
                </div>
              </div>

              {/* Toggle Detailed Explanation */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDetailedExplanation(!showDetailedExplanation)}
                className="h-auto p-1"
              >
                {showDetailedExplanation ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Detailed Explanation */}
        {showExplanation && showDetailedExplanation && explanation && (
          <div className="mb-4 space-y-3">
            {/* Preference Matches */}
            {explanation.preferenceMatches && (
              <div className="rounded-lg border border-green-200 bg-green-50 p-3">
                <h4 className="mb-2 flex items-center gap-1 text-sm font-medium text-green-800">
                  <Heart className="h-3 w-3" />
                  Matches Your Preferences
                </h4>
                <div className="flex flex-wrap gap-1">
                  {explanation.preferenceMatches.genres?.map(genre => (
                    <Badge
                      key={genre}
                      className="border-green-300 bg-green-100 text-xs text-green-800"
                    >
                      <ThumbsUp className="mr-1 h-2 w-2" />
                      {genre}
                    </Badge>
                  ))}
                  {explanation.preferenceMatches.directors?.map(director => (
                    <Badge
                      key={director}
                      className="border-purple-300 bg-purple-100 text-xs text-purple-800"
                    >
                      🎬 {director}
                    </Badge>
                  ))}
                  {explanation.preferenceMatches.themes?.map(theme => (
                    <Badge
                      key={theme}
                      className="border-orange-300 bg-orange-100 text-xs text-orange-800"
                    >
                      ✨ {theme}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Quality Signals */}
            {explanation.qualitySignals && (
              <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3">
                <h4 className="mb-2 flex items-center gap-1 text-sm font-medium text-yellow-800">
                  <Award className="h-3 w-3" />
                  Quality Indicators
                </h4>
                <div className="flex items-center gap-2 text-xs text-yellow-700">
                  {explanation.qualitySignals.rating && (
                    <div className="flex items-center gap-1">
                      <Star className="h-3 w-3 text-yellow-500" />
                      <span>Highly Rated ({movie.rating?.toFixed(1)})</span>
                    </div>
                  )}
                  {explanation.qualitySignals.awards &&
                    explanation.qualitySignals.awards.length > 0 && (
                      <div className="flex items-center gap-1">
                        <Award className="h-3 w-3 text-yellow-500" />
                        <span>Award Winner</span>
                      </div>
                    )}
                </div>
              </div>
            )}

            {/* AI Semantic Match */}
            {confidence > 0.8 && (
              <div className="rounded-lg border border-purple-200 bg-purple-50 p-3">
                <h4 className="mb-2 flex items-center gap-1 text-sm font-medium text-purple-800">
                  <Brain className="h-3 w-3" />
                  AI Semantic Match
                </h4>
                <p className="text-xs text-purple-700">
                  Our AI found strong thematic similarities with your preferences (
                  {Math.round(confidence * 100)}% confidence)
                </p>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between gap-2">
          {/* Watchlist Button */}
          <Button
            variant={isInWatchlist ? 'default' : 'outline'}
            size="sm"
            onClick={() => onAddToWatchlist(movie.id)}
            className="flex-1"
          >
            {isInWatchlist ? (
              <>
                <BookmarkCheck className="mr-1 h-4 w-4" />
                In Watchlist
              </>
            ) : (
              <>
                <Bookmark className="mr-1 h-4 w-4" />
                Add to Watchlist
              </>
            )}
          </Button>

          {/* Feedback Buttons */}
          {showFeedbackButtons && onFeedback && (
            <div className="flex gap-1">
              <Button
                variant={feedbackGiven === 'like' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleFeedback('like')}
                disabled={feedbackGiven !== null}
                className={`p-2 ${feedbackGiven === 'like' ? 'bg-green-600 hover:bg-green-700' : ''}`}
                title="More like this"
              >
                <ThumbsUp className="h-4 w-4" />
              </Button>
              <Button
                variant={feedbackGiven === 'dislike' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleFeedback('dislike')}
                disabled={feedbackGiven !== null}
                className={`p-2 ${feedbackGiven === 'dislike' ? 'bg-red-600 hover:bg-red-700' : ''}`}
                title="Less like this"
              >
                <ThumbsDown className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Feedback Confirmation */}
        {feedbackGiven && (
          <div
            className={`mt-2 rounded p-2 text-center text-xs ${
              feedbackGiven === 'like' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}
          >
            {feedbackGiven === 'like'
              ? "👍 Thanks! We'll show you more movies like this."
              : "👎 Got it! We'll adjust your recommendations."}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
