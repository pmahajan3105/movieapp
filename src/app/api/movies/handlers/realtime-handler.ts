import { NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getDatabaseForTask, getBestDatabaseForCapability } from '@/lib/movie-databases/config'
import { ExplanationService } from '@/lib/ai/explanation-service'
import { logger } from '@/lib/logger'

export async function handleRealTimeMovies(
  limit: number,
  page: number,
  query: string,
  databaseId?: string,
  supabase?: SupabaseClient,
  smartMode?: boolean,
  skipExplanations?: boolean,
  topRated?: boolean
) {
  logger.info('Fetching real-time movies', { limit, page, query, databaseId, smartMode })

  try {
    // TEMP DEBUG START
    if (process.env.NODE_ENV === 'development') {
      console.log('DEBUG ENV', {
        NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.slice(0, 6) + '...',
        SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'present' : 'missing',
      })
    }
    // TEMP DEBUG END

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
          logger.debug('Using smart default preferences for new user')
        } else {
          logger.debug('Using user preferences for real-time recommendations', { userPreferences: JSON.stringify(userPreferences) })
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

      logger.debug('Enhanced search with preferences', {
        genres: preferredGenres.slice(0, 2),
        minRating,
        minYear,
        searchQuery: searchParams.query,
      })
    }

    const result =
      query || (smartMode && searchParams.query)
        ? await movieDatabaseService.searchMovies(database, searchParams)
        : topRated
        ? await movieDatabaseService.getTopRatedMovies(database, searchParams)
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

    // Attach explanations for authenticated users (only if not skipped)
    if (supabase && !skipExplanations) {
      const { data: { user: rtUser } } = await supabase.auth.getUser()
      if (rtUser && result.movies) {
        const explanationService = new ExplanationService()
        try {
          const explanations = await explanationService.generateExplanationsForMovies(rtUser.id, result.movies)
          result.movies = result.movies.map(movie => ({
            ...movie,
            explanation: explanations.get(movie.id) || null
          }))
        } catch (error) {
          logger.warn(`Failed to generate batch explanations: ${error instanceof Error ? error.message : String(error)}`)
          // Continue without explanations
        }
      }
    }

    return NextResponse.json({
      ...result,
      source: smartMode ? 'tmdb-ai-enhanced' : 'tmdb-realtime',
      aiEnhanced: smartMode,
      userPreferences: smartMode && userPreferences ? userPreferences : null,
      preferencesApplied: smartMode && userPreferences ? true : false,
    })
  } catch (error) {
    logger.error(`Error fetching realtime movies from ${databaseId || 'auto'}`, { error: error instanceof Error ? error.message : String(error) })
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch real-time movies',
      },
      { status: 500 }
    )
  }
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