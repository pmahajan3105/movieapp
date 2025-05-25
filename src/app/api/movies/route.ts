import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/client'
import { getDatabaseForTask, getBestDatabaseForCapability } from '@/lib/movie-databases/config'
import { movieDatabaseService } from '@/lib/movie-databases/service'
import { movieMemoryService } from '@/lib/mem0/client'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Movie } from '@/types'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    // Parse parameters with fallbacks for invalid values
    const limitParam = searchParams.get('limit') || '12'
    const pageParam = searchParams.get('page') || '1'

    const limit = Math.max(1, parseInt(limitParam) || 12)
    const page = Math.max(1, parseInt(pageParam) || 1)
    const offset = (page - 1) * limit
    const usePreferences = searchParams.get('preferences') === 'true'
    const smartMode = searchParams.get('smart') === 'true'
    const realTime = searchParams.get('realtime') === 'true'
    const query = searchParams.get('query') || ''
    const databaseId = searchParams.get('database') // Allow explicit database selection

    if (process.env.NODE_ENV === 'development') {
      console.log('🎬 Fetching movies', {
        limit,
        page,
        offset,
        usePreferences,
        smartMode,
        realTime,
        query,
        databaseId,
      })
    }

    const supabase = await createServerClient()

    // Smart mode: Intelligent recommendation blending with configurable databases
    if (smartMode) {
      return await handleSmartRecommendations(
        supabase,
        limit,
        page,
        offset,
        realTime,
        databaseId || undefined
      )
    }

    // Real-time mode: Use external databases for fresh data
    if (realTime || databaseId) {
      return await handleRealTimeMovies(limit, page, query, databaseId || undefined)
    }

    // Legacy mode: Maintain backward compatibility
    let data,
      error,
      totalCount = 0

    if (usePreferences) {
      // Get current user for preference-based recommendations
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        // Get user preferences
        const { data: userProfile } = await supabase
          .from('user_profiles')
          .select('preferences')
          .eq('id', user.id)
          .single()

        if (userProfile?.preferences) {
          if (process.env.NODE_ENV === 'development') {
            console.log('🎯 Loading preference-based recommendations', userProfile.preferences)
          }

          const preferences = userProfile.preferences as {
            preferred_genres?: string[]
            avoid_genres?: string[]
            yearRange?: { min?: number; max?: number }
            ratingRange?: { min?: number; max?: number }
          }
          let dbQuery = supabase.from('movies').select('*', { count: 'exact' })

          // Build query based on preferences
          if (preferences.preferred_genres && preferences.preferred_genres.length > 0) {
            // Use overlap operator to match any genre
            dbQuery = dbQuery.overlaps('genre', preferences.preferred_genres)
          }

          if (preferences.avoid_genres && preferences.avoid_genres.length > 0) {
            // Exclude movies with avoided genres
            dbQuery = dbQuery.not('genre', 'ov', preferences.avoid_genres)
          }

          if (preferences.yearRange) {
            if (preferences.yearRange.min) {
              dbQuery = dbQuery.gte('year', preferences.yearRange.min)
            }
            if (preferences.yearRange.max) {
              dbQuery = dbQuery.lte('year', preferences.yearRange.max)
            }
          }

          if (preferences.ratingRange?.min) {
            dbQuery = dbQuery.gte('rating', preferences.ratingRange.min)
          }

          // Order by rating and year for best recommendations
          const {
            data: prefData,
            error: prefError,
            count,
          } = await dbQuery
            .order('rating', { ascending: false, nullsFirst: false })
            .order('year', { ascending: false, nullsFirst: false })
            .range(offset, offset + limit - 1)

          if (prefError) {
            console.error('❌ Error with preference-based query, falling back to general results')
            // Fall back to general query
          } else {
            data = prefData
            error = prefError
            totalCount = count || 0
            if (process.env.NODE_ENV === 'development') {
              console.log('✅ Loaded preference-based recommendations', {
                count: data?.length || 0,
                total: totalCount,
                preferences: {
                  genres: preferences.preferred_genres,
                  avoidGenres: preferences.avoid_genres,
                  yearRange: preferences.yearRange,
                  ratingMin: preferences.ratingRange?.min,
                },
              })
            }
          }
        }
      }
    }

    // Fall back to general movies if preferences didn't work or weren't requested
    if (!data) {
      if (process.env.NODE_ENV === 'development') {
        console.log('🎬 Loading general movie recommendations')
      }
      const {
        data: generalData,
        error: generalError,
        count,
      } = await supabase
        .from('movies')
        .select('*', { count: 'exact' })
        .order('rating', { ascending: false, nullsFirst: false })
        .order('year', { ascending: false, nullsFirst: false })
        .range(offset, offset + limit - 1)

      data = generalData
      error = generalError
      totalCount = count || 0
    }

    if (error) {
      console.error('❌ Error fetching movies from database:', {
        error: error.message,
        code: error.code,
        details: error.details,
      })
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to fetch movies from database',
        },
        { status: 500 }
      )
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('✅ Successfully fetched movies from database', {
        count: data?.length || 0,
        total: totalCount,
        hasMore: (data?.length || 0) === limit,
      })
    }

    return NextResponse.json({
      success: true,
      data: data || [],
      total: totalCount,
      pagination: {
        page,
        limit,
        hasMore: (data?.length || 0) === limit,
        totalPages: Math.ceil(totalCount / limit),
      },
      source: 'local',
    })
  } catch (error) {
    console.error('❌ Movies API error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 }
    )
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
        { status: 503 }
      )
    }

    console.log(`🎯 Using database: ${database.name} for real-time movies`)

    let result
    if (query) {
      // Search movies
      result = await movieDatabaseService.searchMovies(database, {
        query,
        limit,
        page,
      })
    } else {
      // Get trending/popular movies
      result = await movieDatabaseService.getTrendingMovies(database, {
        limit,
        page,
      })
    }

    if (!result.movies || result.movies.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'No movies found from external database',
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: result.movies,
      total: result.total,
      pagination: {
        page,
        limit,
        hasMore: result.movies.length === limit,
        totalPages: Math.ceil(result.total / limit),
      },
      source: 'external',
      database: database.name,
      realTime: true,
    })
  } catch (error) {
    console.error('❌ Real-time movies error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'External database error',
      },
      { status: 500 }
    )
  }
}

