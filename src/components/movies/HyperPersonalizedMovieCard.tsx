'use client'

import React, { useState } from 'react'
import Image from 'next/image'
import { Star, Clock, Zap, Brain } from 'lucide-react'
import type { HyperPersonalizedRecommendation } from '@/lib/ai/hyper-personalized-engine'
import { useLearningSignals } from '@/contexts/HyperPersonalizedContext'

interface HyperPersonalizedMovieCardProps {
  recommendation: HyperPersonalizedRecommendation
  onView?: () => void
  onSave?: () => void
  onRate?: (rating: number) => void
  context?: {
    page_type: string
    recommendation_type?: string
    position_in_list?: number
    session_id?: string
  }
  showPersonalizationDetails?: boolean
}

export const HyperPersonalizedMovieCard: React.FC<HyperPersonalizedMovieCardProps> = ({
  recommendation,
  onView,
  onSave,
  onRate,
  context = { page_type: 'unknown' },
  showPersonalizationDetails = false
}) => {
  const { movie, confidence_score, personalization_factors, explanation, reasoning } = recommendation
  const { recordLearningSignal } = useLearningSignals()
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [isRating, setIsRating] = useState(false)

  const handleView = async (e?: React.MouseEvent) => {
    e?.preventDefault()
    await recordLearningSignal(movie.id, 'view', undefined, context)
    if (onView) {
      onView()
    } else {
      // Default action: navigate to movie details
      window.location.href = `/dashboard/movie/${movie.id}`
    }
  }

  const handleRate = async (rating: number) => {
    setIsRating(true)
    await recordLearningSignal(movie.id, 'rate', rating, context)
    onRate?.(rating)
    setIsRating(false)
  }

  const handleSkip = async () => {
    await recordLearningSignal(movie.id, 'skip', undefined, context)
  }


  const getConfidenceBadge = (score: number) => {
    if (score >= 80) return 'badge-success'
    if (score >= 60) return 'badge-warning'
    return 'badge-error'
  }

  return (
    <div className="card bg-base-100 shadow-lg hover:shadow-xl transition-all duration-300 group">
      {/* Movie Poster */}
      <figure className="relative overflow-hidden cursor-pointer" onClick={handleView}>
        {movie.poster_url ? (
          <Image
            src={movie.poster_url}
            alt={movie.title}
            width={300}
            height={450}
            className="w-full h-64 object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-64 bg-base-200 flex items-center justify-center">
            <span className="text-base-content/50">No Image</span>
          </div>
        )}

        {/* Confidence Badge */}
        <div className="absolute top-2 right-2">
          <div className={`badge ${getConfidenceBadge(confidence_score)} badge-sm gap-1`}>
            <Brain className="w-3 h-3" />
            {confidence_score}%
          </div>
        </div>

      </figure>

      {/* Card Body */}
      <div className="card-body p-4">
        {/* Title & Year */}
        <h3 className="card-title text-base font-semibold line-clamp-2">
          {movie.title}
          {movie.year && (
            <span className="text-sm text-base-content/70">({movie.year})</span>
          )}
        </h3>

        {/* Rating & Runtime */}
        <div className="flex items-center gap-3 text-sm text-base-content/70">
          {movie.rating && (
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 fill-warning text-warning" />
              <span>{movie.rating.toFixed(1)}</span>
            </div>
          )}
          {movie.runtime && (
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              <span>{movie.runtime}m</span>
            </div>
          )}
        </div>

        {/* Genres */}
        {movie.genre && movie.genre.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {movie.genre.slice(0, 3).map((genre) => (
              <span key={genre} className="badge badge-outline badge-xs">
                {genre}
              </span>
            ))}
            {movie.genre.length > 3 && (
              <span className="badge badge-outline badge-xs">+{movie.genre.length - 3}</span>
            )}
          </div>
        )}

        {/* AI Explanation with confidence-based styling */}
        <div className={`rounded-lg p-3 mt-2 ${
          confidence_score >= 80 
            ? 'bg-success/10 border border-success/20' 
            : confidence_score >= 60 
            ? 'bg-primary/10 border border-primary/20'
            : 'bg-warning/10 border border-warning/20'
        }`}>
          <div className="flex items-start gap-2">
            <Zap className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
              confidence_score >= 80 
                ? 'text-success' 
                : confidence_score >= 60 
                ? 'text-primary'
                : 'text-warning'
            }`} />
            <div>
              <p className={`text-sm font-medium ${
                confidence_score >= 80 
                  ? 'text-success' 
                  : confidence_score >= 60 
                  ? 'text-primary'
                  : 'text-warning'
              }`}>
                {confidence_score >= 80 
                  ? 'Highly recommended for you!' 
                  : confidence_score >= 60 
                  ? 'Why this recommendation?'
                  : 'Worth exploring'}
              </p>
              <p className="text-xs text-base-content/80 mt-1">{explanation}</p>
              {reasoning.length > 0 && (
                <p className="text-xs text-base-content/60 mt-1 italic">
                  +{reasoning.length} personalization factor{reasoning.length !== 1 ? 's' : ''}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Personalization Details (Expandable) */}
        {showPersonalizationDetails && (
          <div className="mt-2">
            <button
              onClick={() => setIsDetailsOpen(!isDetailsOpen)}
              className="btn btn-ghost btn-xs w-full"
            >
              {isDetailsOpen ? 'Hide Details' : 'Show AI Analysis'}
            </button>

            {isDetailsOpen && (
              <div className="mt-2 p-3 bg-base-200 rounded-lg text-xs space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="font-medium">Genre Affinity:</span>
                    <div className="progress progress-xs progress-primary">
                      <div 
                        className="progress-bar" 
                        style={{ width: `${personalization_factors.genre_affinity_score * 100}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <span className="font-medium">Quality Match:</span>
                    <div className="progress progress-xs progress-success">
                      <div 
                        className="progress-bar" 
                        style={{ width: `${personalization_factors.quality_prediction * 100}%` }}
                      />
                    </div>
                  </div>
                </div>

                {reasoning.length > 0 && (
                  <div>
                    <span className="font-medium">Reasoning:</span>
                    <ul className="list-disc list-inside text-xs text-base-content/70 mt-1">
                      {reasoning.map((reason, index) => (
                        <li key={index}>{reason}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="card-actions justify-between mt-4">
          {/* Rating */}
          <div className="rating rating-sm">
            {[1, 2, 3, 4, 5].map((star) => (
              <input
                key={star}
                type="radio"
                name={`rating-${movie.id}`}
                className="mask mask-star-2 bg-warning"
                onClick={() => handleRate(star)}
                disabled={isRating}
              />
            ))}
          </div>

          {/* Skip Button */}
          <button
            onClick={handleSkip}
            className="btn btn-ghost btn-xs text-base-content/50"
          >
            Skip
          </button>
        </div>
      </div>
    </div>
  )
}

// Grid layout for multiple hyper-personalized cards
interface HyperPersonalizedMovieGridProps {
  recommendations: HyperPersonalizedRecommendation[]
  context?: {
    page_type: string
    recommendation_type?: string
    session_id?: string
  }
  showPersonalizationDetails?: boolean
  onMovieView?: (movieId: string, movieData?: any) => void
  onMovieSave?: (movieId: string) => void
  onMovieRate?: (movieId: string, rating: number) => void
}

export const HyperPersonalizedMovieGrid: React.FC<HyperPersonalizedMovieGridProps> = ({
  recommendations,
  context = { page_type: 'dashboard' },
  showPersonalizationDetails = false,
  onMovieView,
  onMovieSave,
  onMovieRate
}) => {
  if (!recommendations || recommendations.length === 0) {
    return (
      <div className="text-center py-8">
        <Brain className="w-12 h-12 text-base-content/30 mx-auto mb-4" />
        <p className="text-base-content/70">No personalized recommendations available</p>
        <p className="text-sm text-base-content/50 mt-2">
          Rate some movies to get started with AI recommendations!
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {recommendations.map((recommendation, index) => (
        <HyperPersonalizedMovieCard
          key={recommendation.movie.id}
          recommendation={recommendation}
          context={{
            ...context,
            position_in_list: index + 1
          }}
          showPersonalizationDetails={showPersonalizationDetails}
          onView={() => onMovieView?.(String(recommendation.movie.id), recommendation.movie)}
          onSave={() => onMovieSave?.(String(recommendation.movie.id))}
          onRate={(rating) => onMovieRate?.(String(recommendation.movie.id), rating)}
        />
      ))}
    </div>
  )
} 