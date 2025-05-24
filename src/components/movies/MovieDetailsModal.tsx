import React, { useState } from 'react'
import Image from 'next/image'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Heart, Plus, Minus, Star, Calendar, Clock, Play } from 'lucide-react'
import type { Movie } from '@/types'
import { toast } from 'react-hot-toast'

interface MovieDetailsModalProps {
  movie: Movie | null
  open: boolean
  onClose: () => void
  onAddToWatchlist?: (movieId: string) => Promise<void>
  onRemoveFromWatchlist?: (movieId: string) => Promise<void>
  onRate?: (movieId: string, interested: boolean, rating?: number) => Promise<void>
  isInWatchlist?: boolean
}

export function MovieDetailsModal({
  movie,
  open,
  onClose,
  onAddToWatchlist,
  onRemoveFromWatchlist,
  onRate,
  isInWatchlist = false,
}: MovieDetailsModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [userRating, setUserRating] = useState<number | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  if (!movie) return null

  const handleWatchlistAction = async () => {
    if (!movie) return

    console.log('🎬 Watchlist action triggered', { movieId: movie.id, isInWatchlist })

    setActionLoading('watchlist')
    setIsLoading(true)
    try {
      if (isInWatchlist) {
        console.log('🗑️ Removing from watchlist...')
        await onRemoveFromWatchlist?.(movie.id)
      } else {
        console.log('➕ Adding to watchlist...')
        await onAddToWatchlist?.(movie.id)
      }
    } catch (error) {
      console.error('❌ Watchlist action failed:', error)
      toast.error('Failed to update watchlist. Please try again.')
    } finally {
      setIsLoading(false)
      setActionLoading(null)
    }
  }

  const handleRating = async (rating: number) => {
    if (!movie) return

    console.log('⭐ Rating triggered', { movieId: movie.id, rating })

    setActionLoading('rating')
    try {
      setUserRating(rating)
      await onRate?.(movie.id, true, rating)
    } catch (error) {
      console.error('❌ Rating failed:', error)
      setUserRating(null)
    } finally {
      setActionLoading(null)
    }
  }

  const handleLikeDislike = async (interested: boolean) => {
    if (!movie) return

    console.log('👍👎 Like/Dislike triggered', { movieId: movie.id, interested })

    setActionLoading(interested ? 'like' : 'dislike')
    try {
      await onRate?.(movie.id, interested)
    } catch (error) {
      console.error('❌ Like/dislike failed:', error)
    } finally {
      setActionLoading(null)
    }
  }

  // Handle genres - check if it's array or string
  const genres = Array.isArray(movie.genre) ? movie.genre : movie.genre ? [movie.genre] : []
  const actors = movie.actors || []

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            {movie.title} ({movie.year})
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {/* Movie Poster */}
          <div className="md:col-span-1">
            <div className="relative aspect-[2/3] w-full overflow-hidden rounded-lg">
              {movie.poster_url ? (
                <Image
                  src={movie.poster_url}
                  alt={movie.title}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 400px"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gray-200">
                  <span className="text-gray-500">No poster available</span>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="mt-4 space-y-3">
              <Button
                onClick={handleWatchlistAction}
                disabled={isLoading || actionLoading === 'watchlist'}
                className="w-full"
                variant={isInWatchlist ? 'outline' : 'default'}
              >
                {actionLoading === 'watchlist' ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                ) : isInWatchlist ? (
                  <>
                    <Minus className="mr-2 h-4 w-4" />
                    Remove from Watchlist
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    Add to Watchlist
                  </>
                )}
              </Button>

              {/* Like/Dislike Buttons */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1 hover:border-green-300 hover:bg-green-50"
                  onClick={() => handleLikeDislike(true)}
                  disabled={actionLoading === 'like'}
                >
                  {actionLoading === 'like' ? (
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  ) : (
                    <Heart className="mr-2 h-4 w-4" />
                  )}
                  Like
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 hover:border-red-300 hover:bg-red-50"
                  onClick={() => handleLikeDislike(false)}
                  disabled={actionLoading === 'dislike'}
                >
                  {actionLoading === 'dislike' ? (
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  ) : (
                    <Minus className="mr-2 h-4 w-4" />
                  )}
                  Pass
                </Button>
              </div>

              {/* Rating Stars */}
              <div className="text-center">
                <p className="mb-2 text-sm text-gray-600">Rate this movie:</p>
                <div className="flex justify-center space-x-1">
                  {[1, 2, 3, 4, 5].map(rating => (
                    <button
                      key={rating}
                      onClick={() => handleRating(rating)}
                      disabled={actionLoading === 'rating'}
                      className="p-1 transition-transform hover:scale-110 disabled:opacity-50"
                    >
                      <Star
                        className={`h-5 w-5 ${
                          userRating && rating <= userRating
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-gray-300 hover:text-yellow-400'
                        }`}
                      />
                    </button>
                  ))}
                </div>
                {userRating && (
                  <p className="mt-1 text-xs text-gray-600">You rated: {userRating} stars</p>
                )}
              </div>
            </div>
          </div>

          {/* Movie Details */}
          <div className="space-y-6 md:col-span-2">
            {/* Basic Info */}
            <div className="flex flex-wrap gap-4 text-sm text-gray-600">
              {movie.year && (
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {movie.year}
                </div>
              )}
              {movie.runtime && (
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {movie.runtime} min
                </div>
              )}
              {movie.rating && (
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  {movie.rating}/10 IMDb
                </div>
              )}
            </div>

            {/* Genres */}
            {genres.length > 0 && (
              <div>
                <h3 className="mb-2 font-semibold">Genres</h3>
                <div className="flex flex-wrap gap-2">
                  {genres.map((genre: string) => (
                    <Badge key={genre} variant="secondary">
                      {genre.trim()}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Plot */}
            {movie.plot && (
              <div>
                <h3 className="mb-2 font-semibold">Plot</h3>
                <p className="leading-relaxed text-gray-700">{movie.plot}</p>
              </div>
            )}

            {/* Director */}
            {movie.director && (
              <div>
                <h3 className="mb-2 font-semibold">Director</h3>
                <p className="text-gray-700">
                  {Array.isArray(movie.director) ? movie.director.join(', ') : movie.director}
                </p>
              </div>
            )}

            {/* Cast */}
            {actors.length > 0 && (
              <div>
                <h3 className="mb-2 font-semibold">Cast</h3>
                <div className="flex flex-wrap gap-2">
                  {actors.slice(0, 6).map((actor, index) => (
                    <Badge key={index} variant="outline">
                      {actor.trim()}
                    </Badge>
                  ))}
                  {actors.length > 6 && <Badge variant="outline">+{actors.length - 6} more</Badge>}
                </div>
              </div>
            )}

            {/* External Links */}
            <div className="flex gap-3">
              {movie.imdb_id && (
                <Button variant="outline" size="sm" asChild>
                  <a
                    href={`https://www.imdb.com/title/${movie.imdb_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Play className="mr-2 h-4 w-4" />
                    IMDb
                  </a>
                </Button>
              )}
              <Button variant="outline" size="sm" asChild>
                <a
                  href={`https://www.youtube.com/results?search_query=${encodeURIComponent(
                    `${movie.title} ${movie.year} trailer`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Play className="mr-2 h-4 w-4" />
                  Trailer
                </a>
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
