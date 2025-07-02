import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server-client'
import { MovieRepository } from '@/repositories/MovieRepository'
import { logger } from '@/lib/logger'
import { fetchTmdbMovieById } from '@/lib/utils/tmdb-helpers'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      logger.error('Authentication failed', { error: authError })
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { movieId } = body

    if (!movieId) {
      return NextResponse.json({ success: false, error: 'Movie ID is required' }, { status: 400 })
    }

    const movieRepo = new MovieRepository(supabase)

    // Get the movie from database
    const movie = await movieRepo.findById(movieId)
    if (!movie) {
      return NextResponse.json({ success: false, error: 'Movie not found' }, { status: 404 })
    }

    // Check if it has a TMDB ID and needs refreshing
    if (!movie.tmdb_id) {
      return NextResponse.json(
        { success: false, error: 'Movie does not have a TMDB ID' },
        { status: 400 }
      )
    }

    // Check if it's a stub movie (has placeholder title or no poster)
    const isStub =
      movie.title?.includes('Movie ') || movie.title?.includes('[Imported') || !movie.poster_url

    if (!isStub) {
      return NextResponse.json({ success: true, message: 'Movie already has complete details' })
    }

    logger.info('Refreshing movie details from TMDB', { movieId, tmdbId: movie.tmdb_id })

    // Fetch fresh data from TMDB
    const tmdbMovie = await fetchTmdbMovieById(movie.tmdb_id)
    
    if (!tmdbMovie) {
      return NextResponse.json({ success: false, error: 'Failed to fetch movie details from TMDB' }, { status: 500 })
    }

    // Convert null values to undefined for Movie type compatibility
    const movieUpdate = {
      title: tmdbMovie.title,
      year: tmdbMovie.year,
      genre: tmdbMovie.genre,
      director: tmdbMovie.director,
      plot: tmdbMovie.plot || undefined,
      poster_url: tmdbMovie.poster_url || undefined,
      rating: tmdbMovie.rating,
      runtime: tmdbMovie.runtime,
      imdb_id: tmdbMovie.imdb_id || undefined,
    }

    // Update the movie in database
    const updatedMovie = await movieRepo.update(movieId, movieUpdate)

    logger.info('Movie details refreshed successfully', { movieId, title: updatedMovie.title })

    return NextResponse.json({
      success: true,
      data: updatedMovie,
      message: 'Movie details refreshed successfully',
    })
  } catch (error) {
    logger.error('Error refreshing movie:', { error: String(error) })
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
