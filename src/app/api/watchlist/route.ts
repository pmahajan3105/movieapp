import { NextRequest, NextResponse } from 'next/server'
import { LocalStorageService } from '@/lib/db'
import { APIErrorHandler } from '@/lib/error-handling'
import { logger } from '@/lib/logger'
import { fetchTmdbMovieById } from '@/lib/utils/tmdb-helpers'

/**
 * GET /api/watchlist
 * Fetch user's watchlist with movie details
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url)
    const watchedParam = searchParams.get('watched')

    // Get watchlist from local database
    let watchlist = LocalStorageService.getWatchlist()

    // Apply watched filter if specified
    if (watchedParam !== null) {
      const filterWatched = watchedParam === 'true'
      watchlist = watchlist.filter(item => item.watched === filterWatched)
    }

    // Auto-refresh stub movies with TMDB details
    const refreshPromises = watchlist
      .filter(item => {
        const movie = item.movie
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
          const movie = item.movie!
          logger.info('Auto-refreshing stub movie', { movieId: movie.id, tmdbId: movie.tmdb_id })
          const tmdbMovie = await fetchTmdbMovieById(movie.tmdb_id!)
          if (!tmdbMovie) {
            logger.warn('Failed to fetch TMDB movie data', { tmdbId: movie.tmdb_id })
            return
          }

          // Update movie in database
          LocalStorageService.upsertMovie({
            id: movie.id,
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
          })

          // Update local reference
          item.movie = {
            ...item.movie!,
            title: tmdbMovie.title,
            year: tmdbMovie.year,
            poster_url: tmdbMovie.poster_url || undefined,
          }

          logger.info('Auto-refreshed movie details', {
            movieId: movie.id,
            title: tmdbMovie.title,
          })
        } catch (error) {
          logger.warn('Failed to auto-refresh movie', {
            movieId: item.movie?.id,
            error: String(error),
          })
        }
      })

    // Wait for all refreshes to complete
    await Promise.all(refreshPromises)

    // Transform to expected format
    const data = watchlist.map(item => ({
      id: item.id,
      movie_id: item.movie_id,
      added_at: item.added_at,
      watched: item.watched,
      watched_at: item.watched_at,
      notes: item.notes,
      movies: item.movie ? {
        id: item.movie.id,
        title: item.movie.title,
        year: item.movie.year,
        poster_url: item.movie.poster_url,
        tmdb_id: item.movie.tmdb_id,
        genre: item.movie.genre,
        rating: item.movie.rating,
      } : null,
    }))

    logger.info('Watchlist fetched', { count: data.length })

    return NextResponse.json({
      success: true,
      data,
      source: 'local',
    })
  } catch (error) {
    return APIErrorHandler.handle(error, {
      endpoint: '/api/watchlist',
      method: 'GET',
    })
  }
}

/**
 * POST /api/watchlist
 * Add a movie to watchlist
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json()
    let movieId = body.movie_id || body.movieId
    const notes = body.notes

    if (!movieId) {
      return NextResponse.json(
        { success: false, error: 'Movie ID is required' },
        { status: 400 }
      )
    }

    logger.info('Adding to watchlist', { movieId })

    // Handle TMDB IDs - find or create the movie in our database
    if (movieId.startsWith('tmdb_')) {
      const tmdbId = parseInt(movieId.replace('tmdb_', ''), 10)

      // Try to find existing movie by TMDB ID
      let movie = LocalStorageService.getMovieByTmdbId(tmdbId)

      if (!movie) {
        // Movie doesn't exist, create it
        try {
          const tmdbMovie = await fetchTmdbMovieById(tmdbId)
          if (!tmdbMovie) {
            throw new Error('Failed to fetch movie from TMDB')
          }

          movie = LocalStorageService.upsertMovie({
            title: tmdbMovie.title,
            year: tmdbMovie.year,
            genre: tmdbMovie.genre,
            director: tmdbMovie.director,
            plot: tmdbMovie.plot,
            poster_url: tmdbMovie.poster_url,
            rating: tmdbMovie.rating,
            runtime: tmdbMovie.runtime,
            tmdb_id: tmdbId,
            imdb_id: tmdbMovie.imdb_id,
            source: 'tmdb',
          })
          logger.info('Created movie from TMDB', { tmdbId, movieId: movie.id })
        } catch (error) {
          // Fallback: create a stub movie
          logger.warn('TMDB fetch failed, creating stub', { tmdbId, error: String(error) })
          movie = LocalStorageService.upsertMovie({
            title: `Movie ${tmdbId}`,
            tmdb_id: tmdbId,
            genre: [],
            source: 'tmdb-stub',
          })
        }
      }

      // Use the actual UUID from our database
      movieId = movie.id
    }

    // Check if already in watchlist
    const existing = LocalStorageService.getWatchlistItem(movieId)
    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Movie is already in watchlist' },
        { status: 400 }
      )
    }

    // Add to watchlist
    const result = LocalStorageService.addToWatchlist(movieId, notes)

    // Record interaction
    LocalStorageService.recordInteraction('watchlist_add', movieId, { notes })

    logger.info('Movie added to watchlist', { movieId })

    return NextResponse.json({
      success: true,
      data: result,
      source: 'local',
    })
  } catch (error) {
    return APIErrorHandler.handle(error, {
      endpoint: '/api/watchlist',
      method: 'POST',
    })
  }
}

/**
 * DELETE /api/watchlist
 * Remove a movie from watchlist
 */
