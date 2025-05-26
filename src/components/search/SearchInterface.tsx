'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Search, X, Clock, Film } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardBody } from '@/components/ui/card'
import type { AutocompleteResponse } from '@/types/search'
import Image from 'next/image'

interface SearchInterfaceProps {
  onSearch: (query: string) => void
  initialQuery?: string
  placeholder?: string
  showAutocomplete?: boolean
  className?: string
}

export function SearchInterface({
  onSearch,
  initialQuery = '',
  placeholder = 'Search movies, directors, actors...',
  showAutocomplete = true,
  className = '',
}: SearchInterfaceProps) {
  const [query, setQuery] = useState(initialQuery)
  const [autocompleteData, setAutocompleteData] = useState<AutocompleteResponse['data']>()
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)

  const inputRef = useRef<HTMLInputElement>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Debounced autocomplete
  useEffect(() => {
    if (!showAutocomplete || query.length < 2) {
      setAutocompleteData(undefined)
      setShowSuggestions(false)
      return
    }

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    timeoutRef.current = setTimeout(async () => {
      setIsLoading(true)
      try {
        const response = await fetch(
          `/api/movies/autocomplete?query=${encodeURIComponent(query)}&limit=6`
        )
        const data: AutocompleteResponse = await response.json()

        if (data.success && data.data) {
          setAutocompleteData(data.data)
          setShowSuggestions(true)
        }
      } catch (error) {
        console.error('Autocomplete error:', error)
      } finally {
        setIsLoading(false)
      }
    }, 300)

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [query, showAutocomplete])

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
      case 'Enter':
        e.preventDefault()
        if (selectedIndex >= 0) {
          if (selectedIndex < autocompleteData.movies.length) {
            const movie = autocompleteData.movies[selectedIndex]
            handleSearch(movie.title)
          } else {
            const suggestionIndex = selectedIndex - autocompleteData.movies.length
            const suggestion = autocompleteData.suggestions[suggestionIndex]
            setQuery(suggestion)
            handleSearch(suggestion)
          }
        } else {
          handleSearch()
        }
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
    setQuery('')
    setShowSuggestions(false)
    setSelectedIndex(-1)
    inputRef.current?.focus()
  }

  return (
    <div className={`relative w-full ${className}`}>
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          ref={inputRef}
          value={query}
          onChange={e => {
            setQuery(e.target.value)
            setSelectedIndex(-1)
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (autocompleteData && query.length >= 2) {
              setShowSuggestions(true)
            }
          }}
          placeholder={placeholder}
          className="h-12 pl-10 pr-20 text-base"
        />

        {/* Clear and Search buttons */}
        <div className="absolute right-2 top-1/2 flex -translate-y-1/2 gap-1">
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
        <Card className="absolute left-0 right-0 top-full z-50 mt-1 max-h-96 overflow-y-auto">
          <CardBody className="p-0">
            {/* Movie Suggestions */}
            {autocompleteData.movies.length > 0 && (
              <div className="p-2">
                <div className="mb-2 px-2 text-xs font-medium uppercase tracking-wide text-gray-500">
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
                <div className="mb-2 px-2 text-xs font-medium uppercase tracking-wide text-gray-500">
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
            {isLoading && (
              <div className="p-4 text-center text-gray-500">
                <div className="inline-flex items-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Searching...
                </div>
              </div>
            )}

            {/* No results */}
            {!isLoading &&
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
