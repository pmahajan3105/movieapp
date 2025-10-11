import { getMovieService } from '@/lib/services/movie-service'
import { logger } from '@/lib/logger'
import type { Movie } from '@/types'
import { TMDBAPIError, getErrorDetails } from '@/lib/errors'
import { tmdbCache } from '@/lib/services/tmdb-cache'

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