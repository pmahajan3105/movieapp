'use client'

import React from 'react'
import Image from 'next/image'
import { Heart, Bookmark, Star, ThumbsUp, ThumbsDown } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { ConfidenceBadge } from '@/components/ui/ConfidenceBadge'
import { ExplanationBadge } from '@/components/ui/ExplanationBadge'
import { ExplanationPopover } from '@/components/movies/ExplanationPopover'
import { useRateMovie } from '@/hooks/useRateMovie'
import { cn } from '@/lib/utils'
import { MovieGridCardProps } from '@/types'

export const MovieGridCard: React.FC<MovieGridCardProps> = ({
  movie,
  userRating,
  onRate,
  onAddToWatchlist,
  size = 'md',
  className = '',
  priority = false, // Add priority prop for above-the-fold images
  index = 0, // Add index prop for determining priority
}) => {
  const { mutate: rateMovie } = useRateMovie()

  const sizeClasses = {
    sm: 'w-32',
    md: 'w-40',
    lg: 'w-48',
  }

  const posterAspectRatio = 'aspect-[3/4]'

  const handleLike = () => {
    if (onRate) {
      onRate(movie.id, true)
    } else {
      rateMovie({ movie_id: movie.id, interested: true })
    }
  }

  const handleDislike = () => {
    if (onRate) {
      onRate(movie.id, false)
    } else {
      rateMovie({ movie_id: movie.id, interested: false })
    }
  }

  const handleAddToWatchlist = () => {
    onAddToWatchlist(movie.id)
  }

  const renderQuickActions = () => (
    <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={handleLike}
          className="bg-green-600 p-2 text-white hover:bg-green-700"
          title="Like"
          aria-label={`Like ${movie.title}`}
        >
          <ThumbsUp className="h-4 w-4" />
        </Button>

        <Button
          size="sm"
          onClick={handleDislike}
          variant="outline"
          className="border-red-300 bg-white/90 p-2 text-red-600 hover:bg-white"
          title="Pass"
          aria-label={`Dislike ${movie.title}`}
        >
          <ThumbsDown className="h-4 w-4" />
        </Button>

        <Button
          size="sm"
          onClick={handleAddToWatchlist}
          variant="outline"
          className="border-blue-300 bg-white/90 p-2 text-blue-600 hover:bg-white"
          title="Add to Watchlist"
          aria-label={`Add ${movie.title} to watchlist`}
        >
          <Bookmark className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )

  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-lg bg-white shadow-md transition-all duration-200 hover:shadow-lg',
        'cursor-pointer border border-gray-200',
        sizeClasses[size],
        className
      )}
    >
      {/* Movie Poster */}
      <div className={cn('relative', posterAspectRatio)}>
        {movie.poster_url ? (
          <Image
            src={movie.poster_url}
            alt={movie.title}
            fill
            className="object-cover transition-opacity duration-300"
            sizes={`(max-width: 768px) 50vw, ${size === 'sm' ? '16vw' : size === 'md' ? '20vw' : '24vw'}`}
            priority={priority || index < 6} // Prioritize first 6 images
            placeholder="blur"
            blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k="
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-gray-300 to-gray-500">
            <span className="text-lg font-bold text-white">{movie.title.charAt(0)}</span>
          </div>
        )}

        {/* User Rating Indicator */}
        {userRating && (
          <div className="absolute top-2 right-2 z-10">
            {userRating.interested ? (
              <div className="rounded-full bg-green-500 p-1 text-white">
                <Heart className="h-3 w-3 fill-current" />
              </div>
            ) : (
              <div className="rounded-full bg-red-500 p-1 text-white">
                <ThumbsDown className="h-3 w-3" />
              </div>
            )}
          </div>
        )}

        {/* Movie Rating (IMDb rating) */}
        {movie.rating && (
          <div className="absolute top-2 left-2 flex items-center gap-1 rounded bg-black/70 px-1.5 py-0.5 text-xs text-white">
            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
            {movie.rating.toFixed(1)}
          </div>
        )}

        {/* Explanation confidence badge */}
        {(movie as any).explanation && (
          <div className="absolute bottom-2 right-2 z-20 flex flex-col items-end gap-1 group/expl">
            <ConfidenceBadge explanation={(movie as any).explanation} />
            <ExplanationBadge explanation={(movie as any).explanation} className="max-w-[8rem]" />
            {/* popover */}
            <div className="absolute bottom-full right-0 mb-2 hidden group-hover/expl:block w-64">
              <ExplanationPopover explanation={(movie as any).explanation} />
            </div>
          </div>
        )}

        {/* Quick Actions Overlay */}
        {renderQuickActions()}
      </div>

      {/* Movie Info */}
      <div className="p-3">
        <h3 className="mb-1 line-clamp-2 text-sm font-semibold text-gray-900">{movie.title}</h3>

        <div className="mb-2 text-xs text-gray-600">{movie.year}</div>

        {/* Genres */}
        <div className="flex flex-wrap gap-1">
          {(() => {
            if (!movie.genre) return null
            const genres = Array.isArray(movie.genre) ? movie.genre : [movie.genre]
            return genres.slice(0, 2).map(genre => (
              <span key={genre} className="rounded bg-blue-100 px-1.5 py-0.5 text-xs text-blue-800">
                {genre}
              </span>
            ))
          })()}
        </div>

        {/* Runtime */}
        {movie.runtime && <div className="mt-1 text-xs text-gray-500">{movie.runtime} min</div>}
      </div>
    </div>
  )
}