export async function DELETE(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url)
    let movieId = searchParams.get('movie_id') || searchParams.get('movieId')

    if (!movieId) {
      return NextResponse.json(
        { success: false, error: 'Movie ID is required' },
        { status: 400 }
      )
    }

    // Handle TMDB IDs - convert to actual UUID
    if (movieId.startsWith('tmdb_')) {
      const tmdbId = parseInt(movieId.replace('tmdb_', ''), 10)
      const movie = LocalStorageService.getMovieByTmdbId(tmdbId)
      if (movie) {
        movieId = movie.id
      }
    }

    logger.info('Removing from watchlist', { movieId })

    LocalStorageService.removeFromWatchlist(movieId)

    // Record interaction
    LocalStorageService.recordInteraction('watchlist_remove', movieId)

    logger.info('Movie removed from watchlist', { movieId })

    return NextResponse.json({
      success: true,
      message: 'Removed from watchlist',
      source: 'local',
    })
  } catch (error) {
    return APIErrorHandler.handle(error, {
      endpoint: '/api/watchlist',
      method: 'DELETE',
    })
  }
}

/**
 * PATCH /api/watchlist
 * Update a watchlist item (mark watched, update notes, etc.)
 */
export async function PATCH(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json()
    const { movie_id, watchlist_id, watched, notes } = body

    if (!movie_id && !watchlist_id) {
      return NextResponse.json(
        { success: false, error: 'Movie ID or Watchlist ID is required' },
        { status: 400 }
      )
    }

    // For watchlist_id, we need to find the movie_id
    let targetMovieId = movie_id

    if (watchlist_id && !movie_id) {
      // Get watchlist to find the movie_id
      const watchlist = LocalStorageService.getWatchlist()
      const item = watchlist.find(w => w.id === watchlist_id)
      if (!item) {
        return NextResponse.json(
          { success: false, error: 'Watchlist item not found' },
          { status: 404 }
        )
      }
      targetMovieId = item.movie_id
    }

    logger.info('Updating watchlist item', { movieId: targetMovieId, watched, notes })

    let result = null

    // Update watched status
    if (watched !== undefined) {
      result = LocalStorageService.markWatched(targetMovieId, watched)

      // Record interaction
      LocalStorageService.recordInteraction(
        watched ? 'movie_watched' : 'movie_unwatched',
        targetMovieId
      )
    }

    if (!result) {
      result = LocalStorageService.getWatchlistItem(targetMovieId)
    }

    if (!result) {
      return NextResponse.json(
        { success: false, error: 'Watchlist item not found' },
        { status: 404 }
      )
    }

    logger.info('Watchlist item updated', { movieId: targetMovieId, watched: result.watched })

    return NextResponse.json({
      success: true,
      data: result,
      source: 'local',
    })
  } catch (error) {
    return APIErrorHandler.handle(error, {
      endpoint: '/api/watchlist',
      method: 'PATCH',
    })
  }
}
