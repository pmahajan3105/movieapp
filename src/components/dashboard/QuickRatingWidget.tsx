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
  title = "Rate Top Movies",
  description = "Rate TMDB's top-rated movies to help AI learn your taste",
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
  const [sessionRatedMovies, setSessionRatedMovies] = useState<Set<string>>(new Set())
  const [tmdbPage, setTmdbPage] = useState(1) // Track TMDB pagination
  
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
  
  // Load movies immediately when user is available
  useEffect(() => {
    if (user) {
      const loadEverything = async () => {
        setTmdbPage(1)
        // Load movies first for immediate display
        await loadMoviesForRating()
        // Load user ratings in background for UI hints
        await loadUserRatings()
      }
      loadEverything()
    }
  }, [user, moviesSource])

  // Load user's existing ratings - with localStorage fallback
  const loadUserRatings = async () => {
    try {
      console.log('Loading user ratings...')
      
      // Try to load from localStorage first (immediate)
      const localRatings = localStorage.getItem(`rated_movies_${user?.id}`)
      if (localRatings) {
        try {
          const parsedRatings = JSON.parse(localRatings)
          const localKeys = new Set<string>(parsedRatings)
          setUserRatedMovies(localKeys)
          setSessionRatedMovies(localKeys)
          console.log('Loaded from localStorage:', Array.from(localKeys))
        } catch (e) {
          console.warn('Failed to parse localStorage ratings')
        }
      }
      
      // Then try to load from API (when it works)
      try {
        const response = await fetch('/api/ratings')
        if (response.ok) {
          const data = await response.json()
          const ratings = data.data?.ratings || []
          
          console.log('Loaded ratings from API:', ratings.length)
          
          // Type for API rating response
          interface RatingFromAPI {
            movie_id: string
            movie_data?: {
              title?: string
              year?: number
            }
          }

          // Create a set of rated movie IDs
          const ratedIds = new Set<string>(ratings.map((rating: RatingFromAPI) => String(rating.movie_id)))
          setRatedMovieIds(ratedIds)
          setRatingsGiven(ratedIds.size)

          // Also populate title+year keys for better matching
          const titleYearKeys = new Set<string>()
          ratings.forEach((rating: RatingFromAPI) => {
            if (rating.movie_data?.title && rating.movie_data?.year) {
              const key = `${rating.movie_data.title.toLowerCase().trim()}_${rating.movie_data.year}`
              titleYearKeys.add(key)
            }
          })
          
          console.log('Generated title+year keys for filtering:', titleYearKeys.size)
          
          // Merge with existing localStorage data
          setUserRatedMovies(prev => new Set([...prev, ...titleYearKeys]))
          
        } else {
          console.warn('API ratings failed, using localStorage only')
        }
      } catch (apiError) {
        console.warn('API ratings failed, using localStorage only:', apiError)
      }
    } catch (error) {
      console.error('Failed to load user ratings:', error)
    }
  }
  

  // Check if a movie is already rated (by ID or by title+year for TMDB movies)
  const isMovieRated = (movie: Movie): boolean => {
    const movieKey = movie.title && movie.year ? `${movie.title.toLowerCase().trim()}_${movie.year}` : null
    
    // Check session ratings first (most reliable for current session)
    if (movieKey && sessionRatedMovies.has(movieKey)) {
      return true
    }
    
    // Check by database ID (most reliable for existing ratings)
    if (ratedMovieIds.has(movie.id)) {
      return true
    }
    
    // Check by title and year for TMDB movies (fallback)
    if (movieKey && userRatedMovies.has(movieKey)) {
      return true
    }
    
    return false
  }

  const loadMoviesForRating = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      console.log(`Loading TMDB movies page ${tmdbPage}`)
      
      // Fetch from TMDB top-rated movies
      const apiUrl = `/api/movies?realtime=true&top_rated=true&limit=${maxMovies}&page=${tmdbPage}`
      const response = await fetch(apiUrl)
      
      if (!response.ok) {
        throw new Error('Failed to load movies')
      }
      
      const data = await response.json()
      const moviesList = data.movies || []
      
      if (moviesList.length === 0) {
        setError('No more movies available')
        return
      }
      
      // Simply add new movies to the list (no complex filtering)
      setMovies(prevMovies => {
        const existingIds = new Set(prevMovies.map(m => m.id))
        const newMovies = moviesList.filter((movie: Movie) => !existingIds.has(movie.id))
        const allMovies = [...prevMovies, ...newMovies]
        
        console.log(`Loaded ${allMovies.length} total movies`)
        
        // Start with first movie if this is initial load
        if (prevMovies.length === 0) {
          setCurrentIndex(0)
        }
        
        return allMovies
      })
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load movies'
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }
  
  const handleRating = async (rating: number) => {
    if (!currentMovie || !user || isSubmitting) return
    
    // Check if movie is already rated and show toast
    if (isMovieRated(currentMovie)) {
      toast(`You've already rated "${currentMovie.title}"`, { duration: 3000 })
      await goToNext()
      return
    }
    
    setIsSubmitting(true)
    try {
      console.log('Submitting rating for:', currentMovie.title, currentMovie.year, 'Rating:', rating)
      
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
          interested: rating >= 3
        })
      })
      if (!response.ok) {
        const errorData = await response.text()
        throw new Error(errorData || 'Failed to save rating')
      }
      const ratingResult = await response.json()
      const actualMovieId = ratingResult.data?.movie_id || currentMovie.id
      
      toast.success(`Rated "${currentMovie.title}" ${rating} star${rating !== 1 ? 's' : ''}!`, { duration: 2000 })
      setRatingsGiven(prev => prev + 1)
      
      // Store both the original movie ID and the actual database ID
      setRatedMovieIds(prev => new Set([...prev, currentMovie.id, actualMovieId]))
      
      if (currentMovie.title && currentMovie.year) {
        const movieKey = `${currentMovie.title.toLowerCase().trim()}_${currentMovie.year}`
        
        // Update all three storage methods consistently
        setSessionRatedMovies(prev => new Set([...prev, movieKey]))
        setUserRatedMovies(prev => {
          const newSet = new Set([...prev, movieKey])
          if (user?.id) {
            localStorage.setItem(`rated_movies_${user.id}`, JSON.stringify(Array.from(newSet)))
          }
          return newSet
        })
        
        console.log(`Stored rating for ${currentMovie.title} (${currentMovie.year}) with key: ${movieKey}`)
      }
      if (onRatingComplete) {
        onRatingComplete(actualMovieId, rating)
      }
      
      // Move to next movie
      await goToNext()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save rating'
      toast.error(`Failed to rate movie: ${errorMessage}`, { duration: 4000 })
    } finally {
      setIsSubmitting(false)
    }
  }
  
  const handleSkip = async () => {
    await goToNext()
  }
  
  const goToNext = async () => {
    const nextIndex = currentIndex + 1
    if (nextIndex < movies.length) {
      setCurrentIndex(nextIndex)
    } else {
      // Load more movies when we reach the end
      const newPage = tmdbPage + 1
      setTmdbPage(newPage)
      
      try {
        setIsLoading(true)
        const apiUrl = `/api/movies?realtime=true&top_rated=true&limit=${maxMovies}&page=${newPage}`
        const response = await fetch(apiUrl)
        
        if (response.ok) {
          const data = await response.json()
          const newMovies = data.movies || []
          
          if (newMovies.length > 0) {
            setMovies(prev => {
              const existingIds = new Set(prev.map(m => m.id))
              const filteredNewMovies = newMovies.filter((movie: Movie) => !existingIds.has(movie.id))
              return [...prev, ...filteredNewMovies]
            })
            setCurrentIndex(nextIndex)
          }
        }
      } catch (err) {
        console.error('Failed to load more movies:', err)
      } finally {
        setIsLoading(false)
      }
    }
  }
  
  const goToPrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
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

  // If no current movie (index out of bounds), show loading or try to find a valid movie
  if (!currentMovie) {
    // Try to find first valid movie
    const validIndex = movies.findIndex(movie => movie && movie.title)
    if (validIndex !== -1) {
      setCurrentIndex(validIndex)
      return (
        <div className={`space-y-4 ${className}`}>
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
    
    return (
      <div className={`text-center py-8 ${className}`}>
        <p className="text-base-content/60">No valid movies found for rating</p>
        <button onClick={() => loadMoviesForRating()} className="btn btn-sm btn-outline mt-2">
          <RefreshCw className="w-4 h-4 mr-2" />
          Load More Movies
        </button>
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
            Movie {currentIndex + 1} of {movies.length}
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
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-semibold text-lg leading-tight hover:text-primary transition-colors">
                    {currentMovie.title} ({currentMovie.year})
                  </h4>
                  {isMovieRated(currentMovie) && (
                    <div className="badge badge-success badge-sm gap-1">
                      <Star className="w-3 h-3" />
                      Rated
                    </div>
                  )}
                </div>
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
        {ratingOptions.map((option) => {
          const isAlreadyRated = isMovieRated(currentMovie)
          return (
            <button
              key={option.value}
              onClick={(e) => {
                e.stopPropagation() // Prevent movie card click
                handleRating(option.value)
              }}
              disabled={isSubmitting || isAlreadyRated}
              className={`btn gap-2 ${
                isAlreadyRated 
                  ? 'btn-disabled opacity-50' 
                  : isSubmitting 
                  ? 'btn-disabled' 
                  : 'btn-outline hover:btn-primary'
              }`}
            >
              <option.icon className={`w-4 h-4 ${option.color}`} />
              <span className="text-sm">{option.label}</span>
            </button>
          )
        })}
      </div>
      
      {/* Already rated message */}
      {isMovieRated(currentMovie) && (
        <div className="alert alert-info">
          <Star className="w-4 h-4" />
          <span className="text-sm">You've already rated this movie. Use navigation to find unrated movies.</span>
        </div>
      )}
      
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
        
        <div className="flex gap-2">
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
              loadMoviesForRating()
            }}
            className="btn btn-sm btn-outline"
            disabled={isLoading}
          >
            {isLoading ? 'Loading...' : 'More Movies'}
          </button>
        </div>
        
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