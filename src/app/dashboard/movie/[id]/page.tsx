'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Movie, WatchlistItem } from '@/types'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'react-hot-toast'

export const dynamic = 'force-dynamic'

interface MovieDetails extends Movie {
  cast?: string[]
}

interface ApiResponse<T> {
  success: boolean
  data: T
  error?: string
}

export default function MovieDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const [movie, setMovie] = useState<MovieDetails | null>(null)
  const [similarMovies, setSimilarMovies] = useState<Movie[]>([])
  const [watchlistItem, setWatchlistItem] = useState<WatchlistItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [addingToWatchlist, setAddingToWatchlist] = useState(false)
  const [userRating, setUserRating] = useState<number>(0)
  const [userNotes, setUserNotes] = useState<string>('')
  const [showNotesForm, setShowNotesForm] = useState(false)

  const movieId = params.id as string

  // Fetch movie details
  useEffect(() => {
    const fetchMovieDetails = async () => {
      try {
        const [movieRes, similarRes, watchlistRes] = await Promise.all([
          fetch(`/api/movies/${movieId}`),
          fetch(`/api/movies/${movieId}/similar?limit=6`),
          user ? fetch(`/api/watchlist?movie_id=${movieId}`) : Promise.resolve(null),
        ])

        // Handle movie details
        const movieData: ApiResponse<MovieDetails> = await movieRes.json()
        if (movieData.success) {
          setMovie(movieData.data)
        } else {
          toast.error('Movie not found')
          router.push('/dashboard')
          return
        }

        // Handle similar movies
        const similarData: ApiResponse<Movie[]> = await similarRes.json()
        if (similarData.success) {
          setSimilarMovies(similarData.data)
        }

        // Handle watchlist status
        if (user && watchlistRes) {
          const watchlistData: ApiResponse<WatchlistItem[]> = await watchlistRes.json()
          if (watchlistData.success && watchlistData.data.length > 0) {
            const item = watchlistData.data[0]
            setWatchlistItem(item)
            setUserRating(item.rating || 0)
            setUserNotes(item.notes || '')
          }
        }
      } catch (error) {
        console.error('Error fetching movie details:', error)
        toast.error('Failed to load movie details')
      } finally {
        setLoading(false)
      }
    }

    if (movieId) {
      fetchMovieDetails()
    }
  }, [movieId, user, router])

  // Add to watchlist
  const handleAddToWatchlist = async () => {
    if (!user) {
      toast.error('Please sign in to add movies to your watchlist')
      return
    }

    setAddingToWatchlist(true)
    try {
      const response = await fetch('/api/watchlist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          movie_id: movieId,
          notes: userNotes || null,
        }),
      })

      const data: ApiResponse<WatchlistItem> = await response.json()
      if (data.success) {
        setWatchlistItem(data.data)
        toast.success('Added to watchlist!')
      } else {
        toast.error(data.error || 'Failed to add to watchlist')
      }
    } catch (error) {
      console.error('Error adding to watchlist:', error)
      toast.error('Failed to add to watchlist')
    } finally {
      setAddingToWatchlist(false)
    }
  }

  // Remove from watchlist
  const handleRemoveFromWatchlist = async () => {
    if (!watchlistItem) return

    try {
      const response = await fetch(`/api/watchlist?id=${watchlistItem.id}`, {
        method: 'DELETE',
      })

      const data: ApiResponse<void> = await response.json()
      if (data.success) {
        setWatchlistItem(null)
        setUserRating(0)
        setUserNotes('')
        toast.success('Removed from watchlist')
      } else {
        toast.error(data.error || 'Failed to remove from watchlist')
      }
    } catch (error) {
      console.error('Error removing from watchlist:', error)
      toast.error('Failed to remove from watchlist')
    }
  }

  // Update watchlist item
  const handleUpdateWatchlist = async (updates: { watched?: boolean; rating?: number; notes?: string }) => {
    if (!watchlistItem) return

    try {
      const response = await fetch('/api/watchlist', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          watchlist_id: watchlistItem.id,
          ...updates,
        }),
      })

      const data: ApiResponse<WatchlistItem> = await response.json()
      if (data.success) {
        setWatchlistItem(data.data)
        if (updates.rating !== undefined) {
          setUserRating(updates.rating)
        }
        if (updates.notes !== undefined) {
          setUserNotes(updates.notes)
        }
        toast.success('Updated successfully!')
      } else {
        toast.error(data.error || 'Failed to update')
      }
    } catch (error) {
      console.error('Error updating watchlist:', error)
      toast.error('Failed to update')
    }
  }

  // Star rating component
  const StarRating = ({ rating, onRatingChange, readonly = false }: { 
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
            className={`text-2xl ${
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

  // Get YouTube trailer URL
  const getTrailerUrl = (movie: MovieDetails) => {
    // In a real app, you'd have trailer URLs stored or fetch from TMDB/OMDB
    // For now, we'll construct a search URL
    const searchQuery = `${movie.title} ${movie.year} trailer`
    return `https://www.youtube.com/results?search_query=${encodeURIComponent(searchQuery)}`
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!movie) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Movie Not Found</h1>
        <button
          onClick={() => router.push('/dashboard')}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Back to Dashboard
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Breadcrumb Navigation */}
      <nav className="mb-6">
        <button
          onClick={() => router.push('/dashboard')}
          className="text-blue-600 hover:text-blue-800 flex items-center space-x-2"
        >
          <span>←</span>
          <span>Back to Dashboard</span>
        </button>
      </nav>

      {/* Movie Details Header */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Movie Poster */}
          <div className="flex-shrink-0">
            {movie.poster_url ? (
              <img
                src={movie.poster_url}
                alt={movie.title}
                className="w-64 h-96 object-cover rounded-lg shadow-md"
              />
            ) : (
              <div className="w-64 h-96 bg-gray-200 rounded-lg flex items-center justify-center">
                <span className="text-gray-500">No Poster</span>
              </div>
            )}
          </div>

          {/* Movie Info */}
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{movie.title}</h1>
            
            <div className="flex flex-wrap items-center gap-4 text-gray-600 mb-4">
              {movie.year && <span>{movie.year}</span>}
              {movie.runtime && <span>{movie.runtime} min</span>}
              {movie.rating && (
                <div className="flex items-center space-x-1">
                  <span className="text-yellow-400">★</span>
                  <span>{movie.rating.toFixed(1)}</span>
                </div>
              )}
            </div>

            {/* Genres */}
            {movie.genre && movie.genre.length > 0 && (
              <div className="mb-4">
                <div className="flex flex-wrap gap-2">
                  {movie.genre.map((genre) => (
                    <span
                      key={genre}
                      className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full"
                    >
                      {genre}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Directors */}
            {movie.director && movie.director.length > 0 && (
              <div className="mb-4">
                <span className="font-semibold text-gray-900">Director(s): </span>
                <span className="text-gray-700">{movie.director.join(', ')}</span>
              </div>
            )}

            {/* Cast */}
            {movie.cast && movie.cast.length > 0 && (
              <div className="mb-4">
                <span className="font-semibold text-gray-900">Cast: </span>
                <span className="text-gray-700">{movie.cast.slice(0, 5).join(', ')}</span>
                {movie.cast.length > 5 && <span className="text-gray-500"> and more...</span>}
              </div>
            )}

            {/* Plot */}
            {movie.plot && (
              <div className="mb-6">
                <h3 className="font-semibold text-gray-900 mb-2">Plot</h3>
                <p className="text-gray-700 leading-relaxed">{movie.plot}</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-4">
              {/* Watchlist Button */}
              {user && (
                <div className="flex items-center space-x-4">
                  {!watchlistItem ? (
                    <button
                      onClick={handleAddToWatchlist}
                      disabled={addingToWatchlist}
                      className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                    >
                      {addingToWatchlist ? 'Adding...' : '+ Add to Watchlist'}
                    </button>
                  ) : (
                    <div className="flex items-center space-x-4">
                      <button
                        onClick={() => handleUpdateWatchlist({ watched: !watchlistItem.watched })}
                        className={`px-6 py-2 rounded-lg transition-colors ${
                          watchlistItem.watched
                            ? 'bg-green-600 text-white hover:bg-green-700'
                            : 'bg-gray-600 text-white hover:bg-gray-700'
                        }`}
                      >
                        {watchlistItem.watched ? '✓ Watched' : 'Mark as Watched'}
                      </button>
                      
                      <button
                        onClick={handleRemoveFromWatchlist}
                        className="text-red-600 hover:text-red-800 px-4 py-2 border border-red-600 rounded-lg hover:bg-red-50 transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Trailer Button */}
              <a
                href={getTrailerUrl(movie)}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-colors"
              >
                🎬 Watch Trailer
              </a>
            </div>
          </div>
        </div>

        {/* User Rating and Notes (if in watchlist) */}
        {user && watchlistItem && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-4">Your Review</h3>
            
            {/* Rating */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Your Rating
              </label>
              <StarRating
                rating={userRating}
                onRatingChange={(rating) => {
                  setUserRating(rating)
                  handleUpdateWatchlist({ rating })
                }}
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Your Notes
              </label>
              {!showNotesForm ? (
                <div>
                  {userNotes ? (
                    <p className="text-gray-700 bg-gray-50 p-3 rounded-lg mb-2">{userNotes}</p>
                  ) : (
                    <p className="text-gray-500 italic mb-2">No notes added yet</p>
                  )}
                  <button
                    onClick={() => setShowNotesForm(true)}
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    {userNotes ? 'Edit Notes' : 'Add Notes'}
                  </button>
                </div>
              ) : (
                <div>
                  <textarea
                    value={userNotes}
                    onChange={(e) => setUserNotes(e.target.value)}
                    placeholder="Add your thoughts about this movie..."
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-2"
                    rows={3}
                  />
                  <div className="flex space-x-2">
                    <button
                      onClick={() => {
                        handleUpdateWatchlist({ notes: userNotes })
                        setShowNotesForm(false)
                      }}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setUserNotes(watchlistItem.notes || '')
                        setShowNotesForm(false)
                      }}
                      className="text-gray-600 hover:text-gray-800 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Similar Movies Section */}
      {similarMovies.length > 0 && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Similar Movies</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {similarMovies.map((similarMovie) => (
              <div
                key={similarMovie.id}
                onClick={() => router.push(`/dashboard/movie/${similarMovie.id}`)}
                className="cursor-pointer group"
              >
                <div className="relative">
                  {similarMovie.poster_url ? (
                    <img
                      src={similarMovie.poster_url}
                      alt={similarMovie.title}
                      className="w-full h-64 object-cover rounded-lg shadow-md group-hover:shadow-lg transition-shadow"
                    />
                  ) : (
                    <div className="w-full h-64 bg-gray-200 rounded-lg flex items-center justify-center group-hover:bg-gray-300 transition-colors">
                      <span className="text-gray-500 text-sm">No Poster</span>
                    </div>
                  )}
                  
                  {/* Overlay on hover */}
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 rounded-lg transition-all duration-200 flex items-center justify-center">
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-white font-semibold bg-black bg-opacity-75 px-3 py-1 rounded-full text-sm">
                        View Details
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="mt-2">
                  <h3 className="font-medium text-gray-900 text-sm line-clamp-2 group-hover:text-blue-600 transition-colors">
                    {similarMovie.title}
                  </h3>
                  <div className="flex items-center justify-between mt-1">
                    {similarMovie.year && (
                      <span className="text-gray-500 text-xs">{similarMovie.year}</span>
                    )}
                    {similarMovie.rating && (
                      <div className="flex items-center space-x-1">
                        <span className="text-yellow-400 text-xs">★</span>
                        <span className="text-gray-600 text-xs">{similarMovie.rating.toFixed(1)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
} 