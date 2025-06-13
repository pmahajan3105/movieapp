import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/client'
import { getDatabaseForTask, getBestDatabaseForCapability } from '@/lib/movie-databases/config'
import { getMoviesByPreferences, getPopularMovies } from '@/lib/services/movieService'
// import { movieMemoryService } from '@/lib/mem0/client' // Disabled - package removed
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Movie } from '@/types'

async function handleLegacyRequest(request: NextRequest, supabase: SupabaseClient) {
  const { searchParams } = new URL(request.url)
  const limit = Math.max(1, parseInt(searchParams.get('limit') || '12'))
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
  const offset = (page - 1) * limit
  const usePreferences = searchParams.get('preferences') === 'true'

  const {
    data: { user },
  } = await supabase.auth.getUser()

  let result = null
  if (usePreferences && user) {
    result = await getMoviesByPreferences({ supabase, userId: user.id, limit, page, offset })
  }

  // Fallback to popular movies if preferences fail or are not requested
  if (!result) {
    result = await getPopularMovies({ supabase, limit, page, offset })
  }

  const response = {
    success: result.success,
    data: result.data,
    total: result.total,
    pagination: {
      currentPage: result.page,
      limit: result.limit,
      hasMore: result.hasMore,
      totalPages: Math.ceil(result.total / result.limit),
    },
    source: result.source,
  }

  return NextResponse.json(response)
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const supabase = await createServerClient()

    const smartMode = searchParams.get('smart') === 'true'
    const realTime = searchParams.get('realtime') === 'true'
    const databaseId = searchParams.get('database')
    const query = searchParams.get('query') || ''
    const limit = Math.max(1, parseInt(searchParams.get('limit') || '12'))
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))

    if (smartMode) {
      return await handleSmartRecommendations(
        supabase,
        limit,
        page,
        (page - 1) * limit,
        realTime,
        databaseId || undefined
      )
    }

    if (realTime || databaseId) {
      return await handleRealTimeMovies(limit, page, query, databaseId || undefined)
    }

    // Default to legacy handling (which now uses the service)
    return await handleLegacyRequest(request, supabase)
  } catch (error) {
    console.error('❌ Movies API error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

// Handle real-time movie fetching using configurable databases
async function handleRealTimeMovies(
  limit: number,
  page: number,
  query: string,
  databaseId?: string
) {
  console.log('🌐 Fetching real-time movies', { limit, page, query, databaseId })

  try {
    // Select database based on requirements
    let database
    if (databaseId) {
      const { AVAILABLE_MOVIE_DATABASES } = await import('@/lib/movie-databases/config')
      database = AVAILABLE_MOVIE_DATABASES[databaseId]
      if (!database) {
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid database ID',
          },
          { status: 400 }
        )
      }
    } else {
      // Auto-select best database based on requirements
      database = query ? getDatabaseForTask('search') : getBestDatabaseForCapability('trending')
    }

    if (!database) {
      return NextResponse.json(
        {
          success: false,
          error: 'No suitable database available',
        },
        { status: 500 }
      )
    }

    // Use the database service to fetch movies
    const { movieDatabaseService } = await import('@/lib/movie-databases/service')
    const result = query
      ? await movieDatabaseService.searchMovies(database, { query, limit, page })
      : await movieDatabaseService.getTrendingMovies(database, { limit, page })

    return NextResponse.json(result)
  } catch (error) {
    console.error(`❌ Error fetching from ${databaseId || 'auto'} database:`, error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch real-time movies',
      },
      { status: 500 }
    )
  }
}

interface PreferenceMatch {
  keyword: string
  memory: string
  confidence: number
}

interface UserContext {
  memories: Array<{ text: string }>
  preferences: {
    favorite_genres: PreferenceMatch[]
    avoid_preferences: PreferenceMatch[]
    favorite_directors: PreferenceMatch[]
    favorite_movies: PreferenceMatch[]
  }
}

function convertToUserContext(
  context: {
    memories: Array<{ text?: string; memory?: string }>
    preferences: Record<string, unknown>
  } | null
): UserContext {
  if (!context) {
    return {
      memories: [],
      preferences: {
        favorite_genres: [],
        avoid_preferences: [],
        favorite_directors: [],
        favorite_movies: [],
      },
    }
  }

  const convertedPreferences: any = {
    favorite_genres: [],
    avoid_preferences: [],
    favorite_directors: [],
    favorite_movies: [],
  }

  for (const key in context.preferences) {
    if (Object.prototype.hasOwnProperty.call(context.preferences, key)) {
      const value = context.preferences[key] as any
      if (Array.isArray(value)) {
        convertedPreferences[key] = value.map(item => ({
          keyword: item,
          memory: `User preference for ${key}: ${item}`,
          confidence: 0.9,
        }))
      }
    }
  }

  return {
    memories: (context.memories || []).map(m => ({ text: m.text || m.memory || '' })),
    preferences: convertedPreferences,
  }
}

