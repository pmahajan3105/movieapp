'use client'

import React, { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Film, Zap, TrendingUp, List } from 'lucide-react'
import { ChatInterface } from '@/components/ai/ChatInterface'
import { MovieDetailsModal } from '@/components/movies/MovieDetailsModal'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { Movie } from '@/types'
import Link from 'next/link'
import Image from 'next/image'
import { toast } from 'react-hot-toast'

interface SimplifiedDashboardState {
  recommendations: Movie[]
  topMovies: Movie[]
  selectedMovie: Movie | null
  isLoading: boolean
  watchlistIds: Set<string>
}

export default function DashboardPage() {
  const { loading, user } = useAuth()
  const [state, setState] = useState<SimplifiedDashboardState>({
    recommendations: [],
    topMovies: [],
    selectedMovie: null,
    isLoading: true,
    watchlistIds: new Set(),
  })

  useEffect(() => {
    // Load recommendations and movies
    const loadData = async () => {
      try {
        setState(prev => ({ ...prev, isLoading: true }))

        // Fetch recommendations
        const recsResponse = await fetch('/api/recommendations?limit=6')
        const recsData = await recsResponse.json()

        // Fetch top movies
        const moviesResponse = await fetch('/api/movies?limit=12')
        const moviesData = await moviesResponse.json()

        // Fetch user's watchlist to mark movies as already added
        const watchlistResponse = await fetch('/api/watchlist')
        const watchlistData = await watchlistResponse.json()

        const watchlistIds = new Set<string>(
          watchlistData.success
            ? watchlistData.data.map((item: { movie_id: string }) => item.movie_id)
            : []
        )

        setState(prev => ({
          ...prev,
          recommendations: recsData.success ? recsData.data : [],
          topMovies: moviesData.success ? moviesData.data : [],
          watchlistIds,
          isLoading: false,
        }))
      } catch (error) {
        console.error('Error loading data:', error)
        setState(prev => ({ ...prev, isLoading: false }))
      }
    }

    if (!loading) {
      loadData()
    }
  }, [loading])

  const handleRate = async (movieId: string, interested: boolean): Promise<void> => {
    console.log('⭐ Dashboard rating triggered', { movieId, interested, user: user?.email })

    try {
      if (!user) {
        toast.error('Please sign in to rate movies')
        return
      }

      const response = await fetch('/api/ratings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          movie_id: movieId,
          interested,
        }),
      })

      const data = await response.json()

      console.log('⭐ Rating API response', { status: response.status, data })

      if (response.ok && data.success) {
        console.log('✅ Rating saved successfully')
        toast.success(interested ? 'Added to your likes!' : 'Marked as not interested')
        // Optionally refresh recommendations
      } else {
        toast.error(data.error || 'Failed to save rating')
        console.error('❌ Rating error:', data.error)
        throw new Error(data.error || 'Failed to save rating')
      }
    } catch (error) {
      console.error('❌ Error saving rating:', error)
      toast.error('Failed to save rating. Please try again.')
      throw error
    }
  }

  const handleAddToWatchlist = async (movieId: string) => {
    console.log('➕ Dashboard add to watchlist triggered', { movieId, user: user?.email })

    try {
      if (!user) {
        toast.error('Please sign in to add movies to your watchlist')
        return
      }

      const response = await fetch('/api/watchlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ movie_id: movieId }),
      })

      const data = await response.json()

      console.log('➕ Watchlist add API response', { status: response.status, data })

      if (response.ok && data.success) {
        setState(prev => ({
          ...prev,
          watchlistIds: new Set([...prev.watchlistIds, movieId]),
        }))
        console.log('✅ Added to watchlist successfully')
        toast.success('Added to watchlist!')
      } else {
        toast.error(data.error || 'Failed to add to watchlist')
        console.error('❌ Watchlist add error:', data.error)
      }
    } catch (error) {
      console.error('❌ Error adding to watchlist:', error)
      toast.error('Failed to add to watchlist. Please try again.')
    }
  }

  const handleRemoveFromWatchlist = async (movieId: string) => {
    console.log('🗑️ Dashboard remove from watchlist triggered', { movieId, user: user?.email })

    try {
      if (!user) {
        toast.error('Please sign in to manage your watchlist')
        return
      }

      const response = await fetch(`/api/watchlist?movie_id=${movieId}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      console.log('🗑️ Watchlist remove API response', { status: response.status, data })

      if (response.ok && data.success) {
        setState(prev => {
          const newWatchlistIds = new Set(prev.watchlistIds)
          newWatchlistIds.delete(movieId)
          return { ...prev, watchlistIds: newWatchlistIds }
        })
        console.log('✅ Removed from watchlist successfully')
        toast.success('Removed from watchlist!')
      } else {
        toast.error(data.error || 'Failed to remove from watchlist')
        console.error('❌ Watchlist remove error:', data.error)
      }
    } catch (error) {
      console.error('❌ Error removing from watchlist:', error)
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
          <p className="mt-4 text-center text-sm text-gray-600">
            Loading your personalized movie recommendations...
          </p>
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
            <h1 className="mb-2 text-3xl font-bold text-gray-900">Welcome back! 🎬</h1>
            <p className="text-gray-600">
              Discover your next favorite movie with AI-powered recommendations
            </p>
          </div>
          <Link href="/watchlist">
            <Button variant="outline" className="flex items-center gap-2">
              <List className="h-4 w-4" />
              My Watchlist
            </Button>
          </Link>
        </div>

        {/* AI Chat Section */}
        <section className="mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-green-500"></span>
                Chat with CineAI
              </CardTitle>
              <CardDescription>
                Tell me what kind of movies you&apos;re in the mood for!
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="h-96 overflow-hidden">
                <ChatInterface
                  onPreferencesExtracted={preferences => {
                    console.log('Preferences learned:', preferences)
                    // Refresh recommendations when preferences are learned
                    setTimeout(() => {
                      window.location.reload()
                    }, 1000)
                  }}
                />
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Recommendations Section */}
        <section className="mb-12">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
                <Zap className="h-6 w-6 text-purple-500" />
                Recommended for You
              </h2>
              <p className="mt-1 text-gray-600">Based on popular movies and ratings</p>
            </div>
          </div>

          {state.recommendations.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {state.recommendations.map(movie => (
                <MovieCard
                  key={movie.id}
                  movie={movie}
                  onRate={handleRate}
                  onMovieClick={movie => setState(prev => ({ ...prev, selectedMovie: movie }))}
                  compact={true}
                  showRating={true}
                />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <Film className="mx-auto mb-4 h-12 w-12 text-gray-400" />
                <h3 className="mb-2 text-lg font-medium text-gray-900">No recommendations yet</h3>
                <p className="mb-4 text-gray-600">
                  Start by rating some movies or chatting with our AI!
                </p>
                <Button onClick={() => window.location.reload()}>Refresh Recommendations</Button>
              </CardContent>
            </Card>
          )}
        </section>

        {/* Top Movies Section */}
        <section className="mb-12">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
                <TrendingUp className="h-6 w-6 text-blue-500" />
                Popular Movies
              </h2>
              <p className="mt-1 text-gray-600">Highly rated films worth watching</p>
            </div>
          </div>

          {state.topMovies.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
              {state.topMovies.map(movie => (
                <MovieCard
                  key={movie.id}
                  movie={movie}
                  onRate={handleRate}
                  onMovieClick={movie => setState(prev => ({ ...prev, selectedMovie: movie }))}
                  compact={true}
                />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <TrendingUp className="mx-auto mb-4 h-12 w-12 text-gray-400" />
                <h3 className="mb-2 text-lg font-medium text-gray-900">No movies found</h3>
                <p className="mb-4 text-gray-600">
                  Check back later for popular movie recommendations!
                </p>
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
          onRate={handleRate}
          isInWatchlist={
            state.selectedMovie ? state.watchlistIds.has(state.selectedMovie.id) : false
          }
        />
      </div>
    </div>
  )
}

// Simplified Movie Card Component
interface MovieCardProps {
  movie: Movie
  onRate: (movieId: string, interested: boolean) => Promise<void>
  onMovieClick: (movie: Movie) => void
  compact?: boolean
  showRating?: boolean
}

function MovieCard({
  movie,
  onRate,
  onMovieClick,
  compact = false,
  showRating = false,
}: MovieCardProps) {
  const [isLoading, setIsLoading] = useState(false)

  const handleLike = async () => {
    setIsLoading(true)
    try {
      await onRate(movie.id, true)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDislike = async () => {
    setIsLoading(true)
    try {
      await onRate(movie.id, false)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCardClick = () => {
    onMovieClick(movie)
  }

  return (
    <Card
      className="group cursor-pointer transition-all duration-300 hover:shadow-lg"
      onClick={handleCardClick}
    >
      <CardContent className="p-0">
        {/* Movie Poster */}
        <div className={`relative ${compact ? 'aspect-[3/4]' : 'aspect-[4/6]'}`}>
          {movie.poster_url ? (
            <Image
              src={movie.poster_url}
              alt={movie.title}
              fill
              className="rounded-t-lg object-cover transition-transform duration-300 group-hover:scale-105"
              sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center rounded-t-lg bg-gradient-to-br from-gray-300 to-gray-500 transition-colors duration-300 group-hover:from-gray-400 group-hover:to-gray-600">
              <span className="text-xl font-bold text-white">{movie.title.charAt(0)}</span>
            </div>
          )}

          {/* Rating Badge */}
          {movie.rating && (
            <div className="absolute right-2 top-2 rounded bg-black/70 px-2 py-1 text-xs text-white">
              ⭐ {movie.rating.toFixed(1)}
            </div>
          )}

          {/* Hover Overlay */}
          <div className="absolute inset-0 flex items-center justify-center rounded-t-lg bg-black/0 transition-all duration-300 group-hover:bg-black/20">
            <div className="opacity-0 transition-opacity duration-300 group-hover:opacity-100">
              <span className="rounded-full bg-white/90 px-3 py-1 text-sm font-medium text-gray-900">
                View Details
              </span>
            </div>
          </div>
        </div>

        {/* Movie Info */}
        <div className="p-4">
          <h3 className="mb-1 line-clamp-1 font-semibold text-gray-900 transition-colors group-hover:text-blue-600">
            {movie.title}
          </h3>

          <div className="mb-2 flex items-center gap-2 text-sm text-gray-600">
            <span>{movie.year}</span>
            {movie.runtime && (
              <>
                <span>•</span>
                <span>{movie.runtime}m</span>
              </>
            )}
          </div>

          {/* Genres */}
          <div className="mb-3 flex flex-wrap gap-1">
            {movie.genre?.slice(0, 2).map(genre => (
              <span
                key={genre}
                className="rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800"
              >
                {genre}
              </span>
            ))}
          </div>

          {/* Plot (if not compact) */}
          {!compact && movie.plot && (
            <p className="mb-3 line-clamp-2 text-sm text-gray-700">{movie.plot}</p>
          )}

          {/* Action Buttons */}
          {showRating && (
            <div className="flex gap-2" onClick={e => e.stopPropagation()}>
              <Button
                size="sm"
                variant="outline"
                onClick={handleLike}
                disabled={isLoading}
                className="flex-1"
              >
                {isLoading ? (
                  <div className="mr-1 h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                ) : null}
                👍 Like
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleDislike}
                disabled={isLoading}
                className="flex-1"
              >
                {isLoading ? (
                  <div className="mr-1 h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                ) : null}
                👎 Pass
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
