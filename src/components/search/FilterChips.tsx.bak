'use client'

import React from 'react'
import { X, Star, Calendar, Film } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { SearchFilters } from '@/types/search'

interface FilterChipsProps {
  filters: SearchFilters
  onRemoveFilter: (filterKey: string, value?: unknown) => void
  onClearAll: () => void
  className?: string
}

export function FilterChips({
  filters,
  onRemoveFilter,
  onClearAll,
  className = '',
}: FilterChipsProps) {
  // Generate filter chips
  const chips: Array<{
    id: string
    label: string
    value: unknown
    icon?: React.ReactNode
    filterKey: string
  }> = []

  // Genre chips
  filters.genres?.forEach(genre => {
    chips.push({
      id: `genre-${genre}`,
      label: genre,
      value: genre,
      icon: <Film className="h-3 w-3" />,
      filterKey: 'genres',
    })
  })

  // Year range chip
  if (filters.yearRange) {
    chips.push({
      id: 'year-range',
      label: `${filters.yearRange[0]} - ${filters.yearRange[1]}`,
      value: filters.yearRange,
      icon: <Calendar className="h-3 w-3" />,
      filterKey: 'yearRange',
    })
  }

  // Rating chips
  if (filters.minRating || filters.maxRating) {
    const minRating = filters.minRating || 0
    const maxRating = filters.maxRating || 10
    chips.push({
      id: 'rating-range',
      label: `★ ${minRating.toFixed(1)} - ${maxRating.toFixed(1)}`,
      value: { minRating: filters.minRating, maxRating: filters.maxRating },
      icon: <Star className="h-3 w-3" />,
      filterKey: 'rating',
    })
  }

  // Director chips
  filters.directors?.forEach(director => {
    chips.push({
      id: `director-${director}`,
      label: `Dir: ${director}`,
      value: director,
      filterKey: 'directors',
    })
  })

  // Actor chips
  filters.actors?.forEach(actor => {
    chips.push({
      id: `actor-${actor}`,
      label: `Actor: ${actor}`,
      value: actor,
      filterKey: 'actors',
    })
  })

  if (chips.length === 0) {
    return null
  }

  const handleRemoveChip = (chip: (typeof chips)[0]) => {
    if (chip.filterKey === 'genres') {
      const remainingGenres = filters.genres?.filter(g => g !== chip.value) || []
      onRemoveFilter('genres', remainingGenres.length > 0 ? remainingGenres : undefined)
    } else if (chip.filterKey === 'directors') {
      const remainingDirectors = filters.directors?.filter(d => d !== chip.value) || []
      onRemoveFilter('directors', remainingDirectors.length > 0 ? remainingDirectors : undefined)
    } else if (chip.filterKey === 'actors') {
      const remainingActors = filters.actors?.filter(a => a !== chip.value) || []
      onRemoveFilter('actors', remainingActors.length > 0 ? remainingActors : undefined)
    } else if (chip.filterKey === 'yearRange') {
      onRemoveFilter('yearRange')
    } else if (chip.filterKey === 'rating') {
      onRemoveFilter('minRating')
      onRemoveFilter('maxRating')
    }
  }

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <span className="text-sm font-medium text-gray-700">Active filters:</span>

      {chips.map(chip => (
        <Badge key={chip.id} variant="secondary" className="flex items-center gap-1 pr-1">
          {chip.icon}
          <span className="text-xs">{chip.label}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleRemoveChip(chip)}
            className="ml-1 h-4 w-4 p-0 hover:bg-gray-300"
          >
            <X className="h-3 w-3" />
            <span className="sr-only">Remove {chip.label} filter</span>
          </Button>
        </Badge>
      ))}

      {chips.length > 1 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearAll}
          className="text-blue-600 hover:text-blue-700"
        >
          Clear all
        </Button>
      )}
    </div>
  )
}
