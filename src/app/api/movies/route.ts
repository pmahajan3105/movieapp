import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { getDatabaseForTask, getBestDatabaseForCapability } from '@/lib/movie-databases/config'
import { getMovieService } from '@/lib/services/movie-service'
import { smartRecommenderV2 } from '@/lib/ai/smart-recommender-v2'
import type { SupabaseClient } from '@supabase/supabase-js'
import { MovieRepository } from '@/repositories'

async function handleLegacyRequest(request: NextRequest, supabase: SupabaseClient) {
  const { searchParams } = new URL(request.url)
  const limit = Math.max(1, parseInt(searchParams.get('limit') || '12') || 12)
  const page = Math.max(1, parseInt(searchParams.get('page') || '1') || 1)
  const usePreferences = searchParams.get('preferences') === 'true'

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const movieService = getMovieService()
  let result = null

  if (usePreferences && user) {
    const preferencesResult = await movieService.getMoviesByPreferences(user.id, { limit, page })
    if (preferencesResult) {
      result = {
        success: true,
        data: preferencesResult.movies,
        total: preferencesResult.totalResults,
        page: preferencesResult.page,
        limit,
        hasMore: preferencesResult.page * limit < preferencesResult.totalResults,
        source: preferencesResult.source,
      }
    }
  }

  // Fallback to popular movies if preferences fail or are not requested
  if (!result) {
    const popularResult = await movieService.getPopularMovies({ limit, page })
    result = {
      success: true,
      data: popularResult.movies,
      total: popularResult.totalResults,
      page: popularResult.page,
      limit,
      hasMore: popularResult.page * limit < popularResult.totalResults,
      source: popularResult.source,
    }
  }

  const response = {
    success: result.success,
    data: result.data,
    total: result.total,
    pagination: {
      currentPage: result.page,
      limit: limit,
      hasMore: result.hasMore,
      totalPages: Math.ceil(result.total / limit),
    },
    source: result.source,
  }

  return NextResponse.json(response)
}