// Enhanced smart recommendations with Mem0 integration
async function handleSmartRecommendations(
  supabase: SupabaseClient,
  limit: number,
  page: number,
  offset: number,
  realTime: boolean = false,
  databaseId?: string
) {
  console.log('🧠 Using smart recommendation system with Mem0', { realTime, databaseId })

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  let userHasPreferences = false
  let preferredMovies: Movie[] = []
  let recommendationType: 'personalized' | 'popular' | 'mixed' = 'popular'
  let mem0Context = null

  // Step 1: Check for user preferences from AI chat sessions AND Mem0
  if (user) {
    try {
      // Get Mem0 recommendation context
      mem0Context = await movieMemoryService.getRecommendationContext(user.id)
      console.log('🧠 Mem0 context retrieved:', mem0Context.memories.length, 'memories')

      // Also check traditional preferences
      const { data: userProfile } = await supabase
        .from('user_profiles')
        .select('preferences, onboarding_completed')
        .eq('id', user.id)
        .single()

      // Check recent chat sessions for preference extraction
      const { data: recentChats } = await supabase
        .from('chat_sessions')
        .select('preferences_extracted, messages')
        .eq('user_id', user.id)
        .eq('preferences_extracted', true)
        .order('updated_at', { ascending: false })
        .limit(1)

      const hasProfilePreferences =
        userProfile?.preferences && Object.keys(userProfile.preferences).length > 0
      const hasRecentChatPreferences = recentChats && recentChats.length > 0
      const hasMem0Memories = mem0Context?.memories?.length > 0

      userHasPreferences = hasProfilePreferences || hasRecentChatPreferences || hasMem0Memories

      if (userHasPreferences) {
        console.log(
          '👤 User has preferences (Mem0 + traditional), loading personalized recommendations'
        )

        // Get preference-based movies (60% of results)
        const preferenceLimit = Math.ceil(limit * 0.6)

        if (realTime || databaseId) {
          // Get personalized movies from external databases
          preferredMovies = await getPersonalizedExternalMovies(
            userProfile?.preferences,
            preferenceLimit,
            databaseId,
            mem0Context
          )
        } else {
          // Get from local database with Mem0 enhancement
          const preferenceResult = await getPreferenceBasedMovies(
            supabase,
            userProfile?.preferences,
            preferenceLimit,
            Math.floor(offset * 0.6),
            mem0Context
          )

          if (preferenceResult.data && preferenceResult.data.length > 0) {
            preferredMovies = preferenceResult.data as Movie[]
          }
        }

        if (preferredMovies.length > 0) {
          recommendationType = 'personalized'
          console.log(
            `✅ Found ${preferredMovies.length} preference-based movies (enhanced with Mem0)`
          )
        }
      }
    } catch (mem0Error) {
      console.error('❌ Mem0 error, falling back to traditional preferences:', mem0Error)
      // Continue with traditional preference system if Mem0 fails
    }
  }

  // Step 2: Get popular/trending movies to fill remaining slots
  const remainingSlots = limit - preferredMovies.length
  const popularOffset = userHasPreferences ? Math.floor(offset * 0.4) : offset

  let popularMovies: Movie[] = []
  let totalCount = 0

  if (remainingSlots > 0) {
    console.log(`🔥 Loading ${remainingSlots} popular movies`)

    if (realTime || databaseId) {
      // Get trending movies from external databases
      const database = databaseId
        ? (await import('@/lib/movie-databases/config')).AVAILABLE_MOVIE_DATABASES[databaseId]
        : getBestDatabaseForCapability('trending')

      if (database) {
        const trendingResult = await movieDatabaseService.getTrendingMovies(database, {
          limit: remainingSlots,
          page: Math.ceil(popularOffset / remainingSlots) + 1,
        })
        popularMovies = trendingResult.movies
        totalCount = trendingResult.total
      }
    } else {
      // Get from local database
      const {
        data: popularData,
        error: popularError,
        count,
      } = await supabase
        .from('movies')
        .select('*', { count: 'exact' })
        .order('rating', { ascending: false, nullsFirst: false })
        .order('year', { ascending: false, nullsFirst: false })
        .range(popularOffset, popularOffset + remainingSlots - 1)

      if (!popularError && popularData) {
        popularMovies = popularData as Movie[]
        totalCount = count || 0
      }
    }
  }

  // Step 3: Intelligently blend recommendations
  const finalMovies: Movie[] = []
  const usedIds = new Set<string>()

  // Add personalized movies first (remove duplicates)
  preferredMovies.forEach((movie: Movie) => {
    if (!usedIds.has(movie.id)) {
      finalMovies.push(movie)
      usedIds.add(movie.id)
    }
  })

  // Add popular movies (remove duplicates)
  popularMovies.forEach((movie: Movie) => {
    if (!usedIds.has(movie.id) && finalMovies.length < limit) {
      finalMovies.push(movie)
      usedIds.add(movie.id)
    }
  })

  // Update recommendation type based on final mix
  if (preferredMovies.length > 0 && popularMovies.length > 0) {
    recommendationType = 'mixed'
  } else if (preferredMovies.length > 0) {
    recommendationType = 'personalized'
  }

  // For total count in smart mode, use an estimated blend
  if (userHasPreferences && recommendationType !== 'popular') {
    // Estimate total available movies with blended approach
    totalCount = Math.max(totalCount, realTime ? 100 : 50) // Higher estimate for real-time
  }

  const hasMore = finalMovies.length === limit && (realTime || totalCount > offset + limit)

  console.log('🎯 Smart recommendations complete (with Mem0)', {
    personalizedCount: preferredMovies.length,
    popularCount: popularMovies.filter(
      (m: Movie) => !preferredMovies.some((p: Movie) => p.id === m.id)
    ).length,
    finalCount: finalMovies.length,
    recommendationType,
    userHasPreferences,
    hasMore,
    realTime,
    databaseId,
    mem0MemoriesCount: mem0Context?.memories.length || 0,
  })

  return NextResponse.json({
    success: true,
    data: finalMovies,
    total: totalCount,
    pagination: {
      currentPage: page,
      hasMore,
      totalPages: hasMore ? page + 1 : page, // Conservative estimate
    },
    recommendationType,
    userHasPreferences,
    smartMode: true,
    realTime: realTime || !!databaseId,
    database: databaseId
      ? (await import('@/lib/movie-databases/config')).AVAILABLE_MOVIE_DATABASES[databaseId]?.name
      : undefined,
    mem0Enhanced: (mem0Context?.memories?.length || 0) > 0,
  })
}

