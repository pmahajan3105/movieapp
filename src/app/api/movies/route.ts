import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/client'
import { getDatabaseForTask, getBestDatabaseForCapability } from '@/lib/movie-databases/config'
import { movieDatabaseService } from '@/lib/movie-databases/service'
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
        databaseId
      })
    }

    const supabase = await createServerClient()

    // Smart mode: Intelligent recommendation blending with configurable databases
    if (smartMode) {
      return await handleSmartRecommendations(supabase, limit, page, offset, realTime, databaseId || undefined)
    }

    // Real-time mode: Use external databases for fresh data
    if (realTime || databaseId) {
      return await handleRealTimeMovies(limit, page, query, databaseId || undefined)
    }

    // Legacy mode: Maintain backward compatibility
    let data, error, totalCount = 0

    if (usePreferences) {
      // Get current user for preference-based recommendations
      const { data: { user } } = await supabase.auth.getUser()
      
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
          const { data: prefData, error: prefError, count } = await dbQuery
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
                  ratingMin: preferences.ratingRange?.min
                }
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
      const { data: generalData, error: generalError, count } = await supabase
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
        details: error.details
      })
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to fetch movies from database' 
      }, { status: 500 })
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('✅ Successfully fetched movies from database', { 
        count: data?.length || 0,
        total: totalCount,
        hasMore: (data?.length || 0) === limit
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
      source: 'local'
    })
  } catch (error) {
    console.error('❌ Movies API error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}

// Handle real-time movie fetching using configurable databases
async function handleRealTimeMovies(limit: number, page: number, query: string, databaseId?: string) {
  console.log('🌐 Fetching real-time movies', { limit, page, query, databaseId })
  
  try {
    // Select database based on requirements
    let database
    if (databaseId) {
      const { AVAILABLE_MOVIE_DATABASES } = await import('@/lib/movie-databases/config')
      database = AVAILABLE_MOVIE_DATABASES[databaseId]
      if (!database) {
        return NextResponse.json({ 
          success: false, 
          error: `Database ${databaseId} not found` 
        }, { status: 400 })
      }
    } else if (query) {
      // Use best database for search
      database = getBestDatabaseForCapability('search')
    } else {
      // Use best database for trending
      database = getBestDatabaseForCapability('trending')
    }

    console.log(`📡 Using ${database.name} for real-time data`)

    let result
    if (query) {
      // Search movies
      result = await movieDatabaseService.searchMovies(database, {
        query,
        limit,
        page
      })
    } else {
      // Get trending movies
      result = await movieDatabaseService.getTrendingMovies(database, {
        limit,
        page
      })
    }

    return NextResponse.json({
      success: true,
      data: result.movies,
      total: result.total,
      pagination: {
        page: result.page,
        limit,
        hasMore: result.page < result.totalPages,
        totalPages: result.totalPages,
      },
      source: result.source,
      database: database.name
    })

  } catch (error) {
    console.error('❌ Error fetching real-time movies:', error)
    
    // Fallback to local database
    console.log('🔄 Falling back to local database')
    const fallbackDatabase = getDatabaseForTask('fallback')
    
    try {
      const result = await movieDatabaseService.searchMovies(fallbackDatabase, {
        query,
        limit,
        page
      })

      return NextResponse.json({
        success: true,
        data: result.movies,
        total: result.total,
        pagination: {
          page: result.page,
          limit,
          hasMore: result.page < result.totalPages,
          totalPages: result.totalPages,
        },
        source: 'local',
        database: 'Local Database (Fallback)',
        warning: 'External database unavailable, using local fallback'
      })
    } catch (fallbackError) {
      console.error('❌ Fallback also failed:', fallbackError)
      return NextResponse.json({ 
        success: false, 
        error: 'All movie databases unavailable' 
      }, { status: 503 })
    }
  }
}

// Enhanced smart recommendation system with configurable databases
async function handleSmartRecommendations(
  supabase: SupabaseClient, 
  limit: number, 
  page: number, 
  offset: number, 
  realTime: boolean = false,
  databaseId?: string
) {
  console.log('🧠 Using smart recommendation system', { realTime, databaseId })
  
  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  
  let userHasPreferences = false
  let preferredMovies: Movie[] = []
  let recommendationType: 'personalized' | 'popular' | 'mixed' = 'popular'

  // Step 1: Check for user preferences from AI chat sessions
  if (user) {
    // Check if user has preferences from chat sessions
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('preferences, onboarding_completed')
      .eq('id', user.id)
      .single()

    // Also check recent chat sessions for preference extraction
    const { data: recentChats } = await supabase
      .from('chat_sessions')
      .select('preferences_extracted, messages')
      .eq('user_id', user.id)
      .eq('preferences_extracted', true)
      .order('updated_at', { ascending: false })
      .limit(1)

    const hasProfilePreferences = userProfile?.preferences && Object.keys(userProfile.preferences).length > 0
    const hasRecentChatPreferences = recentChats && recentChats.length > 0
    
    userHasPreferences = hasProfilePreferences || hasRecentChatPreferences

    if (userHasPreferences) {
      console.log('👤 User has preferences, loading personalized recommendations')
      
      // Get preference-based movies (60% of results)
      const preferenceLimit = Math.ceil(limit * 0.6)
      
      if (realTime || databaseId) {
        // Get personalized movies from external databases
        preferredMovies = await getPersonalizedExternalMovies(
          userProfile?.preferences, 
          preferenceLimit,
          databaseId
        )
      } else {
        // Get from local database
        const preferenceResult = await getPreferenceBasedMovies(
          supabase, 
          userProfile?.preferences, 
          preferenceLimit, 
          Math.floor(offset * 0.6)
        )
        
        if (preferenceResult.data && preferenceResult.data.length > 0) {
          preferredMovies = preferenceResult.data as Movie[]
        }
      }
      
      if (preferredMovies.length > 0) {
        recommendationType = 'personalized'
        console.log(`✅ Found ${preferredMovies.length} preference-based movies`)
      }
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
          page: Math.ceil(popularOffset / remainingSlots) + 1
        })
        popularMovies = trendingResult.movies
        totalCount = trendingResult.total
      }
    } else {
      // Get from local database
      const { data: popularData, error: popularError, count } = await supabase
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

  console.log('🎯 Smart recommendations complete', {
    personalizedCount: preferredMovies.length,
    popularCount: popularMovies.filter((m: Movie) => !preferredMovies.some((p: Movie) => p.id === m.id)).length,
    finalCount: finalMovies.length,
    recommendationType,
    userHasPreferences,
    hasMore,
    realTime,
    databaseId
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
    database: databaseId ? (await import('@/lib/movie-databases/config')).AVAILABLE_MOVIE_DATABASES[databaseId]?.name : undefined
  })
}

// Helper function to get preference-based movies
async function getPreferenceBasedMovies(supabase: SupabaseClient, preferences: unknown, limit: number, offset: number) {
  if (!preferences) {
    return { data: [], error: null, count: 0 }
  }

  const prefs = preferences as {
    preferred_genres?: string[]
    favorite_movies?: string[]
    themes?: string[]
    avoid_genres?: string[]
    yearRange?: { min?: number; max?: number }
    ratingRange?: { min?: number; max?: number }
  }

  let query = supabase.from('movies').select('*', { count: 'exact' })

  // Apply preference filters
  if (prefs.preferred_genres && prefs.preferred_genres.length > 0) {
    query = query.overlaps('genre', prefs.preferred_genres)
  }

  if (prefs.avoid_genres && prefs.avoid_genres.length > 0) {
    query = query.not('genre', 'ov', prefs.avoid_genres)
  }

  if (prefs.yearRange) {
    if (prefs.yearRange.min) {
      query = query.gte('year', prefs.yearRange.min)
    }
    if (prefs.yearRange.max) {
      query = query.lte('year', prefs.yearRange.max)
    }
  }

  if (prefs.ratingRange?.min) {
    query = query.gte('rating', prefs.ratingRange.min)
  }

  return await query
    .order('rating', { ascending: false, nullsFirst: false })
    .order('year', { ascending: false, nullsFirst: false })
    .range(offset, offset + limit - 1)
}

// New function to get personalized movies from external databases
async function getPersonalizedExternalMovies(
  preferences: unknown, 
  limit: number,
  databaseId?: string
): Promise<Movie[]> {
  if (!preferences) return []
  
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
    
    // Search for movies based on user preferences
    const searchTerms = []
    
    if (prefs.preferred_genres) {
      searchTerms.push(...prefs.preferred_genres)
    }
    
    if (prefs.themes) {
      searchTerms.push(...prefs.themes)
    }
    
    if (prefs.favorite_movies) {
      searchTerms.push(...prefs.favorite_movies)
    }
    
    // If no specific preferences, use some defaults
    if (searchTerms.length === 0) {
      searchTerms.push('popular', 'top rated')
    }
    
    // Fetch movies for each search term
    for (const term of searchTerms.slice(0, 3)) { // Limit search terms
      const result = await movieDatabaseService.searchMovies(database, {
        query: term,
        limit: Math.ceil(limit / 3)
      })
      
      movies.push(...result.movies)
      
      if (movies.length >= limit) break
    }
    
    console.log(`✅ Found ${movies.length} personalized external movies from ${database.name}`)
    
    return movies.slice(0, limit)
  } catch (error) {
    console.error('❌ Error fetching personalized external movies:', error)
    return []
  }
}
