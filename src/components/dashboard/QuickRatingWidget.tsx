'use client'

import React, { useState, useEffect } from 'react'
import { Star, Heart, ThumbsUp, ThumbsDown, Meh, RefreshCw, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useMovieActions } from '@/hooks/useMovieActions'
import { MovieDetailsModal } from '@/components/movies/MovieDetailsModal'
import toast from 'react-hot-toast'

interface Movie {
  id: string
  title: string
  year: number
  genre: string[]
  director: string[]
  poster_url?: string
  rating: number
  plot: string
  tmdb_id?: number
  imdb_id?: string
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
  const [ratedMovieIds, setRatedMovieIds] = useState<Set<string>>(new Set())
  const [userRatedMovies, setUserRatedMovies] = useState<Set<string>>(new Set())
  
  // Movie actions for modal functionality
  const movieActions = useMovieActions()
  
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
      loadUserRatings()
      loadMoviesForRating()
    }
  }, [user, moviesSource])

  // Load user's existing ratings
  const loadUserRatings = async () => {
    try {
      const response = await fetch('/api/ratings')
      if (response.ok) {
        const data = await response.json()
        const ratings = data.data?.ratings || []
        
        // Create a set of rated movie IDs
        const ratedIds = new Set<string>(ratings.map((rating: any) => String(rating.movie_id)))
        
        // Create title+year mappings from the included movie data
        const ratedMovieTitles = new Set<string>()
        
        ratings.forEach((rating: any) => {
          if (rating.movies && rating.movies.title && rating.movies.year) {
            const movieKey = `${rating.movies.title.toLowerCase().trim()}_${rating.movies.year}`
            ratedMovieTitles.add(movieKey)
          }
        })
        
        setUserRatedMovies(ratedMovieTitles)
        setRatedMovieIds(ratedIds)
        setRatingsGiven(ratedIds.size)
      }
    } catch (error) {
      // Failed to load user ratings
    }
  }
  
  // Find next unrated movie starting from given index
  const findNextUnratedMovie = (startIndex: number): number => {
    for (let i = startIndex; i < movies.length; i++) {
      const movie = movies[i]
      if (movie && !isMovieRated(movie)) {
        return i
      }
    }
    // If no unrated movie found after startIndex, check from beginning
    for (let i = 0; i < startIndex; i++) {
      const movie = movies[i]
      if (movie && !isMovieRated(movie)) {
        return i
      }
    }
    return -1 // All movies rated
  }

  // Check if a movie is already rated (by ID or by title+year for TMDB movies)
  const isMovieRated = (movie: Movie): boolean => {
    // Debug logging
    console.log('Checking movie:', {
      title: movie.title,
      year: movie.year,
      id: movie.id,
      ratedMovieIds: Array.from(ratedMovieIds),
      userRatedMovies: Array.from(userRatedMovies)
    })
    
    // Check by database ID first
    if (ratedMovieIds.has(movie.id)) {
      console.log('Movie rated by ID:', movie.id)
      return true
    }
    
    // Check by title and year for TMDB movies that may have been rated
    if (movie.title && movie.year) {
      const movieKey = `${movie.title.toLowerCase().trim()}_${movie.year}`
      console.log('Checking movie key:', movieKey)
      if (userRatedMovies.has(movieKey)) {
        console.log('Movie rated by title+year:', movieKey)
        return true
      }
    }
    
    console.log('Movie NOT rated')
    return false
  }

  const loadMoviesForRating = async (useTmdb = false) => {
    try {
      setIsLoading(true)
      setError(null)
      
      // If we need fresh movies or have exhausted local movies, fetch from TMDB top-rated
      const apiUrl = useTmdb 
        ? `/api/movies?realtime=true&top_rated=true&limit=${maxMovies}&page=1`
        : `/api/movies?limit=${maxMovies}&page=1`
      
      const response = await fetch(apiUrl)
      
      if (!response.ok) {
        throw new Error('Failed to load movies')
      }
      
      const data = await response.json()
      
      // Handle different response formats
      const moviesData = data.success ? data.data : (data.movies || data)
      const moviesList = Array.isArray(moviesData) ? moviesData : []
      
      if (useTmdb) {
        // When loading from TMDB, append to existing movies to avoid duplicates
        setMovies(prevMovies => {
          const existingIds = new Set(prevMovies.map(m => m.id))
          const newMovies = moviesList.filter(movie => !existingIds.has(movie.id))
          const updatedMovies = [...prevMovies, ...newMovies]
          
          // Find first unrated movie in the updated list
          const firstUnratedIndex = updatedMovies.findIndex(movie => !isMovieRated(movie))
          if (firstUnratedIndex >= 0) {
            setCurrentIndex(firstUnratedIndex)
          }
          
          return updatedMovies
        })
      } else {
        setMovies(moviesList)
        
        // Start with first unrated movie
        const firstUnratedIndex = moviesList.findIndex(movie => !isMovieRated(movie))
        setCurrentIndex(firstUnratedIndex >= 0 ? firstUnratedIndex : 0)
      }
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load movies'
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }
  
  const handleRating = async (rating: number) => {
    if (!currentMovie || !user || isSubmitting) return
    
    setIsSubmitting(true)
    
    try {
      const response = await fetch('/api/ratings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          movie_data: {
            title: currentMovie.title,
            year: currentMovie.year,
            genre: currentMovie.genre,
            director: currentMovie.director,
            plot: currentMovie.plot,
            poster_url: currentMovie.poster_url,
            rating: currentMovie.rating,
            tmdb_id: currentMovie.tmdb_id,
            imdb_id: currentMovie.imdb_id,
          },
          rating: rating,
          interested: rating >= 3 // 3+ stars means interested
        })
      })
      
      if (!response.ok) {
        const errorData = await response.text()
        throw new Error(errorData || 'Failed to save rating')
      }

      const ratingResult = await response.json()
      const actualMovieId = ratingResult.data?.movie_id || currentMovie.id
      
      // Success toast
      toast.success(`Rated "${currentMovie.title}" ${rating} star${rating !== 1 ? 's' : ''}!`, {
        duration: 2000,
      })
      
      setRatingsGiven(prev => prev + 1)
      
      // Track this movie as rated using both the original ID and the database ID
      setRatedMovieIds(prev => new Set([...prev, currentMovie.id, actualMovieId]))
      
      // Also track by title+year for future duplicate detection
      if (currentMovie.title && currentMovie.year) {
        const movieKey = `${currentMovie.title.toLowerCase().trim()}_${currentMovie.year}`
        setUserRatedMovies(prev => new Set([...prev, movieKey]))
      }
      
      // Call onRatingComplete callback
      onRatingComplete?.(actualMovieId, rating)
      
      // Find next unrated movie
      const nextUnratedIndex = findNextUnratedMovie(currentIndex + 1)
      if (nextUnratedIndex !== -1) {
        setCurrentIndex(nextUnratedIndex)
      } else {
        // All current movies rated, load fresh movies from TMDB
        await loadMoviesForRating(true)
      }
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save rating'
      
      // Show error toast
      toast.error(`Failed to rate movie: ${errorMessage}`, {
        duration: 4000,
      })
    } finally {
      setIsSubmitting(false)
    }
  }
  
  const handleSkip = () => {
    const nextUnratedIndex = findNextUnratedMovie(currentIndex + 1)
    if (nextUnratedIndex !== -1) {
      setCurrentIndex(nextUnratedIndex)
    } else {
      onSkip?.()
    }
  }
  
  const goToNext = () => {
    const nextUnratedIndex = findNextUnratedMovie(currentIndex + 1)
    if (nextUnratedIndex !== -1) {
      setCurrentIndex(nextUnratedIndex)
    }
  }
  
  const goToPrevious = () => {
    // Find previous unrated movie
    for (let i = currentIndex - 1; i >= 0; i--) {
      const movie = movies[i]
      if (movie && !ratedMovieIds.has(movie.id)) {
        setCurrentIndex(i)
        return
      }
    }
    // If no unrated movie found before current, wrap around to end
    for (let i = movies.length - 1; i > currentIndex; i--) {
      const movie = movies[i]
      if (movie && !ratedMovieIds.has(movie.id)) {
        setCurrentIndex(i)
        return
      }
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
          <button onClick={() => loadMoviesForRating()} className="btn btn-sm btn-outline">
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
            {movies.filter(m => !isMovieRated(m)).length} unrated movies
          </span>
          {ratingsGiven > 0 && (
            <div className="badge badge-primary badge-sm">
              {ratingsGiven} rated
            </div>
          )}
          {ratingsGiven > 0 && ratingsGiven < 3 && (
            <div className="badge badge-warning badge-sm">
              {3 - ratingsGiven} more for better AI
            </div>
          )}
        </div>
      </div>
      
      {/* Movie Card */}
      {currentMovie && (
        <div 
          className="card bg-base-100 border border-base-300 cursor-pointer hover:border-primary/50 hover:shadow-md transition-all duration-200"
          onClick={() => movieActions.handleMovieView(currentMovie.id, currentMovie)}
        >
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
                <h4 className="font-semibold text-lg leading-tight mb-1 hover:text-primary transition-colors">
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
                <p className="text-xs text-primary mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  Click to view details
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Rating Options */}
      <div className="grid grid-cols-2 gap-2">
        {ratingOptions.map((option) => (
          <button
            key={option.value}
            onClick={(e) => {
              e.stopPropagation() // Prevent movie card click
              handleRating(option.value)
            }}
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
          onClick={(e) => {
            e.stopPropagation()
            goToPrevious()
          }}
          disabled={currentIndex === 0}
          className="btn btn-sm btn-ghost gap-1"
        >
          <ChevronLeft className="w-4 h-4" />
          Previous
        </button>
        
        <button
          onClick={(e) => {
            e.stopPropagation()
            handleSkip()
          }}
          className="btn btn-sm btn-ghost"
        >
          Skip
        </button>
        
        <button
          onClick={(e) => {
            e.stopPropagation()
            goToNext()
          }}
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
          <div className="flex-1">
            <h4 className="font-semibold">Great job!</h4>
            <p className="text-sm">You&apos;ve rated {ratingsGiven} movies. The AI is learning your preferences!</p>
          </div>
          <button
            onClick={() => onSkip?.()}
            className="btn btn-sm btn-outline"
          >
            View My Profile
          </button>
        </div>
      )}

      {/* Movie Details Modal */}
      <MovieDetailsModal
        movie={movieActions.state.selectedMovie}
        open={movieActions.state.movieModalOpen}
        onClose={movieActions.handleModalClose}
        onAddToWatchlist={(movieId) => movieActions.handleMovieSave(movieId)}
        aiInsights={movieActions.state.selectedMovieInsights}
      />
    </div>
  )
}