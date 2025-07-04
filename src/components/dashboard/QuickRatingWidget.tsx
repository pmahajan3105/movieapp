'use client'

import React, { useState, useEffect } from 'react'
import { Star, Heart, ThumbsUp, ThumbsDown, Meh, RefreshCw, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { logger } from '@/lib/logger'

interface Movie {
  id: string
  title: string
  year: number
  genre: string[]
  director: string[]
  poster_url?: string
  rating: number
  plot: string
}

interface QuickRatingWidgetProps {
  onRatingComplete?: (movieId: string, rating: number) => void
  onSkip?: () => void
  className?: string
  title?: string
  description?: string
  moviesSource?: 'popular' | 'trending' | 'mixed'
  maxMovies?: number
}

export const QuickRatingWidget: React.FC<QuickRatingWidgetProps> = ({
  onRatingComplete,
  onSkip,
  className = '',
  title = "Rate Movies You Know",
  description = "Help AI learn your taste by rating movies you've seen",
  moviesSource = 'popular',
  maxMovies = 10
}) => {
  const { user } = useAuth()
  const [movies, setMovies] = useState<Movie[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [ratingsGiven, setRatingsGiven] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const currentMovie = movies[currentIndex]
  
  // Quick rating options
  const ratingOptions = [
    { value: 1, icon: ThumbsDown, label: "Not for me", color: "text-error" },
    { value: 2, icon: Meh, label: "It's okay", color: "text-warning" },
    { value: 3, icon: ThumbsUp, label: "Pretty good", color: "text-info" },
    { value: 4, icon: Heart, label: "Love it", color: "text-success" }
  ]
  
  // Load movies for rating
  useEffect(() => {
    if (user) {
      loadMoviesForRating()
    }
  }, [user, moviesSource])
  
  const loadMoviesForRating = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const response = await fetch(`/api/movies/popular?limit=${maxMovies}&forRating=true`)
      
      if (!response.ok) {
        throw new Error('Failed to load movies')
      }
      
      const data = await response.json()
      setMovies(data.movies || [])
      setCurrentIndex(0)
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load movies'
      setError(errorMessage)
      logger.error('Failed to load movies for rating', { error: errorMessage })
    } finally {
      setIsLoading(false)
    }
  }
  
  const handleRating = async (rating: number) => {
    if (!currentMovie || !user || isSubmitting) return
    
    setIsSubmitting(true)
    
    try {
      const response = await fetch('/api/user/interactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          movieId: currentMovie.id,
          rating: rating,
          interactionType: 'rating',
          source: 'quick_rating_widget'
        })
      })
      
      if (!response.ok) {
        throw new Error('Failed to save rating')
      }
      
      setRatingsGiven(prev => prev + 1)
      onRatingComplete?.(currentMovie.id, rating)
      
      // Move to next movie
      if (currentIndex < movies.length - 1) {
        setCurrentIndex(prev => prev + 1)
      } else {
        // All movies rated, could show completion message or reload
        setCurrentIndex(0)
        loadMoviesForRating()
      }
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save rating'
      logger.error('Failed to save movie rating', { error: errorMessage, movieId: currentMovie.id })
      // Show error toast or notification
    } finally {
      setIsSubmitting(false)
    }
  }
  
  const handleSkip = () => {
    if (currentIndex < movies.length - 1) {
      setCurrentIndex(prev => prev + 1)
    } else {
      onSkip?.()
    }
  }
  
  const goToNext = () => {
    if (currentIndex < movies.length - 1) {
      setCurrentIndex(prev => prev + 1)
    }
  }
  
  const goToPrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1)
    }
  }
  
  if (!user) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <p className="text-base-content/60">Please log in to rate movies</p>
      </div>
    )
  }
  
  if (isLoading) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="text-center">
          <h3 className="text-lg font-semibold mb-2">{title}</h3>
          <p className="text-base-content/60 text-sm mb-4">{description}</p>
        </div>
        <div className="card bg-base-200 animate-pulse">
          <div className="card-body">
            <div className="flex items-center justify-center h-64">
              <span className="loading loading-spinner loading-lg"></span>
            </div>
          </div>
        </div>
      </div>
    )
  }
  
  if (error) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="text-center">
          <h3 className="text-lg font-semibold mb-2">{title}</h3>
          <p className="text-base-content/60 text-sm mb-4">{description}</p>
        </div>
        <div className="alert alert-error">
          <span>{error}</span>
          <button onClick={loadMoviesForRating} className="btn btn-sm btn-outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </button>
        </div>
      </div>
    )
  }
  
  if (!movies.length) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <p className="text-base-content/60">No movies available for rating</p>
      </div>
    )
  }
  
  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2 flex items-center justify-center gap-2">
          <Star className="w-5 h-5 text-primary" />
          {title}
        </h3>
        <p className="text-base-content/60 text-sm mb-2">{description}</p>
        
        {/* Progress */}
        <div className="flex items-center justify-center gap-2 text-sm">
          <span className="text-base-content/60">
            {currentIndex + 1} of {movies.length}
          </span>
          {ratingsGiven > 0 && (
            <div className="badge badge-primary badge-sm">
              {ratingsGiven} rated
            </div>
          )}
        </div>
      </div>
      
      {/* Movie Card */}
      <div className="card bg-base-100 border border-base-300">
        <div className="card-body p-4">
          <div className="flex items-start gap-4">
            {/* Movie Poster */}
            <div className="flex-shrink-0">
              {currentMovie.poster_url ? (
                <img
                  src={currentMovie.poster_url}
                  alt={currentMovie.title}
                  className="w-16 h-24 object-cover rounded"
                />
              ) : (
                <div className="w-16 h-24 bg-base-300 rounded flex items-center justify-center">
                  <Star className="w-6 h-6 text-base-content/30" />
                </div>
              )}
            </div>
            
            {/* Movie Info */}
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-lg leading-tight mb-1">
                {currentMovie.title} ({currentMovie.year})
              </h4>
              <div className="flex flex-wrap gap-1 mb-2">
                {currentMovie.genre.slice(0, 2).map((genre, index) => (
                  <span key={index} className="badge badge-outline badge-sm">
                    {genre}
                  </span>
                ))}
              </div>
              <p className="text-sm text-base-content/70 line-clamp-2">
                {currentMovie.plot}
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Rating Options */}
      <div className="grid grid-cols-2 gap-2">
        {ratingOptions.map((option) => (
          <button
            key={option.value}
            onClick={() => handleRating(option.value)}
            disabled={isSubmitting}
            className={`btn btn-outline hover:btn-primary gap-2 ${isSubmitting ? 'btn-disabled' : ''}`}
          >
            <option.icon className={`w-4 h-4 ${option.color}`} />
            <span className="text-sm">{option.label}</span>
          </button>
        ))}
      </div>
      
      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={goToPrevious}
          disabled={currentIndex === 0}
          className="btn btn-sm btn-ghost gap-1"
        >
          <ChevronLeft className="w-4 h-4" />
          Previous
        </button>
        
        <button
          onClick={handleSkip}
          className="btn btn-sm btn-ghost"
        >
          Skip
        </button>
        
        <button
          onClick={goToNext}
          disabled={currentIndex === movies.length - 1}
          className="btn btn-sm btn-ghost gap-1"
        >
          Next
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
      
      {/* Completion Message */}
      {ratingsGiven >= 3 && (
        <div className="alert alert-success">
          <Sparkles className="w-5 h-5" />
          <div>
            <h4 className="font-semibold">Great job!</h4>
            <p className="text-sm">You've rated {ratingsGiven} movies. The AI is learning your preferences!</p>
          </div>
        </div>
      )}
    </div>
  )
}