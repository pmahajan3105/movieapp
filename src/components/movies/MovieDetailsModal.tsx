import React from 'react'
import Image from 'next/image'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, Minus, Star, Calendar, Clock } from 'lucide-react'
import type { Movie } from '@/types'
import { toast } from 'react-hot-toast'
import { useAsyncAction } from '@/hooks/useAsyncOperation'

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
  const { isLoading, execute } = useAsyncAction()

  if (!movie) return null

  const handleWatchlistAction = async () => {
    if (!movie) return

    console.log('🎬 Watchlist action triggered', { movieId: movie.id, isInWatchlist })

    const success = await execute(async () => {
      if (isInWatchlist) {
        console.log('🗑️ Removing from watchlist...')
        await onRemoveFromWatchlist?.(movie.id)
      } else {
        console.log('➕ Adding to watchlist...')
        await onAddToWatchlist?.(movie.id)
      }
    })

    if (!success) {
      console.error('❌ Watchlist action failed')
      toast.error('Failed to update watchlist. Please try again.')
    }
  }

  // Handle genres - check if it's array or string
  const genres = Array.isArray(movie.genre) ? movie.genre : movie.genre ? [movie.genre] : []
  // Handle cast/actors - check both field names for compatibility
  const actors = movie.actors || (movie as any).cast || []

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto border border-gray-200 bg-white shadow-xl">
        <DialogHeader className="-m-6 mb-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50 p-6">
          <DialogTitle className="text-2xl font-bold text-gray-900">
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

            {/* Movie IDs */}
            <div className="flex flex-wrap gap-4 rounded-lg border border-gray-100 bg-gray-50 p-4">
              {movie.imdb_id && (
                <div className="rounded border border-gray-200 bg-white p-3">
                  <h4 className="text-xs font-medium tracking-wide text-gray-500 uppercase">
                    IMDb ID
                  </h4>
                  <p className="font-mono text-sm text-gray-900">{movie.imdb_id}</p>
                </div>
              )}
              {/* TMDB ID is internal; no need to show to users */}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
