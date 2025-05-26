'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { MovieDetailsModal } from '@/components/movies/MovieDetailsModal'
import { MarkWatchedModal } from '@/components/movies/MarkWatchedModal'
import { Film, CheckCircle, Circle, Star, Calendar, Trash2, SortAsc } from 'lucide-react'
import type { Movie, WatchlistItem } from '@/types'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

interface WatchlistPageState {
  items: (WatchlistItem & { movies: Movie })[]
  isLoading: boolean
  error: string | null
  filter: 'all' | 'watched' | 'unwatched'
  sortBy: 'added_at' | 'title' | 'year'
  selectedMovie: Movie | null
  movieToMarkWatched: Movie | null
  isMarkingWatched: boolean
}

export default function WatchlistPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [state, setState] = useState<WatchlistPageState>({
    items: [],
    isLoading: true,
    error: null,
    filter: 'all',
    sortBy: 'added_at',
    selectedMovie: null,
    movieToMarkWatched: null,
    isMarkingWatched: false,
  })

  const loadWatchlist = useCallback(async () => {
    console.log('📋 Loading watchlist...', { user: user?.email, filter: state.filter })

    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }))

      const params = new URLSearchParams()
      if (state.filter !== 'all') {
        params.append('watched', state.filter === 'watched' ? 'true' : 'false')
      }

      console.log('📡 Fetching watchlist API...', `/api/watchlist?${params}`)

      const response = await fetch(`/api/watchlist?${params}`)
      const data = await response.json()

      console.log('📋 Watchlist API response', { status: response.status, data })

      if (data.success) {
        console.log('✅ Watchlist loaded successfully', { itemCount: data.data?.length || 0 })
        setState(prev => ({
          ...prev,
          items: data.data || [],
          isLoading: false,
        }))
      } else {
        console.error('❌ Watchlist API returned error:', data.error)
        setState(prev => ({ ...prev, isLoading: false, items: [], error: data.error }))
        // Show an error message to the user
        if (data.error === 'Unauthorized') {
          console.log('🔐 Authentication issue detected, redirecting to login')
          router.push('/auth/login')
        }
      }
    } catch (error) {
      console.error('❌ Error loading watchlist:', error)
      setState(prev => ({ ...prev, isLoading: false, items: [], error: 'An error occurred' }))
      // Optionally show a user-friendly error message
    }
  }, [user?.email, state.filter, router])

  useEffect(() => {
    if (loading) return

    if (!user) {
      router.push('/auth/login')
      return
    }

    if (user) {
      loadWatchlist()
    }
  }, [user, loading, loadWatchlist, router])

  const handleRemoveFromWatchlist = async (movieId: string) => {
    try {
      console.log('🗑️ Removing movie from watchlist:', { movieId, user: user?.email })

      const response = await fetch(`/api/watchlist?movie_id=${movieId}`, {
        method: 'DELETE',
      })

      const data = await response.json()
      console.log('🗑️ Delete response:', { status: response.status, data })

      if (response.ok && data.success) {
        setState(prev => ({
          ...prev,
          items: prev.items.filter(item => item.movie_id !== movieId),
        }))
        console.log('✅ Movie removed from watchlist successfully')
      } else {
        console.error('❌ Failed to remove from watchlist:', data.error)
        
        // Show specific error messages to the user
        if (response.status === 401) {
          router.push('/auth/login')
        } else if (response.status === 404) {
          // Movie wasn't in watchlist anyway, remove from UI
          setState(prev => ({
            ...prev,
            items: prev.items.filter(item => item.movie_id !== movieId),
          }))
        } else {
          alert(`Failed to remove movie: ${data.error || 'Unknown error'}`)
        }
      }
    } catch (error) {
      console.error('❌ Network error removing from watchlist:', error)
      alert('Failed to remove movie: Network error')
    }
  }

  const handleMarkWatched = async (movieId: string, watchlistId: string) => {
    // Find the movie to mark as watched
    const item = state.items.find(item => item.id === watchlistId)
    if (!item) return

    setState(prev => ({ ...prev, movieToMarkWatched: item.movies }))
  }

  const handleConfirmMarkWatched = async (rating?: number, notes?: string) => {
    const movie = state.movieToMarkWatched
    if (!movie) return

    // Find the watchlist item for this movie
    const item = state.items.find(item => item.movie_id === movie.id)
    if (!item) return

    setState(prev => ({ ...prev, isMarkingWatched: true }))

    try {
      const response = await fetch('/api/watchlist', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          watchlist_id: item.id,
          watched: true,
          rating,
          notes,
        }),
      })

      if (response.ok) {
        loadWatchlist() // Reload to get updated data
        setState(prev => ({ 
          ...prev, 
          movieToMarkWatched: null, 
          isMarkingWatched: false 
        }))
      }
    } catch (error) {
      console.error('Error updating watch status:', error)
      setState(prev => ({ ...prev, isMarkingWatched: false }))
    }
  }

  const getSortedItems = () => {
    const sortedItems = [...state.items].sort((a, b) => {
      switch (state.sortBy) {
        case 'title':
          return a.movies.title.localeCompare(b.movies.title)
        case 'year':
          return (b.movies.year || 0) - (a.movies.year || 0)
        default:
          return new Date(b.added_at).getTime() - new Date(a.added_at).getTime()
      }
    })
    return sortedItems
  }

  if (loading || state.isLoading) {
    return (
      <div className="flex min-h-screen flex-col justify-center bg-gray-50 py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="flex justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          </div>
          <p className="mt-4 text-center text-sm text-gray-600">Loading your watchlist...</p>
        </div>
      </div>
    )
  }

  // Show error state if there's an error
  if (state.error) {
    return (
      <div className="flex min-h-screen flex-col justify-center bg-gray-50 py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="flex justify-center">
            <div className="rounded-full bg-red-100 p-3">
              <svg
                className="h-6 w-6 text-red-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </div>
          </div>
          <h2 className="mt-4 text-center text-lg font-medium text-gray-900">
            Failed to load watchlist
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {state.error === 'Unauthorized'
              ? 'Please sign in to view your watchlist'
              : 'There was a problem loading your watchlist. Please try again.'}
          </p>
          <div className="mt-6 flex justify-center space-x-4">
            <Button onClick={() => loadWatchlist()}>Try Again</Button>
            {state.error === 'Unauthorized' && (
              <Button variant="outline" onClick={() => router.push('/auth/login')}>
                Sign In
              </Button>
            )}
          </div>
        </div>
      </div>
    )
  }

  const sortedItems = getSortedItems()
  const watchedCount = state.items.filter(item => item.watched).length
  const unwatchedCount = state.items.length - watchedCount

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="mb-2 text-3xl font-bold text-gray-900">My Watchlist 🎬</h1>
          <p className="text-gray-600">Movies you&apos;ve saved to watch later</p>
        </div>

        {/* Stats */}
        <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Movies</CardTitle>
              <Film className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{state.items.length}</div>
              <p className="text-xs text-muted-foreground">In your watchlist</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Watched</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{watchedCount}</div>
              <p className="text-xs text-muted-foreground">Movies completed</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">To Watch</CardTitle>
              <Circle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{unwatchedCount}</div>
              <p className="text-xs text-muted-foreground">Movies pending</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Controls */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex gap-2">
            <Button
              variant={state.filter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setState(prev => ({ ...prev, filter: 'all' }))}
            >
              All ({state.items.length})
            </Button>
            <Button
              variant={state.filter === 'unwatched' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setState(prev => ({ ...prev, filter: 'unwatched' }))}
            >
              To Watch ({unwatchedCount})
            </Button>
            <Button
              variant={state.filter === 'watched' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setState(prev => ({ ...prev, filter: 'watched' }))}
            >
              Watched ({watchedCount})
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <SortAsc className="h-4 w-4 text-gray-500" />
            <select
              value={state.sortBy}
              onChange={e =>
                setState(prev => ({
                  ...prev,
                  sortBy: e.target.value as 'added_at' | 'title' | 'year',
                }))
              }
              className="rounded border border-gray-300 px-3 py-1 text-sm"
            >
              <option value="added_at">Date Added</option>
              <option value="title">Title</option>
              <option value="year">Year</option>
            </select>
          </div>
        </div>

        {/* Movies Grid */}
        {sortedItems.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {sortedItems.map(item => (
              <WatchlistCard
                key={item.id}
                item={item}
                onMovieClick={movie => setState(prev => ({ ...prev, selectedMovie: movie }))}
                onRemove={handleRemoveFromWatchlist}
                onMarkWatched={handleMarkWatched}
              />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-8 text-center">
              <Film className="mx-auto mb-4 h-12 w-12 text-gray-400" />
              <h3 className="mb-2 text-lg font-medium text-gray-900">
                No movies in your watchlist
              </h3>
              <p className="mb-4 text-gray-600">
                {state.filter === 'all'
                  ? 'Start adding movies to your watchlist from the recommendations!'
                  : `No ${state.filter} movies found.`}
              </p>
              <Button onClick={() => router.push('/dashboard')}>Discover Movies</Button>
            </CardContent>
          </Card>
        )}

        {/* Movie Details Modal */}
        <MovieDetailsModal
          movie={state.selectedMovie}
          open={!!state.selectedMovie}
          onClose={() => setState(prev => ({ ...prev, selectedMovie: null }))}
          onRemoveFromWatchlist={handleRemoveFromWatchlist}
          isInWatchlist={true}
        />

        {/* Mark as Watched Modal */}
        <MarkWatchedModal
          movie={state.movieToMarkWatched}
          open={!!state.movieToMarkWatched}
          onClose={() => setState(prev => ({ ...prev, movieToMarkWatched: null }))}
          onConfirm={handleConfirmMarkWatched}
          isLoading={state.isMarkingWatched}
        />
      </div>
    </div>
  )
}

