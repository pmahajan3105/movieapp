'use client'

import React, { useState, useCallback, useEffect, Suspense } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useSearchParams } from 'next/navigation'
import { FilterPanel } from '@/components/search/FilterPanel'
import { FilterChips } from '@/components/search/FilterChips'
import { SearchResults } from '@/components/search/SearchResults'
import { MovieDetailsModal } from '@/components/movies/MovieDetailsModal'
import type { Movie } from '@/types'
import type { SearchFilters, SearchResponse } from '@/types/search'
import { toast } from 'react-hot-toast'

function SearchPageContent() {
  const { user } = useAuth()
  const searchParams = useSearchParams()

  const [filters, setFilters] = useState<SearchFilters>({
    query: searchParams.get('q') || '',
    limit: 20,
    offset: 0,
    sortBy: 'relevance',
    sortOrder: 'desc',
  })

  const [searchResults, setSearchResults] = useState<SearchResponse['data']>()
  const [loading, setLoading] = useState(false)
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  // Perform search
  const performSearch = useCallback(async (searchFilters: SearchFilters) => {
    setLoading(true)
    try {
      const params = new URLSearchParams()

      if (searchFilters.query) params.set('query', searchFilters.query)
      if (searchFilters.genres?.length) params.set('genres', searchFilters.genres.join(','))
      if (searchFilters.yearRange) params.set('yearRange', JSON.stringify(searchFilters.yearRange))
      if (searchFilters.minRating) params.set('minRating', searchFilters.minRating.toString())
      if (searchFilters.maxRating) params.set('maxRating', searchFilters.maxRating.toString())
      if (searchFilters.limit) params.set('limit', searchFilters.limit.toString())
      if (searchFilters.offset) params.set('offset', searchFilters.offset.toString())
      if (searchFilters.sortBy) params.set('sortBy', searchFilters.sortBy)
      if (searchFilters.sortOrder) params.set('sortOrder', searchFilters.sortOrder)

      console.log('🔍 Performing search with filters:', searchFilters)

      const response = await fetch(`/api/movies/search?${params}`)
      const data: SearchResponse = await response.json()

      if (data.success && data.data) {
        setSearchResults(data.data)
        console.log(`🔍 Search successful: ${data.data.movies.length} movies found`)
      } else {
        toast.error(data.error || 'Search failed')
        setSearchResults(undefined)
      }
    } catch (error) {
      console.error('Search error:', error)
      toast.error('Search failed. Please try again.')
      setSearchResults(undefined)
    } finally {
      setLoading(false)
    }
  }, [])

  // Handle filter changes
  const handleFiltersChange = useCallback(
    (newFilters: SearchFilters) => {
      const updatedFilters = { ...newFilters, offset: 0 }
      setFilters(updatedFilters)
      setCurrentPage(1)
      performSearch(updatedFilters)
    },
    [performSearch]
  )

  // Handle filter removal
  const handleRemoveFilter = useCallback(
    (filterKey: string, value?: unknown) => {
      const newFilters = { ...filters }

      if (value !== undefined) {
        // @ts-expect-error - Dynamic property assignment for filter object
        newFilters[filterKey] = value
      } else {
        // @ts-expect-error - Dynamic property deletion for filter object
        delete newFilters[filterKey]
      }

      handleFiltersChange(newFilters)
    },
    [filters, handleFiltersChange]
  )

  // Handle pagination
  const handlePageChange = useCallback(
    (page: number) => {
      const newOffset = (page - 1) * (filters.limit || 20)
      const newFilters = { ...filters, offset: newOffset }
      setFilters(newFilters)
      setCurrentPage(page)
      performSearch(newFilters)
    },
    [filters, performSearch]
  )

  // Handle add to watchlist
  const handleAddToWatchlist = useCallback(
    async (movieId: string) => {
      if (!user) {
        toast.error('Please sign in to add movies to your watchlist')
        return
      }

      try {
        const response = await fetch('/api/watchlist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ movie_id: movieId }),
        })

        const data = await response.json()
        if (data.success) {
          toast.success('Added to watchlist!')
        } else {
          toast.error(data.error || 'Failed to add to watchlist')
        }
      } catch (error) {
        console.error('Watchlist error:', error)
        toast.error('Failed to add to watchlist')
      }
    },
    [user]
  )

  // Initial search on mount
  useEffect(() => {
    if (filters.query) {
      performSearch(filters)
    }
  }, [filters, performSearch])

  // Update filters when URL search params change
  useEffect(() => {
    const queryFromUrl = searchParams.get('q') || ''
    if (queryFromUrl !== filters.query) {
      const newFilters = { ...filters, query: queryFromUrl, offset: 0 }
      setFilters(newFilters)
      setCurrentPage(1)
      if (queryFromUrl) {
        performSearch(newFilters)
      }
    }
  }, [searchParams, filters, performSearch])

  const currentQuery = filters.query || searchParams.get('q') || ''

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="mb-2 text-3xl font-bold text-gray-900">
            {currentQuery ? (
              <>
                Search Results for{' '}
                <span className="text-purple-600">&ldquo;{currentQuery}&rdquo;</span>
              </>
            ) : (
              'Search Movies 🔍'
            )}
          </h1>
          {currentQuery && searchResults && (
            <p className="text-gray-600">
              Found {searchResults.totalCount} movies matching your search
            </p>
          )}
          {!currentQuery && (
            <p className="text-gray-600">
              Use the search bar above to find movies, or apply filters below to browse our
              collection
            </p>
          )}
        </div>

        <div className="flex gap-8">
          {/* Filter Panel */}
          <div className="w-80 flex-shrink-0">
            <FilterPanel
              filters={filters}
              onFiltersChange={handleFiltersChange}
              isLoading={loading}
            />
          </div>

          {/* Main Content */}
          <div className="min-w-0 flex-1">
            {/* Active Filters */}
            <FilterChips
              filters={filters}
              onRemoveFilter={handleRemoveFilter}
              onClearAll={() =>
                handleFiltersChange({
                  query: filters.query,
                  limit: filters.limit,
                  offset: filters.offset,
                  sortBy: filters.sortBy,
                  sortOrder: filters.sortOrder,
                })
              }
              className="mb-6"
            />

            {/* Search Results */}
            <SearchResults
              movies={searchResults?.movies || []}
              totalCount={searchResults?.totalCount || 0}
              currentPage={currentPage}
              pageSize={filters.limit || 20}
              onPageChange={handlePageChange}
              onMovieClick={setSelectedMovie}
              loading={loading}
              searchMeta={searchResults?.searchMeta}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
            />
          </div>
        </div>

        {/* Movie Details Modal */}
        <MovieDetailsModal
          movie={selectedMovie}
          open={!!selectedMovie}
          onClose={() => setSelectedMovie(null)}
          onAddToWatchlist={handleAddToWatchlist}
          isInWatchlist={false}
        />
      </div>
    </div>
  )
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="mx-auto h-32 w-32 animate-spin rounded-full border-b-2 border-purple-600"></div>
            <p className="mt-4 text-gray-600">Loading search...</p>
          </div>
        </div>
      }
    >
      <SearchPageContent />
    </Suspense>
  )
}