// Create Supabase client for server-side use
function createSupabaseServerClient(request: NextRequest) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set() {
          // API routes don't set cookies
        },
        remove() {
          // API routes don't remove cookies
        },
      },
    }
  )
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const supabase = createSupabaseServerClient(request)

    const smartMode = searchParams.get('smart') === 'true'
    const realTime = searchParams.get('realtime') === 'true'
    const databaseId = searchParams.get('database')
    const query = searchParams.get('query') || ''
    const mood = searchParams.get('mood') || ''
    const genres = searchParams.get('genres')?.split(',').filter(Boolean) || []
    const limit = Math.max(1, parseInt(searchParams.get('limit') || '12') || 12)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1') || 1)

    if (realTime || databaseId) {
      return await handleRealTimeMovies(
        limit,
        page,
        query,
        databaseId || undefined,
        supabase,
        smartMode
      )
    }

    if (smartMode) {
      return await handleSmartRecommendations(supabase, limit, page, query, mood, genres)
    }

    // Default to legacy handling (which now uses the service)
    return await handleLegacyRequest(request, supabase)
  } catch (error) {
    console.error('❌ Movies API error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

// Handle real-time movie fetching using configurable databases with AI preferences
async function handleRealTimeMovies(
  limit: number,
  page: number,
  query: string,
  databaseId?: string,
  supabase?: SupabaseClient,
  smartMode?: boolean
) {
  console.log('🌐 Fetching real-time movies', { limit, page, query, databaseId, smartMode })

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

    // Get user preferences for smart recommendations
    let userPreferences = null
    if (smartMode && supabase) {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (user) {
        const { data: userProfile } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', user.id)
          .single()

        userPreferences = userProfile?.preferences

        // If no preferences exist, create smart defaults based on popular genres
        if (!userPreferences || !userPreferences.preferred_genres) {
          userPreferences = {
            preferred_genres: ['Action', 'Drama', 'Comedy', 'Thriller', 'Adventure'],
            disliked_genres: [],
            preferred_rating_min: 6.0,
            preferred_year_min: 2000,
          }
          console.log('🧠 Using smart default preferences for new user')
        } else {
          console.log('🧠 Using user preferences for real-time recommendations:', userPreferences)
        }
      }
    }

    // Use the database service to fetch movies
    const { movieDatabaseService } = await import('@/lib/movie-databases/service')

    // Build search parameters based on user preferences
    let searchParams: any = { query, limit, page }

    if (smartMode && userPreferences) {
      // Enhance search with user preferences
      const preferredGenres = userPreferences.preferred_genres || []
      const minRating = userPreferences.preferred_rating_min || 6.0
      const minYear = userPreferences.preferred_year_min || 2000

      // If no specific query, create intelligent search based on preferences
      if (!query && preferredGenres.length > 0) {
        // Use top 2 preferred genres for search
        searchParams.query = preferredGenres.slice(0, 2).join(' ')
      }

      // Add preference-based filtering
      if (preferredGenres.length > 0) {
        searchParams.genres = preferredGenres
      }

      // Add quality filters
      searchParams.minRating = minRating
      searchParams.minYear = minYear

      console.log('🎯 Enhanced search with preferences:', {
        genres: preferredGenres.slice(0, 2),
        minRating,
        minYear,
        searchQuery: searchParams.query,
      })
    }

    const result =
      query || (smartMode && searchParams.query)
        ? await movieDatabaseService.searchMovies(database, searchParams)
        : await movieDatabaseService.getTrendingMovies(database, searchParams)

    // Enhance results with AI reasoning if in smart mode
    if (smartMode && result.movies) {
      result.movies = result.movies.map(movie => ({
        ...movie,
        reasoning: generateRealtimeRecommendationReason(movie, userPreferences, query),
        confidence_score: calculateRealtimeConfidenceScore(movie, userPreferences, query),
        source: 'tmdb-ai-enhanced',
      }))
    }

    return NextResponse.json({
      ...result,
      source: smartMode ? 'tmdb-ai-enhanced' : 'tmdb-realtime',
      aiEnhanced: smartMode,
      userPreferences: smartMode && userPreferences ? userPreferences : null,
      preferencesApplied: smartMode && userPreferences ? true : false,
    })
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
 * Smart Recommendations Handler V2 - Fast Local-First AI Recommendations
 * Uses local database with smart filtering and fast response times
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
    const movieService = getMovieService()
    const result = await movieService.getPopularMovies({ limit, page })
    return NextResponse.json({
      success: true,
      data: result.movies,
      total: result.totalResults,
      pagination: {
        currentPage: result.page,
        limit: limit,
        hasMore: result.page * limit < result.totalResults,
        totalPages: Math.ceil(result.totalResults / limit),
      },
      source: 'local-popular',
      vectorEnhanced: false,
    })
  }

  console.log('🧠 Handling fast smart recommendations for user:', user.id)

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

    // Use MovieRepository for smart filtering
    const movieRepo = new MovieRepository(supabase)

    // Build search filters
    const filters: Parameters<typeof movieRepo.search>[1] = {
      limit,
      offset: (page - 1) * limit,
    }

    // Apply genre filtering if specified
    if (finalGenres.length > 0) {
      filters.genres = finalGenres
    }

    // Apply mood-based genre filtering
    if (mood) {
      const moodGenres: Record<string, string[]> = {
        happy: ['Comedy', 'Animation', 'Family', 'Musical'],
        upbeat: ['Comedy', 'Animation', 'Family', 'Musical'],
        sad: ['Drama', 'Romance'],
        emotional: ['Drama', 'Romance'],
        excited: ['Action', 'Adventure', 'Thriller'],
        energetic: ['Action', 'Adventure', 'Thriller'],
        relaxed: ['Documentary', 'Biography', 'History'],
        calm: ['Documentary', 'Biography', 'History'],
        scared: ['Horror', 'Thriller', 'Mystery'],
        thrilled: ['Horror', 'Thriller', 'Mystery'],
      }

      const moodLower = mood.toLowerCase()
      if (moodGenres[moodLower]) {
        filters.genres = [...(filters.genres || []), ...moodGenres[moodLower]]
        // Remove duplicates
        filters.genres = [...new Set(filters.genres)]
      }
    }

    try {
      const { movies, total } = await movieRepo.search(query || '', filters)

      // Enhance movies with recommendation reasoning
      const enhancedMovies = movies.map(movie => ({
        ...movie,
        reasoning: generateRecommendationReason(movie, finalGenres, mood, query),
        confidence_score: calculateConfidenceScore(movie, finalGenres, mood, query),
        source: 'smart-local',
      }))

      // Save user interaction for future recommendations
      if (query || mood || finalGenres.length > 0) {
        await smartRecommenderV2.saveUserInteraction(user.id, 'smart-search', 'search', {
          source: 'search',
          query,
          mood,
          genres: finalGenres,
          timestamp: new Date().toISOString(),
        })
      }

      const totalPages = Math.ceil(total / limit)

      return NextResponse.json({
        success: true,
        data: enhancedMovies,
        total,
        pagination: {
          currentPage: page,
          limit,
          hasMore: page < totalPages,
          totalPages,
        },
        source: 'smart-local-v2',
        vectorEnhanced: true,
        filters: {
          genres: finalGenres,
          mood,
          query,
        },
        performance: {
          fast: true,
          local: true,
        },
      })
    } catch (error) {
      console.error('❌ Smart recommendations V2 error:', error)

      // Fallback to standard preference-based recommendations on error
      const movieService = getMovieService()
      const preferencesResult = await movieService.getMoviesByPreferences(user.id, { limit, page })

      if (preferencesResult) {
        return NextResponse.json({
          success: true,
          data: preferencesResult.movies,
          total: preferencesResult.totalResults,
          pagination: {
            currentPage: preferencesResult.page,
            limit: limit,
            hasMore: preferencesResult.page * limit < preferencesResult.totalResults,
            totalPages: Math.ceil(preferencesResult.totalResults / limit),
          },
          source: 'local-preferences-fallback',
          vectorEnhanced: false,
        })
      }

      // Final fallback to popular movies
      const popularResult = await movieService.getPopularMovies({ limit, page })
      return NextResponse.json({
        success: true,
        data: popularResult.movies,
        total: popularResult.totalResults,
        pagination: {
          currentPage: popularResult.page,
          limit: limit,
          hasMore: popularResult.page * limit < popularResult.totalResults,
          totalPages: Math.ceil(popularResult.totalResults / limit),
        },
        source: 'popular-fallback',
        vectorEnhanced: false,
      })
    }
  } catch (error) {
    console.error('❌ Smart recommendations V2 error:', error)

    // Fallback to standard preference-based recommendations on error
    const movieService = getMovieService()
    const preferencesResult = await movieService.getMoviesByPreferences(user.id, { limit, page })

    if (preferencesResult) {
      return NextResponse.json({
        success: true,
        data: preferencesResult.movies,
        total: preferencesResult.totalResults,
        pagination: {
          currentPage: preferencesResult.page,
          limit: limit,
          hasMore: preferencesResult.page * limit < preferencesResult.totalResults,
          totalPages: Math.ceil(preferencesResult.totalResults / limit),
        },
        source: 'local-preferences-fallback',
        vectorEnhanced: false,
      })
    }

    // Final fallback to popular movies
    const popularResult = await movieService.getPopularMovies({ limit, page })
    return NextResponse.json({
      success: true,
      data: popularResult.movies,
      total: popularResult.totalResults,
      pagination: {
        currentPage: popularResult.page,
        limit: limit,
        hasMore: popularResult.page * limit < popularResult.totalResults,
        totalPages: Math.ceil(popularResult.totalResults / limit),
      },
      source: 'popular-fallback',
      vectorEnhanced: false,
    })
  }
}

