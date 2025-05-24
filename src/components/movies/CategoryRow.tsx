'use client'

import React, { useRef } from 'react'
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react'
import { CategoryRowProps } from '@/types'
import { MovieGridCard } from './MovieGridCard'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export const CategoryRow: React.FC<CategoryRowProps> = ({
  category,
  movies,
  onRate,
  className = '',
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({
        left: -300,
        behavior: 'smooth',
      })
    }
  }

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({
        left: 300,
        behavior: 'smooth',
      })
    }
  }

  if (!movies || movies.length === 0) {
    return (
      <div className={cn('py-6', className)}>
        <div className="mb-4">
          <h2 className="flex items-center gap-2 text-xl font-bold text-gray-900">
            <Sparkles className="h-5 w-5 text-purple-500" />
            {category.category_name}
          </h2>
          <p className="mt-1 text-sm text-gray-600">{category.ai_description}</p>
        </div>
        <div className="py-8 text-center text-gray-500">No movies available in this category</div>
      </div>
    )
  }

  return (
    <div className={cn('group py-6', className)}>
      {/* Category Header */}
      <div className="mb-4 flex items-start justify-between">
        <div className="flex-1">
          <h2 className="mb-2 flex items-center gap-2 text-xl font-bold text-gray-900">
            <Sparkles className="h-5 w-5 text-purple-500" />
            {category.category_name}
          </h2>
          <p className="max-w-2xl text-sm leading-relaxed text-gray-600">
            {category.ai_description}
          </p>
        </div>

        {/* Navigation Buttons */}
        <div className="flex gap-2 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          <Button
            variant="outline"
            size="sm"
            onClick={scrollLeft}
            className="border-gray-300 bg-white/90 p-2 hover:bg-white"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={scrollRight}
            className="border-gray-300 bg-white/90 p-2 hover:bg-white"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Movies Scrollable Row */}
      <div className="relative">
        <div
          ref={scrollContainerRef}
          className="scrollbar-hide flex gap-4 overflow-x-auto pb-2"
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}
        >
          {movies.map(movie => (
            <div key={movie.id} className="flex-none">
              <MovieGridCard
                movie={movie}
                onRate={(movieId, interested) => {
                  onRate(movieId, interested)
                }}
                onAddToWatchlist={movieId => {
                  // Handle watchlist addition through rating system
                  onRate(movieId, true)
                }}
                size="md"
                showRating={true}
                className="transition-transform duration-200 hover:scale-105"
              />
            </div>
          ))}

          {/* Show More Placeholder */}
          <div className="flex w-40 flex-none items-center justify-center">
            <div className="flex h-48 w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 text-gray-500 transition-colors hover:border-gray-400 hover:text-gray-600">
              <Sparkles className="mb-2 h-8 w-8" />
              <span className="px-2 text-center text-sm">
                More {category.category_name.toLowerCase()}
              </span>
            </div>
          </div>
        </div>

        {/* Gradient Overlays for scroll indication */}
        <div className="pointer-events-none absolute bottom-0 left-0 top-0 w-8 bg-gradient-to-r from-white to-transparent" />
        <div className="pointer-events-none absolute bottom-0 right-0 top-0 w-8 bg-gradient-to-l from-white to-transparent" />
      </div>

      {/* Category Metadata */}
      <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
        <div>Generated on {new Date(category.generated_date).toLocaleDateString()}</div>
        <div>
          {movies.length} movie{movies.length !== 1 ? 's' : ''}
        </div>
      </div>
    </div>
  )
}
