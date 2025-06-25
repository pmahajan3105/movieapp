import { NextRequest, NextResponse } from 'next/server'
import { createAuthenticatedApiHandler, parseJsonBody } from '@/lib/api/factory'
import { WatchlistRepository } from '@/repositories/WatchlistRepository'
import { MovieRepository } from '@/repositories/MovieRepository'
import { logger } from '@/lib/logger'

// Helper to fetch movie from TMDB API
async function fetchTmdbMovie(tmdbId: number) {
  const apiKey = process.env.TMDB_API_KEY

  if (!apiKey) {
    logger.warn('TMDB API key not found, creating enhanced stub movie', { tmdbId })
    // Return a better stub with the TMDB ID properly set
    return {
      title: `Movie ${tmdbId}`,
      year: null,
      genre: [],
      director: [],
      plot: 'Movie details will be loaded when TMDB API key is configured.',
      poster_url: null,
      rating: null,
      runtime: null,
      tmdb_id: tmdbId,
      imdb_id: null,
    }
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

export const GET = createAuthenticatedApiHandler(
  async (request: NextRequest, { supabase, user }) => {
    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const watchedParam = searchParams.get('watched')

    const filters: { watched?: boolean } = {}
    if (watchedParam !== null) {
      filters.watched = watchedParam === 'true'
    }

    const watchlistRepo = new WatchlistRepository(supabase)
    const movieRepo = new MovieRepository(supabase)

    logger.info('Fetching watchlist', { userId: user.id, filters })
    const movies = await watchlistRepo.getUserWatchlist(user.id, filters)
    logger.info('Watchlist fetched', { userId: user.id, count: movies.length, filters })

    // Auto-refresh stub movies with TMDB details
    const refreshPromises = movies
      .filter(item => {
        const movie = item.movies
        return (
          movie &&
          movie.tmdb_id &&
          (movie.title?.includes('Movie ') ||
            movie.title?.includes('[Imported') ||
            !movie.poster_url)
        )
      })
      .map(async item => {
        try {
          const movie = item.movies!
          logger.info('Auto-refreshing stub movie', { movieId: movie.id, tmdbId: movie.tmdb_id })
          const tmdbData = await fetchTmdbMovie(movie.tmdb_id!)
          const movieUpdate = {
            ...tmdbData,
            poster_url: tmdbData.poster_url || undefined,
            plot: tmdbData.plot || undefined,
            imdb_id: tmdbData.imdb_id || undefined,
          }
          const updatedMovie = await movieRepo.update(movie.id, movieUpdate)
          item.movies = updatedMovie
          logger.info('Auto-refreshed movie details', {
            movieId: movie.id,
            title: updatedMovie.title,
          })
        } catch (error) {
          logger.warn('Failed to auto-refresh movie', {
            movieId: item.movies?.id,
            error: String(error),
          })
        }
      })

    // Wait for all refreshes to complete
    await Promise.all(refreshPromises)

    // Return in the expected format
    return NextResponse.json({
      success: true,
      data: movies,
    })
  }
)

export const POST = createAuthenticatedApiHandler(
  async (request: NextRequest, { supabase, user }) => {
    const body = await parseJsonBody<{
      movie_id?: string
      movieId?: string
      notes?: string
    }>(request)

    let movieId = body.movie_id || body.movieId // Support both formats
    const notes = body.notes

    if (!movieId) {
      throw new Error('Movie ID is required')
    }

    const movieRepo = new MovieRepository(supabase)
    const watchlistRepo = new WatchlistRepository(supabase)

    logger.info('Adding to watchlist', { userId: user.id, movieId })

    // Handle TMDB IDs - find or create the movie in our database
    if (movieId.startsWith('tmdb_')) {
      const tmdbId = parseInt(movieId.replace('tmdb_', ''), 10)

      // Try to find existing movie by TMDB ID
      let movie = await movieRepo.findByTmdbId(tmdbId)

      if (!movie) {
        // Movie doesn't exist, create it
        try {
          const movieData = await fetchTmdbMovie(tmdbId)
          movie = await movieRepo.create(movieData)
          logger.info('Created movie from TMDB', { tmdbId, movieId: movie.id })
        } catch (error) {
          // Fallback: create a better stub movie
          logger.warn('TMDB fetch failed, creating enhanced stub', { tmdbId, error: String(error) })
          movie = await movieRepo.create({
            title: `Movie ${tmdbId}`,
            tmdb_id: tmdbId,
            genre: [],
            plot: 'Movie details will be loaded when TMDB API is available.',
          })
        }
      }

      // Use the actual UUID from our database
      movieId = movie.id
    }

    // Check if already in watchlist
    const isInWatchlist = await watchlistRepo.checkIfInWatchlist(user.id, movieId)
    if (isInWatchlist) {
      throw new Error('Movie is already in watchlist')
    }

    const result = await watchlistRepo.addToWatchlist(user.id, movieId, notes)
    logger.info('Movie added to watchlist', { userId: user.id, movieId })

    return NextResponse.json({
      success: true,
      data: result,
    })
  }
)

export const DELETE = createAuthenticatedApiHandler(
  async (request: NextRequest, { supabase, user }) => {
    const { searchParams } = new URL(request.url)
    const movieId = searchParams.get('movie_id')

    if (!movieId) {
      throw new Error('Movie ID is required')
    }

    const watchlistRepo = new WatchlistRepository(supabase)

    logger.info('Removing from watchlist', { userId: user.id, movieId })

    const isInWatchlist = await watchlistRepo.checkIfInWatchlist(user.id, movieId)
    if (!isInWatchlist) {
      throw new Error('Movie not found in watchlist')
    }

    await watchlistRepo.removeFromWatchlist(user.id, movieId)
    logger.info('Movie removed from watchlist', { userId: user.id, movieId })

    return NextResponse.json({ success: true })
  }
)

export const PATCH = createAuthenticatedApiHandler(
  async (request: NextRequest, { supabase, user }) => {
    const body = await parseJsonBody<{
      movie_id?: string
      movieId?: string
      watched?: boolean
      rating?: number
      notes?: string
    }>(request)

    const movieId = body.movie_id || body.movieId
    const { watched, rating, notes } = body

    if (!movieId) {
      throw new Error('Movie ID is required')
    }

    const watchlistRepo = new WatchlistRepository(supabase)

    logger.info('Updating watchlist item', { userId: user.id, movieId, watched, rating })

    // Check if movie is in watchlist
    const isInWatchlist = await watchlistRepo.checkIfInWatchlist(user.id, movieId)
    if (!isInWatchlist) {
      throw new Error('Movie not found in watchlist')
    }

    const result = await watchlistRepo.updateWatchlistItem(user.id, movieId, {
      watched,
      rating,
      notes,
    })

    logger.info('Watchlist item updated', { userId: user.id, movieId })

    return NextResponse.json({
      success: true,
      data: result,
    })
  }
)
