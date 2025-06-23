// Unified Movie Service - TMDB as primary source with intelligent fallbacks
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import type { Movie } from '@/types'
import { logger } from '@/lib/logger'

// TMDB API interfaces
interface TMDBMovie {
  id: number
  title: string
  release_date: string
  genre_ids: number[]
  vote_average: number
  overview: string
  poster_path: string | null
  backdrop_path: string | null
  runtime?: number
  imdb_id?: string
  popularity: number
  adult: boolean
}

interface TMDBSearchResponse {
  results: TMDBMovie[]
  total_results: number
  total_pages: number
  page: number
}

interface TMDBGenre {
  id: number
  name: string
}

interface TMDBCredits {
  crew: Array<{ job: string; name: string }>
  cast: Array<{ name: string }>
}

interface TMDBMovieDetailed extends TMDBMovie {
  credits?: TMDBCredits
}

// Movie service configuration
interface MovieServiceConfig {
  tmdbApiKey: string
  supabaseUrl: string
  supabaseKey: string
  enableCache?: boolean
  cacheMaxAge?: number // in minutes
}

export interface PaginatedMovieResults {
  results: Movie[]
  page: number
  total_pages: number
  total_results: number
}

export interface MoviePreferences {
  explicitGenres?: string[]
  preferredGenres?: string[]
  moods?: string[]
  movieRatings?: Record<string, number>
  likedMovieIds?: string[]
  dislikedMovieIds?: string[]
}

export interface MovieRecommendation {
  id: string
  title: string
  year: number | null
  genre: string | string[] | null
  director: string | string[] | null
  actors: string | null
  plot: string | null
  poster_url: string | null
  rating: number | null
  runtime: number | null
  imdb_id: string | null
  tmdb_id: number | null
  created_at: string
  updated_at: string
  matchScore?: number
  relevanceReason?: string
}

export class MovieService {
  private tmdbApiKey: string
  private tmdbBaseUrl = 'https://api.themoviedb.org/3'
  private imageBaseUrl = 'https://image.tmdb.org/t/p/w500'
  private supabase: SupabaseClient
  private enableCache: boolean
  private cacheMaxAge: number
  private genreCache: Map<number, string> = new Map()
  private genreCacheExpiry = 0

  constructor(config: MovieServiceConfig) {
    this.tmdbApiKey = config.tmdbApiKey
    this.enableCache = config.enableCache ?? true
    this.cacheMaxAge = config.cacheMaxAge ?? 60 // 1 hour default

    this.supabase = createClient(config.supabaseUrl, config.supabaseKey)

    if (!this.tmdbApiKey) {
      throw new Error('TMDB API key is required')
    }

    // Initialize genres cache
    this.loadGenres()
  }

  // Fetch and cache movie genres
  private async loadGenres(): Promise<void> {
    try {
      const response = await fetch(
        `${this.tmdbBaseUrl}/genre/movie/list?api_key=${this.tmdbApiKey}&language=en-US`
      )

      if (!response.ok) {
        logger.warn('Failed to load TMDB genres', { status: response.status })
        return
      }

      const data = await response.json()
      data.genres?.forEach((genre: TMDBGenre) => {
        this.genreCache.set(genre.id, genre.name)
      })
    } catch (error) {
      logger.warn('Error loading TMDB genres:', { error: String(error) })
    }
  }

  // Get trending movies
  async getTrendingMovies(
    options: {
      limit?: number
      page?: number
      timeWindow?: 'day' | 'week'
    } = {}
  ): Promise<{
    movies: Movie[]
    totalResults: number
    totalPages: number
    page: number
  }> {
    const { limit = 20, page = 1, timeWindow = 'week' } = options

    try {
      const response = await fetch(
        `${this.tmdbBaseUrl}/trending/movie/${timeWindow}?api_key=${this.tmdbApiKey}&page=${page}`
      )

      if (!response.ok) {
        throw new Error(`TMDB API error: ${response.status}`)
      }

      const data: TMDBSearchResponse = await response.json()
      const movies = await Promise.all(
        data.results.slice(0, limit).map(movie => this.transformTMDBToMovie(movie))
      )

      return {
        movies,
        totalResults: data.total_results,
        totalPages: data.total_pages,
        page: data.page,
      }
    } catch (error) {
      logger.error('TMDB trending error:', { error: String(error) })
      // Fallback to local database
      return this.getLocalMovies({ limit, page })
    }
  }

