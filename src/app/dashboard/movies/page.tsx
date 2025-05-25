'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Film, Zap, TrendingUp, Plus, RefreshCw, ChevronDown } from 'lucide-react'
import { MovieDetailsModal } from '@/components/movies/MovieDetailsModal'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { Movie } from '@/types'
import Image from 'next/image'
import { toast } from 'react-hot-toast'

interface MoviesPageState {
  personalizedMovies: Movie[]
  moreMovies: Movie[]
  selectedMovie: Movie | null
  isLoading: boolean
  isLoadingMore: boolean
  watchlistIds: Set<string>
  hasMorePersonalized: boolean
  hasMoreGeneral: boolean
  personalizedPage: number
  generalPage: number
  hasPreferences: boolean
}

export default function MoviesPage() {
  const { loading, user } = useAuth()
  const [state, setState] = useState<MoviesPageState>({
    personalizedMovies: [],
    moreMovies: [],
    selectedMovie: null,
    isLoading: true,
    isLoadingMore: false,
    watchlistIds: new Set(),
    hasMorePersonalized: true,
    hasMoreGeneral: true,
    personalizedPage: 1,
    generalPage: 1,
    hasPreferences: false,
  })

  const loadMovies = useCallback(async (type: 'initial' | 'more-personalized' | 'more-general' | 'refresh') => {
    try {
      if (type === 'initial') {
        setState(prev => ({ ...prev, isLoading: true }))
      } else {
        setState(prev => ({ ...prev, isLoadingMore: true }))
      }

      const isRefresh = type === 'refresh'
      const isInitial = type === 'initial' || isRefresh
      
      // Reset pagination on refresh
      if (isRefresh) {
        setState(prev => ({ 
          ...prev, 
          personalizedPage: 1, 
          generalPage: 1,
          personalizedMovies: [],
          moreMovies: []
        }))
      }

      // Determine which page to load
      const currentPersonalizedPage = isRefresh ? 1 : 
        (type === 'more-personalized' ? state.personalizedPage + 1 : state.personalizedPage)
      const currentGeneralPage = isRefresh ? 1 : 
        (type === 'more-general' ? state.generalPage + 1 : state.generalPage)

      // Load personalized recommendations (preference-based)
      let personalizedData = null
      let generalData = null

      if (isInitial || type === 'more-personalized') {
        console.log('🎯 Loading personalized recommendations', { page: currentPersonalizedPage })
        const personalizedResponse = await fetch(`/api/movies?limit=9&page=${currentPersonalizedPage}&preferences=true`)
        personalizedData = await personalizedResponse.json()
      }

      // Load general movies
      if (isInitial || type === 'more-general') {
        console.log('🎬 Loading general movies', { page: currentGeneralPage })
        const generalResponse = await fetch(`/api/movies?limit=9&page=${currentGeneralPage}`)
        generalData = await generalResponse.json()
      }

      // Fetch user's watchlist to mark movies as already added
      let watchlistIds = new Set<string>()
      if (user) {
        const watchlistResponse = await fetch('/api/watchlist')
        const watchlistData = await watchlistResponse.json()
        watchlistIds = new Set<string>(
          watchlistData.success
            ? watchlistData.data.map((item: { movie_id: string }) => item.movie_id)
            : []
        )
      }

      setState(prev => {
        const newState = { ...prev }

        // Update personalized movies
        if (personalizedData) {
          const newPersonalizedMovies = personalizedData.success ? personalizedData.data : []
          newState.personalizedMovies = isRefresh || type === 'initial' 
            ? newPersonalizedMovies 
            : [...prev.personalizedMovies, ...newPersonalizedMovies]
          newState.hasMorePersonalized = personalizedData.pagination?.hasMore || false
          newState.personalizedPage = currentPersonalizedPage
          newState.hasPreferences = newPersonalizedMovies.length > 0 && personalizedData.total > 0
        }

        // Update general movies
        if (generalData) {
          const newGeneralMovies = generalData.success ? generalData.data : []
          newState.moreMovies = isRefresh || type === 'initial'
            ? newGeneralMovies 
            : [...prev.moreMovies, ...newGeneralMovies]
          newState.hasMoreGeneral = generalData.pagination?.hasMore || false
          newState.generalPage = currentGeneralPage
        }

        newState.watchlistIds = watchlistIds
        newState.isLoading = false
        newState.isLoadingMore = false

        return newState
      })

      console.log('✅ Movies loaded successfully', { 
        personalizedCount: personalizedData?.data?.length || 0,
        generalCount: generalData?.data?.length || 0,
        hasPreferences: personalizedData?.total > 0
      })

    } catch (error) {
      console.error('Error loading movies:', error)
      setState(prev => ({ ...prev, isLoading: false, isLoadingMore: false }))
      toast.error('Failed to load movies. Please try again.')
    }
  }, [user, state.personalizedPage, state.generalPage])

  useEffect(() => {
    if (!loading && user) {
      loadMovies('initial')
    }
  }, [loading, user, loadMovies])

  const handleAddToWatchlist = async (movieId: string) => {
    console.log('➕ Movies page add to watchlist triggered', { movieId, user: user?.email })

    try {
      if (!user) {
        console.log('❌ No user authenticated')
        toast.error('Please sign in to add movies to your watchlist')
        return
      }

      console.log('📤 Sending watchlist request...', { 
        movieId, 
        userId: user.id,
        endpoint: '/api/watchlist'
      })

      const response = await fetch('/api/watchlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ movie_id: movieId }),
      })

      const data = await response.json()

      console.log('📥 Watchlist add API response', { 
        status: response.status,
        ok: response.ok,
        success: data.success,
        error: data.error,
        movieId
      })

      if (response.ok && data.success) {
        setState(prev => ({
          ...prev,
          watchlistIds: new Set([...prev.watchlistIds, movieId]),
        }))
        console.log('✅ Added to watchlist successfully')
        toast.success('Added to watchlist!')
      } else {
        const errorMessage = data.error || `Failed to add to watchlist (Status: ${response.status})`
        console.error('❌ Watchlist add failed:', {
          status: response.status,
          error: data.error,
          fullResponse: data
        })
        
        // Provide specific error messages based on the error type
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
      console.error('❌ Error adding to watchlist:', {
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
        movieId,
        userId: user?.id
      })
      toast.error('Failed to add to watchlist. Please try again.')
    }
  }

  const handleRemoveFromWatchlist = async (movieId: string) => {
    console.log('🗑️ Movies page remove from watchlist triggered', { movieId, user: user?.email })

    try {
      if (!user) {
        console.log('❌ No user authenticated for remove')
        toast.error('Please sign in to manage your watchlist')
        return
      }

      console.log('📤 Sending remove watchlist request...', { 
        movieId, 
        userId: user.id,
        endpoint: `/api/watchlist?movie_id=${movieId}`
      })

      const response = await fetch(`/api/watchlist?movie_id=${movieId}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      console.log('📥 Watchlist remove API response', { 
        status: response.status,
        ok: response.ok,
        success: data.success,
        error: data.error,
        message: data.message,
        movieId
      })

      if (response.ok && data.success) {
        setState(prev => {
          const newWatchlistIds = new Set(prev.watchlistIds)
          newWatchlistIds.delete(movieId)
          return { ...prev, watchlistIds: newWatchlistIds }
        })
        console.log('✅ Removed from watchlist successfully')
        toast.success('Removed from watchlist!')
      } else {
        const errorMessage = data.error || `Failed to remove from watchlist (Status: ${response.status})`
        console.error('❌ Watchlist remove failed:', {
          status: response.status,
          error: data.error,
          fullResponse: data
        })
        
        // Provide specific error messages based on the error type
        if (response.status === 401) {
          toast.error('Please sign in again to manage your watchlist')
        } else if (response.status === 404) {
          toast.error('Movie not found in your watchlist')
        } else {
          toast.error(errorMessage)
        }
      }
    } catch (error) {
      console.error('❌ Error removing from watchlist:', {
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
        movieId,
        userId: user?.id
      })
      toast.error('Failed to remove from watchlist. Please try again.')
    }
  }

  if (loading || state.isLoading) {
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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="mb-2 text-3xl font-bold text-gray-900">
              {state.hasPreferences ? 'Your Personalized Movies 🎯' : 'All Movies 🎬'}
            </h1>
            <p className="text-gray-600">
              {state.hasPreferences 
                ? 'Movies tailored to your preferences from our AI chat' 
                : 'Discover popular and trending movies'}
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => loadMovies('refresh')}
            disabled={state.isLoadingMore}
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>

        {/* Personalized Movies Section */}
        {state.hasPreferences && (
          <section className="mb-12">
            <div className="mb-6">
              <h2 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
                <Zap className="h-6 w-6 text-purple-500" />
                Recommended For You
              </h2>
              <p className="mt-1 text-gray-600">Based on your chat preferences with CineAI</p>
            </div>

            {state.personalizedMovies.length > 0 ? (
              <>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {state.personalizedMovies.map(movie => (
                    <MovieCard
                      key={movie.id}
                      movie={movie}
                      onMovieClick={movie => setState(prev => ({ ...prev, selectedMovie: movie }))}
                      onAddToWatchlist={handleAddToWatchlist}
                      isInWatchlist={state.watchlistIds.has(movie.id)}
                    />
                  ))}
                </div>
                
                {/* Load More Personalized */}
                {state.hasMorePersonalized && (
                  <div className="mt-8 flex justify-center">
                    <Button
                      variant="outline"
                      onClick={() => loadMovies('more-personalized')}
                      disabled={state.isLoadingMore}
                      className="flex items-center gap-2"
                    >
                      {state.isLoadingMore ? (
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                      Load More Recommendations
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <Zap className="mx-auto mb-4 h-12 w-12 text-gray-400" />
                  <h3 className="mb-2 text-lg font-medium text-gray-900">No personalized recommendations yet</h3>
                  <p className="mb-4 text-gray-600">Chat with CineAI on the Dashboard to get personalized movie recommendations!</p>
                  <Button onClick={() => window.location.href = '/dashboard'}>Chat with CineAI</Button>
                </CardContent>
              </Card>
            )}
          </section>
        )}

        {/* General Movies Section */}
        <section className="mb-12">
          <div className="mb-6">
            <h2 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
              <TrendingUp className="h-6 w-6 text-blue-500" />
              {state.hasPreferences ? 'More Movies' : 'Popular Movies'}
            </h2>
            <p className="mt-1 text-gray-600">
              {state.hasPreferences ? 'Discover more great films' : 'Trending and highly rated movies'}
            </p>
          </div>

          {state.moreMovies.length > 0 ? (
            <>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
                {state.moreMovies.map(movie => (
                  <MovieCard
                    key={movie.id}
                    movie={movie}
                    onMovieClick={movie => setState(prev => ({ ...prev, selectedMovie: movie }))}
                    onAddToWatchlist={handleAddToWatchlist}
                    isInWatchlist={state.watchlistIds.has(movie.id)}
                    compact={true}
                  />
                ))}
              </div>
              
              {/* Load More General */}
              {state.hasMoreGeneral && (
                <div className="mt-8 flex justify-center">
                  <Button
                    variant="outline"
                    onClick={() => loadMovies('more-general')}
                    disabled={state.isLoadingMore}
                    className="flex items-center gap-2"
                  >
                    {state.isLoadingMore ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                    Load More Movies
                  </Button>
                </div>
              )}
            </>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <TrendingUp className="mx-auto mb-4 h-12 w-12 text-gray-400" />
                <h3 className="mb-2 text-lg font-medium text-gray-900">No movies found</h3>
                <p className="mb-4 text-gray-600">
                  Check back later for more movie recommendations!
                </p>
                <Button onClick={() => loadMovies('refresh')}>Refresh</Button>
              </CardContent>
            </Card>
          )}
        </section>

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

// Movie Card Component
interface MovieCardProps {
  movie: Movie
  onMovieClick: (movie: Movie) => void
  onAddToWatchlist: (movieId: string) => void
  isInWatchlist: boolean
  compact?: boolean
}

function MovieCard({
  movie,
  onMovieClick,
  onAddToWatchlist,
  isInWatchlist,
  compact = false,
}: MovieCardProps) {
  return (
    <Card className="overflow-hidden transition-shadow hover:shadow-lg">
      <div className="relative">
        <div className={`aspect-[2/3] w-full overflow-hidden ${compact ? 'h-48' : 'h-64'}`}>
          {movie.poster_url ? (
            <Image
              src={movie.poster_url}
              alt={movie.title}
              fill
              className="cursor-pointer object-cover transition-transform hover:scale-105"
              onClick={() => onMovieClick(movie)}
              sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
            />
          ) : (
            <div
              className="flex h-full w-full cursor-pointer items-center justify-center bg-gray-200"
              onClick={() => onMovieClick(movie)}
            >
              <Film className="h-12 w-12 text-gray-400" />
            </div>
          )}
        </div>

        {/* Rating Badge */}
        {movie.rating && (
          <div className="absolute right-2 top-2 rounded bg-black/70 px-2 py-1 text-xs text-white">
            ⭐ {movie.rating}
          </div>
        )}
      </div>

      <CardContent className="p-4">
        <h3
          className="mb-2 line-clamp-2 cursor-pointer text-lg font-semibold hover:text-blue-600"
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
          className="w-full"
          onClick={() => onAddToWatchlist(movie.id)}
          disabled={isInWatchlist}
        >
          <Plus className="mr-1 h-4 w-4" />
          {isInWatchlist ? 'In Watchlist' : 'Add to Watchlist'}
        </Button>
      </CardContent>
    </Card>
  )
} 