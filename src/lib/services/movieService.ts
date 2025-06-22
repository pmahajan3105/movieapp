import type { SupabaseClient } from '@supabase/supabase-js'
import type { Movie } from '@/types'

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

  console.log('🎯 Loading preference-based recommendations', userProfile.preferences)

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
    console.error('❌ Error with preference-based query:', error)
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
  console.log('🎬 Loading general movie recommendations')

  const { data, error, count } = await supabase
    .from('movies')
    .select('*', { count: 'exact' })
    .order('rating', { ascending: false, nullsFirst: false })
    .order('year', { ascending: false, nullsFirst: false })
    .range(offset, offset + limit - 1)

  if (error) {
    console.error('❌ Error fetching popular movies:', error)
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
