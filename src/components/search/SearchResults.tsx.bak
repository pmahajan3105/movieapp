'use client'

import React from 'react'
import { Grid, List, ChevronLeft, ChevronRight, Star, Calendar, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { MovieGridSkeleton } from '@/components/movies/MovieCardSkeleton'
import { motion } from 'framer-motion'
import type { Movie } from '@/types'
import Image from 'next/image'

interface SearchMeta {
  query: string
  appliedFilters: Record<string, unknown>
  resultCount: number
  executionTime: number
}

interface SearchResultsProps {
  movies: Movie[]
  totalCount: number
  currentPage: number
  pageSize: number
  onPageChange: (page: number) => void
  onMovieClick: (movie: Movie) => void
  loading?: boolean
  searchMeta?: SearchMeta
  viewMode?: 'grid' | 'list'
  onViewModeChange?: (mode: 'grid' | 'list') => void
  className?: string
}

// Simple movie card component for search results
interface SearchMovieCardProps {
  movie: Movie
  onMovieClick: (movie: Movie) => void
  variant?: 'card' | 'list'
}

function SearchMovieCard({ movie, onMovieClick, variant = 'card' }: SearchMovieCardProps) {
  const genres = Array.isArray(movie.genre) ? movie.genre : movie.genre ? [movie.genre] : []

  if (variant === 'list') {
    return (
      <Card
        className="cursor-pointer overflow-hidden transition-shadow hover:shadow-lg"
        onClick={() => onMovieClick(movie)}
      >
        <div className="flex">
          <div className="relative h-36 w-24 flex-shrink-0">
            {movie.poster_url ? (
              <Image
                src={movie.poster_url}
                alt={movie.title}
                fill
                className="object-cover"
                sizes="96px"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gray-200">
                <span className="text-xs text-gray-500">No poster</span>
              </div>
            )}
          </div>
          <CardContent className="flex-1 p-4">
            <h3 className="mb-1 text-lg font-semibold hover:text-blue-600">{movie.title}</h3>
            <div className="mb-2 flex items-center gap-4 text-sm text-gray-600">
              {movie.year && (
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {movie.year}
                </div>
              )}
              {movie.runtime && (
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {movie.runtime}m
                </div>
              )}
              {movie.rating !== null && movie.rating !== undefined && (
                <div className="flex items-center gap-1">
                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                  {Number(movie.rating).toFixed(1)}
                </div>
              )}
            </div>
            {genres.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-1">
                {genres.slice(0, 3).map(genre => (
                  <Badge key={genre} variant="secondary" className="text-xs">
                    {genre}
                  </Badge>
                ))}
              </div>
            )}
            {movie.plot && <p className="line-clamp-2 text-sm text-gray-700">{movie.plot}</p>}
          </CardContent>
        </div>
      </Card>
    )
  }

  return (
    <Card
      className="cursor-pointer overflow-hidden transition-shadow hover:shadow-lg"
      onClick={() => onMovieClick(movie)}
    >
      <div className="relative aspect-[2/3] w-full">
        {movie.poster_url ? (
          <Image
            src={movie.poster_url}
            alt={movie.title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gray-200">
            <span className="text-gray-500">No poster</span>
          </div>
        )}
        {movie.rating !== null && movie.rating !== undefined && (
          <div className="absolute top-2 right-2 rounded bg-black/70 px-2 py-1 text-xs text-white">
            ⭐ {Number(movie.rating).toFixed(1)}
          </div>
        )}
      </div>
      <CardContent className="p-4">
        <h3 className="mb-1 line-clamp-2 font-semibold hover:text-blue-600">{movie.title}</h3>
        <div className="mb-2 flex items-center justify-between text-sm text-gray-600">
          {movie.year && <span>{movie.year}</span>}
          {movie.runtime && <span>{movie.runtime}m</span>}
        </div>
        {genres.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {genres.slice(0, 2).map(genre => (
              <Badge key={genre} variant="secondary" className="text-xs">
                {genre}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function SearchResults({
  movies,
  totalCount,
  currentPage,
  pageSize,
  onPageChange,
  onMovieClick,
  loading = false,
  searchMeta,
  viewMode = 'grid',
  onViewModeChange,
  className = '',
}: SearchResultsProps) {
  const totalPages = Math.ceil(totalCount / pageSize)
  const startIndex = (currentPage - 1) * pageSize + 1
  const endIndex = Math.min(currentPage * pageSize, totalCount)

  // Pagination helper
  const generatePageNumbers = () => {
    const pages: (number | string)[] = []
    const maxVisiblePages = 5
    const halfVisible = Math.floor(maxVisiblePages / 2)

    let startPage = Math.max(1, currentPage - halfVisible)
    let endPage = Math.min(totalPages, currentPage + halfVisible)

    // Adjust if we're near the beginning or end
    if (endPage - startPage < maxVisiblePages - 1) {
      if (startPage === 1) {
        endPage = Math.min(totalPages, startPage + maxVisiblePages - 1)
      } else {
        startPage = Math.max(1, endPage - maxVisiblePages + 1)
      }
    }

    // Add first page and ellipsis if needed
    if (startPage > 1) {
      pages.push(1)
      if (startPage > 2) pages.push('...')
    }

    // Add visible pages
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i)
    }

    // Add ellipsis and last page if needed
    if (endPage < totalPages) {
      if (endPage < totalPages - 1) pages.push('...')
      pages.push(totalPages)
    }

    return pages
  }

  if (loading) {
    return (
      <div className={`space-y-4 ${className}`}>
        {/* Loading skeleton header */}
        <div className="flex items-center justify-between">
          <div className="h-6 w-32 animate-pulse rounded bg-gray-200" />
          <div className="h-8 w-24 animate-pulse rounded bg-gray-200" />
        </div>

        {/* Enhanced skeleton using our MovieGridSkeleton */}
        <MovieGridSkeleton count={pageSize || 12} />
      </div>
    )
  }

  if (movies.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div className="mb-4 text-gray-400">
            <svg className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2h4a1 1 0 110 2h-1v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6H3a1 1 0 110-2h4z"
              />
            </svg>
          </div>
          <h3 className="mb-2 text-lg font-medium text-gray-900">No movies found</h3>
          <p className="max-w-md text-center text-gray-500">
            {searchMeta?.query
              ? `No movies match your search for &ldquo;${searchMeta.query}&rdquo;. Try adjusting your filters or search terms.`
              : 'No movies match your current filters. Try adjusting your criteria.'}
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Results Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="text-sm text-gray-600">
            Showing {startIndex}-{endIndex} of {totalCount.toLocaleString()} results
            {searchMeta?.executionTime && (
              <span className="ml-2">({searchMeta.executionTime}ms)</span>
            )}
          </div>
          {searchMeta?.query && (
            <div className="text-lg font-medium">Results for &ldquo;{searchMeta.query}&rdquo;</div>
          )}
        </div>

        {/* View Mode Toggle */}
        {onViewModeChange && (
          <div className="flex rounded-lg border p-1">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => onViewModeChange('grid')}
            >
              <Grid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => onViewModeChange('list')}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Results Grid */}
      <div
        className={
          viewMode === 'grid'
            ? 'grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
            : 'space-y-4'
        }
      >
        {movies.map((movie, index) => (
          <motion.div
            key={movie.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.3,
              delay: index * 0.05, // Staggered animation
              ease: 'easeOut',
            }}
          >
            <SearchMovieCard
              movie={movie}
              onMovieClick={onMovieClick}
              variant={viewMode === 'list' ? 'list' : 'card'}
            />
          </motion.div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center space-x-2 pt-6">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>

          {generatePageNumbers().map((page, index) => (
            <React.Fragment key={index}>
              {page === '...' ? (
                <span className="px-2 text-gray-500">...</span>
              ) : (
                <Button
                  variant={page === currentPage ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => onPageChange(page as number)}
                  disabled={page === currentPage}
                >
                  {page}
                </Button>
              )}
            </React.Fragment>
          ))}

          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  )
}
