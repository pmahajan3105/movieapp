'use client'

import React, { useState } from 'react'
import Image from 'next/image'
import { 
  Star, 
  Clock, 
  Calendar, 
  Play, 
  Plus, 
  Check, 
  ChevronDown, 
  ChevronUp, 
  Target,
  Sparkles,
  ThumbsUp,
  Award,
  Info
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import type { EnhancedRecommendation } from '@/types'

interface RecommendationCardProps {
  recommendation: EnhancedRecommendation
  onMovieClick: (movie: EnhancedRecommendation['movie']) => void
  onAddToWatchlist: (movieId: string) => void
  isInWatchlist: boolean
  showExplanation?: boolean
  className?: string
}

export function RecommendationCard({
  recommendation,
  onMovieClick,
  onAddToWatchlist,
  isInWatchlist,
  showExplanation = true,
  className = ''
}: RecommendationCardProps) {
  const [showDetailedExplanation, setShowDetailedExplanation] = useState(false)
  const { movie, reason, confidence, explanation } = recommendation

  const getConfidenceColor = (conf: number) => {
    if (conf >= 0.8) return 'text-green-600 bg-green-100'
    if (conf >= 0.6) return 'text-blue-600 bg-blue-100'
    return 'text-yellow-600 bg-yellow-100'
  }

  const getConfidenceText = (conf: number) => {
    if (conf >= 0.9) return 'Perfect Match'
    if (conf >= 0.8) return 'Excellent Match'
    if (conf >= 0.7) return 'Great Match'
    if (conf >= 0.6) return 'Good Match'
    return 'Possible Match'
  }

  return (
    <Card className={`group overflow-hidden transition-all hover:shadow-lg border border-gray-200 ${className}`}>
      <div className="relative">
        {/* Position Badge */}
        <div className="absolute left-2 top-2 z-10">
          <div className="badge badge-primary text-primary-content font-bold text-xs">
            #{recommendation.position}
          </div>
        </div>

        {/* Confidence Badge */}
        <div className="absolute right-2 top-2 z-10">
          <div className={`badge text-xs font-medium ${getConfidenceColor(confidence)}`}>
            <Target className="h-3 w-3 mr-1" />
            {Math.round(confidence * 100)}%
          </div>
        </div>

        {/* Movie Poster */}
        <div className="aspect-[2/3] w-full overflow-hidden">
          {movie.poster_url ? (
            <Image
              src={movie.poster_url}
              alt={movie.title}
              fill
              className="cursor-pointer object-cover transition-transform group-hover:scale-105"
              onClick={() => onMovieClick(movie)}
              sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
              loading="lazy"
            />
          ) : (
            <div
              className="flex h-full w-full cursor-pointer items-center justify-center bg-gray-200 transition-colors group-hover:bg-gray-300"
              onClick={() => onMovieClick(movie)}
            >
              <Play className="h-12 w-12 text-gray-400" />
            </div>
          )}
        </div>

        {/* Movie Rating */}
        {movie.rating && (
          <div className="absolute bottom-2 right-2 rounded bg-black/70 px-2 py-1 text-xs text-white backdrop-blur-sm">
            <Star className="h-3 w-3 inline mr-1 fill-yellow-400 text-yellow-400" />
            {movie.rating.toFixed(1)}
          </div>
        )}
      </div>

      <CardContent className="p-4">
        {/* Movie Title & Year */}
        <h3
          className="mb-2 line-clamp-2 cursor-pointer text-lg font-semibold transition-colors hover:text-primary"
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
          <div className={`text-xs px-2 py-1 rounded ${getConfidenceColor(confidence)}`}>
            {getConfidenceText(confidence)}
          </div>
        </div>

        {/* Genres */}
        {movie.genre && movie.genre.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-1">
            {movie.genre.slice(0, 3).map(g => (
              <Badge key={g} variant="outline" className="text-xs bg-gray-100">
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
          <div className="mb-4 rounded-lg bg-blue-50 p-3 border border-blue-200">
            <div className="flex items-start gap-2">
              <Sparkles className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm text-blue-800 font-medium mb-1">Why we recommend this:</p>
                <p className="text-sm text-blue-700">{reason}</p>
              </div>
            </div>
          </div>
        )}

        {/* Preference Matches */}
        {showExplanation && explanation?.preferenceMatches && (
          <div className="mb-3">
            <div className="flex flex-wrap gap-1">
              {explanation.preferenceMatches.genres?.map(genre => (
                <Badge key={genre} className="text-xs bg-green-100 text-green-800">
                  <ThumbsUp className="h-2 w-2 mr-1" />
                  {genre}
                </Badge>
              ))}
              {explanation.preferenceMatches.directors?.map(director => (
                <Badge key={director} className="text-xs bg-purple-100 text-purple-800">
                  🎬 {director}
                </Badge>
              ))}
              {explanation.preferenceMatches.themes?.map(theme => (
                <Badge key={theme} className="text-xs bg-orange-100 text-orange-800">
                  ✨ {theme}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Quality Signals */}
        {showExplanation && explanation?.qualitySignals && (
          <div className="mb-3 flex items-center gap-2 text-xs text-gray-600">
            {explanation.qualitySignals.rating && (
              <div className="flex items-center gap-1">
                <Award className="h-3 w-3 text-yellow-500" />
                <span>Highly Rated</span>
              </div>
            )}
            {explanation.qualitySignals.awards && explanation.qualitySignals.awards.length > 0 && (
              <div className="flex items-center gap-1">
                <Award className="h-3 w-3 text-amber-500" />
                <span>Award Winner</span>
              </div>
            )}
          </div>
        )}

        {/* Detailed Explanation Toggle */}
        {showExplanation && (explanation?.contextMatch || explanation?.considerations) && (
          <Button
            variant="ghost"
            size="sm"
            className="mb-3 w-full text-xs"
            onClick={() => setShowDetailedExplanation(!showDetailedExplanation)}
          >
            <Info className="h-3 w-3 mr-1" />
            {showDetailedExplanation ? 'Hide Details' : 'Show Why'} 
            {showDetailedExplanation ? (
              <ChevronUp className="h-3 w-3 ml-1" />
            ) : (
              <ChevronDown className="h-3 w-3 ml-1" />
            )}
          </Button>
        )}

        {/* Detailed Explanation */}
        {showExplanation && showDetailedExplanation && (
          <div className="mb-4 space-y-2 rounded-lg bg-gray-50 p-3 border border-gray-200">
            {explanation?.contextMatch && (
              <div>
                <h4 className="text-xs font-semibold text-gray-700 mb-1">Perfect For You:</h4>
                <ul className="text-xs text-gray-600 space-y-1">
                  {explanation.contextMatch.runtime && <li>• {explanation.contextMatch.runtime}</li>}
                  {explanation.contextMatch.year && <li>• {explanation.contextMatch.year}</li>}
                  {explanation.contextMatch.availability && <li>• {explanation.contextMatch.availability}</li>}
                  {explanation.contextMatch.mood && <li>• {explanation.contextMatch.mood}</li>}
                </ul>
              </div>
            )}

            {explanation?.similarToLiked && explanation.similarToLiked.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-gray-700 mb-1">Similar to movies you loved:</h4>
                <p className="text-xs text-gray-600">{explanation.similarToLiked.join(', ')}</p>
              </div>
            )}

            {explanation?.considerations && explanation.considerations.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-amber-700 mb-1">Keep in mind:</h4>
                <ul className="text-xs text-amber-600 space-y-1">
                  {explanation.considerations.map((consideration, index) => (
                    <li key={index}>⚠️ {consideration}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button
            size="sm"
            className="flex-1"
            onClick={() => onMovieClick(movie)}
          >
            <Play className="h-4 w-4 mr-1" />
            Details
          </Button>
          
          <Button
            size="sm"
            variant={isInWatchlist ? "secondary" : "outline"}
            onClick={() => onAddToWatchlist(movie.id)}
            disabled={isInWatchlist}
            className="flex-1"
          >
            {isInWatchlist ? (
              <>
                <Check className="h-4 w-4 mr-1" />
                Added
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-1" />
                Watchlist
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
} 