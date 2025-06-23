import { NextResponse } from 'next/server'
import { withSupabase, withError } from '@/lib/api/factory'
import { MovieRepository } from '@/repositories'
import { logger } from '@/lib/logger'

export const GET = withError(
  withSupabase(async ({ request, supabase }) => {
    const movieId = request.nextUrl.pathname.split('/').pop() || ''

    if (!movieId) {
      return NextResponse.json({ error: 'Movie ID is required' }, { status: 400 })
    }

    const movieRepo = new MovieRepository(supabase)

    try {
      const movie = await movieRepo.findById(movieId)

      if (!movie) {
        return NextResponse.json({ error: 'Movie not found' }, { status: 404 })
      }

      return NextResponse.json({
        success: true,
        data: movie,
      })
    } catch (error) {
      logger.dbError(
        'fetch-movie-details',
        error instanceof Error ? error : new Error(String(error)),
        {
          movieId: movieId,
        }
      )
      return NextResponse.json({ error: 'Failed to fetch movie details' }, { status: 500 })
    }
  })
)
