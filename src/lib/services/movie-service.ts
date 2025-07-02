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

// Shared genre cache across all instances (singleton pattern)
class GenreCacheManager {
  private static instance: GenreCacheManager
  private cache = new Map<number, string>()
  private expiry = 0

  private constructor() {}

  static getInstance(): GenreCacheManager {
    if (!GenreCacheManager.instance) {
      GenreCacheManager.instance = new GenreCacheManager()
    }
    return GenreCacheManager.instance
  }

  isExpired(): boolean {
    return this.expiry <= Date.now()
  }

  getCacheSize(): number {
    return this.cache.size
  }

  getGenre(id: number): string | undefined {
    return this.cache.get(id)
  }

  setGenre(id: number, name: string): void {
    this.cache.set(id, name)
  }

  clear(): void {
    this.cache.clear()
  }

  setExpiry(timestamp: number): void {
    this.expiry = timestamp
  }

  getExpiry(): number {
    return this.expiry
  }
}

export class MovieService {
  private tmdbApiKey: string
  private tmdbBaseUrl = 'https://api.themoviedb.org/3'
  private imageBaseUrl = 'https://image.tmdb.org/t/p/w500'
  private supabase: SupabaseClient
  private enableCache: boolean
  private cacheMaxAge: number
  private genreCacheManager = GenreCacheManager.getInstance()

  constructor(config: MovieServiceConfig) {
    this.tmdbApiKey = config.tmdbApiKey
    this.enableCache = config.enableCache ?? true
    this.cacheMaxAge = config.cacheMaxAge ?? 60 // 1 hour default

    this.supabase = createClient(config.supabaseUrl, config.supabaseKey)

    if (!this.tmdbApiKey) {
      throw new Error('TMDB API key is required')
    }

    // Initialize genres cache with proper error handling
    this.loadGenres().catch(error => {
      logger.error('Failed to load genres cache during initialization:', error)
      // Set empty cache on failure to prevent undefined access
      this.genreCacheManager.clear()
    })
  }

