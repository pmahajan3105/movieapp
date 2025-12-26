import { NextRequest, NextResponse } from 'next/server'
import { LocalStorageService } from '@/lib/db'
import { logger } from '@/lib/logger'
import { fetchTmdbMovieById } from '@/lib/utils/tmdb-helpers'

/**
 * POST /api/movies/refresh
 * Refresh movie details from TMDB
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { movieId } = body

    if (!movieId) {
      return NextResponse.json(
        { success: false, error: 'Movie ID is required' },
        { status: 400 }
      )
    }

    // Get the movie from local database
    const movie = LocalStorageService.getMovie(movieId)
    if (!movie) {
      return NextResponse.json(
        { success: false, error: 'Movie not found' },
        { status: 404 }
      )
    }

    // Check if it has a TMDB ID
    if (!movie.tmdb_id) {
      return NextResponse.json(
        { success: false, error: 'Movie does not have a TMDB ID' },
        { status: 400 }
      )
    }

    // Check if it's a stub movie (has placeholder title or no poster)
    const isStub =
      movie.title?.includes('Movie ') ||
      movie.title?.includes('[Imported') ||
      !movie.poster_url

    if (!isStub) {
      return NextResponse.json({
        success: true,
        message: 'Movie already has complete details',
        data: movie,
        source: 'local',
      })
    }

    logger.info('Refreshing movie details from TMDB', {
      movieId,
      tmdbId: movie.tmdb_id
    })

    // Fetch fresh data from TMDB
    const tmdbMovie = await fetchTmdbMovieById(movie.tmdb_id)

    if (!tmdbMovie) {
      return NextResponse.json(
        { success: false, error: 'Failed to fetch movie details from TMDB' },
        { status: 500 }
      )
    }

    // Update the movie in local database
    const updatedMovie = LocalStorageService.upsertMovie({
      id: movieId,
      tmdb_id: movie.tmdb_id,
      title: tmdbMovie.title,
      year: tmdbMovie.year,
      genre: tmdbMovie.genre,
      director: tmdbMovie.director,
      plot: tmdbMovie.plot || undefined,
      poster_url: tmdbMovie.poster_url || undefined,
      rating: tmdbMovie.rating,
      runtime: tmdbMovie.runtime,
      imdb_id: tmdbMovie.imdb_id || undefined,
      popularity: tmdbMovie.popularity,
    })

    logger.info('Movie details refreshed successfully', {
      movieId,
      title: updatedMovie.title
    })

    return NextResponse.json({
      success: true,
      data: updatedMovie,
      message: 'Movie details refreshed successfully',
      source: 'local',
    })
  } catch (error) {
    logger.error('Error refreshing movie:', { error: String(error) })
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
