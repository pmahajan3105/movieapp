// Unified Movie Database Service
// Single interface for all movie data providers (TMDB as primary, Local as fallback)

import { Movie } from '@/types'
import type { MovieDatabaseConfig } from './config'
import { createClient } from '@supabase/supabase-js'

// Request/Response Interfaces
export interface MovieSearchOptions {
  query?: string
  limit?: number
  page?: number
  year?: number
  genre?: string[]
  includeAdult?: boolean
  language?: string
}

export interface MovieDatabaseResponse {
  movies: Movie[]
  total: number
  page: number
  totalPages: number
  source: string
}

export interface TrendingOptions {
  timeWindow?: 'day' | 'week'
  limit?: number
  page?: number
}

// TMDB specific interfaces
interface TMDBMovie {
  id: number
  title: string
  overview: string
  release_date: string
  poster_path: string | null
  backdrop_path: string | null
  vote_average: number
  vote_count: number
  genre_ids: number[]
  runtime?: number
  genres?: { id: number; name: string }[]
  imdb_id?: string
}

interface TMDBSearchResponse {
  page: number
  results: TMDBMovie[]
  total_pages: number
  total_results: number
}

export class MovieDatabaseService {
  private static instance: MovieDatabaseService

  static getInstance(): MovieDatabaseService {
    if (!MovieDatabaseService.instance) {
      MovieDatabaseService.instance = new MovieDatabaseService()
    }
    return MovieDatabaseService.instance
  }

  // Main search method
  async searchMovies(
    database: MovieDatabaseConfig,
    options: MovieSearchOptions
  ): Promise<MovieDatabaseResponse> {
    console.log(`🎬 Searching movies using ${database.name}`)

    switch (database.provider) {
      case 'tmdb':
        return this.searchTMDB(database, options)
      
      case 'local':
        return this.searchLocal(database, options)
      
      default:
        throw new Error(`Provider ${database.provider} not supported`)
    }
  }

  // Get trending movies
  async getTrendingMovies(
    database: MovieDatabaseConfig,
    options: TrendingOptions = {}
  ): Promise<MovieDatabaseResponse> {
    console.log(`🔥 Getting trending movies from ${database.name}`)

    switch (database.provider) {
      case 'tmdb':
        return this.getTrendingTMDB(database, options)
      
      case 'local':
        // Local doesn't have trending, return top rated
        return this.searchLocal(database, { 
          limit: options.limit,
          page: options.page 
        })
      
      default:
        throw new Error(`Provider ${database.provider} not supported for trending`)
    }
  }

  // Get movie details
  async getMovieDetails(
    database: MovieDatabaseConfig,
    movieId: string
  ): Promise<Movie | null> {
    console.log(`🎯 Getting movie details from ${database.name}`)

    switch (database.provider) {
      case 'tmdb':
        return this.getMovieDetailsTMDB(database, movieId)
      
      case 'local':
        return this.getMovieDetailsLocal(database, movieId)
      
      default:
        throw new Error(`Provider ${database.provider} not supported for details`)
    }
  }

  // TMDB Implementation
  private async searchTMDB(
    database: MovieDatabaseConfig,
    options: MovieSearchOptions
  ): Promise<MovieDatabaseResponse> {
    const apiKey = process.env.TMDB_API_KEY
    if (!apiKey) {
      throw new Error('TMDB API key not configured')
    }

    const {
      query = '',
      limit = 20,
      page = 1,
      year,
      includeAdult = false,
      language = 'en-US'
    } = options

    let url: string
    if (query) {
      // Search movies
      url = `${database.apiUrl}/search/movie?api_key=${apiKey}&query=${encodeURIComponent(query)}&page=${page}&include_adult=${includeAdult}&language=${language}`
      if (year) {
        url += `&year=${year}`
      }
    } else {
      // Get popular movies
      url = `${database.apiUrl}/movie/popular?api_key=${apiKey}&page=${page}&language=${language}`
    }

    const response = await fetch(url)
    const data: TMDBSearchResponse = await response.json()

    if (!response.ok) {
      throw new Error(`TMDB API error: ${response.status}`)
    }

    const movies = data.results.slice(0, limit).map(movie => this.transformTMDBToMovie(movie))

    return {
      movies,
      total: data.total_results,
      page: data.page,
      totalPages: data.total_pages,
      source: 'tmdb'
    }
  }