// Define types for Mem0 context
interface Mem0PreferenceMatch {
  keyword: string
  memory: string
  confidence: number
}

interface Mem0Context {
  memories: Array<{ text: string }>
  preferences: {
    favorite_genres?: Mem0PreferenceMatch[]
    avoid_preferences?: Mem0PreferenceMatch[]
    favorite_directors?: Mem0PreferenceMatch[]
    favorite_movies?: Mem0PreferenceMatch[]
  }
}

// Helper function to get preference-based movies (enhanced with Mem0)
async function getPreferenceBasedMovies(
  supabase: SupabaseClient,
  preferences: unknown,
  limit: number,
  offset: number,
  mem0Context?: Mem0Context
) {
  if (!preferences && !mem0Context) {
    return { data: [], error: null, count: 0 }
  }

  // Combine traditional preferences with Mem0 insights
  const prefs = preferences as {
    preferred_genres?: string[]
    favorite_movies?: string[]
    themes?: string[]
    avoid_genres?: string[]
    yearRange?: { min?: number; max?: number }
    ratingRange?: { min?: number; max?: number }
  }

  // Extract additional preferences from Mem0 context
  const mem0Genres =
    mem0Context?.preferences?.favorite_genres?.map((g: Mem0PreferenceMatch) => g.keyword) || []
  const mem0AvoidGenres =
    mem0Context?.preferences?.avoid_preferences?.map((a: Mem0PreferenceMatch) => a.keyword) || []

  let query = supabase.from('movies').select('*', { count: 'exact' })

  // Combine traditional and Mem0 genre preferences
  const allPreferredGenres = [...(prefs?.preferred_genres || []), ...mem0Genres]
  const allAvoidGenres = [...(prefs?.avoid_genres || []), ...mem0AvoidGenres]

  // Apply preference filters
  if (allPreferredGenres.length > 0) {
    query = query.overlaps('genre', allPreferredGenres)
  }

  if (allAvoidGenres.length > 0) {
    query = query.not('genre', 'ov', allAvoidGenres)
  }

  if (prefs?.yearRange) {
    if (prefs.yearRange.min) {
      query = query.gte('year', prefs.yearRange.min)
    }
    if (prefs.yearRange.max) {
      query = query.lte('year', prefs.yearRange.max)
    }
  }

  if (prefs?.ratingRange?.min) {
    query = query.gte('rating', prefs.ratingRange.min)
  }

  return await query
    .order('rating', { ascending: false, nullsFirst: false })
    .order('year', { ascending: false, nullsFirst: false })
    .range(offset, offset + limit - 1)
}