// Helper function to generate recommendation reasoning
function generateRecommendationReason(
  movie: any,
  genres: string[],
  mood: string,
  query: string
): string {
  const reasons = []

  if (
    query &&
    (movie.title.toLowerCase().includes(query.toLowerCase()) ||
      movie.plot?.toLowerCase().includes(query.toLowerCase()))
  ) {
    reasons.push(`Matches your search for "${query}"`)
  }

  if (genres.length > 0 && movie.genre) {
    const matchingGenres = movie.genre.filter((g: string) => genres.includes(g))
    if (matchingGenres.length > 0) {
      reasons.push(`Perfect ${matchingGenres.join(', ')} match`)
    }
  }

  if (mood) {
    reasons.push(`Great for ${mood} mood`)
  }

  if (movie.rating && movie.rating > 7.5) {
    reasons.push(`Highly rated (${movie.rating}/10)`)
  }

  return reasons.length > 0 ? reasons.join(' • ') : 'Recommended for you'
}

// Helper function to calculate confidence score
function calculateConfidenceScore(
  movie: any,
  genres: string[],
  mood: string,
  query: string
): number {
  let score = 0.5 // Base score

  // Query match boost
  if (
    query &&
    (movie.title.toLowerCase().includes(query.toLowerCase()) ||
      movie.plot?.toLowerCase().includes(query.toLowerCase()))
  ) {
    score += 0.3
  }

  // Genre match boost
  if (genres.length > 0 && movie.genre) {
    const matchingGenres = movie.genre.filter((g: string) => genres.includes(g))
    score += (matchingGenres.length / genres.length) * 0.2
  }

  // Rating boost
  if (movie.rating) {
    score += (movie.rating / 10) * 0.2
  }

  return Math.min(score, 1.0)
}