  // Search movies
  async searchMovies(
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
  }> {
    const { limit = 20, page = 1, year, includeAdult = false } = options

    if (!query.trim()) {
      return { movies: [], totalResults: 0, totalPages: 0, page: 1 }
    }

    try {
      let url = `${this.tmdbBaseUrl}/search/movie?api_key=${this.tmdbApiKey}&query=${encodeURIComponent(query)}&page=${page}&include_adult=${includeAdult}`

      if (year) {
        url += `&year=${year}`
      }

      const response = await fetch(url)

      if (!response.ok) {
        throw new Error(`TMDB API error: ${response.status}`)
      }

      const data: TMDBSearchResponse = await response.json()
      const movies = await Promise.all(
        data.results.slice(0, limit).map(movie => this.transformTMDBToMovie(movie))
      )

      return {
        movies,
        totalResults: data.total_results,
        totalPages: data.total_pages,
        page: data.page,
      }
    } catch (error) {
      logger.error('TMDB search error:', { error: String(error) })
      // Fallback to local database search
      return this.searchLocalMovies(query, { limit, page })
    }
  }

  // Get movie details by TMDB ID
  async getMovieById(tmdbId: number): Promise<Movie | null> {
    try {
      const response = await fetch(
        `${this.tmdbBaseUrl}/movie/${tmdbId}?api_key=${this.tmdbApiKey}&append_to_response=credits,videos,similar,keywords`
      )

      if (!response.ok) {
        throw new Error(`TMDB API error: ${response.status}`)
      }

      const movie: TMDBMovieDetailed = await response.json()
      return this.transformTMDBToMovie(movie, true) // detailed = true
    } catch (error) {
      logger.error('TMDB movie details error:', { error: String(error) })
      return null
    }
  }

  // Get movie info for AI chat (optimized for chat context)
  async getMovieInfoForChat(movieTitle: string): Promise<string> {
    try {
      const searchResult = await this.searchMovies(movieTitle, { limit: 1 })

      if (searchResult.movies.length === 0) {
        return `I couldn't find any movie titled "${movieTitle}" in the TMDB database. It might be a very new release, indie film, or the title might be slightly different.`
      }

      const movie = searchResult.movies[0]

      // Get detailed info if we have TMDB ID
      let detailedMovie = movie
      if (movie?.tmdb_id) {
        const details = await this.getMovieById(movie.tmdb_id)
        if (details) {
          detailedMovie = details
        }
      }

      if (!detailedMovie) {
        return `I couldn't find detailed information about "${movieTitle}". Please try asking about the movie in a different way.`
      }

      return this.formatMovieInfoForChat(detailedMovie)
    } catch (error) {
      logger.error('Error getting movie info for chat:', { error: String(error), movieTitle })
      return `I encountered an error while looking up "${movieTitle}". Please try asking about the movie in a different way.`
    }
  }

  // Transform TMDB movie to our Movie interface
  private async transformTMDBToMovie(
    tmdbMovie: TMDBMovie | TMDBMovieDetailed,
    detailed: boolean = false
  ): Promise<Movie> {
    const genres =
      tmdbMovie.genre_ids
        ?.map(id => this.genreCache.get(id))
        .filter((genre): genre is string => genre !== undefined) || []

    const movie: Movie = {
      id: `tmdb_${tmdbMovie.id}`,
      title: tmdbMovie.title,
      year: tmdbMovie.release_date ? new Date(tmdbMovie.release_date).getFullYear() : 0,
      genre: genres,
      rating: tmdbMovie.vote_average || 0,
      plot: tmdbMovie.overview || '',
      poster_url: tmdbMovie.poster_path
        ? `${this.imageBaseUrl}${tmdbMovie.poster_path}`
        : undefined,
      runtime: tmdbMovie.runtime,
      tmdb_id: tmdbMovie.id,
      imdb_id: tmdbMovie.imdb_id,
      popularity: tmdbMovie.popularity,
      backdrop_url: tmdbMovie.backdrop_path
        ? `https://image.tmdb.org/t/p/w1280${tmdbMovie.backdrop_path}`
        : undefined,
      source: 'tmdb',
    }

    // Add additional details if this is a detailed request
    if (detailed && 'credits' in tmdbMovie && tmdbMovie.credits) {
      const credits = tmdbMovie.credits
      movie.director =
        credits.crew?.filter(person => person.job === 'Director')?.map(person => person.name) || []
    }

    return movie
  }

