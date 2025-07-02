'use client'
// @ts-nocheck
/* eslint-disable */

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import { useNetworkStatus } from '@/hooks/useNetworkStatus'
import { useErrorRecovery } from '@/contexts/ErrorRecoveryContext'
import { useRetryOperation, RetryConfigs } from '@/hooks/useRetryOperation'
import { MovieGridCard } from './MovieGridCard'
import { useMoviesWatchlist } from '@/hooks/useMoviesWatchlist'
import { AlertTriangle, Wifi, WifiOff, RefreshCw } from 'lucide-react'
import type { Movie } from '@/types'

interface ProgressiveMovieGridProps {
  fallbackMovies?: Movie[]
  enableAIFeatures?: boolean
  useTMDBTrending?: boolean
  showWatchlistOnly?: boolean
  showWatchedOnly?: boolean
  className?: string
}

interface APIResponse {
  success: boolean
  data: Movie[]
  total: number
  pagination: {
    currentPage: number
    hasMore: boolean
    totalPages: number
  }
  source: string
  vectorEnhanced?: boolean
}

export const ProgressiveMovieGrid: React.FC<ProgressiveMovieGridProps> = ({
  fallbackMovies = [],
  enableAIFeatures = true,
  useTMDBTrending = false,
  showWatchlistOnly = false,
  showWatchedOnly = false,
  className = ''
}) => {
  const { user } = useAuth()
  const { isOnline, isSlowConnection, shouldOptimizeForData } = useNetworkStatus()
  const { reportError, getHealthStatus } = useErrorRecovery()
  const { watchlistIds, toggleWatchlist } = useMoviesWatchlist()
  
  const [enhancedMode, setEnhancedMode] = useState(enableAIFeatures)
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null)
  const [userWarned, setUserWarned] = useState(false)

  const healthStatus = getHealthStatus()

  // Fallback to basic mode if AI services are consistently failing
  useEffect(() => {
    if (healthStatus.issues.includes('AI services experiencing issues')) {
      setEnhancedMode(false)
      if (!userWarned) {
        setUserWarned(true)
      }
    }
  }, [healthStatus.issues, userWarned])

  // Movie fetcher function
  const fetchMoviesPage = useCallback(async (pageParam = 1) => {
    // Handle watchlist/watched from local state first
    if (showWatchlistOnly || showWatchedOnly) {
      // TODO: Implement watchlist/watched fetching from Supabase
      return {
        success: true,
        data: [],
        total: 0,
        pagination: { currentPage: 1, hasMore: false, totalPages: 0 },
        source: showWatchlistOnly ? 'watchlist' : 'watched'
      }
    }

    const params = new URLSearchParams({
      limit: shouldOptimizeForData ? '8' : '12',
      page: pageParam.toString()
    })

    // Simple TMDB trending mode
    if (useTMDBTrending) {
      params.append('realtime', 'true')
      params.append('database', 'tmdb')
    }
    // AI recommendations mode
    else if (enhancedMode && isOnline && !isSlowConnection) {
      params.append('smart', 'true')
      params.append('includeExplanations', 'true')
    }
    // Default fallback
    else {
      params.append('realtime', 'true')
      params.append('database', 'tmdb')
    }

    const response = await fetch(`/api/movies?${params}`)
    
    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`API Error ${response.status}: ${errorText}`)
    }
    
    return response.json() as Promise<APIResponse>
  }, [shouldOptimizeForData, enhancedMode, isOnline, isSlowConnection, useTMDBTrending, showWatchlistOnly, showWatchedOnly])

  // Movie fetcher with retry logic
  const movieFetcher = useRetryOperation(
    () => fetchMoviesPage(1), // Default to page 1 for the retry operation
    {
      ...RetryConfigs.api,
      onRetry: (attemptCount, error) => {
        console.log(`Retrying movie fetch (attempt ${attemptCount}):`, error.message)
      },
      onMaxRetriesReached: (error) => {
        reportError(error, 'Movie fetching failed after all retries')
      }
    }
  )

  const {
    data,
    error,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch
  } = useInfiniteQuery({
    queryKey: ['progressive-movies', user?.id, enhancedMode, shouldOptimizeForData, useTMDBTrending, showWatchlistOnly, showWatchedOnly],
    queryFn: ({ pageParam = 1 }) => fetchMoviesPage(pageParam),
    enabled: !!user && isOnline,
    initialPageParam: 1,
    getNextPageParam: (lastPage) => 
      (lastPage as any)?.pagination?.hasMore ? (lastPage as any).pagination.currentPage + 1 : undefined,
    staleTime: shouldOptimizeForData ? 10 * 60 * 1000 : 5 * 60 * 1000, // Cache longer on slow connections
    retry: 2, // Allow React Query to handle retries
  })

  const movies = useMemo(() => {
    if (data?.pages) {
      return data.pages.flatMap(page => page.data || [])
    }
    return []
  }, [data])

  // Offline fallback
  if (!isOnline) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="alert alert-warning">
          <WifiOff className="h-5 w-5" />
          <div>
            <h3 className="font-medium">You're offline</h3>
            <p className="text-sm opacity-90">
              {fallbackMovies.length > 0 
                ? 'Showing cached recommendations from your last session.'
                : 'No cached content available. Please check your internet connection.'
              }
            </p>
          </div>
        </div>

        {fallbackMovies.length > 0 && (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {fallbackMovies.map(movie => (
              <MovieGridCard
                key={movie.id}
                movie={movie}
                userRating={undefined}
                onRate={() => {}} // Disabled offline
                onAddToWatchlist={() => {}} // Disabled offline
                priority={false}
                index={0}
              />
            ))}
          </div>
        )}
      </div>
    )
  }

  // AI services failed, showing basic mode
  if (!enhancedMode && enableAIFeatures) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="alert alert-info">
          <AlertTriangle className="h-5 w-5" />
          <div>
            <h3 className="font-medium">Basic Mode Active</h3>
            <p className="text-sm opacity-90">
              AI recommendations are temporarily unavailable. Showing popular movies from TMDB.
            </p>
          </div>
          <button
            onClick={() => {
              setEnhancedMode(true)
              refetch()
            }}
            className="btn btn-sm btn-outline"
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Retry AI Mode
          </button>
        </div>

        <BasicMovieDisplay 
          movies={movies}
          isLoading={isLoading}
          error={error}
          onLoadMore={() => fetchNextPage()}
          hasMore={hasNextPage}
          isLoadingMore={isFetchingNextPage}
        />
      </div>
    )
  }

  // Network issues detected
  if (isSlowConnection && !userWarned) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="alert alert-warning">
          <Wifi className="h-5 w-5" />
          <div>
            <h3 className="font-medium">Slow Connection Detected</h3>
            <p className="text-sm opacity-90">
              We've optimized the experience for your connection speed.
            </p>
          </div>
          <button
            onClick={() => setUserWarned(true)}
            className="btn btn-sm btn-ghost"
          >
            Continue
          </button>
        </div>
      </div>
    )
  }

  // Retry in progress
  if (movieFetcher.isRetrying) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="alert alert-info">
          <RefreshCw className="h-5 w-5 animate-spin" />
          <div>
            <h3 className="font-medium">Reconnecting...</h3>
            <p className="text-sm opacity-90">
              Attempt {movieFetcher.attemptCount + 1}
              {movieFetcher.nextRetryIn > 0 && ` • Next retry in ${movieFetcher.nextRetryIn}s`}
            </p>
          </div>
          <button
            onClick={movieFetcher.cancel}
            className="btn btn-sm btn-outline"
          >
            Cancel
          </button>
        </div>

        {/* Show cached content while retrying */}
        {movies.length > 0 && (
          <div className="opacity-50">
            <BasicMovieDisplay 
              movies={movies}
              isLoading={false}
              error={null}
              onLoadMore={() => {}}
              hasMore={false}
              isLoadingMore={false}
            />
          </div>
        )}
      </div>
    )
  }

  // Error state with recovery options
  if (error && movies.length === 0) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="alert alert-error">
          <AlertTriangle className="h-5 w-5" />
          <div>
            <h3 className="font-medium">Unable to Load Movies</h3>
            <p className="text-sm opacity-90">
              {error.message || 'Something went wrong while loading movies.'}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => refetch()}
              className="btn btn-sm btn-outline"
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              Retry
            </button>
            <button
              onClick={() => {
                setEnhancedMode(false)
                refetch()
              }}
              className="btn btn-sm btn-ghost"
            >
              Basic Mode
            </button>
          </div>
        </div>

        {/* Show fallback content if available */}
        {fallbackMovies.length > 0 && (
          <div>
            <h3 className="text-lg font-medium mb-4">Previously Cached Content</h3>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {fallbackMovies.slice(0, 12).map(movie => (
                <MovieGridCard
                  key={movie.id}
                  movie={movie}
                  userRating={undefined}
                  onRate={() => {}}
                  onAddToWatchlist={() => {}}
                  priority={false}
                  index={0}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  // Success state - enhanced mode
  return (
    <div className={`space-y-6 ${className}`}>
      {/* Status indicators */}
      {enhancedMode && (
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span className="inline-flex items-center gap-1 bg-green-100 text-green-800 px-2 py-1 rounded-full">
            ✨ AI Enhanced
          </span>
          {shouldOptimizeForData && (
            <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
              📱 Optimized for Data
            </span>
          )}
        </div>
      )}

      <BasicMovieDisplay 
        movies={movies}
        isLoading={isLoading}
        error={error}
        onLoadMore={() => fetchNextPage()}
        hasMore={hasNextPage}
        isLoadingMore={isFetchingNextPage}
        watchlistIds={watchlistIds}
        onToggleWatchlist={toggleWatchlist}
        onMovieClick={setSelectedMovie}
      />
    </div>
  )
}

// Basic movie display component
interface BasicMovieDisplayProps {
  movies: Movie[]
  isLoading: boolean
  error: any
  onLoadMore: () => void
  hasMore?: boolean
  isLoadingMore?: boolean
  watchlistIds?: Set<string>
  onToggleWatchlist?: (movieId: string) => void
  onMovieClick?: (movie: Movie) => void
}

const BasicMovieDisplay: React.FC<BasicMovieDisplayProps> = ({
  movies,
  isLoading,
  error,
  onLoadMore,
  hasMore,
  isLoadingMore,
  watchlistIds = new Set(),
  onToggleWatchlist = () => {},
  onMovieClick = () => {}
}) => {
  if (isLoading && movies.length === 0) {
    return (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="aspect-[2/3] bg-gray-200 animate-pulse rounded-lg" />
        ))}
      </div>
    )
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {movies.map((movie, index) => (
          <MovieGridCard
            key={movie.id}
            movie={movie}
            userRating={undefined}
            onRate={() => {}}
            onAddToWatchlist={onToggleWatchlist}
            priority={index < 6}
            index={index}
          />
        ))}
      </div>

      {hasMore && (
        <div className="flex justify-center">
          <button
            onClick={onLoadMore}
            disabled={isLoadingMore}
            className="btn btn-primary"
          >
            {isLoadingMore ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Loading...
              </>
            ) : (
              'Load More Movies'
            )}
          </button>
        </div>
      )}
    </>
  )
}