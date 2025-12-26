import { NextRequest, NextResponse } from 'next/server'
import { LocalStorageService } from '@/lib/db'
import { logger } from '@/lib/logger'
import { applyRateLimit, rateLimiters } from '@/lib/utils/rate-limiter'
import { createSuccessResponse, StandardErrors } from '@/lib/utils/api-response'
import type { Movie } from '@/types'

// Helper function to calculate preference score
function calculatePreferenceScore(movie: Movie, genrePreferences: Map<string, number>): number {
  if (!movie.genre || !Array.isArray(movie.genre)) return 0

  let score = 0
  let genreCount = 0

  for (const genre of movie.genre) {
    const preference = genrePreferences.get(genre)
    if (preference !== undefined) {
      score += preference
      genreCount++
    }
  }

  return genreCount > 0 ? score / genreCount : 0
}

export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResponse = await applyRateLimit(request, rateLimiters.search)
    if (rateLimitResponse) {
      return rateLimitResponse
    }

    // Parse request body
    const body = await request.json()
    const { query, limit = 10 } = body

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Query parameter is required and must be a string' },
        { status: 400 }
      )
    }

    logger.info('Processing search', { query: query.substring(0, 100) })

    // First try local database search
    const localResults = LocalStorageService.getMovies({
      query,
      limit,
    })

    // Get user genre preferences for scoring
    const genrePrefs = LocalStorageService.getGenrePreferences()

    // If we have local results, score them by user preferences
    let movies = localResults.movies
    if (genrePrefs.size > 0 && movies.length > 0) {
      movies = movies.map(movie => ({
        ...movie,
        preferenceScore: calculatePreferenceScore(movie, genrePrefs),
      })).sort((a, b) => (b.preferenceScore || 0) - (a.preferenceScore || 0))
    }

    // If we have enough local results, return them
    if (movies.length >= limit / 2) {
      return createSuccessResponse({
        movies,
        totalResults: localResults.total,
        searchType: 'local',
      }, `Found ${movies.length} movies locally`)
    }

    // Otherwise, search TMDB
    try {
      const { searchTmdbMovies } = await import('@/lib/utils/tmdb-helpers')
      const tmdbResults = await searchTmdbMovies(query, { limit, page: 1 })

      // Combine local and TMDB results, deduplicating by tmdb_id
      const seenTmdbIds = new Set(movies.map(m => m.tmdb_id).filter(Boolean))
      const tmdbMovies = tmdbResults.movies.filter(m => !seenTmdbIds.has(m.tmdb_id))

      // Add TMDB movies to local database for future searches
      for (const movie of tmdbMovies) {
        if (movie.tmdb_id) {
          LocalStorageService.upsertMovie({
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
            source: 'tmdb-search',
          })
        }
      }

      // Score TMDB movies by preferences
      const scoredTmdbMovies = tmdbMovies.map(movie => ({
        ...movie,
        preferenceScore: calculatePreferenceScore(movie, genrePrefs),
      }))

      // Combine and sort
      const allMovies = [...movies, ...scoredTmdbMovies]
        .sort((a, b) => ((b as { preferenceScore?: number }).preferenceScore || 0) - ((a as { preferenceScore?: number }).preferenceScore || 0))
        .slice(0, limit)

      return createSuccessResponse({
        movies: allMovies,
        totalResults: localResults.total + tmdbResults.totalResults,
        searchType: 'combined',
      }, `Found ${allMovies.length} movies`)
    } catch (tmdbError) {
      logger.warn('TMDB search failed, using local results only', {
        error: tmdbError instanceof Error ? tmdbError.message : 'Unknown error',
      })

      // Return local results only
      return createSuccessResponse({
        movies,
        totalResults: localResults.total,
        searchType: 'local_fallback',
      }, `Found ${movies.length} movies locally`)
    }
  } catch (error) {
    logger.error('Search failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
    })

    return StandardErrors.INTERNAL_ERROR('Failed to process search request')
  }
}

// GET endpoint for simple text-based search
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')
    const limit = parseInt(searchParams.get('limit') || '10')
    const simple = searchParams.get('simple') === 'true'

    if (!query) {
      return NextResponse.json(
        { error: 'Query parameter "q" is required' },
        { status: 400 }
      )
    }

    logger.info('Processing GET search', {
      query: query.substring(0, 100),
      simple,
    })

    if (simple) {
      // Direct TMDB search
      try {
        const { searchTmdbMovies } = await import('@/lib/utils/tmdb-helpers')
        const result = await searchTmdbMovies(query, { limit, page: 1 })

        return NextResponse.json({
          success: true,
          data: {
            movies: result.movies,
            totalResults: result.totalResults,
            searchType: result.fallbackUsed ? 'simple_fallback' : 'simple_tmdb',
          },
          source: 'local',
        })
      } catch (error) {
        logger.error('Simple search failed', {
          error: error instanceof Error ? error.message : 'Unknown error',
        })
        return NextResponse.json({
          success: false,
          error: 'Simple search failed',
        }, { status: 500 })
      }
    }

    // Use local database search with TMDB fallback
    const localResults = LocalStorageService.getMovies({ query, limit })

    if (localResults.movies.length > 0) {
      return NextResponse.json({
        success: true,
        data: {
          movies: localResults.movies,
          totalResults: localResults.total,
          searchType: 'local',
        },
        source: 'local',
      })
    }

    // Fallback to TMDB
    try {
      const { searchTmdbMovies } = await import('@/lib/utils/tmdb-helpers')
      const result = await searchTmdbMovies(query, { limit, page: 1 })

      return NextResponse.json({
        success: true,
        data: {
          movies: result.movies,
          totalResults: result.totalResults,
          searchType: 'tmdb_fallback',
        },
        source: 'local',
      })
    } catch (fallbackError) {
      logger.error('Fallback search also failed', {
        error: fallbackError instanceof Error ? fallbackError.message : 'Unknown error',
      })

      return NextResponse.json({
        success: false,
        error: 'Search failed',
      }, { status: 500 })
    }
  } catch (error) {
    logger.error('GET search failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
    })

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process search request',
      },
      { status: 500 }
    )
  }
}