// Enhanced function to get personalized movies from external databases (with Mem0)
async function getPersonalizedExternalMovies(
  preferences: unknown,
  limit: number,
  databaseId?: string,
  mem0Context?: Mem0Context
): Promise<Movie[]> {
  if (!preferences && !mem0Context) return []

  const prefs = preferences as {
    preferred_genres?: string[]
    favorite_movies?: string[]
    themes?: string[]
  }

  try {
    // Select appropriate database
    const database = databaseId
      ? (await import('@/lib/movie-databases/config')).AVAILABLE_MOVIE_DATABASES[databaseId]
      : getBestDatabaseForCapability('search')

    if (!database) return []

    const movies: Movie[] = []

    // Search for movies based on user preferences (traditional + Mem0)
    const searchTerms = []

    if (prefs?.preferred_genres) {
      searchTerms.push(...prefs.preferred_genres)
    }

    if (prefs?.themes) {
      searchTerms.push(...prefs.themes)
    }

    if (prefs?.favorite_movies) {
      searchTerms.push(...prefs.favorite_movies)
    }

    // Add Mem0 insights
    if (mem0Context?.preferences) {
      const mem0Genres =
        mem0Context.preferences.favorite_genres?.map((g: Mem0PreferenceMatch) => g.keyword) || []
      const mem0Directors =
        mem0Context.preferences.favorite_directors?.map((d: Mem0PreferenceMatch) => d.keyword) || []
      searchTerms.push(...mem0Genres, ...mem0Directors)
    }

    // If no specific preferences, use some defaults
    if (searchTerms.length === 0) {
      searchTerms.push('popular', 'top rated')
    }

    // Fetch movies for each search term
    for (const term of searchTerms.slice(0, 4)) {
      // Increased limit for Mem0 enhanced search
      const result = await movieDatabaseService.searchMovies(database, {
        query: term,
        limit: Math.ceil(limit / 4),
      })

      movies.push(...result.movies)

      if (movies.length >= limit) break
    }

    console.log(
      `✅ Found ${movies.length} personalized external movies from ${database.name} (Mem0 enhanced)`
    )

    return movies.slice(0, limit)
  } catch (error) {
    console.error('❌ Error fetching personalized external movies:', error)
    return []
  }
}
