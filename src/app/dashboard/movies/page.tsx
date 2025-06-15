'use client'

import { useState, useEffect, useCallback } from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { useMoviesWatchlist } from '@/hooks/useMoviesWatchlist'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Brain, RefreshCw, Loader2, Bookmark, BookmarkCheck } from 'lucide-react'
import Image from 'next/image'
import PreferencesSetup from '@/components/PreferencesSetup'
import { MovieDetailsModal } from '@/components/movies/MovieDetailsModal'
import type { Movie } from '@/types'

// Movie Card Component
const MovieCard = ({
  movie,
  onAddToWatchlist,
  onMovieClick,
  isInWatchlist,
}: {
  movie: Movie & { reasoning?: string }
  onAddToWatchlist: (movieId: string) => void
  onMovieClick: (movie: Movie) => void
  isInWatchlist: boolean
}) => {
  return (
    <Card className="group h-full overflow-hidden transition-all duration-200 hover:shadow-lg">
      <div className="relative aspect-[2/3] overflow-hidden">
        <Image
          src={
            movie.poster_url ||
            `data:image/svg+xml;base64,${btoa(`
            <svg width="300" height="450" xmlns="http://www.w3.org/2000/svg">
              <rect width="100%" height="100%" fill="#f3f4f6"/>
              <text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="#9ca3af" font-family="Arial, sans-serif" font-size="16">
                ${movie.title}
              </text>
            </svg>
          `)}`
          }
          alt={movie.title}
          fill
          className="object-cover transition-transform duration-200 group-hover:scale-105"
          sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, (max-width: 1280px) 25vw, 16vw"
        />

        {movie.rating && (
          <div className="absolute top-2 right-2 rounded-full bg-black/70 px-2 py-1 text-xs font-medium text-white">
            ⭐ {movie.rating}
          </div>
        )}
      </div>

      <CardContent className="flex h-full flex-col justify-between p-4">
        <div>
          <h3
            className="hover:text-primary mb-2 line-clamp-2 cursor-pointer text-sm font-semibold transition-colors"
            onClick={() => onMovieClick(movie)}
          >
            {movie.title}
          </h3>

          {movie.genre && movie.genre.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-1">
              {movie.genre.slice(0, 2).map(genre => (
                <Badge key={genre} variant="outline" className="text-xs">
                  {genre}
                </Badge>
              ))}
              {movie.genre.length > 2 && (
                <Badge variant="outline" className="text-xs">
                  +{movie.genre.length - 2}
                </Badge>
              )}
            </div>
          )}

          {movie.reasoning && (
            <div className="from-primary/10 to-secondary/10 border-primary/20 mb-3 rounded-lg border bg-gradient-to-r p-3">
              <div className="mb-1 flex items-center gap-1">
                <Brain className="text-primary h-3 w-3" />
                <span className="text-primary text-xs font-medium">Why recommended:</span>
              </div>
              <p className="line-clamp-3 text-xs text-gray-700">{movie.reasoning}</p>
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 text-xs"
            onClick={() => onMovieClick(movie)}
          >
            View Details
          </Button>
          <Button
            variant={isInWatchlist ? 'default' : 'outline'}
            size="sm"
            onClick={() => onAddToWatchlist(movie.id)}
            className="text-xs"
          >
            {isInWatchlist ? (
              <BookmarkCheck className="h-3 w-3" />
            ) : (
              <Bookmark className="h-3 w-3" />
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// Main Page Component
export default function SmartMoviesPage() {
  const { user, loading: authLoading } = useAuth()
  const { watchlistIds, toggleWatchlist } = useMoviesWatchlist()

  const [showingRecommendations, setShowingRecommendations] = useState(false)
  const [showPreferencesSetup, setShowPreferencesSetup] = useState(false)
  const [hasPreferences, setHasPreferences] = useState(false)
  const [savingPreferences, setSavingPreferences] = useState(false)
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null)

  // Infinite scroll query
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    refetch,
    isError,
    error,
  } = useInfiniteQuery({
    queryKey: ['movies-infinite-realtime', showingRecommendations],
    queryFn: async ({ pageParam = 1 }) => {
      const params = new URLSearchParams({
        limit: '6',
        page: pageParam.toString(),
        realtime: 'true',
        database: 'tmdb',
        ...(showingRecommendations && { smart: 'true' }),
      })

      const response = await fetch(`/api/movies?${params}`)
      if (!response.ok) {
        throw new Error('Failed to fetch movies')
      }
      const data = await response.json()

      // Transform TMDB response to match expected format
      return {
        data: data.movies || data.data || [],
        total: data.total || 10000,
        pagination: {
          currentPage: data.page || pageParam,
          limit: parseInt(params.get('limit') || '6'),
          hasMore: (data.page || pageParam) < (data.totalPages || 500),
          totalPages: data.totalPages || 500,
        },
        source: data.source || 'tmdb-realtime',
      }
    },
    getNextPageParam: lastPage => {
      const { pagination } = lastPage
      return pagination.hasMore ? pagination.currentPage + 1 : undefined
    },
    staleTime: 1000 * 60 * 2, // 2 minutes for real-time data
    initialPageParam: 1,
  })

  // Flatten all pages into a single array
  const movies = data?.pages.flatMap(page => page.data) || []
  const totalMovies = data?.pages[0]?.total || 0

  // Infinite scroll handler
  const handleScroll = useCallback(() => {
    if (
      window.innerHeight + document.documentElement.scrollTop >=
        document.documentElement.offsetHeight - 1000 && // Load when 1000px from bottom
      hasNextPage &&
      !isFetchingNextPage
    ) {
      fetchNextPage()
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  // Set up scroll listener
  useEffect(() => {
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [handleScroll])

  // Reset when switching modes
  useEffect(() => {
    refetch()
  }, [showingRecommendations, refetch])

  const handleAddToWatchlist = async (movieId: string) => {
    await toggleWatchlist(movieId)
  }

  const handleMovieClick = (movie: Movie) => {
    setSelectedMovie(movie)
  }

  const handleCloseModal = () => {
    setSelectedMovie(null)
  }

  const handleRefresh = () => {
    refetch()
  }

  const toggleRecommendations = async () => {
    if (!showingRecommendations) {
      // Check if user has preferences before enabling AI recommendations
      try {
        const response = await fetch('/api/user/preferences')
        const data = await response.json()

        if (data.hasPreferences) {
          setHasPreferences(true)
          setShowingRecommendations(true)
        } else {
          setShowPreferencesSetup(true)
        }
      } catch (error) {
        console.error('Error checking preferences:', error)
        setShowingRecommendations(true) // Fallback to default preferences
      }
    } else {
      setShowingRecommendations(false)
    }
  }

  const handleSavePreferences = async (preferences: any) => {
    setSavingPreferences(true)
    try {
      const response = await fetch('/api/user/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(preferences),
      })

      if (response.ok) {
        setHasPreferences(true)
        setShowPreferencesSetup(false)
        setShowingRecommendations(true)
      } else {
        console.error('Failed to save preferences')
      }
    } catch (error) {
      console.error('Error saving preferences:', error)
    } finally {
      setSavingPreferences(false)
    }
  }

  const handleSkipPreferences = () => {
    setShowPreferencesSetup(false)
    setShowingRecommendations(true) // Use default preferences
  }

  if (authLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="border-primary h-8 w-8 animate-spin rounded-full border-4 border-t-transparent"></div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-gray-500">Please log in to view movies.</p>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex h-64 flex-col items-center justify-center">
        <div className="mb-4 text-6xl text-red-300">⚠️</div>
        <h3 className="mb-2 text-xl font-semibold text-gray-700">Something went wrong</h3>
        <p className="mb-4 text-gray-500">{error?.message || 'Failed to load movies'}</p>
        <Button onClick={handleRefresh}>Try Again</Button>
      </div>
    )
  }

  // Show preferences setup if needed
  if (showPreferencesSetup) {
    return (
      <div className="container mx-auto px-4 py-8">
        <PreferencesSetup
          onSave={handleSavePreferences}
          onSkip={handleSkipPreferences}
          isLoading={savingPreferences}
        />
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            {showingRecommendations ? 'AI Smart Recommendations' : 'Real-time Movie Discovery'}
          </h1>
          <p className="text-gray-600">
            {showingRecommendations
              ? '🧠 AI-powered recommendations from TMDB based on your preferences'
              : '🌐 Fresh movies from TMDB database • Unlimited scroll'}
          </p>
          <div className="mt-2 flex items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800 dark:bg-green-900 dark:text-green-200">
              🔴 Live TMDB Data
            </span>
            {showingRecommendations && (
              <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                🤖 AI Enhanced {hasPreferences ? '(Personalized)' : '(Default)'}
              </span>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant={showingRecommendations ? 'default' : 'outline'}
            onClick={toggleRecommendations}
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            {isLoading ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : (
              <Brain className="h-4 w-4" />
            )}
            {showingRecommendations ? 'Show All Movies' : 'Get AI Recommendations'}
          </Button>

          <Button variant="outline" onClick={handleRefresh} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Movies Count */}
      <div className="mb-6 flex items-center justify-between">
        <span className="text-sm text-gray-600">
          Showing {movies.length} of {totalMovies.toLocaleString()} movies • Scroll for more
          {showingRecommendations && ' (AI Enhanced)'}
        </span>

        {hasNextPage && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            className="flex items-center gap-2"
          >
            {isFetchingNextPage ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Load More'}
          </Button>
        )}
      </div>

      {/* Movies Grid */}
      {isLoading && movies.length === 0 ? (
        <div className="flex h-64 items-center justify-center">
          <div className="border-primary h-8 w-8 animate-spin rounded-full border-4 border-t-transparent"></div>
        </div>
      ) : movies.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center">
          <div className="mb-4 text-6xl text-gray-300">⚡</div>
          <h3 className="mb-2 text-xl font-semibold text-gray-700">No movies found</h3>
          <p className="mb-4 text-gray-500">Check back later for more movie recommendations!</p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleRefresh}>
              Refresh
            </Button>
            <Button onClick={() => setShowingRecommendations(false)}>Chat with CineAI</Button>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
            {movies.map((movie: Movie & { reasoning?: string }, index) => (
              <MovieCard
                key={`${movie.id}-${index}`} // Include index to handle duplicates across pages
                movie={movie}
                onAddToWatchlist={handleAddToWatchlist}
                onMovieClick={handleMovieClick}
                isInWatchlist={watchlistIds.has(movie.id)}
              />
            ))}
          </div>

          {/* Loading indicator for infinite scroll */}
          {isFetchingNextPage && (
            <div className="mt-8 flex justify-center">
              <div className="flex items-center gap-2 text-gray-600">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Loading more movies...</span>
              </div>
            </div>
          )}

          {/* End of results indicator */}
          {!hasNextPage && movies.length > 0 && (
            <div className="mt-8 text-center">
              <p className="text-gray-500">
                🎬 You&apos;ve explored {totalMovies.toLocaleString()} movies from TMDB!
                {showingRecommendations ? (
                  <Button
                    variant="link"
                    onClick={() => setShowingRecommendations(false)}
                    className="ml-2"
                  >
                    Browse trending movies
                  </Button>
                ) : (
                  <Button
                    variant="link"
                    onClick={() => setShowingRecommendations(true)}
                    className="ml-2"
                  >
                    Get AI recommendations
                  </Button>
                )}
              </p>
            </div>
          )}
        </>
      )}

      {/* Movie Details Modal */}
      {selectedMovie && (
        <MovieDetailsModal
          movie={selectedMovie}
          open={!!selectedMovie}
          onClose={handleCloseModal}
          onAddToWatchlist={handleAddToWatchlist}
          onRemoveFromWatchlist={handleAddToWatchlist}
          isInWatchlist={watchlistIds.has(selectedMovie.id)}
        />
      )}
    </div>
  )
}
