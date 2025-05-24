'use client'

import React, { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Film, Zap, TrendingUp, List, Plus } from 'lucide-react'
import { ChatInterface } from '@/components/ai/ChatInterface'
import { MovieDetailsModal } from '@/components/movies/MovieDetailsModal'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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
    // Load movies
    const loadData = async () => {
      try {
        setState(prev => ({ ...prev, isLoading: true }))

        // Fetch movies
        const moviesResponse = await fetch('/api/movies?limit=12')
        const moviesData = await moviesResponse.json()

        // Fetch user's watchlist to mark movies as already added
        if (user) {
          const watchlistResponse = await fetch('/api/watchlist')
          const watchlistData = await watchlistResponse.json()

          const watchlistIds = new Set<string>(
            watchlistData.success
              ? watchlistData.data.map((item: { movie_id: string }) => item.movie_id)
              : []
          )

          setState(prev => ({
            ...prev,
            recommendations: moviesData.success ? moviesData.data.slice(0, 6) : [],
            topMovies: moviesData.success ? moviesData.data.slice(6, 12) : [],
            watchlistIds,
            isLoading: false,
          }))
        } else {
          setState(prev => ({
            ...prev,
            recommendations: moviesData.success ? moviesData.data.slice(0, 6) : [],
            topMovies: moviesData.success ? moviesData.data.slice(6, 12) : [],
            isLoading: false,
          }))
        }
      } catch (error) {
        console.error('Error loading data:', error)
        setState(prev => ({ ...prev, isLoading: false }))
      }
    }

    if (!loading) {
      loadData()
    }
  }, [loading, user])

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
          <p className="mt-4 text-center text-sm text-gray-600">Loading your movie dashboard...</p>
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
            <p className="text-gray-600">Discover your next favorite movie</p>
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
                Tell me what kind of movies you&apos;re looking for!
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="h-96 overflow-hidden">
                <ChatInterface
                  onPreferencesExtracted={preferences => {
                    console.log('Preferences learned:', preferences)
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
                Popular Movies
              </h2>
              <p className="mt-1 text-gray-600">Trending and highly rated movies</p>
            </div>
          </div>

          {state.recommendations.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {state.recommendations.map(movie => (
                <SimpleMovieCard
                  key={movie.id}
                  movie={movie}
                  onMovieClick={movie => setState(prev => ({ ...prev, selectedMovie: movie }))}
                  onAddToWatchlist={handleAddToWatchlist}
                  isInWatchlist={state.watchlistIds.has(movie.id)}
                />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <Film className="mx-auto mb-4 h-12 w-12 text-gray-400" />
                <h3 className="mb-2 text-lg font-medium text-gray-900">No movies found</h3>
                <p className="mb-4 text-gray-600">Check back later for movie recommendations!</p>
                <Button onClick={() => window.location.reload()}>Refresh</Button>
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
                More Movies
              </h2>
              <p className="mt-1 text-gray-600">Discover more great films</p>
            </div>
          </div>

          {state.topMovies.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
              {state.topMovies.map(movie => (
                <SimpleMovieCard
                  key={movie.id}
                  movie={movie}
                  onMovieClick={movie => setState(prev => ({ ...prev, selectedMovie: movie }))}
                  onAddToWatchlist={handleAddToWatchlist}
                  isInWatchlist={state.watchlistIds.has(movie.id)}
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
                  Check back later for more movie recommendations!
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
          isInWatchlist={
            state.selectedMovie ? state.watchlistIds.has(state.selectedMovie.id) : false
          }
        />
      </div>
    </div>
  )
}

// Simple Movie Card Component (No Rating Functionality)
interface SimpleMovieCardProps {
  movie: Movie
  onMovieClick: (movie: Movie) => void
  onAddToWatchlist: (movieId: string) => void
  isInWatchlist: boolean
  compact?: boolean
}

function SimpleMovieCard({
  movie,
  onMovieClick,
  onAddToWatchlist,
  isInWatchlist,
  compact = false,
}: SimpleMovieCardProps) {
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