// Helper function to generate real-time recommendation reasoning
function generateRealtimeRecommendationReason(
  movie: any,
  userPreferences: any,
  query: string
): string {
  const reasons = []

  if (
    query &&
    (movie.title.toLowerCase().includes(query.toLowerCase()) ||
      movie.plot?.toLowerCase().includes(query.toLowerCase()))
  ) {
    reasons.push(`Matches your search for "${query}"`)
  }

  if (userPreferences?.preferred_genres && movie.genre) {
    const matchingGenres = movie.genre.filter((g: string) =>
      userPreferences.preferred_genres.includes(g)
    )
    if (matchingGenres.length > 0) {
      reasons.push(`${matchingGenres.join(', ')} - matches your preferences`)
    }
  }

  // Quality indicators
  if (movie.rating && movie.rating > 8.0) {
    reasons.push(`Exceptional rating (${movie.rating}/10)`)
  } else if (movie.rating && movie.rating > 7.0) {
    reasons.push(`Highly rated (${movie.rating}/10)`)
  }

  // Popularity indicators
  if (movie.popularity && movie.popularity > 500) {
    reasons.push('Trending worldwide')
  } else if (movie.popularity && movie.popularity > 100) {
    reasons.push('Popular now')
  }

  // Year preference
  if (userPreferences?.preferred_year_min && movie.year >= userPreferences.preferred_year_min) {
    if (movie.year >= 2020) {
      reasons.push('Recent release')
    } else if (movie.year >= 2010) {
      reasons.push('Modern classic')
    }
  }

  return reasons.length > 0 ? reasons.join(' • ') : 'AI curated for you'
}

// Helper function to calculate real-time confidence score
function calculateRealtimeConfidenceScore(movie: any, userPreferences: any, query: string): number {
  let score = 0.5 // Base score

  // Query match boost
  if (
    query &&
    (movie.title.toLowerCase().includes(query.toLowerCase()) ||
      movie.plot?.toLowerCase().includes(query.toLowerCase()))
  ) {
    score += 0.3
  }

  // User preference match boost
  if (userPreferences?.preferred_genres && movie.genre) {
    const matchingGenres = movie.genre.filter((g: string) =>
      userPreferences.preferred_genres.includes(g)
    )
    score += (matchingGenres.length / Math.max(userPreferences.preferred_genres.length, 1)) * 0.3
  }

  // Rating boost
  if (movie.rating) {
    score += (movie.rating / 10) * 0.2
  }

  // Popularity boost (for trending content)
  if (movie.popularity) {
    score += Math.min(movie.popularity / 1000, 0.1)
  }

  return Math.min(score, 1.0)
}
