'use client'

import React, { useState } from 'react'
import Image from 'next/image'
import { ThumbsUp, ThumbsDown, Heart, X } from 'lucide-react'
import { QuickRateCardProps } from '@/types'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export const QuickRateCard: React.FC<QuickRateCardProps> = ({ movie, onRate, className = '' }) => {
  const [isRating, setIsRating] = useState(false)

  const handleLike = () => {
    setIsRating(true)
    setTimeout(() => {
      onRate(true)
    }, 200)
  }

  const handleDislike = () => {
    setIsRating(true)
    setTimeout(() => {
      onRate(false)
    }, 200)
  }

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl bg-white shadow-lg',
        'border border-gray-200 transition-all duration-300',
        'mx-auto max-w-sm',
        isRating && 'scale-95 opacity-75',
        className
      )}
    >
      {/* Movie Poster */}
      <div className="relative aspect-[3/4]">
        {movie.poster_url ? (
          <Image
            src={movie.poster_url}
            alt={movie.title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 400px"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-gray-300 to-gray-500">
            <span className="text-4xl font-bold text-white">{movie.title.charAt(0)}</span>
          </div>
        )}

        {/* Quick Action Buttons */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity duration-200 hover:opacity-100">
          <div className="flex gap-6">
            <Button
              onClick={handleDislike}
              size="lg"
              className="transform rounded-full bg-red-500 p-4 text-white shadow-lg transition-all duration-200 hover:scale-110 hover:bg-red-600"
              disabled={isRating}
            >
              <X className="h-8 w-8" />
            </Button>

            <Button
              onClick={handleLike}
              size="lg"
              className="transform rounded-full bg-green-500 p-4 text-white shadow-lg transition-all duration-200 hover:scale-110 hover:bg-green-600"
              disabled={isRating}
            >
              <Heart className="h-8 w-8 fill-current" />
            </Button>
          </div>
        </div>

        {/* Movie Rating */}
        {movie.rating && (
          <div className="absolute left-3 top-3 flex items-center gap-1 rounded bg-black/70 px-2 py-1 text-sm text-white">
            ⭐ {movie.rating.toFixed(1)}
          </div>
        )}

        {/* Year Badge */}
        <div className="absolute right-3 top-3 rounded bg-purple-600 px-2 py-1 text-sm font-medium text-white">
          {movie.year}
        </div>

        {/* Rating Animation Overlay */}
        {isRating && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80">
            <div className="animate-pulse text-lg font-bold text-white">Rating...</div>
          </div>
        )}
      </div>

      {/* Movie Details */}
      <div className="p-4">
        <h3 className="mb-2 line-clamp-2 text-lg font-bold text-gray-900">{movie.title}</h3>

        {/* Genres */}
        <div className="mb-3 flex flex-wrap gap-1">
          {movie.genre?.slice(0, 3).map(genre => (
            <span
              key={genre}
              className="rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800"
            >
              {genre}
            </span>
          ))}
        </div>

        {/* Director */}
        {movie.director && movie.director.length > 0 && (
          <p className="mb-2 text-sm text-gray-600">
            <span className="font-medium">Director:</span> {movie.director[0]}
          </p>
        )}

        {/* Plot Preview */}
        {movie.plot && <p className="mb-4 line-clamp-3 text-sm text-gray-700">{movie.plot}</p>}

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button
            onClick={handleDislike}
            variant="outline"
            className="flex-1 border-red-300 text-red-600 transition-colors hover:bg-red-50"
            disabled={isRating}
          >
            <ThumbsDown className="mr-2 h-4 w-4" />
            Skip
          </Button>

          <Button
            onClick={handleLike}
            className="flex-1 bg-green-600 text-white transition-colors hover:bg-green-700"
            disabled={isRating}
          >
            <ThumbsUp className="mr-2 h-4 w-4" />
            Like
          </Button>
        </div>

        {/* Runtime and additional info */}
        <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
          {movie.runtime && <span>{movie.runtime} minutes</span>}
          {movie.actors && movie.actors.length > 0 && (
            <span className="ml-2 truncate">{movie.actors.slice(0, 2).join(', ')}</span>
          )}
        </div>
      </div>

      {/* Swipe Indicators */}
      <div className="absolute bottom-20 left-0 right-0 flex justify-center gap-8 opacity-50">
        <div className="flex items-center gap-1 text-red-500">
          <X className="h-4 w-4" />
          <span className="text-xs">Swipe left</span>
        </div>
        <div className="flex items-center gap-1 text-green-500">
          <Heart className="h-4 w-4" />
          <span className="text-xs">Swipe right</span>
        </div>
      </div>
    </div>
  )
}