  // Fetch and cache movie genres with expiry management
  private async loadGenres(): Promise<void> {
    // Check if cache is still valid
    const now = Date.now()
    if (this.genreCacheManager.isExpired()) {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout

        const response = await fetch(
          `${this.tmdbBaseUrl}/genre/movie/list?api_key=${this.tmdbApiKey}&language=en-US`,
          {
            signal: controller.signal,
            headers: { Accept: 'application/json' },
          }
        )

        clearTimeout(timeoutId)

        if (!response.ok) {
          logger.warn('Failed to load TMDB genres', { status: response.status })
          return
        }

        const data = await response.json()
        if (data.genres && Array.isArray(data.genres)) {
          // Clear existing cache before loading new data
          this.genreCacheManager.clear()

          data.genres.forEach((genre: TMDBGenre) => {
            if (genre.id && genre.name) {
              this.genreCacheManager.setGenre(genre.id, genre.name)
            }
          })

          // Set cache expiry using configured max age
          this.genreCacheManager.setExpiry(now + this.cacheMaxAge * 60 * 1000) // Convert minutes to milliseconds
          logger.info(
            `Loaded ${this.genreCacheManager.getCacheSize()} genres, cache expires at ${new Date(this.genreCacheManager.getExpiry()).toISOString()}`
          )
        }
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          logger.warn('TMDB genres request timed out')
        } else {
          logger.warn('Error loading TMDB genres:', { error: String(error) })
        }
      }
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
    fallbackUsed: boolean
  }> {
    const { limit = 20, page = 1, timeWindow = 'week' } = options

    // Validate and sanitize parameters
    const safeLimit = Math.max(1, Math.min(100, Math.floor(Number(limit)) || 20))
    const safePage = Math.max(1, Math.floor(Number(page)) || 1)
    const safeTimeWindow = timeWindow === 'day' ? 'day' : 'week'

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000)

      const response = await fetch(
        `${this.tmdbBaseUrl}/trending/movie/${safeTimeWindow}?api_key=${this.tmdbApiKey}&page=${safePage}`,
        {
          signal: controller.signal,
          headers: { Accept: 'application/json' },
        }
      )

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`TMDB API error: ${response.status}`)
      }

      const data: TMDBSearchResponse = await response.json()
      // More efficient: iterate only up to the limit instead of slice then map
      const results = data.results || []
      const itemsToProcess = Math.min(safeLimit, results.length)
      const movies: Movie[] = []

      for (let i = 0; i < itemsToProcess; i++) {
        try {
          const movie = results[i]
          if (movie) {
            const transformedMovie = await this.transformTMDBToMovie(movie)
            movies.push(transformedMovie)
          }
        } catch (error) {
          logger.warn(`Failed to transform movie ${results[i]?.title}:`, { error: String(error) })
          // Continue processing other movies
        }
      }

      return {
        movies,
        totalResults: data.total_results || 0,
        totalPages: data.total_pages || 0,
        page: safePage,
        fallbackUsed: false, // Indicates primary source was used
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        logger.warn('TMDB trending request timed out')
      } else {
        logger.error('TMDB trending error:', { error: String(error) })
      }
      // Fallback to local database
      const fallbackResult = await this.getLocalMovies({ limit: safeLimit, page: safePage })
      return {
        ...fallbackResult,
        fallbackUsed: true, // Indicates fallback was used
      }
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
    fallbackUsed: boolean
  }> {
    // Enhanced input validation
    if (typeof query !== 'string') {
      throw new Error('Search query must be a string')
    }

    const { limit = 20, page = 1, year, includeAdult = false } = options

    // Validate numeric parameters
    const safeLimit = Math.max(1, Math.min(100, Math.floor(Number(limit)) || 20))
    const safePage = Math.max(1, Math.floor(Number(page)) || 1)
    const safeYear = year
      ? Math.max(1800, Math.min(new Date().getFullYear() + 5, Math.floor(Number(year))))
      : undefined

    if (!query.trim()) {
      return { movies: [], totalResults: 0, totalPages: 0, page: safePage, fallbackUsed: false }
    }

    try {
      let url = `${this.tmdbBaseUrl}/search/movie?api_key=${this.tmdbApiKey}&query=${encodeURIComponent(query)}&page=${safePage}&include_adult=${includeAdult}`

      if (safeYear) {
        url += `&year=${safeYear}`
      }

      const response = await fetch(url)

      if (!response.ok) {
        throw new Error(`TMDB API error: ${response.status}`)
      }

      const data: TMDBSearchResponse = await response.json()
      // More efficient: iterate only up to the limit instead of slice then map
      const results = data.results || []
      const itemsToProcess = Math.min(safeLimit, results.length)
      const movies: Movie[] = []

      for (let i = 0; i < itemsToProcess; i++) {
        try {
          const movie = results[i]
          if (movie) {
            const transformedMovie = await this.transformTMDBToMovie(movie)
            movies.push(transformedMovie)
          }
        } catch (error) {
          logger.warn(`Failed to transform movie ${results[i]?.title}:`, { error: String(error) })
          // Continue processing other movies
        }
      }

      return {
        movies,
        totalResults: data.total_results,
        totalPages: data.total_pages,
        page: data.page,
        fallbackUsed: false,
      }
    } catch (error) {
      logger.error('TMDB search error:', { error: String(error) })
      // Fallback to local database search
      const fallbackResult = await this.searchLocalMovies(query, {
        limit: safeLimit,
        page: safePage,
      })
      return {
        ...fallbackResult,
        fallbackUsed: true,
      }
    }
  }

  // Get movie by ID from TMDB with local fallback
  async getMovieById(id: number, detailed: boolean = true): Promise<Movie | null> {
    if (!id || id <= 0) {
      logger.warn('Invalid movie ID provided', { id })
      return null
    }

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000)

      const appendToResponse = detailed
        ? 'credits,videos,keywords,recommendations,reviews,similar'
        : ''

      const url = `${this.tmdbBaseUrl}/movie/${id}?api_key=${this.tmdbApiKey}${
        appendToResponse ? `&append_to_response=${appendToResponse}` : ''
      }`

      const response = await fetch(url, {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        if (response.status === 404) {
          logger.info(`Movie with ID ${id} not found in TMDB`)
        } else {
          logger.warn(`TMDB API error for movie ${id}:`, { status: response.status })
        }
        // Fall back to local database
        return this.getLocalMovieById(id)
      }

      const data: TMDBMovieDetailed = await response.json()
      return this.transformTMDBToMovie(data, detailed)
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        logger.warn(`TMDB request timed out for movie ${id}`)
      } else {
        logger.error(`Error fetching movie ${id} from TMDB:`, { error: String(error) })
      }
      // Fall back to local database
      return this.getLocalMovieById(id)
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
        ?.map(id => this.genreCacheManager.getGenre(id))
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
    fallbackUsed: boolean
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
        fallbackUsed: false,
      }
    } catch (error) {
      logger.error('Local database error:', { error: String(error) })
      return {
        movies: [],
        totalResults: 0,
        totalPages: 0,
        page: 1,
        fallbackUsed: true,
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
    fallbackUsed: boolean
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
        fallbackUsed: false,
      }
    } catch (error) {
      logger.error('Local database search error:', { error: String(error) })
      return {
        movies: [],
        totalResults: 0,
        totalPages: 0,
        page: 1,
        fallbackUsed: true,
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

  // Force refresh of genre cache
  async refreshGenreCache(): Promise<void> {
    this.genreCacheManager.setExpiry(0) // Force cache expiry
    await this.loadGenres()
  }

  // Fallback method to get movie from local database
  private async getLocalMovieById(id: number): Promise<Movie | null> {
    try {
      const { data: movie, error } = await this.supabase
        .from('movies')
        .select('*')
        .eq('tmdb_id', id)
        .single()

      if (error || !movie) {
        logger.info(`Movie with ID ${id} not found in local database`)
        return null
      }

      return {
        id: movie.id,
        title: movie.title,
        overview: movie.overview || '',
        releaseDate: movie.release_date || '',
        posterPath: movie.poster_path || '',
        backdropPath: movie.backdrop_path || '',
        voteAverage: movie.vote_average || 0,
        voteCount: movie.vote_count || 0,
        genreIds: movie.genre_ids || [],
        adult: movie.adult || false,
        originalLanguage: movie.original_language || 'en',
        originalTitle: movie.original_title || movie.title,
        popularity: movie.popularity || 0,
        video: movie.video || false,
      }
    } catch (error) {
      logger.error(`Error fetching movie ${id} from local database:`, { error: String(error) })
      return null
    }
  }
}

// Create singleton instance
let movieServiceInstance: MovieService | null = null

// Force reset singleton for development (allows reloading with new env vars)
if (process.env.NODE_ENV === 'development') {
  movieServiceInstance = null
}

export function getMovieService(): MovieService {
  if (!movieServiceInstance) {
    // Use service role key in server context, anon key as fallback
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    
    const config: MovieServiceConfig = {
      tmdbApiKey: process.env.TMDB_API_KEY || '',
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      supabaseKey,
      enableCache: true,
      cacheMaxAge: 60,
    }

    if (!supabaseKey) {
      throw new Error('Supabase key is required (SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY)')
    }

    movieServiceInstance = new MovieService(config)
  }

  return movieServiceInstance
}

// Export default instance for backward compatibility
export const movieService = getMovieService()
