import { getMovieService } from '@/lib/services/movie-service'
import { logger } from '@/lib/logger'
import type { Movie } from '@/types'
import { TMDBAPIError, getErrorDetails } from '@/lib/errors'
import { tmdbCache } from '@/lib/services/tmdb-cache'
import { ConfigService } from '@/lib/config/config-service'

// Watch provider types
export interface WatchProvider {
  provider_id: number
  provider_name: string
  logo_path: string
  display_priority: number
}

export interface WatchProviders {
  flatrate?: WatchProvider[]  // Subscription services
  rent?: WatchProvider[]
  buy?: WatchProvider[]
  link?: string  // JustWatch link
}

// TMDB image base URL
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p'

export async function fetchTmdbMovieById(tmdbId: number): Promise<Movie | null> {
  try {
    // Check cache first
    const cached = tmdbCache.getMovieDetails<Movie>(tmdbId)
    if (cached) {
      logger.debug('Using cached movie details', { tmdbId })
      return cached
    }

    // Fetch from TMDB API
    const movieService = getMovieService()
    const movie = await movieService.getMovieById(tmdbId, true)
    
    // Cache the result
    if (movie) {
      tmdbCache.cacheMovieDetails(tmdbId, movie)
      logger.debug('Cached movie details', { tmdbId })
    }
    
    return movie
  } catch (error) {
    const errorDetails = getErrorDetails(error)
    logger.error('Error fetching TMDB movie by ID', { 
      tmdbId, 
      ...errorDetails 
    })
    return null
  }
}

export async function searchTmdbMovies(
  query: string,
  options: {
    limit?: number
    page?: number
    year?: number
    includeAdult?: boolean
  } = {}
): Promise<{
  movies: Movie[]
  totalResults: number
  totalPages: number
  page: number
  fallbackUsed: boolean
}> {
  try {
    // Check cache first (only for first page)
    if (!options.page || options.page === 1) {
      const cached = tmdbCache.getSearchResults<{
        movies: Movie[]
        totalResults: number
        totalPages: number
        page: number
        fallbackUsed: boolean
      }>(query)
      if (cached) {
        logger.debug('Using cached search results', { query })
        return cached
      }
    }

    // Fetch from TMDB API
    const movieService = getMovieService()
    const result = await movieService.searchMovies(query, options)
    
    // Cache the first page results
    if (!options.page || options.page === 1) {
      tmdbCache.cacheSearchResults(query, result)
      logger.debug('Cached search results', { query })
    }
    
    return result
  } catch (error) {
    const errorDetails = getErrorDetails(error)
    logger.error('Error searching TMDB movies', { 
      query, 
      options,
      ...errorDetails 
    })
    return {
      movies: [],
      totalResults: 0,
      totalPages: 0,
      page: options.page || 1,
      fallbackUsed: true
    }
  }
}

export async function getTrendingMovies(options: {
  limit?: number
  page?: number
  timeWindow?: 'day' | 'week'
} = {}): Promise<{
  movies: Movie[]
  totalResults: number
  totalPages: number
  page: number
  fallbackUsed: boolean
}> {
  try {
    const timeWindow = options.timeWindow || 'week'
    
    // Check cache first (only for first page)
    if (!options.page || options.page === 1) {
      const cached = tmdbCache.getTrending<{
        movies: Movie[]
        totalResults: number
        totalPages: number
        page: number
        fallbackUsed: boolean
      }>(timeWindow)
      if (cached) {
        logger.debug('Using cached trending movies', { timeWindow })
        return cached
      }
    }

    // Fetch from TMDB API
    const movieService = getMovieService()
    const result = await movieService.getTrendingMovies(options)
    
    // Cache the first page results
    if (!options.page || options.page === 1) {
      tmdbCache.cacheTrending(timeWindow, result)
      logger.debug('Cached trending movies', { timeWindow })
    }
    
    return result
  } catch (error) {
    logger.error('Error fetching trending movies', { error: String(error) })
    return {
      movies: [],
      totalResults: 0,
      totalPages: 0,
      page: options.page || 1,
      fallbackUsed: true
    }
  }
}

/**
 * Get watch providers (streaming availability) for a movie
 * Uses TMDB's watch/providers endpoint
 */
export async function getWatchProviders(
  tmdbId: number,
  region?: string
): Promise<WatchProviders | null> {
  try {
    const apiKeys = ConfigService.getApiKeys()
    if (!apiKeys.tmdb) {
      logger.warn('No TMDB API key configured')
      return null
    }

    // Use provided region or default to US
    const watchRegion = region || 'US'

    const response = await fetch(
      `https://api.themoviedb.org/3/movie/${tmdbId}/watch/providers?api_key=${apiKeys.tmdb}`
    )

    if (!response.ok) {
      logger.warn('Failed to fetch watch providers', { tmdbId, status: response.status })
      return null
    }

    const data = await response.json()
    const regionData = data.results?.[watchRegion]

    if (!regionData) {
      // Try to get any available region as fallback
      const availableRegions = Object.keys(data.results || {})
      if (availableRegions.length === 0) {
        return null
      }
      // Return null if requested region not available
      return null
    }

    return {
      flatrate: regionData.flatrate?.map((p: WatchProvider) => ({
        ...p,
        logo_path: p.logo_path ? `${TMDB_IMAGE_BASE}/w92${p.logo_path}` : '',
      })),
      rent: regionData.rent?.map((p: WatchProvider) => ({
        ...p,
        logo_path: p.logo_path ? `${TMDB_IMAGE_BASE}/w92${p.logo_path}` : '',
      })),
      buy: regionData.buy?.map((p: WatchProvider) => ({
        ...p,
        logo_path: p.logo_path ? `${TMDB_IMAGE_BASE}/w92${p.logo_path}` : '',
      })),
      link: regionData.link,
    }
  } catch (error) {
    logger.error('Error fetching watch providers', { tmdbId, error: String(error) })
    return null
  }
}

/**
 * Get provider logo URL
 */
export function getProviderLogoUrl(logoPath: string, size: 'w45' | 'w92' | 'w154' = 'w92'): string {
  if (!logoPath) return ''
  if (logoPath.startsWith('http')) return logoPath
  return `${TMDB_IMAGE_BASE}/${size}${logoPath}`
}