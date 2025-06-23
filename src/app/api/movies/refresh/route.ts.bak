import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server-client'
import { MovieRepository } from '@/repositories/MovieRepository'
import { logger } from '@/lib/logger'

// Helper to fetch movie from TMDB API
async function fetchTmdbMovie(tmdbId: number) {
  const apiKey = process.env.TMDB_API_KEY

  if (!apiKey) {
    throw new Error('TMDB API key not configured')
  }

  const resp = await fetch(
    `https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${apiKey}&append_to_response=credits`
  )

  if (!resp.ok) {
    throw new Error(`TMDB API error: ${resp.status} ${resp.statusText}`)
  }

  const m = await resp.json()

  return {
    title: m.title,
    year: m.release_date ? new Date(m.release_date).getFullYear() : null,
    genre: (m.genres || []).map((g: any) => g.name),
    director: (m.credits?.crew || [])
      .filter((c: any) => c.job === 'Director')
      .map((d: any) => d.name),
    plot: m.overview,
    poster_url: m.poster_path ? `https://image.tmdb.org/t/p/w500${m.poster_path}` : null,
    rating: m.vote_average,
    runtime: m.runtime,
    tmdb_id: tmdbId,
    imdb_id: m.imdb_id || null,
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
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
    const tmdbData = await fetchTmdbMovie(movie.tmdb_id)

    // Convert null values to undefined for Movie type compatibility
    const movieUpdate = {
      ...tmdbData,
      poster_url: tmdbData.poster_url || undefined,
      plot: tmdbData.plot || undefined,
      imdb_id: tmdbData.imdb_id || undefined,
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
