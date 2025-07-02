'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import type { Movie } from '@/types';

interface RecommendationExplanation {
  confidence: number; // 0-100
  reasons: {
    type: 'genre' | 'director' | 'actor' | 'mood' | 'temporal' | 'similar_users';
    text: string;
    weight: number;
  }[];
  supportingMovies?: {
    title: string;
    similarity: number;
  }[];
}

interface EnhancedRecommendationCardProps {
  movie: Movie;
  explanation: RecommendationExplanation;
  onMovieClick: (movieId: string) => void;
  onExplanationView?: (movieId: string, explanation: RecommendationExplanation) => void;
  showFullExplanation?: boolean;
  compact?: boolean;
}

export const EnhancedRecommendationCard = ({
  movie,
  explanation,
  onMovieClick,
  onExplanationView,
  showFullExplanation = false,
  compact = false
}: EnhancedRecommendationCardProps) => {
  const { confidence, reasons } = explanation;
  
  const confidenceColor = getConfidenceColor(confidence);
  const topReasons = reasons.slice(0, compact ? 2 : 3);

  const handleCardClick = () => {
    onMovieClick(movie.id.toString());
  };

  const handleExplanationClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onExplanationView?.(movie.id.toString(), explanation);
  };

  return (
    <div className="card card-compact bg-base-100 shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer group">
      {/* Movie Poster */}
      <figure className="relative overflow-hidden">
        <img
          src={movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : '/placeholder-movie.jpg'}
          alt={movie.title}
          className="w-full h-48 sm:h-56 object-cover group-hover:scale-105 transition-transform duration-300"
          onClick={handleCardClick}
        />
        
        {/* Confidence Badge */}
        <div className={`absolute top-2 right-2 badge ${confidenceColor} badge-sm font-bold`}>
          {confidence}%
        </div>

        {/* Quick Reasons Overlay */}
        {!compact && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <div className="text-white text-xs space-y-1">
              {topReasons.map((reason, index) => (
                <div key={index} className="flex items-center gap-1">
                  <span className="text-yellow-400">{getReasonIcon(reason.type)}</span>
                  <span className="truncate">{reason.text}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </figure>

      {/* Card Content */}
      <div className="card-body p-3">
        <h3 
          className="card-title text-sm font-semibold line-clamp-2 cursor-pointer"
          onClick={handleCardClick}
        >
          {movie.title}
        </h3>

        {/* Quick Stats */}
        <div className="flex items-center justify-between text-xs text-base-content/70 mb-2">
          <span>{movie.release_date ? new Date(movie.release_date).getFullYear() : 'N/A'}</span>
          <div className="flex items-center gap-1">
            <span>⭐</span>
            <span>{typeof movie.vote_average === 'number' ? movie.vote_average.toFixed(1) : 'N/A'}</span>
          </div>
        </div>

        {/* Recommendation Reasons */}
        <div className="space-y-2">
          {compact ? (
            <div className="text-xs">
              <strong className="text-primary">Why: </strong>
              <span>{topReasons[0]?.text || 'Great match!'}</span>
            </div>
          ) : (
            <>
              <div className="text-xs font-medium text-base-content/80">
                Why you&apos;ll love this:
              </div>
              <div className="flex flex-wrap gap-1">
                {topReasons.map((reason, index) => (
                  <Badge 
                    key={index} 
                    variant="secondary" 
                    className="text-xs px-2 py-1"
                  >
                    {getReasonIcon(reason.type)} {reason.type}
                  </Badge>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Full Explanation Toggle */}
        {!compact && onExplanationView && (
          <div className="card-actions justify-end mt-2">
            <button
              onClick={handleExplanationClick}
              className="btn btn-ghost btn-xs"
            >
              Why this? <span className="ml-1">🔍</span>
            </button>
          </div>
        )}

        {/* Full Explanation Content */}
        {showFullExplanation && (
          <div className="mt-3 p-3 bg-base-200 rounded-lg">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-sm">Recommendation Analysis</h4>
                <div className={`badge ${confidenceColor} font-bold`}>
                  {confidence}% Match
                </div>
              </div>

              {/* Detailed Reasons */}
              <div className="space-y-2">
                {reasons.map((reason, index) => (
                  <div key={index} className="flex items-start gap-2 text-xs">
                    <span className="text-primary">{getReasonIcon(reason.type)}</span>
                    <div className="flex-1">
                      <div className="font-medium capitalize">{reason.type.replace('_', ' ')}</div>
                      <div className="text-base-content/70">{reason.text}</div>
                    </div>
                    <div className="text-xs font-mono text-base-content/50">
                      {(reason.weight * 100).toFixed(0)}%
                    </div>
                  </div>
                ))}
              </div>

              {/* Supporting Movies */}
              {explanation.supportingMovies && explanation.supportingMovies.length > 0 && (
                <div className="border-t border-base-300 pt-2">
                  <div className="text-xs font-medium mb-1">Based on movies you liked:</div>
                  <div className="space-y-1">
                    {explanation.supportingMovies.slice(0, 3).map((supportMovie, index) => (
                      <div key={index} className="flex justify-between text-xs">
                        <span className="truncate">{supportMovie.title}</span>
                        <span className="text-primary font-mono">
                          {(supportMovie.similarity * 100).toFixed(0)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Helper functions
const getConfidenceColor = (confidence: number): string => {
  if (confidence >= 85) return 'badge-success';
  if (confidence >= 70) return 'badge-primary';
  if (confidence >= 55) return 'badge-warning';
  return 'badge-error';
};

const getReasonIcon = (type: string): string => {
  const iconMap: Record<string, string> = {
    genre: '🎭',
    director: '🎬',
    actor: '⭐',
    mood: '😊',
    temporal: '⏰',
    similar_users: '👥'
  };
  return iconMap[type] || '💡';
};

// Export types for use in other components
export type { RecommendationExplanation, EnhancedRecommendationCardProps }; 