  // Format movie info for AI chat
  private formatMovieInfoForChat(movie: Movie): string {
    const sections = [
      `**${movie.title}** (${movie.year})`,
      `📊 Rating: ${movie.rating}/10`,
      movie.genre?.length ? `🎭 Genre: ${movie.genre.join(', ')}` : null,
      movie.runtime ? `⏱️ Runtime: ${movie.runtime} minutes` : null,
      movie.director?.length ? `🎬 Director: ${movie.director.join(', ')}` : null,
      movie.plot ? `📖 Plot: ${movie.plot}` : null,
    ].filter(Boolean)

    return sections.join('\n')
  }

  // Fallback: Get movies from local database
  private async getLocalMovies(
    options: {
      limit?: number
      page?: number
    } = {}
  ): Promise<{
    movies: Movie[]
    totalResults: number
    totalPages: number
    page: number
  }> {
    const { limit = 20, page = 1 } = options
    const offset = (page - 1) * limit

    try {
      const {
        data: movies,
        error,
        count,
      } = await this.supabase
        .from('movies')
        .select('*', { count: 'exact' })
        .order('popularity', { ascending: false })
        .range(offset, offset + limit - 1)

      if (error) {
        throw error
      }

      const totalResults = count || 0
      const totalPages = Math.ceil(totalResults / limit)

      return {
        movies: movies || [],
        totalResults,
        totalPages,
        page,
      }
    } catch (error) {
      logger.error('Local database error:', { error: String(error) })
      return {
        movies: [],
        totalResults: 0,
        totalPages: 0,
        page: 1,
      }
    }
  }

  // Fallback: Search local database
  private async searchLocalMovies(
    query: string,
    options: {
      limit?: number
      page?: number
    } = {}
  ): Promise<{
    movies: Movie[]
    totalResults: number
    totalPages: number
    page: number
  }> {
    const { limit = 20, page = 1 } = options
    const offset = (page - 1) * limit

    try {
      const {
        data: movies,
        error,
        count,
      } = await this.supabase
        .from('movies')
        .select('*', { count: 'exact' })
        .or(`title.ilike.%${query}%, plot.ilike.%${query}%`)
        .order('rating', { ascending: false })
        .range(offset, offset + limit - 1)

      if (error) {
        throw error
      }

      const totalResults = count || 0
      const totalPages = Math.ceil(totalResults / limit)

      return {
        movies: movies || [],
        totalResults,
        totalPages,
        page,
      }
    } catch (error) {
      logger.error('Local database search error:', { error: String(error) })
      return {
        movies: [],
        totalResults: 0,
        totalPages: 0,
        page: 1,
      }
    }
  }

  // Health check
  async healthCheck(): Promise<{
    tmdb: { status: 'healthy' | 'error'; message: string }
    local: { status: 'healthy' | 'error'; message: string }
  }> {
    const results: {
      tmdb: { status: 'healthy' | 'error'; message: string }
      local: { status: 'healthy' | 'error'; message: string }
    } = {
      tmdb: { status: 'error', message: 'Unknown error' },
      local: { status: 'error', message: 'Unknown error' },
    }

    // Check TMDB
    try {
      const response = await fetch(`${this.tmdbBaseUrl}/configuration?api_key=${this.tmdbApiKey}`)
      if (response.ok) {
        results.tmdb = { status: 'healthy', message: 'TMDB API is accessible' }
      } else {
        results.tmdb = { status: 'error', message: `TMDB API error: ${response.status}` }
      }
    } catch (error) {
      results.tmdb = {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }
    }

    // Check local database
    try {
      const { error } = await this.supabase.from('movies').select('id').limit(1)
      if (!error) {
        results.local = { status: 'healthy', message: 'Local database is accessible' }
      } else {
        results.local = { status: 'error', message: error.message }
      }
    } catch (error) {
      results.local = {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }
    }

    return results
  }

