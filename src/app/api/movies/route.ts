import { NextRequest, NextResponse } from 'next/server'
import { LocalStorageService } from '@/lib/db'
import { APIErrorHandler } from '@/lib/error-handling'
import { logger } from '@/lib/logger'

/**
 * GET /api/movies
 * Fetch movies from local SQLite database with filtering and pagination
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url)

  const query = searchParams.get('query') || ''
  const genres = searchParams.get('genres')?.split(',').filter(Boolean) || []
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '12') || 12))
  const page = Math.max(1, parseInt(searchParams.get('page') || '1') || 1)
  const topRated = searchParams.get('top_rated') === 'true'
  const offset = (page - 1) * limit

  try {
    const result = LocalStorageService.getMovies({
      query: query || undefined,
      genres: genres.length > 0 ? genres : undefined,
      limit,
      offset,
      topRated,
    })

    const totalPages = Math.ceil(result.total / limit)

    logger.info('Movies fetched successfully', {
      count: result.movies.length,
      total: result.total,
      page,
      query: query || undefined,
    })

    const response = NextResponse.json({
      success: true,
      data: result.movies,
      total: result.total,
      pagination: {
        currentPage: page,
        totalPages,
        hasMore: page < totalPages,
        limit,
      },
      source: 'local',
    })

    // Cache for 10 minutes
    response.headers.set('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=1200')

    return response
  } catch (error) {
    return APIErrorHandler.handle(error, {
      endpoint: '/api/movies',
      method: 'GET',
      metadata: { query, genres: genres.join(','), limit, page },
    })
  }
}

/**
 * POST /api/movies
 * Add a movie to the local database (usually from TMDB)
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json()
    const { tmdb_id, ...movieData } = body

    if (!tmdb_id && !movieData.title) {
      return NextResponse.json(
        { success: false, error: 'Either TMDB ID or title is required' },
        { status: 400 }
      )
    }

    // Check if movie already exists by tmdb_id
    if (tmdb_id) {
      const existing = LocalStorageService.getMovieByTmdbId(tmdb_id)
      if (existing) {
        return NextResponse.json({
          success: true,
          data: existing,
          message: 'Movie already exists',
        })
      }
    }

    // Insert/update movie
    const movie = LocalStorageService.upsertMovie({
      tmdb_id,
      ...movieData,
      source: 'tmdb',
    })

    logger.info('Movie added successfully', { tmdb_id, title: movieData.title })

    return NextResponse.json({
      success: true,
      data: movie,
      message: 'Movie added successfully',
    })
  } catch (error) {
    return APIErrorHandler.handle(error, {
      endpoint: '/api/movies',
      method: 'POST',
    })
  }
}
