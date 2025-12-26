import { NextRequest, NextResponse } from 'next/server'
import { LocalStorageService } from '@/lib/db'
import { ConfigService } from '@/lib/config/config-service'
import { logger } from '@/lib/logger'
import { applyRateLimit, rateLimiters } from '@/lib/utils/rate-limiter'
import { createRecommendationResponse, StandardErrors } from '@/lib/utils/api-response'
import { fetchTmdbMovieById, searchTmdbMovies } from '@/lib/utils/tmdb-helpers'
import type { Movie } from '@/types'

interface RecommendedMovie {
  movie: Movie
  confidence_score: number
  explanation: string
  factors: string[]
  noveltyPenalty?: boolean
}

/**
 * GET /api/ai/recommend
 * Generate personalized movie recommendations based on local user data
 */
export async function GET(request: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResponse = await applyRateLimit(request, rateLimiters.ai)
    if (rateLimitResponse) {
      return rateLimitResponse
    }

    const { searchParams } = new URL(request.url)
    const count = parseInt(searchParams.get('count') || '10')
    const context = searchParams.get('context') || undefined
    const excludeWatched = searchParams.get('excludeWatched') !== 'false'

    logger.info('Generating local recommendations', {
      count,
      context,
      excludeWatched
    })

    // Get user preferences from local database
    const genrePrefs = LocalStorageService.getGenrePreferences()
    const ratings = LocalStorageService.getRatings()
    const watchlist = LocalStorageService.getWatchlist()
    const stats = LocalStorageService.getStats()

    // Get top genres by preference
    const topGenres = Array.from(genrePrefs.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([genre]) => genre)

    // Get IDs of movies to exclude (rated and in watchlist)
    const excludeIds = new Set<string>()
    if (excludeWatched) {
      ratings.forEach(r => excludeIds.add(r.movie_id))
      watchlist.filter(w => w.watched).forEach(w => excludeIds.add(w.movie_id))
    }

    // Get candidate movies
    let candidates: Movie[] = []

    // First, try to get movies from local database
    const localMovies = LocalStorageService.getMovies({
      genres: topGenres.length > 0 ? topGenres : undefined,
      limit: count * 3,
      topRated: true,
    })
    candidates = localMovies.movies.filter(m => !excludeIds.has(m.id))

    // If not enough local movies, fetch from TMDB
    if (candidates.length < count) {
      try {
        // Search for movies in user's favorite genres
        for (const genre of topGenres.slice(0, 2)) {
          const tmdbResults = await searchTmdbMovies(genre, { limit: 10, page: 1 })

          for (const movie of tmdbResults.movies) {
            if (movie.tmdb_id && !excludeIds.has(`tmdb_${movie.tmdb_id}`)) {
              // Check if movie exists locally
              let existingMovie = LocalStorageService.getMovieByTmdbId(movie.tmdb_id)

              if (!existingMovie) {
                // Add to local database
                existingMovie = LocalStorageService.upsertMovie({
                  tmdb_id: movie.tmdb_id,
                  title: movie.title,
                  year: movie.year,
                  genre: movie.genre,
                  director: movie.director,
                  plot: movie.plot,
                  poster_url: movie.poster_url,
                  rating: movie.rating,
                  runtime: movie.runtime,
                  popularity: movie.popularity,
                  source: 'tmdb-recommendation',
                })
              }

              if (!excludeIds.has(existingMovie.id)) {
                candidates.push(existingMovie)
                excludeIds.add(existingMovie.id)
              }
            }

            if (candidates.length >= count * 2) break
          }

          if (candidates.length >= count * 2) break
        }
      } catch (tmdbError) {
        logger.warn('TMDB fetch failed, using local movies only', {
          error: tmdbError instanceof Error ? tmdbError.message : 'Unknown error'
        })
      }
    }

    // Score and rank candidates
    const recommendations: RecommendedMovie[] = candidates.map(movie => {
      let score = 0.5 // Base score
      const factors: string[] = []

      // Genre matching
      if (movie.genre && Array.isArray(movie.genre)) {
        const matchingGenres = movie.genre.filter(g => topGenres.includes(g))
        if (matchingGenres.length > 0) {
          score += 0.2 * (matchingGenres.length / movie.genre.length)
          factors.push(`Matches your favorite genres: ${matchingGenres.join(', ')}`)
        }
      }

      // Rating quality
      if (movie.rating && movie.rating >= 7) {
        score += 0.15
        factors.push(`Highly rated (${movie.rating}/10)`)
      }

      // Popularity
      if (movie.popularity && movie.popularity > 50) {
        score += 0.1
        factors.push('Popular choice')
      }

      // Context-based boost
      if (context) {
        const contextLower = context.toLowerCase()
        if (movie.plot?.toLowerCase().includes(contextLower) ||
            movie.title.toLowerCase().includes(contextLower)) {
          score += 0.15
          factors.push(`Matches your mood: "${context}"`)
        }
      }

      // Generate explanation
      let explanation = 'Based on your preferences'
      if (factors.length > 0 && factors[0]) {
        explanation = factors[0]
      }

      return {
        movie,
        confidence_score: Math.min(score, 1),
        explanation,
        factors,
      }
    })

    // Sort by confidence and take top N
    const topRecommendations = recommendations
      .sort((a, b) => b.confidence_score - a.confidence_score)
      .slice(0, count)

    logger.info('Local recommendations generated', {
      count: topRecommendations.length,
      topGenres,
      averageConfidence: topRecommendations.reduce((sum, r) => sum + r.confidence_score, 0) / topRecommendations.length
    })

    // Record recommendation interaction
    LocalStorageService.recordInteraction('recommendations_generated', undefined, {
      count: topRecommendations.length,
      context,
      topGenres,
    })

    // Build userPreferences as Record<string, number>
    const userPreferences: Record<string, number> = {
      totalRatings: stats.totalRatings,
      watchlistCount: stats.watchlistCount,
    }
    // Add genre preferences as numeric values
    topGenres.forEach((genre, index) => {
      userPreferences[`genre_${genre}`] = genrePrefs.get(genre) || (5 - index)
    })

    return createRecommendationResponse(
      topRecommendations,
      {
        algorithm: 'local-personalized',
        confidence: Math.round(
          (topRecommendations.reduce((sum, r) => sum + r.confidence_score, 0) / topRecommendations.length) * 100
        ) / 100,
        factors: ['genre_preferences', 'rating_quality', 'popularity'],
        userPreferences,
        recencyDecay: 0.9, // Default recency decay factor
      },
      `Generated ${topRecommendations.length} personalized recommendations`
    )

  } catch (error) {
    logger.error('Failed to generate recommendations', {
      errorMessage: error instanceof Error ? error.message : String(error)
    })

    return StandardErrors.INTERNAL_ERROR(
      error instanceof Error ? error.message : String(error)
    )
  }
}

/**
 * POST /api/ai/recommend
 * Record a learning signal from user interaction
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      movieId,
      action,
      value,
      context = {}
    } = body

    if (!movieId || !action) {
      return NextResponse.json(
        { error: 'movieId and action are required' },
        { status: 400 }
      )
    }

    // Record learning signal as interaction
    LocalStorageService.recordInteraction(action, String(movieId), {
      value,
      page_type: context.page_type || 'unknown',
      recommendation_type: context.recommendation_type,
      position_in_list: context.position_in_list,
      session_id: context.session_id,
    })

    logger.info('Learning signal recorded', {
      movieId,
      action,
      contextType: context.page_type
    })

    return NextResponse.json({
      success: true,
      message: 'Learning signal recorded',
      source: 'local',
    })

  } catch (error) {
    logger.error('Failed to record learning signal', {
      errorMessage: error instanceof Error ? error.message : String(error)
    })

    return NextResponse.json(
      {
        error: 'Failed to record learning signal',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}
