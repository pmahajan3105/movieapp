import { getMovieService } from '@/lib/services/movie-service'
import { logger } from '@/lib/logger'
import type { Movie } from '@/types'
import { TMDBAPIError, getErrorDetails } from '@/lib/errors'

export async function fetchTmdbMovieById(tmdbId: number): Promise<Movie | null> {
  try {
    const movieService = getMovieService()
    const movie = await movieService.getMovieById(tmdbId, true)
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
    const movieService = getMovieService()
    const result = await movieService.searchMovies(query, options)
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
    const movieService = getMovieService()
    const result = await movieService.getTrendingMovies(options)
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