interface WatchlistCardProps {
  item: WatchlistItem & { movies: Movie }
  onMovieClick: (movie: Movie) => void
  onRemove: (movieId: string) => void
  onMarkWatched: (movieId: string, watchlistId: string) => void
}

function WatchlistCard({ item, onMovieClick, onRemove, onMarkWatched }: WatchlistCardProps) {
  return (
    <Card className="overflow-hidden transition-shadow hover:shadow-lg">
      <div className="relative">
        <div className="aspect-[2/3] w-full overflow-hidden">
          {item.movies.poster_url ? (
            <div className="relative h-full w-full">
              <Image
                src={item.movies.poster_url}
                alt={item.movies.title}
                fill
                className="cursor-pointer object-cover transition-transform hover:scale-105"
                onClick={() => onMovieClick(item.movies)}
                sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
              />
            </div>
          ) : (
            <div
              className="flex h-full w-full cursor-pointer items-center justify-center bg-gray-200"
              onClick={() => onMovieClick(item.movies)}
            >
              <Film className="h-12 w-12 text-gray-400" />
            </div>
          )}
        </div>

        {/* Status Badge */}
        <div className="absolute right-2 top-2">
          {item.watched ? (
            <Badge className="bg-green-600">Watched</Badge>
          ) : (
            <Badge variant="outline">To Watch</Badge>
          )}
        </div>
      </div>

      <CardContent className="p-4">
        <h3 className="mb-1 line-clamp-2 text-sm font-semibold">{item.movies.title}</h3>

        <div className="mb-3 flex items-center justify-between text-xs text-gray-600">
          {item.movies.year && (
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {item.movies.year}
            </div>
          )}
          {item.movies.rating && (
            <div className="flex items-center gap-1">
              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
              {item.movies.rating}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={item.watched ? 'outline' : 'default'}
            className="flex-1"
            onClick={() => onMarkWatched(item.movies?.id || item.movie_id, item.id)}
          >
            {item.watched ? (
              <>
                <Circle className="mr-1 h-3 w-3" />
                Mark Unwatched
              </>
            ) : (
              <>
                <CheckCircle className="mr-1 h-3 w-3" />
                Mark Watched
              </>
            )}
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => onRemove(item.movies?.id || item.movie_id)}
            className="px-3"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
