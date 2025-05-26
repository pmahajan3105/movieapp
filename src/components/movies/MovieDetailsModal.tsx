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
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto bg-white border border-gray-200 shadow-xl">
        <DialogHeader className="bg-gradient-to-r from-blue-50 to-purple-50 -m-6 mb-6 p-6 border-b border-gray-200">
          <DialogTitle className="text-2xl font-bold text-gray-900">
            {movie.title} ({movie.year})
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3 bg-white p-1">
          {/* Movie Poster */}
          <div className="md:col-span-1">
            <div className="relative aspect-[2/3] w-full overflow-hidden rounded-lg shadow-lg border border-gray-200">
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
                  <span className="text-gray-500 font-medium">No poster available</span>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="mt-4">
              <Button
                onClick={handleWatchlistAction}
                disabled={isLoading}
                className="w-full shadow-md"
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
          <div className="md:col-span-2 bg-white">
            {/* Movie Metadata */}
            <div className="mb-6 flex flex-wrap items-center gap-4 text-sm text-gray-600 bg-gray-50 p-4 rounded-lg border border-gray-100">
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
              <div className="mb-6 bg-white p-4 rounded-lg border border-gray-100">
                <h3 className="mb-3 text-sm font-semibold text-gray-900 uppercase tracking-wide">Genres</h3>
                <div className="flex flex-wrap gap-2">
                  {genres.map(genre => (
                    <Badge key={genre} variant="outline" className="bg-blue-100 text-blue-800 border border-blue-200">
                      {genre}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Plot */}
            {movie.plot && (
              <div className="mb-6 bg-white p-4 rounded-lg border border-gray-100">
                <h3 className="mb-3 text-sm font-semibold text-gray-900 uppercase tracking-wide">Plot</h3>
                <p className="text-sm leading-relaxed text-gray-700 bg-gray-50 p-3 rounded border border-gray-100">{movie.plot}</p>
              </div>
            )}

            {/* Director */}
            {movie.director && movie.director.length > 0 && (
              <div className="mb-6 bg-white p-4 rounded-lg border border-gray-100">
                <h3 className="mb-3 text-sm font-semibold text-gray-900 uppercase tracking-wide">Director</h3>
                <p className="text-sm text-gray-700 font-medium">
                  {Array.isArray(movie.director) ? movie.director.join(', ') : movie.director}
                </p>
              </div>
            )}

            {/* Cast */}
            {actors.length > 0 && (
              <div className="mb-6 bg-white p-4 rounded-lg border border-gray-100">
                <h3 className="mb-3 text-sm font-semibold text-gray-900 uppercase tracking-wide">Cast</h3>
                <p className="text-sm text-gray-700">{actors.slice(0, 5).join(', ')}</p>
              </div>
            )}

            {/* Movie IDs */}
            <div className="flex flex-wrap gap-4 bg-gray-50 p-4 rounded-lg border border-gray-100">
              {movie.imdb_id && (
                <div className="bg-white p-3 rounded border border-gray-200">
                  <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide">IMDb ID</h4>
                  <p className="text-sm text-gray-900 font-mono">{movie.imdb_id}</p>
                </div>
              )}
              {movie.tmdb_id && (
                <div className="bg-white p-3 rounded border border-gray-200">
                  <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide">TMDB ID</h4>
                  <p className="text-sm text-gray-900 font-mono">{movie.tmdb_id}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