  private async getTrendingTMDB(
    database: MovieDatabaseConfig,
    options: TrendingOptions
  ): Promise<MovieDatabaseResponse> {
    const apiKey = process.env.TMDB_API_KEY
    if (!apiKey) {
      throw new Error('TMDB API key not configured')
    }

    const {
      timeWindow = 'week',
      limit = 20,
      page = 1
    } = options

    const url = `${database.apiUrl}/trending/movie/${timeWindow}?api_key=${apiKey}&page=${page}`

    const response = await fetch(url)
    const data: TMDBSearchResponse = await response.json()

    if (!response.ok) {
      throw new Error(`TMDB API error: ${response.status}`)
    }

    const movies = data.results.slice(0, limit).map(movie => this.transformTMDBToMovie(movie))

    return {
      movies,
      total: data.total_results,
      page: data.page,
      totalPages: data.total_pages,
      source: 'tmdb'
    }
  }

  private async getMovieDetailsTMDB(
    database: MovieDatabaseConfig,
    movieId: string
  ): Promise<Movie | null> {
    const apiKey = process.env.TMDB_API_KEY
    if (!apiKey) {
      throw new Error('TMDB API key not configured')
    }

    const url = `${database.apiUrl}/movie/${movieId}?api_key=${apiKey}&append_to_response=credits,keywords,videos`

    const response = await fetch(url)
    
    if (!response.ok) {
      throw new Error(`TMDB API error: ${response.status}`)
    }

    const movie: TMDBMovie = await response.json()
    return this.transformTMDBToMovie(movie)
  }

  private transformTMDBToMovie(tmdbMovie: TMDBMovie): Movie {
    return {
      id: `tmdb_${tmdbMovie.id}`,
      title: tmdbMovie.title,
      year: tmdbMovie.release_date ? new Date(tmdbMovie.release_date).getFullYear() : undefined,
      genre: tmdbMovie.genres?.map(g => g.name) || [],
      rating: tmdbMovie.vote_average || 0,
      plot: tmdbMovie.overview || '',
      poster_url: tmdbMovie.poster_path ? `https://image.tmdb.org/t/p/w500${tmdbMovie.poster_path}` : undefined,
      backdrop_url: tmdbMovie.backdrop_path ? `https://image.tmdb.org/t/p/w1280${tmdbMovie.backdrop_path}` : undefined,
      runtime: tmdbMovie.runtime,
      tmdb_id: tmdbMovie.id,
      imdb_id: tmdbMovie.imdb_id,
      popularity: tmdbMovie.vote_count,
      source: 'tmdb'
    }
  }

  // Local Database Implementation
  private async searchLocal(
    database: MovieDatabaseConfig,
    options: MovieSearchOptions
  ): Promise<MovieDatabaseResponse> {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const {
      query = '',
      limit = 20,
      page = 1,
      year,
      genre
    } = options

    const offset = (page - 1) * limit

    let queryBuilder = supabase
      .from('movies')
      .select('*', { count: 'exact' })

    // Add search filters
    if (query) {
      queryBuilder = queryBuilder.or(`title.ilike.%${query}%,plot.ilike.%${query}%`)
    }

    if (year) {
      queryBuilder = queryBuilder.eq('year', year)
    }

    if (genre && genre.length > 0) {
      // Assuming genre is stored as an array or comma-separated string
      queryBuilder = queryBuilder.overlaps('genre', genre)
    }

    const { data: movies, error, count } = await queryBuilder
      .order('rating', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      throw new Error(`Local database error: ${error.message}`)
    }

    const total = count || 0
    const totalPages = Math.ceil(total / limit)

    return {
      movies: movies || [],
      total,
      page,
      totalPages,
      source: 'local'
    }
  }

  private async getMovieDetailsLocal(
    database: MovieDatabaseConfig,
    movieId: string
  ): Promise<Movie | null> {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const { data: movie, error } = await supabase
      .from('movies')
      .select('*')
      .eq('id', movieId)
      .single()

    if (error) {
      console.error('Local database error:', error)
      return null
    }

    return movie
  }
}

// Export singleton instance
export const movieDatabaseService = MovieDatabaseService.getInstance() 