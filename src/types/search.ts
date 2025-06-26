// Search system types

export interface SearchFilters {
  query?: string
  genres?: string[]
  yearRange?: [number, number]
  minRating?: number
  maxRating?: number
  directors?: string[]
  actors?: string[]
  limit?: number
  offset?: number
  sortBy?: 'relevance' | 'rating' | 'year' | 'title'
  sortOrder?: 'asc' | 'desc'
}

export interface SearchResponse {
  success: boolean
  data?: {
    movies: Movie[]
    totalCount: number
    facets: SearchFacets
    searchMeta: SearchMeta
  }
  error?: string
}

export interface SearchFacets {
  genres: { name: string; count: number }[]
  years: { year: number; count: number }[]
  directors: { name: string; count: number }[]
  ratingRanges: { range: string; count: number }[]
}

export interface SearchMeta {
  query: string
  appliedFilters: Record<string, unknown>
  resultCount: number
  executionTime: number
}

export interface AutocompleteResponse {
  success: boolean
  data?: {
    movies: { id: string; title: string; year: number | null; poster_url?: string | null }[]
    directors: string[]
    actors: string[]
    suggestions: string[]
  }
  error?: {
    message: string
    code: string
    details?: unknown
  }
}

export interface FilterPreset {
  id: string
  name: string
  description?: string
  filters: SearchFilters
  is_default: boolean
  is_public: boolean
  usage_count: number
  created_at: string
}

export interface GenreOption {
  name: string
  count: number
}

// Import Movie type from main types
import type { Movie } from '@/types'
