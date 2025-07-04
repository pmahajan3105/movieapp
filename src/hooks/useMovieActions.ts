import { useState, useCallback } from 'react'
import { toast } from 'react-hot-toast'
import { logger } from '@/lib/logger'
import type { Movie } from '@/types'

export interface MovieActionsState {
  selectedMovie: Movie | null
  selectedMovieInsights: any | null
  movieModalOpen: boolean
}

export interface MovieActionsHandlers {
  handleMovieView: (movieId: string, movieData?: any, aiInsights?: any) => Promise<void>
  handleMovieSave: (movieId: string) => Promise<void>
  handleMovieRate: (movieId: string, rating: number) => Promise<void>
  handleModalClose: () => void
  state: MovieActionsState
}

export const useMovieActions = (): MovieActionsHandlers => {
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null)
  const [selectedMovieInsights, setSelectedMovieInsights] = useState<any>(null)
  const [movieModalOpen, setMovieModalOpen] = useState(false)

  const handleMovieView = useCallback(async (
    movieId: string, 
    movieData?: any, 
    aiInsights?: any
  ) => {
    try {
      // If we already have movie data, use it directly
      if (movieData) {
        setSelectedMovie(movieData)
        setSelectedMovieInsights(aiInsights || null)
        setMovieModalOpen(true)
        return
      }

      // Otherwise fetch movie details and open modal
      let response = await fetch(`/api/movies/details/${movieId}`)

      if (!response.ok) {
        // Fallback to the general movies endpoint
        response = await fetch(`/api/movies/${movieId}`)
      }

      if (!response.ok) {
        throw new Error(`Failed to fetch movie details: ${response.statusText}`)
      }

      const responseData = await response.json()
      
      // Handle different response formats
      const movie = responseData.movie || responseData.data || responseData

      if (!movie) {
        throw new Error('No movie data received from server')
      }

      setSelectedMovie(movie)
      setSelectedMovieInsights(null) // No AI insights for manually fetched movies
      setMovieModalOpen(true)

      logger.info('Movie details loaded successfully', { movieId })

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load movie details'
      logger.error('Failed to fetch movie details', { movieId, error: errorMessage })
      toast.error(errorMessage)
    }
  }, [])

  const handleMovieSave = useCallback(async (movieId: string) => {
    try {
      const response = await fetch('/api/watchlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ movieId }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Failed to add movie to watchlist: ${response.statusText}`)
      }

      toast.success('Movie added to watchlist!')
      logger.info('Movie added to watchlist successfully', { movieId })

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to add movie to watchlist'
      
      // Handle "already in watchlist" as a positive message instead of an error
      if (errorMessage.toLowerCase().includes('already in watchlist')) {
        toast('This movie is already in your watchlist!', {
          icon: 'ℹ️',
          duration: 3000,
        })
        logger.info('Movie already in watchlist', { movieId })
      } else {
        logger.error('Failed to add movie to watchlist', { movieId, error: errorMessage })
        toast.error(errorMessage)
      }
    }
  }, [])

  const handleMovieRate = useCallback(async (movieId: string, rating: number) => {
    try {
      const response = await fetch('/api/ratings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ movieId, rating }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Failed to rate movie: ${response.statusText}`)
      }

      toast.success(`Movie rated ${rating}/5 stars!`)
      logger.info('Movie rated successfully', { movieId, rating })

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to rate movie'
      logger.error('Failed to rate movie', { movieId, rating, error: errorMessage })
      toast.error(errorMessage)
    }
  }, [])

  const handleModalClose = useCallback(() => {
    setMovieModalOpen(false)
    setSelectedMovie(null)
    setSelectedMovieInsights(null)
  }, [])

  return {
    handleMovieView,
    handleMovieSave,
    handleMovieRate,
    handleModalClose,
    state: {
      selectedMovie,
      selectedMovieInsights,
      movieModalOpen,
    },
  }
} 