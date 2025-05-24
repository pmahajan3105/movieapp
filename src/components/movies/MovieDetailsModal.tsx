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
}

export function MovieDetailsModal({
  movie,
  open,
  onClose,
  onAddToWatchlist,
  onRemoveFromWatchlist,
  isInWatchlist = false,
}: MovieDetailsModalProps) {
  const [isLoading, setIsLoading] = useState(false)

  if (!movie) return null

  const handleWatchlistAction = async () => {
    if (!movie) return

    console.log('🎬 Watchlist action triggered', { movieId: movie.id, isInWatchlist })

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
            <div className="mt-4">
              <Button
                onClick={handleWatchlistAction}
                disabled={isLoading}
                className="w-full"
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
            </div>
          </div>

          {/* Movie Details */}
          <div className="md:col-span-2">
            {/* Movie Metadata */}
            <div className="mb-4 flex flex-wrap items-center gap-4 text-sm text-gray-600">
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
                  {movie.rating} IMDb
                </div>
              )}
            </div>

            {/* Genres */}
            {genres.length > 0 && (
              <div className="mb-4">
                <h3 className="mb-2 text-sm font-semibold text-gray-900">Genres</h3>
                <div className="flex flex-wrap gap-2">
                  {genres.map(genre => (
                    <Badge key={genre} variant="secondary">
                      {genre}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Plot */}
            {movie.plot && (
              <div className="mb-4">
                <h3 className="mb-2 text-sm font-semibold text-gray-900">Plot</h3>
                <p className="text-sm leading-relaxed text-gray-700">{movie.plot}</p>
              </div>
            )}

            {/* Director */}
            {movie.director && movie.director.length > 0 && (
              <div className="mb-4">
                <h3 className="mb-2 text-sm font-semibold text-gray-900">Director</h3>
                <p className="text-sm text-gray-700">
                  {Array.isArray(movie.director) ? movie.director.join(', ') : movie.director}
                </p>
              </div>
            )}

            {/* Cast */}
            {actors.length > 0 && (
              <div className="mb-4">
                <h3 className="mb-2 text-sm font-semibold text-gray-900">Cast</h3>
                <p className="text-sm text-gray-700">{actors.slice(0, 5).join(', ')}</p>
              </div>
            )}

            {/* Additional Movie Info */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {movie.omdb_id && (
                <div>
                  <h4 className="text-xs font-medium text-gray-500">OMDB ID</h4>
                  <p className="text-sm text-gray-900">{movie.omdb_id}</p>
                </div>
              )}
              {movie.imdb_id && (
                <div>
                  <h4 className="text-xs font-medium text-gray-500">IMDb ID</h4>
                  <p className="text-sm text-gray-900">{movie.imdb_id}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
