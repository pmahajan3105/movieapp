'use client'

import React, { useState, useEffect } from 'react'
import { Filter, ChevronDown, ChevronUp, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Slider } from '@/components/ui/slider'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import type { SearchFilters, GenreOption } from '@/types/search'

interface FilterPanelProps {
  filters: SearchFilters
  onFiltersChange: (filters: SearchFilters) => void
  isLoading?: boolean
  className?: string
}

export function FilterPanel({
  filters,
  onFiltersChange,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  isLoading: _isLoading = false,
  className = '',
}: FilterPanelProps) {
  const [genres, setGenres] = useState<GenreOption[]>([])
  const [genresLoading, setGenresLoading] = useState(true)
  const [expandedSections, setExpandedSections] = useState({
    genres: true,
    years: true,
    rating: true,
  })

  // Load available genres
  useEffect(() => {
    const loadGenres = async () => {
      try {
        const response = await fetch('/api/movies/genres')
        const data = await response.json()
        if (data.success) {
          setGenres(data.data || [])
        }
      } catch (error) {
        console.error('Error loading genres:', error)
      } finally {
        setGenresLoading(false)
      }
    }

    loadGenres()
  }, [])

  // Update filters
  const updateFilters = (updates: Partial<SearchFilters>) => {
    onFiltersChange({ ...filters, ...updates })
  }

  // Handle genre selection
  const handleGenreToggle = (genre: string) => {
    const currentGenres = filters.genres || []
    const newGenres = currentGenres.includes(genre)
      ? currentGenres.filter(g => g !== genre)
      : [...currentGenres, genre]

    updateFilters({ genres: newGenres.length > 0 ? newGenres : undefined })
  }

  // Handle year range change
  const handleYearRangeChange = (values: number[]) => {
    if (values.length >= 2 && values[0] !== undefined && values[1] !== undefined) {
      updateFilters({ yearRange: [values[0], values[1]] })
    }
  }

  // Handle rating range change
  const handleRatingChange = (values: number[]) => {
    updateFilters({
      minRating: values[0]! > 0 ? values[0]! : undefined,
      maxRating: values[1]! < 10 ? values[1]! : undefined,
    })
  }

  // Clear all filters
  const clearAllFilters = () => {
    onFiltersChange({
      query: filters.query, // Keep the search query
      limit: filters.limit,
      offset: filters.offset,
      sortBy: filters.sortBy,
      sortOrder: filters.sortOrder,
    })
  }

  // Count active filters
  const activeFilterCount = [
    filters.genres?.length || 0,
    filters.yearRange ? 1 : 0,
    filters.minRating || filters.maxRating ? 1 : 0,
    filters.directors?.length || 0,
    filters.actors?.length || 0,
  ].reduce((sum, count) => sum + count, 0)

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }))
  }

  return (
    <Card className={`w-full ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Filter className="h-5 w-5" />
            Filters
            {activeFilterCount > 0 && (
              <span className="rounded-full bg-blue-600 px-2 py-1 text-xs text-white">
                {activeFilterCount}
              </span>
            )}
          </CardTitle>
          {activeFilterCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllFilters}
              className="text-blue-600 hover:text-blue-700"
            >
              Clear All
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Genres Filter */}
        <Collapsible open={expandedSections.genres} onOpenChange={() => toggleSection('genres')}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="h-auto w-full justify-between p-0">
              <span className="font-medium">Genres</span>
              {expandedSections.genres ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-3">
            {genresLoading ? (
              <div className="space-y-2">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-4 animate-pulse rounded bg-gray-200" />
                ))}
              </div>
            ) : (
              <div className="max-h-48 space-y-2 overflow-y-auto">
                {genres.slice(0, 20).map(genre => (
                  <div key={genre.name} className="flex items-center space-x-2">
                    <Checkbox
                      id={`genre-${genre.name}`}
                      checked={filters.genres?.includes(genre.name) || false}
                      onCheckedChange={() => handleGenreToggle(genre.name)}
                    />
                    <label
                      htmlFor={`genre-${genre.name}`}
                      className="flex-1 cursor-pointer text-sm"
                    >
                      {genre.name}
                      <span className="ml-1 text-gray-400">({genre.count})</span>
                    </label>
                  </div>
                ))}
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>

        {/* Year Range Filter */}
        <Collapsible open={expandedSections.years} onOpenChange={() => toggleSection('years')}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="h-auto w-full justify-between p-0">
              <span className="font-medium">Release Year</span>
              {expandedSections.years ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-3 space-y-3">
            <div className="px-3">
              <Slider
                value={filters.yearRange || [1920, 2024]}
                onValueChange={handleYearRangeChange}
                min={1920}
                max={2024}
                step={1}
                className="w-full"
              />
            </div>
            <div className="flex justify-between text-sm text-gray-600">
              <span>{filters.yearRange ? filters.yearRange[0] : 1920}</span>
              <span>{filters.yearRange ? filters.yearRange[1] : 2024}</span>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Rating Filter */}
        <Collapsible open={expandedSections.rating} onOpenChange={() => toggleSection('rating')}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="h-auto w-full justify-between p-0">
              <span className="font-medium">IMDb Rating</span>
              {expandedSections.rating ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-3 space-y-3">
            <div className="px-3">
              <Slider
                value={[filters.minRating || 0, filters.maxRating || 10]}
                onValueChange={handleRatingChange}
                min={0}
                max={10}
                step={0.1}
                className="w-full"
              />
            </div>
            <div className="flex items-center justify-between text-sm text-gray-600">
              <div className="flex items-center gap-1">
                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                {(filters.minRating ?? 0).toFixed(1)}
              </div>
              <div className="flex items-center gap-1">
                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                {(filters.maxRating ?? 10).toFixed(1)}
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  )
}