function validateAIRecommendationCriteria(
  movie: Movie,
  userContext: UserContext,
  userProfile?: any
): { isValid: boolean; matchedCriteria: string[]; score: number } {
  let score = 0
  const matchedCriteria: string[] = []

  if (!movie.genre || movie.genre.length === 0) {
    return { isValid: false, matchedCriteria: ['Missing genre'], score: 0 }
  }

  const userPreferences = userProfile?.preferences || {}
  const preferredGenres = new Set(userPreferences.preferred_genres || [])
  const avoidGenres = new Set(userPreferences.avoid_genres || [])

  // Rule 1: Must not be in avoided genres
  if (movie.genre.some(g => avoidGenres.has(g))) {
    return { isValid: false, matchedCriteria: ['In avoided genres'], score: 0 }
  }

  // Rule 2: Must be in preferred genres (if any exist)
  if (preferredGenres.size > 0 && !movie.genre.some(g => preferredGenres.has(g))) {
    return { isValid: false, matchedCriteria: ['Not in preferred genres'], score: 0 }
  } else if (preferredGenres.size > 0) {
    score += 2
    matchedCriteria.push('Matches preferred genres')
  }

  // Rule 3: Rating check
  if (
    movie.rating &&
    userPreferences.ratingRange?.min &&
    movie.rating < userPreferences.ratingRange.min
  ) {
    return { isValid: false, matchedCriteria: ['Below minimum rating'], score: 0 }
  } else if (movie.rating) {
    score += movie.rating / 5 // Normalize rating to a score of 0-2
    matchedCriteria.push('High rating')
  }

  // Rule 4: Year check
  if (movie.year) {
    if (userPreferences.yearRange?.min && movie.year < userPreferences.yearRange.min) {
      return { isValid: false, matchedCriteria: ['Too old'], score: 0 }
    }
    if (userPreferences.yearRange?.max && movie.year > userPreferences.yearRange.max) {
      return { isValid: false, matchedCriteria: ['Too new'], score: 0 }
    }
    matchedCriteria.push('Within year range')
  }

  // Semantic check with user context (simple keyword matching for now)
  const plot = movie.plot?.toLowerCase() || ''
  userContext.preferences.favorite_genres.forEach((pref: PreferenceMatch) => {
    if (movie.genre?.some(g => g.toLowerCase().includes(pref.keyword.toLowerCase()))) {
      score += pref.confidence
      matchedCriteria.push(`Semantic match: ${pref.keyword}`)
    }
  })
  userContext.memories.forEach((mem: { text: string }) => {
    if (plot.includes(mem.text.toLowerCase())) {
      score += 0.5
      matchedCriteria.push(`Context match: ${mem.text}`)
    }
  })

  return { isValid: true, matchedCriteria, score: parseFloat(score.toFixed(2)) }
}

/**
 * Smart Recommendations Handler
 * - Fetches initial candidates from a database (real-time or local).
 * - Gets user's interaction history and preferences from user profile.
 * - Filters, re-ranks, and augments movies based on AI-driven criteria.
 */
async function handleSmartRecommendations(
  supabase: SupabaseClient,
  limit: number,
  page: number,
  offset: number,
  realTime: boolean = false,
  databaseId?: string
) {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    // Fallback to popular movies for logged-out users
    const result = await getPopularMovies({ supabase, limit, page, offset })
    return NextResponse.json({
      success: true,
      data: result.data,
      total: result.total,
      pagination: {
        currentPage: result.page,
        limit: result.limit,
        hasMore: result.hasMore,
        totalPages: Math.ceil(result.total / result.limit),
      },
      source: 'local-popular',
      mem0Enhanced: false,
    })
  }

  console.log('🧠 Handling smart recommendations for user:', user.id)

  try {
    // 1. Fetch movie candidates (from real-time DB or local cache)
    const candidateLimit = limit * 3 // Fetch more candidates to allow for filtering
    let movieCandidates: Movie[] = []

    if (realTime) {
      const realTimeResult = await handleRealTimeMovies(candidateLimit, page, '', databaseId)
      const body = await realTimeResult.json()
      if (body.success) {
        movieCandidates = body.data
      }
    } else {
      const localResult = await getPopularMovies({ supabase, limit: candidateLimit, page, offset })
      if (localResult.success) {
        movieCandidates = localResult.data
      }
    }

    if (movieCandidates.length === 0) {
      return NextResponse.json({ success: true, data: [], pagination: { hasMore: false } })
    }

    // 2. Get user context (mem0 disabled - using fallback)
    const mem0ContextData = { memories: [], preferences: {} }

    // Also get user profile for explicit preferences
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    const userContext = convertToUserContext({
      memories: mem0ContextData?.memories || [],
      preferences: userProfile?.preferences || {},
    })

    console.log('🤖 User Context:', JSON.stringify(userContext, null, 2))

    // 3. Filter and re-rank candidates
    const validatedMovies = movieCandidates
      .map(movie => {
        const validation = validateAIRecommendationCriteria(movie, userContext, userProfile)
        return { ...movie, ...validation }
      })
      .filter(movie => movie.isValid)
      .sort((a, b) => b.score - a.score)

    const finalMovies = validatedMovies.slice(0, limit)
    const totalCount = validatedMovies.length

    return NextResponse.json({
      success: true,
      data: finalMovies,
      total: totalCount,
      pagination: {
        currentPage: page,
        limit,
        hasMore: totalCount > limit,
        totalPages: Math.ceil(totalCount / limit),
      },
      source: 'smart-recommender',
      mem0Enhanced: false,
    })
  } catch (error) {
    console.error('❌ Smart recommendations error:', error)
    // Fallback to standard preference-based recommendations on error
    const result = await getMoviesByPreferences({ supabase, userId: user.id, limit, page, offset })
    if (result) {
      return NextResponse.json({
        success: true,
        data: result.data,
        total: result.total,
        pagination: {
          currentPage: result.page,
          limit: result.limit,
          hasMore: result.hasMore,
          totalPages: Math.ceil(result.total / result.limit),
        },
        source: 'local-preferences-fallback',
        mem0Enhanced: false,
      })
    }
    // Final fallback to popular
    return NextResponse.json(await getPopularMovies({ supabase, limit, page, offset }))
  }
}
