import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '@/lib/api/factory'
import { MovieRepository } from '@/repositories'
import { logger } from '@/lib/logger'

export const GET = withErrorHandling(async (request: NextRequest, { supabase }) => {
  const movieId = request.nextUrl.pathname.split('/').pop() || ''

  if (!movieId) {
    throw new Error('Movie ID is required')
  }

  const movieRepo = new MovieRepository(supabase)

  const movie = await movieRepo.findById(movieId)

  if (!movie) {
    throw new Error('Movie not found')
  }

  logger.info('Movie details retrieved successfully', { movieId })

  return NextResponse.json({
    success: true,
    data: movie,
  })
})
