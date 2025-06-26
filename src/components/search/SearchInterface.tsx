'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Search, X, Clock, Film } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardBody } from '@/components/ui/card'
import type { AutocompleteResponse } from '@/types/search'
import type { Movie } from '@/types'
import Image from 'next/image'
import { useAsyncOperation } from '@/hooks/useAsyncOperation'

interface SearchInterfaceProps {
  onSearch: (query: string) => void
  initialQuery?: string
  placeholder?: string
  showAutocomplete?: boolean
  className?: string
  onQueryChange?: (query: string) => void
}

export function SearchInterface({
  onSearch,
  initialQuery = '',
  placeholder = 'Search movies, directors, actors...',
  showAutocomplete = true,
  className = '',
  onQueryChange,
}: SearchInterfaceProps) {
  const [query, setQuery] = useState(initialQuery)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Sync query with initialQuery when it changes (for clearing from navigation)
  useEffect(() => {
    setQuery(initialQuery)
  }, [initialQuery])

  // Handle query changes
  const handleQueryChange = (newQuery: string) => {
    setQuery(newQuery)
    setSelectedIndex(-1)
    onQueryChange?.(newQuery)
  }

  // Use useAsyncOperation for autocomplete functionality
  const {
    isLoading: isLoadingAutocomplete,
    error: autocompleteError,
    data: autocompleteResponse,
    execute: executeAutocomplete,
  } = useAsyncOperation<{ success: boolean; movies: Movie[] }>()

  // Transform the response to match AutocompleteResponse format
  const autocompleteData: AutocompleteResponse['data'] | undefined =
    autocompleteResponse?.success && autocompleteResponse.movies
      ? {
          movies: autocompleteResponse.movies.slice(0, 6).map(movie => ({
            id: movie.id,
            title: movie.title,
            year: movie.year ?? null,
            poster_url: movie.poster_url,
          })),
          directors: [], // TMDB doesn't provide directors in search results
          actors: [], // TMDB doesn't provide actors in search results
          suggestions: autocompleteResponse.movies.slice(0, 3).map(movie => movie.title), // Top 3 titles as suggestions
        }
      : undefined

  // Debounced autocomplete
  useEffect(() => {
    if (!showAutocomplete || query.length < 2) {
      setShowSuggestions(false)
      return
    }

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    timeoutRef.current = setTimeout(async () => {
      await executeAutocomplete(async () => {
        // Use TMDB for autocomplete to ensure consistent movie ID format
        const response = await fetch(
          `/api/movies?realtime=true&database=tmdb&query=${encodeURIComponent(query)}&limit=6`
        )

        if (!response.ok) {
          throw new Error(`Autocomplete request failed: ${response.status}`)
        }

        const data = await response.json()

        if (!data.success) {
          throw new Error('Autocomplete response was not successful')
        }

        return data
      })

      // Show suggestions only if we have valid data
      if (autocompleteData) {
        setShowSuggestions(true)
      }
    }, 300)

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [query, showAutocomplete, executeAutocomplete])

  // Update suggestions visibility when autocomplete data changes
  useEffect(() => {
    if (autocompleteData && query.length >= 2) {
      setShowSuggestions(true)
    }
  }, [autocompleteData, query.length])

  // Log errors (could also show user-facing error messages if needed)
  useEffect(() => {
    if (autocompleteError) {
      console.error('Autocomplete error:', autocompleteError)
    }
  }, [autocompleteError])

  // Handle search submission
  const handleSearch = (searchQuery?: string) => {
    const finalQuery = searchQuery || query
    if (finalQuery.trim()) {
      onSearch(finalQuery.trim())
      setShowSuggestions(false)
      inputRef.current?.blur()
    }
  }

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Handle Enter key for search regardless of suggestions
    if (e.key === 'Enter') {
      e.preventDefault()

      // If suggestions are showing and an item is selected
      if (showSuggestions && autocompleteData && selectedIndex >= 0) {
        if (selectedIndex < autocompleteData.movies.length) {
          const movie = autocompleteData.movies[selectedIndex]
          if (movie?.title) {
            handleSearch(movie.title)
          }
        } else {
          const suggestionIndex = selectedIndex - autocompleteData.movies.length
          const suggestion = autocompleteData.suggestions[suggestionIndex]
          if (suggestion) {
            handleQueryChange(suggestion)
            handleSearch(suggestion)
          }
        }
      } else {
        // No suggestions or no selection - just search with current query
        handleSearch()
      }
      return
    }

    // Handle other keys only when suggestions are showing
    if (!showSuggestions || !autocompleteData) return

    const totalItems = autocompleteData.movies.length + autocompleteData.suggestions.length

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(prev => (prev < totalItems - 1 ? prev + 1 : -1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(prev => (prev > -1 ? prev - 1 : totalItems - 1))
        break
      case 'Escape':
        setShowSuggestions(false)
        setSelectedIndex(-1)
        inputRef.current?.blur()
        break
    }
  }

  // Clear search
  const handleClear = () => {
    handleQueryChange('')
    setShowSuggestions(false)
    inputRef.current?.focus()
  }

  return (
    <div className={`relative w-full ${className}`}>
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          ref={inputRef}
          value={query}
          onChange={e => handleQueryChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (autocompleteData && query.length >= 2) {
              setShowSuggestions(true)
            }
          }}
          placeholder={placeholder}
          className="h-12 pr-20 pl-10 text-base"
        />

        {/* Clear and Search buttons */}
        <div className="absolute top-1/2 right-2 flex -translate-y-1/2 gap-1">
          {query && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClear}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
          <Button
            type="button"
            onClick={() => handleSearch()}
            disabled={!query.trim()}
            className="h-8 px-3"
          >
            Search
          </Button>
        </div>
      </div>

      {/* Autocomplete Suggestions */}
      {showSuggestions && autocompleteData && (
        <Card className="absolute top-full right-0 left-0 z-50 mt-1 max-h-96 overflow-y-auto">
          <CardBody className="p-0">
            {/* Movie Suggestions */}
            {autocompleteData.movies.length > 0 && (
              <div className="p-2">
                <div className="mb-2 px-2 text-xs font-medium tracking-wide text-gray-500 uppercase">
                  Movies
                </div>
                {autocompleteData.movies.map((movie, index) => (
                  <button
                    key={movie.id}
                    onClick={() => handleSearch(movie.title)}
                    className={`flex w-full items-center gap-3 rounded p-2 text-left hover:bg-gray-50 ${
                      index === selectedIndex ? 'bg-blue-50' : ''
                    }`}
                  >
                    {movie.poster_url ? (
                      <div className="relative h-12 w-8 flex-shrink-0">
                        <Image
                          src={movie.poster_url}
                          alt={movie.title}
                          fill
                          className="rounded object-cover"
                        />
                      </div>
                    ) : (
                      <div className="flex h-12 w-8 flex-shrink-0 items-center justify-center rounded bg-gray-200">
                        <Film className="h-4 w-4 text-gray-400" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium text-gray-900">{movie.title}</div>
                      <div className="text-sm text-gray-500">{movie.year}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Search Suggestions */}
            {autocompleteData.suggestions.length > 0 && (
              <div className="border-t p-2">
                <div className="mb-2 px-2 text-xs font-medium tracking-wide text-gray-500 uppercase">
                  Recent Searches
                </div>
                {autocompleteData.suggestions.map((suggestion, index) => {
                  const suggestionIndex = autocompleteData.movies.length + index
                  return (
                    <button
                      key={suggestion}
                      onClick={() => handleSearch(suggestion)}
                      className={`flex w-full items-center gap-3 rounded p-2 text-left hover:bg-gray-50 ${
                        suggestionIndex === selectedIndex ? 'bg-blue-50' : ''
                      }`}
                    >
                      <Clock className="h-4 w-4 flex-shrink-0 text-gray-400" />
                      <span className="text-gray-700">{suggestion}</span>
                    </button>
                  )
                })}
              </div>
            )}

            {/* Loading state */}
            {isLoadingAutocomplete && (
              <div className="p-4 text-center text-gray-500">
                <div className="inline-flex items-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Searching...
                </div>
              </div>
            )}

            {/* No results */}
            {!isLoadingAutocomplete &&
              autocompleteData &&
              autocompleteData.movies.length === 0 &&
              autocompleteData.suggestions.length === 0 && (
                <div className="p-4 text-center text-gray-500">No suggestions found</div>
              )}
          </CardBody>
        </Card>
      )}
    </div>
  )
}
