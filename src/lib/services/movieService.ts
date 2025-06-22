import type { SupabaseClient } from '@supabase/supabase-js'
import type { Movie } from '@/types'
import { createClient } from '@/lib/supabase/server-client'
import { logger } from '@/lib/logger'

// Define a standard response format for the service
interface MovieServiceResponse {
  success: boolean
  data: Movie[]
  total: number
  page: number
  limit: number
  hasMore: boolean
  source: string
  mem0Enhanced?: boolean
  error?: string
}

// Define parameters for fetching movies
interface GetMovieParams {
  supabase: SupabaseClient
  limit: number
  page: number
  offset: number
}

interface GetMoviesByPreferenceParams extends GetMovieParams {
  userId: string
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

/**
 * Fetches movies based on a user's saved preferences.
 */
export async function getMoviesByPreferences({
  supabase,
  userId,
  limit,
  page,
  offset,
}: GetMoviesByPreferenceParams): Promise<MovieServiceResponse | null> {
  const { data: userProfile } = await supabase
    .from('user_profiles')
    .select('preferences')
    .eq('id', userId)
    .single()

  if (!userProfile?.preferences) {
    return null // Return null if no preferences are found, so the caller can fall back.
  }

  logger.info('Loading preference-based recommendations', { preferences: userProfile.preferences })

  const preferences = userProfile.preferences as {
    preferred_genres?: string[]
    avoid_genres?: string[]
    yearRange?: { min?: number; max?: number }
    ratingRange?: { min?: number; max?: number }
  }

  let dbQuery = supabase.from('movies').select('*', { count: 'exact' })

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

  const totalCount = count || 0
  return {
    success: true,
    data: data || [],
    total: totalCount,
    page,
    limit,
    hasMore: (data?.length || 0) === limit && totalCount > page * limit,
    source: 'local-preferences',
  }
}

/**
 * Fetches a list of popular movies, sorted by rating and year.
 */
export async function getPopularMovies({
  supabase,
  limit,
  page,
  offset,
}: GetMovieParams): Promise<MovieServiceResponse> {
  logger.info('Loading general movie recommendations')

  const { data, error, count } = await supabase
    .from('movies')
    .select('*', { count: 'exact' })
    .order('rating', { ascending: false, nullsFirst: false })
    .order('year', { ascending: false, nullsFirst: false })
    .range(offset, offset + limit - 1)

  if (error) {
    logger.error('Error fetching popular movies:', { error: error.message })
    return {
      success: false,
      error: 'Failed to fetch movies',
      data: [],
      total: 0,
      page,
      limit,
      hasMore: false,
      source: 'local-popular',
    }
  }

  const totalCount = count || 0
  return {
    success: true,
    data: data || [],
    total: totalCount,
    page,
    limit,
    hasMore: (data?.length || 0) === limit && totalCount > page * limit,
    source: 'local-popular',
  }
}

export const movieService = {
  async getMovieRecommendations(userProfile: {
    preferences?: MoviePreferences
  }): Promise<MovieRecommendation[]> {
    const supabase = await createClient()

    // Get user preferences if they exist
    if (userProfile.preferences?.preferredGenres?.length) {
      logger.info('Loading preference-based recommendations', {
        hasPreferences: true,
        genreCount: userProfile.preferences.preferredGenres?.length || 0,
      })

      try {
        // Build a query based on user preferences
        const genreQueries = userProfile.preferences.preferredGenres.map(
          genre => `genre.ilike.%${genre}%`
        )

        const { data: movies, error } = await supabase
          .from('movies')
          .select('*')
          .or(genreQueries.join(','))
          .order('rating', { ascending: false })
          .limit(20)

        if (error) throw error

        // Filter out movies the user has already rated negatively
        const dislikedIds = userProfile.preferences.dislikedMovieIds || []
        const filteredMovies = (movies || []).filter(movie => !dislikedIds.includes(movie.id))

        // Sort by match score
        return filteredMovies
          .map(movie => ({
            ...movie,
            matchScore: this.calculateMatchScore(movie, userProfile.preferences!),
            relevanceReason: this.generateRelevanceReason(movie, userProfile.preferences!),
          }))
          .sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0))
      } catch (error) {
        logger.error('Error with preference-based query:', { error: String(error) })
        // Fall back to popular movies
      }
    }

    // Default: Return popular movies
    return this.getPopularMovies()
  },

  async getPopularMovies(): Promise<MovieRecommendation[]> {
    const supabase = await createClient()

    logger.info('Loading general movie recommendations')

    try {
      const { data: movies, error } = await supabase
        .from('movies')
        .select('*')
        .not('rating', 'is', null)
        .order('rating', { ascending: false })
        .limit(20)

      if (error) throw error

      return (movies || []).map(movie => ({
        ...movie,
        relevanceReason: 'Highly rated movie',
      }))
    } catch (error) {
      logger.error('Error fetching popular movies:', { error: String(error) })
      return []
    }
  },

  calculateMatchScore(movie: Movie, preferences: MoviePreferences): number {
    let score = 50 // Base score

    // Genre matching
    if (movie.genre && preferences.preferredGenres) {
      const movieGenres = Array.isArray(movie.genre) ? movie.genre : [movie.genre]
      const genreMatches = movieGenres.filter(g =>
        preferences.preferredGenres!.some(pg => g.toLowerCase().includes(pg.toLowerCase()))
      ).length

      score += genreMatches * 20
    }

    // Rating boost
    if (movie.rating) {
      score += movie.rating * 2
    }

    // Cap at 100
    return Math.min(100, score)
  },

  generateRelevanceReason(movie: Movie, preferences: MoviePreferences): string {
    const reasons = []

    // Check genre matches
    if (movie.genre && preferences.preferredGenres) {
      const movieGenres = Array.isArray(movie.genre) ? movie.genre : [movie.genre]
      const matchedGenres = movieGenres.filter(g =>
        preferences.preferredGenres!.some(pg => g.toLowerCase().includes(pg.toLowerCase()))
      )

      if (matchedGenres.length > 0) {
        reasons.push(`Matches your interest in ${matchedGenres.join(', ')}`)
      }
    }

    // Check mood matches
    if (preferences.moods?.length) {
      const moodKeywords = {
        'Light & Fun': ['comedy', 'animation', 'family'],
        'Intense & Thrilling': ['thriller', 'action', 'suspense'],
        'Emotional & Deep': ['drama', 'romance'],
        'Dark & Mysterious': ['mystery', 'horror', 'noir'],
      }

      const movieGenres = Array.isArray(movie.genre) ? movie.genre : [movie.genre]
      const relevantMoods = preferences.moods.filter(mood => {
        const keywords = moodKeywords[mood as keyof typeof moodKeywords] || []
        return keywords.some(keyword => movieGenres.some(g => g?.toLowerCase().includes(keyword)))
      })

      if (relevantMoods.length > 0) {
        reasons.push(`Perfect for your ${relevantMoods[0]} mood`)
      }
    }

    // Add rating reason
    if (movie.rating && movie.rating >= 8) {
      reasons.push('Highly rated by viewers')
    }

    return reasons.length > 0 ? reasons.join(' • ') : 'Recommended for you'
  },
}
