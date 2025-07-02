'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Search, X, Clock, Film } from 'lucide-react'
import type { AutocompleteResponse } from '@/types/search'
import type { Movie } from '@/types'
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
  // TODO: Implement autocomplete and debounce indicators
  // const [isAutocompleteLoading, setAutocompleteLoading] = useState(false)
  // const [isDebouncing, setDebouncing] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const inputRef = useRef<HTMLInputElement>(null)

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
        // Use TMDB for autocomplete to ensure consistent movie ID format
        const response = await fetch(
          `/api/movies?realtime=true&database=tmdb&query=${encodeURIComponent(query)}&limit=6`
        )
        const data: { success: boolean; movies: Movie[] } = await response.json()

        if (data.success && data.movies) {
          // Transform TMDB response to match AutocompleteResponse format
          const autocompleteData: AutocompleteResponse['data'] = {
            movies: data.movies.slice(0, 6).map(movie => ({
              id: movie.id,
              title: movie.title,
              year: movie.year ?? null,
              poster_url: movie.poster_url,
            })),
            directors: [], // TMDB doesn't provide directors in search results
            actors: [], // TMDB doesn't provide actors in search results
            suggestions: data.movies.slice(0, 3).map(movie => movie.title), // Top 3 titles as suggestions
          }
          setAutocompleteData(autocompleteData)
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
            setQuery(suggestion)
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
    setQuery('')
    setShowSuggestions(false)
    setSelectedIndex(-1)
    inputRef.current?.focus()
  }

  return (
    <div className={`relative w-full ${className}`}>
      {/* Search Input */}
      <div className="relative group">
        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-slate-400 group-focus-within:text-purple-500 transition-colors" />
        </div>
        <input
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
          className="w-full h-12 pl-12 pr-12 bg-white/80 backdrop-blur-sm border border-slate-200/50 rounded-2xl shadow-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-300 transition-all duration-200 hover:bg-white/90 hover:shadow-md"
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
        />

        {/* Clear button */}
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors p-1"
          >
            <X className="h-4 w-4" />
          </button>
        )}

        {/* Search loading indicator */}
        {isLoading && (
          <div className="absolute inset-y-0 right-3 flex items-center">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-purple-500/30 border-t-purple-500"></div>
          </div>
        )}
      </div>

      {/* Autocomplete Suggestions */}
      {showSuggestions && autocompleteData && (
        <div className="absolute top-full left-0 right-0 z-50 mt-2 max-h-96 overflow-y-auto bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-200/50 ring-1 ring-slate-200/20">
          {/* Movie Suggestions */}
          {autocompleteData.movies.length > 0 && (
            <div className="p-4">
              <div className="mb-3 px-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">
                Movies
              </div>
              {autocompleteData.movies.map((movie, index) => (
                <button
                  key={movie.id}
                  onClick={() => handleSearch(movie.title)}
                  className={`flex w-full items-center gap-4 rounded-xl p-3 text-left transition-all duration-150 ${
                    index === selectedIndex 
                      ? 'bg-gradient-to-r from-purple-50 to-blue-50 shadow-sm' 
                      : 'hover:bg-slate-50/80'
                  }`}
                >
                  {movie.poster_url ? (
                    <div className="relative h-14 w-10 flex-shrink-0 overflow-hidden rounded-lg shadow-sm">
                      <Image
                        src={movie.poster_url}
                        alt={movie.title}
                        fill
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <div className="flex h-14 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-slate-100 to-slate-200 shadow-sm">
                      <Film className="h-5 w-5 text-slate-400" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold text-slate-800">{movie.title}</div>
                    {movie.year && (
                      <div className="text-sm text-slate-500 mt-0.5">{movie.year}</div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Search Suggestions */}
          {autocompleteData.suggestions.length > 0 && (
            <div className={`p-4 ${autocompleteData.movies.length > 0 ? 'border-t border-slate-200/50' : ''}`}>
              <div className="mb-3 px-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">
                Popular Searches
              </div>
              {autocompleteData.suggestions.map((suggestion, index) => {
                const suggestionIndex = autocompleteData.movies.length + index
                return (
                  <button
                    key={suggestion}
                    onClick={() => handleSearch(suggestion)}
                    className={`flex w-full items-center gap-3 rounded-xl p-3 text-left transition-all duration-150 ${
                      suggestionIndex === selectedIndex 
                        ? 'bg-gradient-to-r from-purple-50 to-blue-50 shadow-sm' 
                        : 'hover:bg-slate-50/80'
                    }`}
                  >
                    <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-purple-100 to-blue-100 flex items-center justify-center">
                      <Clock className="h-4 w-4 text-purple-500" />
                    </div>
                    <span className="text-slate-700 font-medium">{suggestion}</span>
                  </button>
                )
              })}
            </div>
          )}

          {/* Loading state */}
          {isLoading && (
            <div className="p-6 text-center">
              <div className="inline-flex items-center gap-3 text-slate-500">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-purple-500/30 border-t-purple-500" />
                <span className="font-medium">Searching movies...</span>
              </div>
            </div>
          )}

          {/* No results */}
          {!isLoading &&
            autocompleteData.movies.length === 0 &&
            autocompleteData.suggestions.length === 0 && (
              <div className="p-6 text-center">
                <div className="mb-2">
                  <Film className="h-8 w-8 text-slate-300 mx-auto" />
                </div>
                <div className="text-slate-500 font-medium">No movies found</div>
                <div className="text-sm text-slate-400 mt-1">Try a different search term</div>
              </div>
            )}
        </div>
      )}
    </div>
  )
}
