import React from 'react'
import Image from 'next/image'
import { Plus, Check } from 'lucide-react'
import type { Movie } from '@/types'

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
  className = ''
}: DaisyUIMovieCardProps) {
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const target = e.target as HTMLImageElement
    target.src = '/placeholder-movie.jpg'
  }

  return (
    <div className={`card bg-base-100 shadow-lg movie-card-hover ${className}`}>
      {/* Movie Poster */}
      <figure className="relative aspect-[2/3] overflow-hidden">
        <Image
          src={movie.poster_url || '/placeholder-movie.jpg'}
          alt={movie.title}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
          className="object-cover transition-transform duration-300 hover:scale-105"
          onError={handleImageError}
        />
        
        {/* Watchlist Button Overlay */}
        <div className="absolute top-2 right-2">
          <button
            onClick={(e) => {
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
              <Check className="h-4 w-4" />
            ) : (
              <Plus className="h-4 w-4" />
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
          className="card-title text-lg line-clamp-2 cursor-pointer hover:text-primary transition-colors"
          onClick={() => onMovieClick(movie)}
        >
          {movie.title}
        </h3>
        
        <div className="flex flex-col gap-2 text-sm text-base-content/70">
          {movie.year && (
            <span className="badge badge-ghost">{movie.year}</span>
          )}
          
          {movie.genre && movie.genre.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {movie.genre.slice(0, 2).map((genre, index) => (
                <span key={index} className="badge badge-primary badge-outline badge-sm">
                  {genre}
                </span>
              ))}
              {movie.genre.length > 2 && (
                <span className="badge badge-ghost badge-sm">
                  +{movie.genre.length - 2}
                </span>
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
          <p className="text-sm text-base-content/60 line-clamp-2 mt-2">
            {movie.plot}
          </p>
        )}

        {/* Action Buttons */}
        <div className="card-actions justify-end mt-4">
          <button 
            className="btn btn-primary btn-sm"
            onClick={() => onMovieClick(movie)}
          >
            Details
          </button>
        </div>
      </div>
    </div>
  )
} 