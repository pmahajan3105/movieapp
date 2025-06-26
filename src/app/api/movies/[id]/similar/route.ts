import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '@/lib/api/factory'
import { logger } from '@/lib/logger'
import { createServerClient } from '@/lib/supabase/server-client'

export const GET = withErrorHandling(async (request: NextRequest) => {
  const supabase = await createServerClient()
  const movieId = request.nextUrl.pathname.split('/').slice(-2)[0] // segment before /similar
  const { searchParams } = new URL(request.url)
  const limit = parseInt(searchParams.get('limit') || '6')

  if (!movieId) {
    throw new Error('Movie ID is required')
  }

  // First, get the current movie details
  const { data: currentMovie, error: currentMovieError } = await supabase
    .from('movies')
    .select('genre, director, year')
    .eq('id', movieId)
    .single()

  if (currentMovieError) {
    logger.dbError('fetch-current-movie-for-similar', new Error(currentMovieError.message), {
      movieId,
      errorCode: currentMovieError.code,
    })
    throw new Error('Movie not found')
  }

  // Find similar movies based on:
  // 1. Shared genres (highest priority)
  // 2. Same director (medium priority)
  // 3. Similar year range (lowest priority)
  let query = supabase
    .from('movies')
    .select(
      `
        id,
        title,
        year,
        genre,
        director,
        plot,
        poster_url,
        rating,
        runtime,
        created_at
      `
    )
    .neq('id', movieId) // Exclude the current movie

  // Find movies with overlapping genres
  if (currentMovie.genre && currentMovie.genre.length > 0) {
    query = query.overlaps('genre', currentMovie.genre)
  }

  const { data: similarMovies, error } = await query
    .order('rating', { ascending: false })
    .limit(limit * 2) // Get more to allow for filtering

  if (error) {
    logger.dbError('fetch-similar-movies', new Error(error.message), {
      movieId,
      errorCode: error.code,
    })
    throw new Error('Failed to fetch similar movies')
  }

  // Score and sort the movies based on similarity
  const safeCurrent: any = currentMovie
  const scoredMovies = (similarMovies || []).map((movie: any) => {
    let score = 0

    // Genre matching (0-3 points)
    if (movie.genre && safeCurrent.genre) {
      const sharedGenres = movie.genre.filter((g: string) => safeCurrent.genre.includes(g))
      score += sharedGenres.length
    }

    // Director matching (2 points)
    if (movie.director && safeCurrent.director) {
      const sharedDirectors = movie.director.filter((d: string) => safeCurrent.director.includes(d))
      if (sharedDirectors.length > 0) score += 2
    }

    // Year proximity (0-1 points)
    if (movie.year && safeCurrent.year) {
      const yearDiff = Math.abs(movie.year - safeCurrent.year)
      if (yearDiff <= 5) score += 1
      else if (yearDiff <= 10) score += 0.5
    }

    // Rating bonus (higher rated movies get slight boost)
    if (movie.rating) {
      score += movie.rating / 10
    }

    return { ...movie, similarity_score: score }
  })

  // Sort by similarity score and take the top results
  const topSimilar = scoredMovies
    .sort((a: any, b: any) => b.similarity_score - a.similarity_score)
    .slice(0, limit)
    .map((movie: any) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { similarity_score, ...movieWithoutScore } = movie
      return movieWithoutScore
    }) // Remove the score from response

  return NextResponse.json({
    success: true,
    data: topSimilar,
    total: topSimilar.length,
    movie_id: movieId,
  })
})
