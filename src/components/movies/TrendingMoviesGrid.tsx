'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import { useMoviesWatchlist } from '@/hooks/useMoviesWatchlist'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, Bookmark, BookmarkCheck } from 'lucide-react'
import Image from 'next/image'
import { MovieDetailsModal } from '@/components/movies/MovieDetailsModal'
import type { Movie } from '@/types'
import { logger } from '@/lib/logger'

// Simple Movie Card Component - Inline for performance
const MovieCard = ({
  movie,
  onAddToWatchlist,
  onMovieClick,
  isInWatchlist,
}: {
  movie: Movie
  onAddToWatchlist: (movieId: string) => void
  onMovieClick: (movie: Movie) => void
  isInWatchlist: boolean
}) => {
  return (
    <Card className="group overflow-hidden transition-all duration-200 hover:shadow-lg">
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
          sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
        />

        {movie.rating !== null && movie.rating !== undefined && (
          <div className="absolute top-2 right-2 rounded-full bg-black/70 px-2 py-1 text-xs font-medium text-white">
            ⭐ {Number(movie.rating).toFixed(1)}
          </div>
        )}
      </div>

      <CardContent className="p-3">
        <h3
          className="hover:text-primary mb-2 line-clamp-2 cursor-pointer text-sm leading-tight font-semibold transition-colors"
          onClick={() => onMovieClick(movie)}
        >
          {movie.title}
        </h3>

        {movie.genre && movie.genre.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1">
            {movie.genre.slice(0, 2).map(genre => (
              <Badge key={genre} variant="outline" className="h-5 px-1.5 py-0 text-xs">
                {genre}
              </Badge>
            ))}
            {movie.genre.length > 2 && (
              <Badge variant="outline" className="h-5 px-1.5 py-0 text-xs">
                +{movie.genre.length - 2}
              </Badge>
            )}
          </div>
        )}

        {/* Plot/Overview */}
        {movie.plot && (
          <div className="mb-2">
            <p className="line-clamp-2 text-xs leading-relaxed text-gray-600">{movie.plot}</p>
          </div>
        )}

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-7 flex-1 text-xs"
            onClick={() => onMovieClick(movie)}
          >
            View Details
          </Button>
          <Button
            variant={isInWatchlist ? 'default' : 'outline'}
            size="sm"
            onClick={() => onAddToWatchlist(movie.id)}
            className="h-7 px-2 text-xs"
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

// Main Trending Movies Grid Component
export const TrendingMoviesGrid = () => {
  const { user, isLoading: authLoading } = useAuth()
  const { watchlistIds, toggleWatchlist } = useMoviesWatchlist()
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Simple infinite scroll query - based on working commit
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
    queryKey: ['trending-movies'], // Simple key - no complex dependencies
    queryFn: async ({ pageParam = 1 }) => {
      const params = new URLSearchParams({
        limit: '20', // 20 movies for good performance
        page: pageParam.toString(),
        realtime: 'true',
        database: 'tmdb',
        skipExplanations: 'true', // Skip explanations for faster loading
      })

      const response = await fetch(`/api/movies?${params}`)
      if (!response.ok) {
        const errorText = await response.text()
        logger.error('Movie fetch error', { status: response.status, errorText })
        throw new Error(`Failed to fetch movies: ${response.status} ${errorText}`)
      }
      const data = await response.json()

      // Transform response to match expected format
      return {
        data: data.movies || data.data || [],
        total: data.total || 10000,
        pagination: {
          currentPage: data.page || pageParam,
          limit: parseInt(params.get('limit') || '20'),
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
    staleTime: 2 * 60 * 1000, // 2 minutes cache
    initialPageParam: 1,
    retry: 2, // Simple retry
    enabled: !!user, // Only authenticated users can access dashboard
  })

  // Flatten all pages into a single array
  const movies = data?.pages.flatMap(page => page.data) || []
  const totalMovies = data?.pages[0]?.total || 0

  // Simple infinite scroll handler with debounce
  const handleScroll = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    debounceRef.current = setTimeout(() => {
      if (
        window.innerHeight + document.documentElement.scrollTop >=
          document.documentElement.offsetHeight - 800 && // Trigger earlier
        hasNextPage &&
        !isFetchingNextPage &&
        !isLoading
      ) {
        fetchNextPage()
      }
    }, 100) // Faster debounce
  }, [hasNextPage, isFetchingNextPage, fetchNextPage, isLoading])

  // Set up scroll listener
  useEffect(() => {
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [handleScroll])

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

  // Simple loading state
  if (authLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="border-primary h-8 w-8 animate-spin rounded-full border-4 border-t-transparent"></div>
      </div>
    )
  }

  // Dashboard access requires authentication
  if (!user) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-gray-500">Please log in to view movies.</p>
      </div>
    )
  }

  // Simple error state
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

  return (
    <div>
      {/* Movies Count */}
      <div className="mb-6 flex items-center justify-between">
        <span className="text-sm text-gray-600">
          Showing {movies.length} of {totalMovies.toLocaleString()} trending movies • Scroll for more
        </span>
      </div>

      {/* Movies Grid */}
      {isLoading && movies.length === 0 ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {Array.from({ length: 20 }).map((_, i) => (
            <div key={i} className="aspect-[2/3] bg-gray-200 animate-pulse rounded-lg" />
          ))}
        </div>
      ) : movies.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center">
          <div className="mb-4 text-6xl text-gray-300">🎬</div>
          <h3 className="mb-2 text-xl font-semibold text-gray-700">No movies found</h3>
          <p className="mb-4 text-gray-500">Check back later for more trending movies!</p>
          <Button onClick={handleRefresh}>Refresh</Button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {movies.map((movie: Movie, index) => (
              <MovieCard
                key={`${movie.id}-${index}`}
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
                🎬 You&apos;ve explored all trending movies!
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
        />
      )}
    </div>
  )
}