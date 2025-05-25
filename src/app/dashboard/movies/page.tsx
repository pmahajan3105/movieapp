'use client'

import React, { useState, useEffect, useCallback, memo, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Film, Zap, Plus, RefreshCw, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { MovieDetailsModal } from '@/components/movies/MovieDetailsModal'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { Movie } from '@/types'
import Image from 'next/image'
import { toast } from 'react-hot-toast'

// Enhanced pagination interface
interface PaginationState {
  currentPage: number
  totalPages: number
  hasMore: boolean
  isLoading: boolean
  isLoadingMore: boolean
  moviesPerPage: number
}

// Enhanced state interface with better pagination
interface SimplifiedMoviesState {
  movies: Movie[] // Single array of all movies
  selectedMovie: Movie | null // Currently selected movie for modal
  watchlistIds: Set<string> // Movies in user's watchlist
  error: string | null // Single error state
  recommendationType: 'personalized' | 'popular' | 'mixed' | null
  userHasPreferences: boolean
  realTimeMode: boolean // Toggle for real-time movie fetching
  pagination: PaginationState
  viewMode: 'loadMore' | 'infiniteScroll' | 'pageNumbers'
}

export default function MoviesPage() {
  const { loading, user } = useAuth()
  const observerRef = useRef<IntersectionObserver | null>(null)
  const loadMoreRef = useRef<HTMLDivElement | null>(null)

  const [state, setState] = useState<SimplifiedMoviesState>({
    movies: [],
    selectedMovie: null,
    watchlistIds: new Set(),
    error: null,
    recommendationType: null,
    userHasPreferences: false,
    realTimeMode: false,
    pagination: {
      currentPage: 1,
      totalPages: 1,
      hasMore: true,
      isLoading: true,
      isLoadingMore: false,
      moviesPerPage: 8,
    },
    viewMode: 'loadMore',
  })

  // Add watchlist loading function
  const loadWatchlist = useCallback(async () => {
    if (!user) return

    try {
      if (process.env.NODE_ENV === 'development') {
        console.log('📋 Loading user watchlist...')
      }
      const response = await fetch('/api/watchlist')
      const result = await response.json()

      if (response.ok && result.success) {
        const watchlistMovieIds = new Set<string>(
          (result.data || []).map((item: { movie_id: string }) => item.movie_id)
        )
        setState(prev => ({ ...prev, watchlistIds: watchlistMovieIds }))
        if (process.env.NODE_ENV === 'development') {
          console.log('✅ Loaded watchlist:', watchlistMovieIds.size, 'movies')
        }
      } else {
        if (process.env.NODE_ENV === 'development') {
          console.log('⚠️ Failed to load watchlist:', result.error)
        }
      }
    } catch (error) {
      console.error('❌ Error loading watchlist:', error)
    }
  }, [user])

  // Enhanced pagination-aware movie loading
  const loadMovies = useCallback(async (targetPage?: number, appendMode = false) => {
    setState(prev => {
      const page = targetPage || (appendMode ? prev.pagination.currentPage + 1 : 1)

      if (process.env.NODE_ENV === 'development') {
        console.log('📱 Loading movies (Enhanced Pagination)', {
          page,
          currentMovieCount: prev.movies.length,
          realTimeMode: prev.realTimeMode,
          appendMode,
          viewMode: prev.viewMode,
        })
      }

      // Start the async operation
      const performLoad = async () => {
        try {
          // Use smart API with real-time TMDB data when real-time mode is enabled
          const params = new URLSearchParams({
            smart: 'true',
            limit: prev.pagination.moviesPerPage.toString(),
            page: page.toString(),
            ...(prev.realTimeMode && { realtime: 'true', database: 'tmdb' }),
          })

          if (process.env.NODE_ENV === 'development') {
            console.log('🔗 API URL:', `/api/movies?${params.toString()}`)
          }

          const response = await fetch(`/api/movies?${params.toString()}`)
          const result = await response.json()

          if (!response.ok) {
            throw new Error(result.error || 'Failed to fetch movies')
          }

          if (process.env.NODE_ENV === 'development') {
            console.log('✅ API Response (Enhanced):', {
              success: result.success,
              movieCount: result.data?.length || 0,
              total: result.total,
              pagination: result.pagination,
              recommendationType: result.recommendationType,
              appendMode,
              requestedPage: page,
            })
          }

          setState(prevState => {
            const existingMovieIds = new Set(prevState.movies.map(m => m.id))
            const newMoviesData = result.data || []

            const newMovies = appendMode
              ? [
                  ...prevState.movies,
                  ...newMoviesData.filter((movie: Movie) => !existingMovieIds.has(movie.id)),
                ]
              : newMoviesData

            return {
              ...prevState,
              movies: newMovies,
              pagination: {
                ...prevState.pagination,
                currentPage: result.pagination?.currentPage || page,
                totalPages:
                  result.pagination?.totalPages ||
                  Math.ceil((result.total || 0) / prevState.pagination.moviesPerPage),
                hasMore: result.pagination?.hasMore || false,
                isLoading: false,
                isLoadingMore: false,
              },
              recommendationType: result.recommendationType || null,
              userHasPreferences: result.userHasPreferences || false,
              error: null,
            }
          })
        } catch (error) {
          console.error('❌ Error loading movies:', error)
          setState(prevState => ({
            ...prevState,
            pagination: {
              ...prevState.pagination,
              isLoading: false,
              isLoadingMore: false,
            },
            error: error instanceof Error ? error.message : 'Failed to load movies',
          }))
        }
      }

      // Execute the async operation
      performLoad()

      // Return updated loading state immediately
      return {
        ...prev,
        pagination: {
          ...prev.pagination,
          isLoading: !appendMode,
          isLoadingMore: appendMode,
        },
        error: null,
      }
    })
  }, [])

  // Infinite scroll setup
  useEffect(() => {
    if (state.viewMode !== 'infiniteScroll' || !loadMoreRef.current) return

    const observerCallback = (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries
      if (entry.isIntersecting && state.pagination.hasMore && !state.pagination.isLoadingMore) {
        loadMovies(undefined, true)
      }
    }

    observerRef.current = new IntersectionObserver(observerCallback, {
      threshold: 0.1,
      rootMargin: '20px',
    })

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current)
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [state.viewMode, state.pagination.hasMore, state.pagination.isLoadingMore, loadMovies])

  useEffect(() => {
    if (!loading && user) {
      loadMovies() // initial load
      loadWatchlist() // load user's watchlist
    }
  }, [loading, user, loadMovies, loadWatchlist])

  const handleAddToWatchlist = async (movieId: string) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('➕ Movies page add to watchlist triggered', { movieId, user: user?.email })
    }

    try {
      if (!user) {
        if (process.env.NODE_ENV === 'development') {
          console.log('❌ No user authenticated')
        }
        toast.error('Please sign in to add movies to your watchlist')
        return
      }

      const response = await fetch('/api/watchlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ movie_id: movieId }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setState(prev => ({
          ...prev,
          watchlistIds: new Set([...prev.watchlistIds, movieId]),
        }))
        toast.success('Added to watchlist!')
      } else {
        const errorMessage = data.error || `Failed to add to watchlist (Status: ${response.status})`
        if (response.status === 401) {
          toast.error('Please sign in again to add movies to your watchlist')
        } else if (response.status === 404) {
          toast.error('Movie not found. Please try refreshing the page.')
        } else if (response.status === 409) {
          toast.error('Movie is already in your watchlist!')
        } else {
          toast.error(errorMessage)
        }
      }
    } catch (error) {
      console.error('❌ Error adding to watchlist:', error)
      toast.error('Failed to add to watchlist. Please try again.')
    }
  }

  const handleRemoveFromWatchlist = async (movieId: string) => {
    try {
      if (!user) {
        toast.error('Please sign in to manage your watchlist')
        return
      }

      const response = await fetch(`/api/watchlist?movie_id=${movieId}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setState(prev => {
          const newWatchlistIds = new Set(prev.watchlistIds)
          newWatchlistIds.delete(movieId)
          return { ...prev, watchlistIds: newWatchlistIds }
        })
        toast.success('Removed from watchlist!')
      } else {
        const errorMessage =
          data.error || `Failed to remove from watchlist (Status: ${response.status})`
        toast.error(errorMessage)
      }
    } catch (error) {
      console.error('❌ Error removing from watchlist:', error)
      toast.error('Failed to remove from watchlist. Please try again.')
    }
  }

  // Enhanced pagination controls
  const goToPage = (page: number) => {
    if (page >= 1 && page <= state.pagination.totalPages && !state.pagination.isLoading) {
      loadMovies(page, false)
    }
  }

  const loadMoreMovies = () => {
    if (!state.pagination.isLoadingMore && state.pagination.hasMore) {
      loadMovies(undefined, true)
    }
  }

  const changeViewMode = (mode: 'loadMore' | 'infiniteScroll' | 'pageNumbers') => {
    setState(prev => ({ ...prev, viewMode: mode }))
  }

  const getRecommendationTitle = () => {
    if (state.realTimeMode) {
      switch (state.recommendationType) {
        case 'personalized':
          return 'Live Personalized Recommendations 🎯'
        case 'mixed':
          return 'Live AI-Powered Movie Mix 🎬'
        default:
          return 'Live Trending Movies 🔥'
      }
    }

    switch (state.recommendationType) {
      case 'personalized':
        return 'Your Personalized Recommendations 🎯'
      case 'mixed':
        return 'Recommended Movies 🎬'
      default:
        return 'Popular Movies 🔥'
    }
  }

  const getRecommendationDescription = () => {
    if (state.realTimeMode) {
      switch (state.recommendationType) {
        case 'personalized':
          return 'Fresh movies tailored to your preferences from real-time sources'
        case 'mixed':
          return 'Live AI-powered recommendations combining trending and personalized picks'
        default:
          return 'Current trending and newly released movies from OMDB and web sources'
      }
    }

    switch (state.recommendationType) {
      case 'personalized':
        return 'Movies tailored to your preferences from our AI chat'
      case 'mixed':
        return 'AI-powered recommendations based on your preferences and popular movies'
      default:
        return 'Trending and highly rated movies for everyone'
    }
  }

  const toggleRealTimeMode = () => {
    setState(prev => {
      const newRealTimeMode = !prev.realTimeMode

      // Show immediate loading state and clear movies when switching modes
      const updatedState = {
        ...prev,
        realTimeMode: newRealTimeMode,
        pagination: {
          ...prev.pagination,
          isLoading: true,
          currentPage: 1,
        },
        movies: [], // Clear movies when switching modes for better UX
        error: null,
      }

      // Refresh movies with new mode after state update
      setTimeout(() => {
        loadMovies(1, false)
      }, 50) // Shorter timeout for better responsiveness

      return updatedState
    })
  }

  const handleRefresh = () => {
    setState(prev => ({
      ...prev,
      pagination: {
        ...prev.pagination,
        currentPage: 1,
      },
      movies: [],
      error: null,
    }))
    loadMovies(1, false)
  }

  if (loading || state.pagination.isLoading) {
    return (
      <div className="flex min-h-screen flex-col justify-center bg-gray-50 py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="flex justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          </div>
          <p className="mt-4 text-center text-sm text-gray-600">Loading movies...</p>
        </div>
      </div>
    )
  }

  if (state.error && state.movies.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <Card>
            <CardContent className="p-8 text-center">
              <Film className="mx-auto mb-4 h-12 w-12 text-red-400" />
              <h3 className="mb-2 text-lg font-medium text-gray-900">Failed to Load Movies</h3>
              <p className="mb-4 text-gray-600">{state.error}</p>
              <Button onClick={() => loadMovies()}>Try Again</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // Generate page numbers for pagination
  const generatePageNumbers = () => {
    const { currentPage, totalPages } = state.pagination
    const pageNumbers = []
    const maxVisible = 5

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i)
      }
    } else {
      const startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2))
      const endPage = Math.min(totalPages, startPage + maxVisible - 1)

      if (startPage > 1) {
        pageNumbers.push(1)
        if (startPage > 2) pageNumbers.push('...')
      }

      for (let i = startPage; i <= endPage; i++) {
        pageNumbers.push(i)
      }

      if (endPage < totalPages) {
        if (endPage < totalPages - 1) pageNumbers.push('...')
        pageNumbers.push(totalPages)
      }
    }

    return pageNumbers
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="mb-2 text-3xl font-bold text-gray-900">{getRecommendationTitle()}</h1>
            <p className="text-gray-600">{getRecommendationDescription()}</p>
            {state.userHasPreferences && (
              <div className="mt-2 flex items-center gap-2">
                <Zap className="h-4 w-4 text-purple-500" />
                <span className="text-sm font-medium text-purple-600">
                  AI-Enhanced Recommendations
                </span>
              </div>
            )}
            {state.realTimeMode && (
              <div className="mt-2 flex items-center gap-2">
                <div className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
                <span className="text-sm font-medium text-green-600">Real-Time Movie Data</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            {/* View Mode Selector */}
            <div className="flex rounded-lg border p-1">
              <button
                onClick={() => changeViewMode('loadMore')}
                className={`rounded px-3 py-1 text-xs ${state.viewMode === 'loadMore' ? 'bg-blue-100 text-blue-700' : 'text-gray-600'}`}
              >
                Load More
              </button>
              <button
                onClick={() => changeViewMode('infiniteScroll')}
                className={`rounded px-3 py-1 text-xs ${state.viewMode === 'infiniteScroll' ? 'bg-blue-100 text-blue-700' : 'text-gray-600'}`}
              >
                Auto Load
              </button>
              <button
                onClick={() => changeViewMode('pageNumbers')}
                className={`rounded px-3 py-1 text-xs ${state.viewMode === 'pageNumbers' ? 'bg-blue-100 text-blue-700' : 'text-gray-600'}`}
              >
                Pages
              </button>
            </div>

            {/* Real-time mode toggle */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Real-time</label>
              <button
                onClick={toggleRealTimeMode}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                  state.realTimeMode ? 'bg-blue-600' : 'bg-gray-200'
                }`}
                disabled={state.pagination.isLoading || state.pagination.isLoadingMore}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    state.realTimeMode ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
            <Button
              variant="outline"
              onClick={handleRefresh}
              disabled={state.pagination.isLoadingMore || state.pagination.isLoading}
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Pagination Info */}
        {state.movies.length > 0 && (
          <div className="mb-6 flex items-center justify-between text-sm text-gray-600">
            <span>
              Showing {state.movies.length} movies
              {state.pagination.totalPages > 1 && (
                <>
                  {' '}
                  (Page {state.pagination.currentPage} of {state.pagination.totalPages})
                </>
              )}
            </span>
            {state.viewMode === 'pageNumbers' && state.pagination.totalPages > 1 && (
              <span>{state.pagination.moviesPerPage} per page</span>
            )}
          </div>
        )}

        {/* Single Movies Grid Section */}
        {state.movies.length > 0 ? (
          <>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {state.movies.map(movie => (
                <MovieCard
                  key={movie.id}
                  movie={movie}
                  onMovieClick={movie => setState(prev => ({ ...prev, selectedMovie: movie }))}
                  onAddToWatchlist={handleAddToWatchlist}
                  isInWatchlist={state.watchlistIds.has(movie.id)}
                />
              ))}
            </div>

            {/* Enhanced Pagination Controls */}
            {state.viewMode === 'loadMore' && state.pagination.hasMore && (
              <div className="mt-12 flex justify-center">
                <Button
                  variant="outline"
                  onClick={loadMoreMovies}
                  disabled={state.pagination.isLoadingMore || state.pagination.isLoading}
                  className="flex items-center gap-2"
                >
                  {state.pagination.isLoadingMore ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                  Load More Movies
                </Button>
              </div>
            )}

            {/* Infinite Scroll Trigger */}
            {state.viewMode === 'infiniteScroll' && state.pagination.hasMore && (
              <div ref={loadMoreRef} className="mt-12 flex justify-center py-8">
                {state.pagination.isLoadingMore && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                    Loading more movies...
                  </div>
                )}
              </div>
            )}

            {/* Page Numbers Navigation */}
            {state.viewMode === 'pageNumbers' && state.pagination.totalPages > 1 && (
              <div className="mt-12 flex justify-center">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => goToPage(state.pagination.currentPage - 1)}
                    disabled={state.pagination.currentPage === 1 || state.pagination.isLoading}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>

                  {generatePageNumbers().map((pageNum, index) => (
                    <React.Fragment key={index}>
                      {pageNum === '...' ? (
                        <span className="px-2 text-gray-500">...</span>
                      ) : (
                        <Button
                          variant={pageNum === state.pagination.currentPage ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => goToPage(pageNum as number)}
                          disabled={state.pagination.isLoading}
                          className="min-w-[40px]"
                        >
                          {pageNum}
                        </Button>
                      )}
                    </React.Fragment>
                  ))}

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => goToPage(state.pagination.currentPage + 1)}
                    disabled={
                      state.pagination.currentPage === state.pagination.totalPages ||
                      state.pagination.isLoading
                    }
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Debug Info (only in development) */}
            {process.env.NODE_ENV === 'development' && (
              <div className="mt-8 rounded bg-gray-100 p-4 text-sm text-gray-600">
                <strong>Debug Info:</strong> Page {state.pagination.currentPage}/
                {state.pagination.totalPages}, Movies: {state.movies.length}, Type:{' '}
                {state.recommendationType}, Has More: {state.pagination.hasMore ? 'Yes' : 'No'},
                View: {state.viewMode}
              </div>
            )}
          </>
        ) : (
          <Card>
            <CardContent className="p-8 text-center">
              <Zap className="mx-auto mb-4 h-12 w-12 text-gray-400" />
              <h3 className="mb-2 text-lg font-medium text-gray-900">No movies found</h3>
              <p className="mb-4 text-gray-600">
                {state.userHasPreferences
                  ? 'No movies match your preferences. Try chatting with CineAI to discover new preferences!'
                  : 'Check back later for more movie recommendations!'}
              </p>
              <div className="flex justify-center gap-2">
                <Button onClick={handleRefresh}>Refresh</Button>
                {!state.userHasPreferences && (
                  <Button variant="outline" onClick={() => (window.location.href = '/dashboard')}>
                    Chat with CineAI
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Movie Details Modal */}
        <MovieDetailsModal
          movie={state.selectedMovie}
          open={!!state.selectedMovie}
          onClose={() => setState(prev => ({ ...prev, selectedMovie: null }))}
          onAddToWatchlist={handleAddToWatchlist}
          onRemoveFromWatchlist={handleRemoveFromWatchlist}
          isInWatchlist={
            state.selectedMovie ? state.watchlistIds.has(state.selectedMovie.id) : false
          }
        />
      </div>
    </div>
  )
}

// Movie Card Component (memoized for performance)
interface MovieCardProps {
  movie: Movie
  onMovieClick: (movie: Movie) => void
  onAddToWatchlist: (movieId: string) => void
  isInWatchlist: boolean
}

const MovieCard = memo(function MovieCard({
  movie,
  onMovieClick,
  onAddToWatchlist,
  isInWatchlist,
}: MovieCardProps) {
  return (
    <Card className="group overflow-hidden transition-all hover:scale-[1.02] hover:shadow-lg">
      <div className="relative">
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
              <Film className="h-12 w-12 text-gray-400" />
            </div>
          )}
        </div>

        {/* Rating Badge */}
        {movie.rating && (
          <div className="absolute right-2 top-2 rounded bg-black/70 px-2 py-1 text-xs text-white backdrop-blur-sm">
            ⭐ {movie.rating}
          </div>
        )}

        {/* Hover overlay for better UX */}
        <div className="pointer-events-none absolute inset-0 bg-black/10 opacity-0 transition-opacity group-hover:opacity-100" />
      </div>

      <CardContent className="p-4">
        <h3
          className="mb-2 line-clamp-2 cursor-pointer text-lg font-semibold transition-colors hover:text-blue-600"
          onClick={() => onMovieClick(movie)}
        >
          {movie.title}
        </h3>

        <div className="mb-3 flex items-center justify-between text-sm text-gray-600">
          {movie.year && <span>{movie.year}</span>}
          {movie.runtime && <span>{movie.runtime}m</span>}
        </div>

        {movie.genre && movie.genre.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-1">
            {movie.genre.slice(0, 2).map(g => (
              <Badge key={g} variant="secondary" className="text-xs">
                {g}
              </Badge>
            ))}
          </div>
        )}

        <Button
          size="sm"
          className="w-full transition-all duration-200"
          onClick={() => onAddToWatchlist(movie.id)}
          disabled={isInWatchlist}
          variant={isInWatchlist ? 'secondary' : 'default'}
        >
          <Plus className="mr-1 h-4 w-4" />
          {isInWatchlist ? 'In Watchlist' : 'Add to Watchlist'}
        </Button>
      </CardContent>
    </Card>
  )
})
