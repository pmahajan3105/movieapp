'use client'

import React, { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { MovieDetailsModal } from '@/components/movies/MovieDetailsModal'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Star, Calendar, Edit, Trash2 } from 'lucide-react'
import Image from 'next/image'
import type { Movie, WatchlistItem } from '@/types'
import { toast } from 'react-hot-toast'

interface WatchedMovie extends WatchlistItem {
  movies: Movie
}

export default function WatchedMoviesPage() {
  const { isLoading: authLoading } = useAuth()
  const [watchedMovies, setWatchedMovies] = useState<WatchedMovie[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingRating, setEditingRating] = useState<number>(0)
  const [editingNotes, setEditingNotes] = useState('')

  useEffect(() => {
    if (!authLoading) {
      fetchWatchedMovies()
    }
  }, [authLoading])

  const fetchWatchedMovies = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch('/api/watchlist?watched=true')
      const data = await response.json()

      if (data.success && data.data && data.data.data) {
        const watchedItems = data.data.data || []
        const watched = watchedItems.filter((item: WatchedMovie) => item.watched)
        setWatchedMovies(watched)
      } else {
        console.error('Unexpected API response format:', data)
        throw new Error(data.error || 'Failed to fetch watched movies')
      }
    } catch (err) {
      console.error('Error fetching watched movies:', err)
      setError(err instanceof Error ? err.message : 'Failed to load watched movies')
    } finally {
      setIsLoading(false)
    }
  }

  const handleMovieClick = (movie: Movie) => {
    setSelectedMovie(movie)
  }

  const handleEditRating = (item: WatchedMovie) => {
    setEditingId(item.id)
    setEditingRating(item.rating || 0)
    setEditingNotes(item.notes || '')
  }

  const handleSaveEdit = async (watchlistId: string) => {
    try {
      const response = await fetch('/api/watchlist', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          watchlist_id: watchlistId,
          rating: editingRating || null,
          notes: editingNotes || null,
        }),
      })

      const data = await response.json()

      if (data.success) {
        // Update local state
        setWatchedMovies(prev =>
          prev.map(item =>
            item.id === watchlistId
              ? { ...item, rating: editingRating || undefined, notes: editingNotes || undefined }
              : item
          )
        )
        setEditingId(null)
        toast.success('Rating updated successfully! 🌟')
      } else {
        throw new Error(data.error || 'Failed to update rating')
      }
    } catch (error) {
      console.error('Error updating rating:', error)
      toast.error('Failed to update rating')
    }
  }

  const handleRemoveFromWatched = async (watchlistId: string) => {
    try {
      const response = await fetch('/api/watchlist', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          watchlist_id: watchlistId,
          watched: false,
        }),
      })

      const data = await response.json()

      if (data.success) {
        setWatchedMovies(prev => prev.filter(item => item.id !== watchlistId))
        toast.success('Moved back to watchlist! 📝')
      } else {
        toast.error(data.error || 'Failed to update status')
      }
    } catch (error) {
      console.error('Error moving to watchlist:', error)
      toast.error('Network error: Failed to update status')
    }
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col justify-center bg-gray-50 py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="flex justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          </div>
          <p className="mt-4 text-center text-sm text-gray-600">Loading watched movies...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
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
            Failed to load watched movies
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">{error}</p>
          <div className="mt-6 flex justify-center">
            <Button onClick={fetchWatchedMovies}>Try Again</Button>
          </div>
        </div>
      </div>
    )
  }

  // Main content
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="mb-2 text-3xl font-bold text-gray-900">Watched Movies 🍿</h1>
          <p className="text-gray-600">
            Movies you&apos;ve already watched ({watchedMovies.length} movies)
          </p>
        </div>

        {/* Movies Grid or Empty State */}
        {watchedMovies.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {watchedMovies.map(item => (
              <Card key={item.id} className="overflow-hidden transition-shadow hover:shadow-lg">
                <div className="relative aspect-[2/3]">
                  <Image
                    src={item.movies.poster_url || '/placeholder-movie.jpg'}
                    alt={item.movies.title}
                    fill
                    className="cursor-pointer object-cover"
                    onClick={() => handleMovieClick(item.movies)}
                  />
                  <div className="absolute top-2 right-2 rounded-full bg-green-500 px-2 py-1 text-xs font-medium text-white">
                    ✓ Watched
                  </div>
                </div>
                <CardContent className="p-4">
                  <h3
                    className="mb-2 line-clamp-2 cursor-pointer text-lg font-semibold hover:text-blue-600"
                    onClick={() => handleMovieClick(item.movies)}
                  >
                    {item.movies.title}
                  </h3>

                  {item.movies.year && (
                    <p className="mb-2 flex items-center text-sm text-gray-600">
                      <Calendar className="mr-1 h-4 w-4" />
                      {item.movies.year}
                    </p>
                  )}

                  {item.watched_at && (
                    <p className="mb-2 text-xs text-gray-500">
                      Watched: {new Date(item.watched_at).toLocaleDateString()}
                    </p>
                  )}

                  {/* Rating Display/Edit */}
                  {editingId === item.id ? (
                    <div className="space-y-2">
                      <div className="flex items-center space-x-1">
                        <Star className="h-4 w-4 text-yellow-400" />
                        <input
                          type="number"
                          min="0"
                          max="10"
                          step="0.1"
                          value={editingRating}
                          onChange={e => setEditingRating(parseFloat(e.target.value))}
                          className="w-16 rounded border px-2 py-1 text-sm"
                        />
                        <span className="text-sm text-gray-500">/10</span>
                      </div>
                      <textarea
                        value={editingNotes}
                        onChange={e => setEditingNotes(e.target.value)}
                        placeholder="Notes (optional)"
                        className="w-full resize-none rounded border px-2 py-1 text-sm"
                        rows={2}
                      />
                      <div className="flex space-x-2">
                        <Button size="sm" onClick={() => handleSaveEdit(item.id)}>
                          Save
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {item.rating && (
                        <div className="flex items-center text-sm">
                          <Star className="mr-1 h-4 w-4 text-yellow-400" />
                          <span className="font-medium">{item.rating}/10</span>
                        </div>
                      )}
                      {item.notes && (
                        <p className="line-clamp-2 text-sm text-gray-600">{item.notes}</p>
                      )}
                      <div className="flex space-x-2 pt-2">
                        <Button size="sm" variant="outline" onClick={() => handleEditRating(item)}>
                          <Edit className="mr-1 h-3 w-3" />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRemoveFromWatched(item.id)}
                        >
                          <Trash2 className="mr-1 h-3 w-3" />
                          Unwatch
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="py-12 text-center">
            <div className="mx-auto mb-4 h-24 w-24 text-gray-400">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1}
                  d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
            </div>
            <h3 className="mb-2 text-lg font-medium text-gray-900">No watched movies yet</h3>
            <p className="mb-6 text-gray-600">Movies you mark as watched will appear here.</p>
            <Button onClick={() => (window.location.href = '/dashboard/watchlist')}>
              Go to Watchlist
            </Button>
          </div>
        )}

        {/* Movie Details Modal */}
        <MovieDetailsModal
          movie={selectedMovie}
          open={!!selectedMovie}
          onClose={() => setSelectedMovie(null)}
          onRemoveFromWatchlist={async () => {}} // Not applicable for watched movies
          isInWatchlist={false}
        />
      </div>
    </div>
  )
}
