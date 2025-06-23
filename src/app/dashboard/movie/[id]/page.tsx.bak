'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Movie, WatchlistItem } from '@/types'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'react-hot-toast'
import Image from 'next/image'

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
            if (item) {
              setWatchlistItem(item)
              setUserRating(item.rating || 0)
              setUserNotes(item.notes || '')
            }
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
    if (!watchlistItem || !movie) return

    try {
      const response = await fetch(`/api/watchlist?movie_id=${movie.id}`, {
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
  const handleUpdateWatchlist = async (updates: {
    watched?: boolean
    rating?: number
    notes?: string
  }) => {
    if (!watchlistItem) return

    try {
      const response = await fetch('/api/watchlist', {
        method: 'PATCH',
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
  const StarRating = ({
    rating,
    onRatingChange,
    readonly = false,
  }: {
    rating: number
    onRatingChange?: (rating: number) => void
    readonly?: boolean
  }) => {
    return (
      <div className="flex space-x-1">
        {[1, 2, 3, 4, 5].map(star => (
          <button
            key={star}
            onClick={() => !readonly && onRatingChange?.(star)}
            disabled={readonly}
            className={`text-2xl ${
              star <= rating ? 'text-yellow-400' : 'text-gray-300'
            } ${!readonly ? 'cursor-pointer hover:text-yellow-400' : 'cursor-default'} transition-colors`}
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
      <div className="flex min-h-96 items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!movie) {
    return (
      <div className="py-12 text-center">
        <h1 className="mb-4 text-2xl font-bold text-gray-900">Movie Not Found</h1>
        <button
          onClick={() => router.push('/dashboard')}
          className="rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
        >
          Back to Dashboard
        </button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl">
      {/* Breadcrumb Navigation */}
      <nav className="mb-6">
        <button
          onClick={() => router.push('/dashboard')}
          className="flex items-center space-x-2 text-blue-600 hover:text-blue-800"
        >
          <span>←</span>
          <span>Back to Dashboard</span>
        </button>
      </nav>

      {/* Movie Details Header */}
      <div className="mb-6 rounded-lg bg-white p-6 shadow-lg">
        <div className="flex flex-col gap-6 md:flex-row">
          {/* Movie Poster */}
          <div className="flex-shrink-0">
            {movie.poster_url ? (
              <div className="relative h-96 w-64">
                <Image
                  src={movie.poster_url}
                  alt={movie.title}
                  fill
                  className="rounded-lg object-cover shadow-md"
                  sizes="(max-width: 768px) 100vw, 256px"
                />
              </div>
            ) : (
              <div className="flex h-96 w-64 items-center justify-center rounded-lg bg-gray-200">
                <span className="text-gray-500">No Poster</span>
              </div>
            )}
          </div>

          {/* Movie Info */}
          <div className="flex-1">
            <h1 className="mb-2 text-3xl font-bold text-gray-900">{movie.title}</h1>

            <div className="mb-4 flex flex-wrap items-center gap-4 text-gray-600">
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
                  {movie.genre.map(genre => (
                    <span
                      key={genre}
                      className="rounded-full bg-blue-100 px-3 py-1 text-sm text-blue-800"
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
                <h3 className="mb-2 font-semibold text-gray-900">Plot</h3>
                <p className="leading-relaxed text-gray-700">{movie.plot}</p>
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
                      className="rounded-lg bg-blue-600 px-6 py-2 text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
                    >
                      {addingToWatchlist ? 'Adding...' : '+ Add to Watchlist'}
                    </button>
                  ) : (
                    <div className="flex items-center space-x-4">
                      <button
                        onClick={() => handleUpdateWatchlist({ watched: !watchlistItem.watched })}
                        className={`rounded-lg px-6 py-2 transition-colors ${
                          watchlistItem.watched
                            ? 'bg-green-600 text-white hover:bg-green-700'
                            : 'bg-gray-600 text-white hover:bg-gray-700'
                        }`}
                      >
                        {watchlistItem.watched ? '✓ Watched' : 'Mark as Watched'}
                      </button>

                      <button
                        onClick={handleRemoveFromWatchlist}
                        className="rounded-lg border border-red-600 px-4 py-2 text-red-600 transition-colors hover:bg-red-50 hover:text-red-800"
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
                className="rounded-lg bg-red-600 px-6 py-2 text-white transition-colors hover:bg-red-700"
              >
                🎬 Watch Trailer
              </a>
            </div>
          </div>
        </div>

        {/* User Rating and Notes (if in watchlist) */}
        {user && watchlistItem && (
          <div className="mt-6 border-t border-gray-200 pt-6">
            <h3 className="mb-4 font-semibold text-gray-900">Your Review</h3>

            {/* Rating */}
            <div className="mb-4">
              <label className="mb-2 block text-sm font-medium text-gray-700">Your Rating</label>
              <StarRating
                rating={userRating}
                onRatingChange={rating => {
                  setUserRating(rating)
                  handleUpdateWatchlist({ rating })
                }}
              />
            </div>

            {/* Notes */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Your Notes</label>
              {!showNotesForm ? (
                <div>
                  {userNotes ? (
                    <p className="mb-2 rounded-lg bg-gray-50 p-3 text-gray-700">{userNotes}</p>
                  ) : (
                    <p className="mb-2 text-gray-500 italic">No notes added yet</p>
                  )}
                  <button
                    onClick={() => setShowNotesForm(true)}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    {userNotes ? 'Edit Notes' : 'Add Notes'}
                  </button>
                </div>
              ) : (
                <div>
                  <textarea
                    value={userNotes}
                    onChange={e => setUserNotes(e.target.value)}
                    placeholder="Add your thoughts about this movie..."
                    className="mb-2 w-full rounded-lg border border-gray-300 p-3 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                    rows={3}
                  />
                  <div className="flex space-x-2">
                    <button
                      onClick={() => {
                        handleUpdateWatchlist({ notes: userNotes })
                        setShowNotesForm(false)
                      }}
                      className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white transition-colors hover:bg-blue-700"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setUserNotes(watchlistItem.notes || '')
                        setShowNotesForm(false)
                      }}
                      className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-800"
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
        <div className="rounded-lg bg-white p-6 shadow-lg">
          <h2 className="mb-6 text-2xl font-bold text-gray-900">Similar Movies</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
            {similarMovies.map(similarMovie => (
              <div
                key={similarMovie.id}
                onClick={() => router.push(`/dashboard/movie/${similarMovie.id}`)}
                className="group cursor-pointer"
              >
                <div className="relative">
                  {similarMovie.poster_url ? (
                    <div className="relative h-64 w-full">
                      <Image
                        src={similarMovie.poster_url}
                        alt={similarMovie.title}
                        fill
                        className="rounded-lg object-cover shadow-md transition-shadow group-hover:shadow-lg"
                        sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 200px"
                      />
                    </div>
                  ) : (
                    <div className="flex h-64 w-full items-center justify-center rounded-lg bg-gray-200 transition-colors group-hover:bg-gray-300">
                      <span className="text-sm text-gray-500">No Poster</span>
                    </div>
                  )}

                  {/* Overlay on hover */}
                  <div className="bg-opacity-0 group-hover:bg-opacity-20 absolute inset-0 flex items-center justify-center rounded-lg bg-black transition-all duration-200">
                    <div className="opacity-0 transition-opacity group-hover:opacity-100">
                      <span className="bg-opacity-75 rounded-full bg-black px-3 py-1 text-sm font-semibold text-white">
                        View Details
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-2">
                  <h3 className="line-clamp-2 text-sm font-medium text-gray-900 transition-colors group-hover:text-blue-600">
                    {similarMovie.title}
                  </h3>
                  <div className="mt-1 flex items-center justify-between">
                    {similarMovie.year && (
                      <span className="text-xs text-gray-500">{similarMovie.year}</span>
                    )}
                    {similarMovie.rating && (
                      <div className="flex items-center space-x-1">
                        <span className="text-xs text-yellow-400">★</span>
                        <span className="text-xs text-gray-600">
                          {similarMovie.rating.toFixed(1)}
                        </span>
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
