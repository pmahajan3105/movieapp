'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { WatchlistItem, Movie } from '@/types'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'react-hot-toast'

// Force dynamic rendering for authenticated pages
export const dynamic = 'force-dynamic'

interface WatchlistItemWithMovie extends Omit<WatchlistItem, 'watched_at'> {
  movies: Movie
  watched_at?: string | null
}

interface ApiResponse<T> {
  success: boolean
  data: T
  error?: string
  total?: number
  filters?: Record<string, unknown>
}

export default function WatchlistPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [watchlistItems, setWatchlistItems] = useState<WatchlistItemWithMovie[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'watched' | 'unwatched'>('all')
  const [sortBy, setSortBy] = useState<'added_at' | 'rating' | 'year' | 'title'>('added_at')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  // Fetch watchlist
  const fetchWatchlist = async () => {
    if (!user) return

    try {
      setLoading(true)
      const params = new URLSearchParams({
        sort: sortBy,
        order: sortOrder,
        limit: '50',
      })

      if (filter !== 'all') {
        params.append('watched', filter === 'watched' ? 'true' : 'false')
      }

      const response = await fetch(`/api/watchlist?${params}`)
      const data: ApiResponse<WatchlistItemWithMovie[]> = await response.json()

      if (data.success) {
        setWatchlistItems(data.data)
      } else {
        toast.error(data.error || 'Failed to load watchlist')
      }
    } catch (error) {
      console.error('Error fetching watchlist:', error)
      toast.error('Failed to load watchlist')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchWatchlist()
  }, [user, filter, sortBy, sortOrder])

  // Update watchlist item
  const handleUpdateItem = async (
    itemId: string,
    updates: { watched?: boolean; rating?: number; notes?: string }
  ) => {
    try {
      const response = await fetch('/api/watchlist', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          watchlist_id: itemId,
          ...updates,
        }),
      })

      const data: ApiResponse<WatchlistItem> = await response.json()
      if (data.success) {
        // Update local state
        setWatchlistItems(prev =>
          prev.map(item =>
            item.id === itemId
              ? { ...item, ...updates, ...(updates.watched !== undefined && { watched_at: updates.watched ? new Date().toISOString() : null }) }
              : item
          )
        )
        toast.success('Updated successfully!')
      } else {
        toast.error(data.error || 'Failed to update')
      }
    } catch (error) {
      console.error('Error updating item:', error)
      toast.error('Failed to update')
    }
  }

  // Remove from watchlist
  const handleRemoveItem = async (itemId: string) => {
    try {
      const response = await fetch(`/api/watchlist?id=${itemId}`, {
        method: 'DELETE',
      })

      const data: ApiResponse<void> = await response.json()
      if (data.success) {
        setWatchlistItems(prev => prev.filter(item => item.id !== itemId))
        toast.success('Removed from watchlist')
      } else {
        toast.error(data.error || 'Failed to remove')
      }
    } catch (error) {
      console.error('Error removing item:', error)
      toast.error('Failed to remove')
    }
  }

  // Star rating component
  const StarRating = ({ 
    rating, 
    onRatingChange, 
    readonly = false 
  }: { 
    rating: number; 
    onRatingChange?: (rating: number) => void;
    readonly?: boolean;
  }) => {
    return (
      <div className="flex space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            onClick={() => !readonly && onRatingChange?.(star)}
            disabled={readonly}
            className={`text-lg ${
              star <= rating 
                ? 'text-yellow-400' 
                : 'text-gray-300'
            } ${!readonly ? 'hover:text-yellow-400 cursor-pointer' : 'cursor-default'} transition-colors`}
          >
            ★
          </button>
        ))}
      </div>
    )
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Please Sign In</h1>
        <p className="text-gray-600 mb-6">You need to be signed in to view your watchlist.</p>
        <button
          onClick={() => router.push('/auth/signin')}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Sign In
        </button>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="mb-2 text-2xl font-bold text-gray-900">Your Watchlist</h1>
        <p className="text-gray-600">Movies you&apos;ve saved to watch later</p>
      </div>

      {/* Filters and Sorting */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          {/* Filter Buttons */}
          <div className="flex space-x-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All ({watchlistItems.length})
            </button>
            <button
              onClick={() => setFilter('unwatched')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'unwatched'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              To Watch ({watchlistItems.filter(item => !item.watched).length})
            </button>
            <button
              onClick={() => setFilter('watched')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'watched'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Watched ({watchlistItems.filter(item => item.watched).length})
            </button>
          </div>

          {/* Sort Controls */}
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Sort by:</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'added_at' | 'rating' | 'year' | 'title')}
              className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="added_at">Date Added</option>
              <option value="title">Title</option>
              <option value="year">Year</option>
              <option value="rating">Your Rating</option>
            </select>
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="p-1 text-gray-500 hover:text-gray-700 transition-colors"
              title={`Sort ${sortOrder === 'asc' ? 'Descending' : 'Ascending'}`}
            >
              {sortOrder === 'asc' ? '↑' : '↓'}
            </button>
          </div>
        </div>
      </div>

      {/* Watchlist Items */}
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : watchlistItems.length === 0 ? (
        <div className="rounded-lg bg-white p-12 shadow text-center">
          <div className="text-gray-400 text-6xl mb-4">🎬</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {filter === 'all' ? 'Your watchlist is empty' : `No ${filter} movies`}
          </h3>
          <p className="text-gray-500 mb-6">
            {filter === 'all' 
              ? 'Start adding movies you want to watch!' 
              : `You don't have any ${filter} movies yet.`}
          </p>
          <button
            onClick={() => router.push('/dashboard')}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Browse Movies
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {watchlistItems.map((item) => (
            <div key={item.id} className="bg-white rounded-lg shadow p-6">
              <div className="flex flex-col md:flex-row gap-4">
                {/* Movie Poster */}
                <div className="flex-shrink-0">
                  <div
                    onClick={() => router.push(`/dashboard/movie/${item.movies.id}`)}
                    className="cursor-pointer group"
                  >
                    {item.movies.poster_url ? (
                      <img
                        src={item.movies.poster_url}
                        alt={item.movies.title}
                        className="w-24 h-36 object-cover rounded-lg shadow-md group-hover:shadow-lg transition-shadow"
                      />
                    ) : (
                      <div className="w-24 h-36 bg-gray-200 rounded-lg flex items-center justify-center group-hover:bg-gray-300 transition-colors">
                        <span className="text-gray-500 text-xs">No Poster</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Movie Info */}
                <div className="flex-1">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div className="flex-1">
                      <h3
                        onClick={() => router.push(`/dashboard/movie/${item.movies.id}`)}
                        className="text-lg font-semibold text-gray-900 hover:text-blue-600 cursor-pointer transition-colors"
                      >
                        {item.movies.title}
                      </h3>
                      
                      <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                        {item.movies.year && <span>{item.movies.year}</span>}
                        {item.movies.runtime && <span>{item.movies.runtime} min</span>}
                        {item.movies.rating && (
                          <div className="flex items-center space-x-1">
                            <span className="text-yellow-400">★</span>
                            <span>{item.movies.rating.toFixed(1)}</span>
                          </div>
                        )}
                      </div>

                      {/* Genres */}
                      {item.movies.genre && item.movies.genre.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {item.movies.genre.slice(0, 3).map((genre) => (
                            <span
                              key={genre}
                              className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full"
                            >
                              {genre}
                            </span>
                          ))}
                          {item.movies.genre.length > 3 && (
                            <span className="text-gray-500 text-xs">+{item.movies.genre.length - 3} more</span>
                          )}
                        </div>
                      )}

                      {/* Plot Preview */}
                      {item.movies.plot && (
                        <p className="text-gray-600 text-sm mt-2 line-clamp-2">
                          {item.movies.plot}
                        </p>
                      )}

                      {/* User Notes */}
                      {item.notes && (
                        <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                          <p className="text-sm text-gray-700">
                            <span className="font-medium">Your notes:</span> {item.notes}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col items-end space-y-3">
                      {/* Watch Status */}
                      <button
                        onClick={() => handleUpdateItem(item.id, { watched: !item.watched })}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          item.watched
                            ? 'bg-green-100 text-green-800 hover:bg-green-200'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {item.watched ? '✓ Watched' : 'Mark as Watched'}
                      </button>

                      {/* User Rating */}
                      <div className="text-center">
                        <div className="text-xs text-gray-500 mb-1">Your Rating</div>
                        <StarRating
                          rating={item.rating || 0}
                          onRatingChange={(rating) => handleUpdateItem(item.id, { rating })}
                        />
                      </div>

                      {/* Remove Button */}
                      <button
                        onClick={() => handleRemoveItem(item.id)}
                        className="text-red-600 hover:text-red-800 text-sm transition-colors"
                      >
                        Remove
                      </button>

                      {/* Added Date */}
                      <div className="text-xs text-gray-500">
                        Added {new Date(item.added_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
