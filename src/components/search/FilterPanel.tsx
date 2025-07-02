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
  const [genresError, setGenresError] = useState(false)
  const [expandedSections, setExpandedSections] = useState({
    genres: true,
    years: true,
    rating: true,
    sort: true,
  })

  // Load available genres with retry logic
  useEffect(() => {
    const loadGenres = async (attempt = 1) => {
      setGenresError(false)
      
      try {
        if (process.env.NODE_ENV === 'development') {
          console.log('🎬 FilterPanel: Loading genres... (attempt', attempt, ')')
        }
        const response = await fetch('/api/movies/genres')
        
        if (!response.ok) {
          if (process.env.NODE_ENV === 'development') {
            console.error('🚨 FilterPanel: Genres API failed:', {
              status: response.status,
              statusText: response.statusText,
              url: response.url,
              attempt
            })
          }
          
          // Retry logic for failed requests
          if (attempt < 3) {
            setTimeout(() => loadGenres(attempt + 1), 1000 * attempt) // Exponential backoff
            return
          } else {
            setGenresError(true)
            return
          }
        }

        const data = await response.json()
        if (process.env.NODE_ENV === 'development') {
          console.log('🎬 FilterPanel: Genres loaded successfully:', data)
        }
        
        if (data.success) {
          setGenres(data.data || [])
          setGenresError(false)
          setGenresLoading(false) // Success - stop loading
        } else {
          if (process.env.NODE_ENV === 'development') {
            console.warn('🟡 FilterPanel: Genres API returned success: false:', data)
          }
          if (attempt < 3) {
            setTimeout(() => loadGenres(attempt + 1), 1000 * attempt)
          } else {
            setGenresError(true)
            setGenresLoading(false)
          }
        }
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error('🚨 FilterPanel: Error loading genres:', {
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            timestamp: new Date().toISOString(),
            attempt
          })
        }
        
        // Retry on network errors
        if (attempt < 3) {
          setTimeout(() => loadGenres(attempt + 1), 1000 * attempt)
        } else {
          setGenresError(true)
          setGenresLoading(false)
        }
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
      sortBy: undefined,
      sortOrder: undefined,
    })
  }

  // Count active filters
  const activeFilterCount = [
    filters.genres?.length || 0,
    filters.yearRange ? 1 : 0,
    filters.minRating || filters.maxRating ? 1 : 0,
    filters.directors?.length || 0,
    filters.actors?.length || 0,
    filters.sortBy ? 1 : 0,
  ].reduce((sum, count) => sum + count, 0)

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }))
  }

  return (
    <Card className={`w-full rounded-xl ${className}`}>
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
            ) : genresError ? (
              <div className="text-center py-4">
                <p className="text-sm text-red-600 mb-2">Failed to load genres</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.location.reload()}
                  className="text-xs"
                >
                  Retry
                </Button>
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
                    <label htmlFor={`genre-${genre.name}`} className="flex-1 cursor-pointer text-sm">
                      {genre.name}
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

        {/* Sort Order */}
        <Collapsible open={expandedSections.sort} onOpenChange={() => toggleSection('sort')}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="h-auto w-full justify-between p-0">
              <span className="font-medium">Sort By</span>
              {expandedSections.sort ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-3 space-y-2">
            {[
              { value: 'popularity', label: 'Popularity' },
              { value: 'rating', label: 'Rating' },
              { value: 'year', label: 'Release Year' },
            ].map(opt => (
              <div key={opt.value} className="flex items-center space-x-2">
                <Checkbox
                  id={`sort-${opt.value}`}
                  checked={filters.sortBy === opt.value}
                  onCheckedChange={() =>
                    updateFilters({ sortBy: filters.sortBy === opt.value ? undefined : (opt.value as any) })
                  }
                />
                <label htmlFor={`sort-${opt.value}`} className="flex-1 cursor-pointer text-sm">
                  {opt.label}
                </label>
              </div>
            ))}
            {/* Sort order toggle */}
            {filters.sortBy && (
              <div className="flex items-center space-x-2 pt-2">
                <span className="text-sm">Order:</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => updateFilters({ sortOrder: filters.sortOrder === 'asc' ? 'desc' : 'asc' })}
                >
                  {filters.sortOrder === 'asc' ? 'Ascending' : 'Descending'}
                </Button>
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  )
}