  // Get movies by user preferences - consolidated from movieService.ts
  async getMoviesByPreferences(
    userId: string,
    options: {
      limit?: number
      page?: number
    } = {}
  ): Promise<{
    movies: Movie[]
    totalResults: number
    totalPages: number
    page: number
    source: string
  } | null> {
    const { limit = 20, page = 1 } = options
    const offset = (page - 1) * limit

    try {
      const { data: userProfile } = await this.supabase
        .from('user_profiles')
        .select('preferences')
        .eq('id', userId)
        .single()

      if (!userProfile?.preferences) {
        return null // Return null if no preferences found
      }

      logger.info('Loading preference-based recommendations', {
        preferences: userProfile.preferences,
      })

      const preferences = userProfile.preferences as {
        preferred_genres?: string[]
        avoid_genres?: string[]
        yearRange?: { min?: number; max?: number }
        ratingRange?: { min?: number; max?: number }
      }

      let dbQuery = this.supabase.from('movies').select('*', { count: 'exact' })

      // Build query based on preferences
      if (preferences.preferred_genres?.length) {
        dbQuery = dbQuery.overlaps('genre', preferences.preferred_genres)
      }
      if (preferences.avoid_genres?.length) {
        dbQuery = dbQuery.not('genre', 'ov', `{${preferences.avoid_genres.join(',')}}`)
      }
      if (preferences.yearRange?.min) {
        dbQuery = dbQuery.gte('year', preferences.yearRange.min)
      }
      if (preferences.yearRange?.max) {
        dbQuery = dbQuery.lte('year', preferences.yearRange.max)
      }
      if (preferences.ratingRange?.min) {
        dbQuery = dbQuery.gte('rating', preferences.ratingRange.min)
      }

      const { data, error, count } = await dbQuery
        .order('rating', { ascending: false, nullsFirst: false })
        .order('year', { ascending: false, nullsFirst: false })
        .range(offset, offset + limit - 1)

      if (error) {
        logger.error('Error with preference-based query:', { error: error.message })
        throw new Error(`Failed to fetch preference-based movies: ${error.message}`)
      }

      const totalResults = count || 0
      const totalPages = Math.ceil(totalResults / limit)

      return {
        movies: data || [],
        totalResults,
        totalPages,
        page,
        source: 'local-preferences',
      }
    } catch (error) {
      logger.error('Error fetching movies by preferences:', { error: String(error) })
      return null
    }
  }

  // Get popular movies - enhanced version
  async getPopularMovies(
    options: {
      limit?: number
      page?: number
    } = {}
  ): Promise<{
    movies: Movie[]
    totalResults: number
    totalPages: number
    page: number
    source: string
  }> {
    const { limit = 20, page = 1 } = options
    const offset = (page - 1) * limit

    logger.info('Loading general movie recommendations')

    try {
      const { data, error, count } = await this.supabase
        .from('movies')
        .select('*', { count: 'exact' })
        .order('rating', { ascending: false, nullsFirst: false })
        .order('year', { ascending: false, nullsFirst: false })
        .range(offset, offset + limit - 1)

      if (error) {
        logger.error('Error fetching popular movies:', { error: error.message })
        throw new Error(`Failed to fetch popular movies: ${error.message}`)
      }

      const totalResults = count || 0
      const totalPages = Math.ceil(totalResults / limit)

      return {
        movies: data || [],
        totalResults,
        totalPages,
        page,
        source: 'local-popular',
      }
    } catch (error) {
      logger.error('Error fetching popular movies:', { error: String(error) })
      // Return empty result instead of throwing
      return {
        movies: [],
        totalResults: 0,
        totalPages: 0,
        page,
        source: 'local-popular',
      }
    }
  }

