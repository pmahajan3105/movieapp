import React from 'react'
import { Bookmark, BookmarkCheck } from 'lucide-react'
import type { Movie } from '@/types'
import Image from 'next/image'

interface DaisyUIMovieCardProps {
  movie: Movie
  onMovieClick: (movie: Movie) => void
  onAddToWatchlist: (movieId: string) => void
  isInWatchlist: boolean
  className?: string
}

export function DaisyUIMovieCard({
  movie,
  onMovieClick,
  onAddToWatchlist,
  isInWatchlist,
  className = '',
}: DaisyUIMovieCardProps) {
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const target = e.target as HTMLImageElement
    target.src =
      'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjQ1MCIgdmlld0JveD0iMCAwIDMwMCA0NTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMDAiIGhlaWdodD0iNDUwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xMjUgMTc1SDE3NVYyMjVIMTI1VjE3NVoiIGZpbGw9IiM5Q0EzQUYiLz4KPHA+CjxyZWN0IHg9IjEwMCIgeT0iMjUwIiB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwIiBmaWxsPSIjOUNBM0FGIi8+CjxyZWN0IHg9IjEyNSIgeT0iMjcwIiB3aWR0aD0iNTAiIGhlaWdodD0iMTAiIGZpbGw9IiM5Q0EzQUYiLz4KPHA+Cjx0ZXh0IHg9IjE1MCIgeT0iMzAwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjNkI3MjgwIiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZm9udC13ZWlnaHQ9IjUwMCI+Tm8gSW1hZ2U8L3RleHQ+Cjwvc3ZnPgo='
  }

  return (
    <div className={`card bg-base-100 movie-card-hover shadow-lg ${className}`}>
      {/* Movie Poster */}
      <figure className="relative aspect-[2/3] overflow-hidden">
        <Image
          src={movie.poster_url || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjQ1MCIgdmlld0JveD0iMCAwIDMwMCA0NTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMDAiIGhlaWdodD0iNDUwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xMjUgMTc1SDE3NVYyMjVIMTI1VjE3NVoiIGZpbGw9IiM5Q0EzQUYiLz4KPHA+CjxyZWN0IHg9IjEwMCIgeT0iMjUwIiB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwIiBmaWxsPSIjOUNBM0FGIi8+CjxyZWN0IHg9IjEyNSIgeT0iMjcwIiB3aWR0aD0iNTAiIGhlaWdodD0iMTAiIGZpbGw9IiM5Q0EzQUYiLz4KPHA+Cjx0ZXh0IHg9IjE1MCIgeT0iMzAwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjNkI3MjgwIiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZm9udC13ZWlnaHQ9IjUwMCI+Tm8gSW1hZ2U8L3RleHQ+Cjwvc3ZnPgo='}
          alt={movie.title}
          width={300}
          height={450}
          className="h-full w-full object-cover"
          onError={handleImageError}
          unoptimized
        />

        {/* Watchlist Button Overlay */}
        <div className="absolute top-2 right-2">
          <button
            onClick={e => {
              e.stopPropagation()
              onAddToWatchlist(movie.id)
            }}
            className={`btn btn-sm btn-circle ${
              isInWatchlist
                ? 'btn-success text-success-content'
                : 'btn-primary btn-outline bg-base-100/80 backdrop-blur-sm'
            }`}
            title={isInWatchlist ? 'Remove from watchlist' : 'Add to watchlist'}
          >
            {isInWatchlist ? (
              <BookmarkCheck className="h-4 w-4" />
            ) : (
              <Bookmark className="h-4 w-4" />
            )}
          </button>
        </div>

        {/* Rating Badge */}
        {movie.rating && (
          <div className="absolute top-2 left-2">
            <div className="badge badge-warning text-warning-content font-bold">
              ⭐ {movie.rating.toFixed(1)}
            </div>
          </div>
        )}
      </figure>

      {/* Movie Details */}
      <div className="card-body p-4">
        <h3
          className="card-title hover:text-primary line-clamp-2 cursor-pointer text-lg transition-colors"
          onClick={() => onMovieClick(movie)}
        >
          {movie.title}
        </h3>

        <div className="text-base-content/70 flex flex-col gap-2 text-sm">
          {movie.year && <span className="badge badge-ghost">{movie.year}</span>}

          {movie.genre && movie.genre.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {movie.genre.slice(0, 2).map((genre, index) => (
                <span key={index} className="badge badge-primary badge-outline badge-sm">
                  {genre}
                </span>
              ))}
              {movie.genre.length > 2 && (
                <span className="badge badge-ghost badge-sm">+{movie.genre.length - 2}</span>
              )}
            </div>
          )}

          {movie.runtime && (
            <span className="text-xs">
              {Math.floor(movie.runtime / 60)}h {movie.runtime % 60}m
            </span>
          )}
        </div>

        {/* Movie Plot Preview */}
        {movie.plot && (
          <p className="text-base-content/60 mt-2 line-clamp-2 text-sm">{movie.plot}</p>
        )}

        {/* Action Buttons */}
        <div className="card-actions mt-4 justify-end">
          <button className="btn btn-primary btn-sm" onClick={() => onMovieClick(movie)}>
            Details
          </button>
        </div>
      </div>
    </div>
  )
}
