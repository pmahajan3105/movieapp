import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/client'
import { getDatabaseForTask, getBestDatabaseForCapability } from '@/lib/movie-databases/config'
import { getMoviesByPreferences, getPopularMovies } from '@/lib/services/movieService'
import { smartRecommenderV2 } from '@/lib/ai/smart-recommender-v2'
import type { SupabaseClient } from '@supabase/supabase-js'

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
    const mood = searchParams.get('mood') || ''
    const genres = searchParams.get('genres')?.split(',').filter(Boolean) || []
    const limit = Math.max(1, parseInt(searchParams.get('limit') || '12'))
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))

    if (smartMode) {
      return await handleSmartRecommendations(supabase, limit, page, query, mood, genres)
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

/**
 * Smart Recommendations Handler V2 - Vector-Enhanced AI Recommendations
 * Uses semantic embeddings and the new SmartRecommenderV2 for intelligent movie discovery
 */
async function handleSmartRecommendations(
  supabase: SupabaseClient,
  limit: number,
  page: number,
  query: string,
  mood: string,
  genres: string[]
) {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    // Fallback to popular movies for logged-out users
    const result = await getPopularMovies({ supabase, limit, page, offset: (page - 1) * limit })
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
      vectorEnhanced: false,
    })
  }

  console.log('🧠 Handling vector-enhanced smart recommendations for user:', user.id)

  try {
    // Get user profile for preferences
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    // Extract preferred genres from user profile
    const userPreferredGenres = userProfile?.preferences?.preferred_genres || []
    const finalGenres = genres.length > 0 ? genres : userPreferredGenres

    // Use SmartRecommenderV2 for vector-enhanced recommendations
    const smartResult = await smartRecommenderV2.getSmartRecommendations({
      userId: user.id,
      userQuery: query || undefined,
      preferredGenres: finalGenres,
      mood: mood || undefined,
      limit,
      semanticThreshold: 0.7,
      diversityFactor: 0.3,
    })

    // Save user interaction for future recommendations
    if (query) {
      await smartRecommenderV2.saveUserInteraction(user.id, 'search-query', 'search', {
        source: 'recommendation',
        query,
        mood,
        genres: finalGenres,
        timestamp: new Date().toISOString(),
      })
    }

    return NextResponse.json({
      success: true,
      data: smartResult.movies,
      total: smartResult.movies.length,
      pagination: {
        currentPage: page,
        limit,
        hasMore: smartResult.movies.length >= limit,
        totalPages: Math.ceil(smartResult.movies.length / limit),
      },
      source: 'smart-recommender-v2',
      vectorEnhanced: true,
      recommendations: smartResult.recommendations,
      insights: smartResult.insights,
    })
  } catch (error) {
    console.error('❌ Smart recommendations V2 error:', error)

    // Fallback to standard preference-based recommendations on error
    const result = await getMoviesByPreferences({
      supabase,
      userId: user.id,
      limit,
      page,
      offset: (page - 1) * limit,
    })

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
        vectorEnhanced: false,
      })
    }

    // Final fallback to popular movies
    const popularResult = await getPopularMovies({
      supabase,
      limit,
      page,
      offset: (page - 1) * limit,
    })
    return NextResponse.json({
      success: true,
      data: popularResult.data,
      total: popularResult.total,
      pagination: {
        currentPage: popularResult.page,
        limit: popularResult.limit,
        hasMore: popularResult.hasMore,
        totalPages: Math.ceil(popularResult.total / popularResult.limit),
      },
      source: 'popular-fallback',
      vectorEnhanced: false,
    })
  }
}
