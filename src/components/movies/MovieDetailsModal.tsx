import React, { useState } from 'react'
import Image from 'next/image'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, Minus, Star, Calendar, Clock } from 'lucide-react'
import type { Movie } from '@/types'
import { toast } from 'react-hot-toast'

interface MovieDetailsModalProps {
  movie: Movie | null
  open: boolean
  onClose: () => void
  onAddToWatchlist?: (movieId: string) => Promise<void>
  onRemoveFromWatchlist?: (movieId: string) => Promise<void>
  isInWatchlist?: boolean
  isWatched?: boolean
  watchlistItem?: any
  onEditRating?: () => void
}

export function MovieDetailsModal({
  movie,
  open,
  onClose,
  onAddToWatchlist,
  onRemoveFromWatchlist,
  isInWatchlist = false,
  isWatched = false,
  watchlistItem = null,
  onEditRating,
}: MovieDetailsModalProps) {
  const [isLoading, setIsLoading] = useState(false)

  if (!movie) return null

  const handleWatchlistAction = async () => {
    if (!movie) return

    setIsLoading(true)
    try {
      if (isInWatchlist) {
        await onRemoveFromWatchlist?.(movie.id)
      } else {
        await onAddToWatchlist?.(movie.id)
      }
    } catch (error) {
      // Error logging handled in the parent component's watchlist hooks
      toast.error('Failed to update watchlist. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  // Handle genres - check if it's array or string
  const genres = Array.isArray(movie.genre) ? movie.genre : movie.genre ? [movie.genre] : []
  // Handle cast/actors - check both field names for compatibility
  const actors = movie.actors || (movie as any).cast || []

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-h-[95vh] sm:max-h-[90vh] max-w-4xl w-full sm:w-auto mx-2 sm:mx-auto overflow-y-auto border border-gray-200 bg-white shadow-xl">
        <DialogHeader className="-m-6 mb-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50 p-4 sm:p-6">
          <DialogTitle className="text-xl sm:text-2xl font-bold text-gray-900 leading-tight">
            {movie.title} ({movie.year})
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-6 bg-white p-1 md:grid-cols-3">
          {/* Movie Poster */}
          <div className="md:col-span-1">
            <div className="relative aspect-[2/3] w-full overflow-hidden rounded-lg border border-gray-200 shadow-lg">
              {movie.poster_url ? (
                <Image
                  src={movie.poster_url}
                  alt={movie.title}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 400px"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                  <span className="font-medium text-gray-500">No poster available</span>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="mt-4">
              {isWatched ? (
                <Button
                  onClick={onEditRating}
                  disabled={isLoading}
                  className="w-full shadow-md h-12 text-base touch-manipulation"
                  variant="outline"
                >
                  {isLoading ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  ) : (
                    <>
                      <Star className="mr-2 h-4 w-4" />
                      Edit Rating & Notes
                    </>
                  )}
                </Button>
              ) : (
                <Button
                  onClick={handleWatchlistAction}
                  disabled={isLoading}
                  className="w-full shadow-md h-12 text-base touch-manipulation"
                  variant={isInWatchlist ? 'outline' : 'default'}
                >
                  {isLoading ? (
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
              )}
            </div>

            {/* Rating Display for Watched Movies */}
            {isWatched && watchlistItem && (
              <div className="mt-4 rounded-lg border border-gray-100 bg-gray-50 p-3">
                {watchlistItem.rating && (
                  <div className="mb-2 flex items-center text-sm">
                    <Star className="mr-1 h-4 w-4 text-yellow-400" />
                    <span className="font-medium">Your Rating: {watchlistItem.rating}/5</span>
                  </div>
                )}
                {watchlistItem.notes && (
                  <p className="text-xs text-gray-600">
                    <span className="font-medium">Your Notes:</span> {watchlistItem.notes}
                  </p>
                )}
                {watchlistItem.watched_at && (
                  <p className="mt-1 text-xs text-gray-500">
                    Watched: {new Date(watchlistItem.watched_at).toLocaleDateString()}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Movie Details */}
          <div className="bg-white md:col-span-2">
            {/* Movie Metadata */}
            <div className="mb-6 flex flex-wrap items-center gap-4 rounded-lg border border-gray-100 bg-gray-50 p-4 text-sm text-gray-600">
              {movie.year && (
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4 text-blue-500" />
                  <span className="font-medium">{movie.year}</span>
                </div>
              )}
              {movie.runtime && (
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4 text-green-500" />
                  <span className="font-medium">{movie.runtime} min</span>
                </div>
              )}
              {movie.rating && (
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  <span className="font-medium">{movie.rating} IMDb</span>
                </div>
              )}
            </div>

            {/* Genres */}
            {genres.length > 0 && (
              <div className="mb-6 rounded-lg border border-gray-100 bg-white p-4">
                <h3 className="mb-3 text-sm font-semibold tracking-wide text-gray-900 uppercase">
                  Genres
                </h3>
                <div className="flex flex-wrap gap-2">
                  {genres.map(genre => (
                    <Badge
                      key={genre}
                      variant="outline"
                      className="border border-blue-200 bg-blue-100 text-blue-800"
                    >
                      {genre}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Plot */}
            {movie.plot && (
              <div className="mb-6 rounded-lg border border-gray-100 bg-white p-4">
                <h3 className="mb-3 text-sm font-semibold tracking-wide text-gray-900 uppercase">
                  Plot
                </h3>
                <p className="rounded border border-gray-100 bg-gray-50 p-3 text-sm leading-relaxed text-gray-700">
                  {movie.plot}
                </p>
              </div>
            )}

            {/* Director */}
            {movie.director && movie.director.length > 0 && (
              <div className="mb-6 rounded-lg border border-gray-100 bg-white p-4">
                <h3 className="mb-3 text-sm font-semibold tracking-wide text-gray-900 uppercase">
                  Director
                </h3>
                <p className="text-sm font-medium text-gray-700">
                  {Array.isArray(movie.director) ? movie.director.join(', ') : movie.director}
                </p>
              </div>
            )}

            {/* Cast */}
            {actors.length > 0 && (
              <div className="mb-6 rounded-lg border border-gray-100 bg-white p-4">
                <h3 className="mb-3 text-sm font-semibold tracking-wide text-gray-900 uppercase">
                  Cast
                </h3>
                <p className="text-sm text-gray-700">{actors.slice(0, 5).join(', ')}</p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