  // Movie recommendations with preferences support
  async getMovieRecommendations(userProfile: {
    preferences?: MoviePreferences
  }): Promise<MovieRecommendation[]> {
    try {
      // Get user preferences if they exist
      if (userProfile.preferences?.preferredGenres?.length) {
        logger.info('Loading preference-based recommendations', {
          hasPreferences: true,
          genreCount: userProfile.preferences.preferredGenres?.length || 0,
        })

        // Build a query based on user preferences
        const genreQueries = userProfile.preferences.preferredGenres.map(
          genre => `genre.ilike.%${genre}%`
        )

        const { data: movies, error } = await this.supabase
          .from('movies')
          .select('*')
          .or(genreQueries.join(','))
          .order('rating', { ascending: false })
          .limit(20)

        if (error) throw error

        return (
          movies?.map(movie => this.transformToRecommendation(movie, userProfile.preferences)) || []
        )
      }

      // Fallback to popular movies
      const popularResult = await this.getPopularMovies({ limit: 20 })
      return popularResult.movies.map(movie => this.transformToRecommendation(movie))
    } catch (error) {
      logger.error('Error getting movie recommendations:', { error: String(error) })
      return []
    }
  }

  // Transform movie to recommendation format
  private transformToRecommendation(
    movie: Movie,
    preferences?: MoviePreferences
  ): MovieRecommendation {
    let matchScore = 0
    let relevanceReason = ''

    if (preferences) {
      matchScore = this.calculateMatchScore(movie, preferences)
      relevanceReason = this.generateRelevanceReason(movie, preferences)
    }

    return {
      id: movie.id,
      title: movie.title,
      year: movie.year ?? null,
      genre: movie.genre ?? null,
      director: movie.director ?? null,
      actors: Array.isArray(movie.actors) ? movie.actors.join(', ') : (movie.actors ?? null),
      plot: movie.plot ?? null,
      poster_url: movie.poster_url ?? null,
      rating: movie.rating ?? null,
      runtime: movie.runtime ?? null,
      imdb_id: movie.imdb_id ?? null,
      tmdb_id: movie.tmdb_id ?? null,
      created_at: movie.created_at || new Date().toISOString(),
      updated_at: movie.updated_at || new Date().toISOString(),
      matchScore,
      relevanceReason,
    }
  }

  // Calculate match score based on preferences
  private calculateMatchScore(movie: Movie, preferences: MoviePreferences): number {
    let score = 0
    let factors = 0

    // Genre matching
    if (preferences.preferredGenres?.length && movie.genre) {
      const movieGenres = Array.isArray(movie.genre) ? movie.genre : [movie.genre]
      const genreMatches = movieGenres.filter(genre =>
        preferences.preferredGenres!.some(pref => genre.toLowerCase().includes(pref.toLowerCase()))
      ).length

      if (genreMatches > 0) {
        score += (genreMatches / movieGenres.length) * 0.4
        factors += 0.4
      }
    }

    // Rating preference
    if (movie.rating && movie.rating >= 7) {
      score += 0.3
      factors += 0.3
    }

    // Popularity/recency
    if (movie.year && movie.year >= 2000) {
      score += 0.3
      factors += 0.3
    }

    return factors > 0 ? score / factors : 0
  }

  // Generate relevance reason
  private generateRelevanceReason(movie: Movie, preferences: MoviePreferences): string {
    const reasons: string[] = []

    if (preferences.preferredGenres?.length && movie.genre) {
      const movieGenres = Array.isArray(movie.genre) ? movie.genre : [movie.genre]
      const matchingGenres = movieGenres.filter(genre =>
        preferences.preferredGenres!.some(pref => genre.toLowerCase().includes(pref.toLowerCase()))
      )

      if (matchingGenres.length > 0) {
        reasons.push(`Matches your preferred genres: ${matchingGenres.join(', ')}`)
      }
    }

    if (movie.rating && movie.rating >= 8) {
      reasons.push('High rating')
    }

    if (movie.year && movie.year >= 2020) {
      reasons.push('Recent release')
    }

    return reasons.length > 0 ? reasons.join('; ') : 'Popular choice'
  }
}

// Create singleton instance
let movieServiceInstance: MovieService | null = null

export function getMovieService(): MovieService {
  if (!movieServiceInstance) {
    const config: MovieServiceConfig = {
      tmdbApiKey: process.env.TMDB_API_KEY || '',
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
      enableCache: true,
      cacheMaxAge: 60,
    }

    movieServiceInstance = new MovieService(config)
  }

  return movieServiceInstance
}

// Export default instance for backward compatibility
export const movieService = getMovieService()
