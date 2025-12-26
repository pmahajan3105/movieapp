import { NextRequest, NextResponse } from 'next/server'
import { getWatchProviders } from '@/lib/utils/tmdb-helpers'
import { LocalStorageService } from '@/lib/db'
import { logger } from '@/lib/logger'

/**
 * GET /api/movies/[id]/providers
 * Get streaming/watch providers for a movie
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const region = searchParams.get('region') || 'US'

    // Get movie to find TMDB ID
    const movie = LocalStorageService.getMovieById(id)

    if (!movie) {
      return NextResponse.json(
        { success: false, error: 'Movie not found' },
        { status: 404 }
      )
    }

    if (!movie.tmdb_id) {
      return NextResponse.json(
        { success: false, error: 'Movie has no TMDB ID' },
        { status: 400 }
      )
    }

    const providers = await getWatchProviders(movie.tmdb_id, region)

    return NextResponse.json({
      success: true,
      providers,
      region,
      tmdbId: movie.tmdb_id,
    })
  } catch (error) {
    logger.error('Failed to get watch providers', {
      error: error instanceof Error ? error.message : String(error),
    })

    return NextResponse.json(
      { success: false, error: 'Failed to get watch providers' },
      { status: 500 }
    )
  }
}
