import { NextRequest, NextResponse } from 'next/server'
import { LocalStorageService } from '@/lib/db'
import { APIErrorHandler } from '@/lib/error-handling'
import { logger } from '@/lib/logger'
import { z } from 'zod'

// Movie data schema for external movies
const movieDataSchema = z.object({
  title: z.string(),
  year: z.number().optional(),
  genre: z.array(z.string()).optional(),
  director: z.array(z.string()).optional(),
  plot: z.string().optional(),
  poster_url: z.string().optional(),
  rating: z.number().optional(),
  tmdb_id: z.number().optional(),
  imdb_id: z.string().optional(),
})

const ratingSchema = z.object({
  movie_id: z.string().optional(), // Movie ID in database
  movie_data: movieDataSchema.optional(), // Movie data for external movies
  interested: z.boolean().optional(), // like/dislike toggle
  rating: z.number().min(1).max(5).optional(), // 1-5 stars
}).refine(data => data.movie_id || data.movie_data, {
  message: "Either movie_id or movie_data must be provided"
})

/**
 * GET /api/ratings
 * Fetch all user ratings with movie details
 */
export async function GET(): Promise<NextResponse> {
  try {
    const ratings = LocalStorageService.getRatings()

    // Transform to expected format
    const ratingsWithMovieData = ratings.map((rating) => ({
      movie_id: rating.movie_id,
      rating: rating.rating,
      interested: rating.interested,
      rated_at: rating.rated_at,
      movie_data: rating.movie ? {
        title: rating.movie.title,
        year: rating.movie.year,
        tmdb_id: rating.movie.tmdb_id
      } : null
    }))

    logger.info('Ratings fetched successfully', { count: ratingsWithMovieData.length })

    return NextResponse.json({
      success: true,
      ratings: ratingsWithMovieData,
      count: ratingsWithMovieData.length,
      source: 'local',
    })
  } catch (error) {
    return APIErrorHandler.handle(error, {
      endpoint: '/api/ratings',
      method: 'GET',
    })
  }
}

/**
 * POST /api/ratings
 * Create or update a rating for a movie
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const json = await request.json().catch(() => null)
    const parsed = ratingSchema.safeParse(json)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ') },
        { status: 400 }
      )
    }

    const { movie_id, movie_data, interested, rating } = parsed.data
    let finalMovieId = movie_id

    // If no movie_id provided, find or create the movie in database
    if (!movie_id && movie_data) {
      // Try to find by TMDB ID first
      if (movie_data.tmdb_id) {
        const existing = LocalStorageService.getMovieByTmdbId(movie_data.tmdb_id)
        if (existing) {
          finalMovieId = existing.id
        }
      }

      // If not found, create the movie
      if (!finalMovieId) {
        const newMovie = LocalStorageService.upsertMovie({
          title: movie_data.title,
          year: movie_data.year,
          genre: movie_data.genre,
          director: movie_data.director,
          plot: movie_data.plot,
          poster_url: movie_data.poster_url,
          rating: movie_data.rating,
          tmdb_id: movie_data.tmdb_id,
          imdb_id: movie_data.imdb_id,
          source: 'user-rating',
        })
        finalMovieId = newMovie.id
        logger.info('Created movie from rating', { movieId: finalMovieId, title: movie_data.title })
      }
    }

    if (!finalMovieId) {
      return NextResponse.json(
        { success: false, error: 'Could not determine movie ID' },
        { status: 400 }
      )
    }

    // Upsert the rating
    const result = LocalStorageService.upsertRating(finalMovieId, {
      rating,
      interested: interested ?? true,
    })

    // Record the interaction for learning
    LocalStorageService.recordInteraction(
      rating ? 'rated' : (interested ? 'liked' : 'disliked'),
      finalMovieId,
      { rating, interested }
    )

    logger.info('Rating saved successfully', {
      movieId: finalMovieId,
      rating,
      interested,
    })

    return NextResponse.json({
      success: true,
      data: result,
      source: 'local',
    })
  } catch (error) {
    return APIErrorHandler.handle(error, {
      endpoint: '/api/ratings',
      method: 'POST',
    })
  }
}

/**
 * DELETE /api/ratings
 * Delete a rating for a movie
 */
export async function DELETE(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url)
    const movieId = searchParams.get('movie_id')

    if (!movieId) {
      return NextResponse.json(
        { success: false, error: 'movie_id is required' },
        { status: 400 }
      )
    }

    LocalStorageService.deleteRating(movieId)

    logger.info('Rating deleted', { movieId })

    return NextResponse.json({
      success: true,
      message: 'Rating deleted',
      source: 'local',
    })
  } catch (error) {
    return APIErrorHandler.handle(error, {
      endpoint: '/api/ratings',
      method: 'DELETE',
    })
  }
}
