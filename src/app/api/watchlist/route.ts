import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server-client'
import { WatchlistRepository } from '@/repositories/WatchlistRepository'
import { MovieRepository } from '@/repositories/MovieRepository'
import { logger } from '@/lib/logger'
import RecommendationCacheManager from '@/lib/utils/recommendation-cache'
import { fetchTmdbMovieById } from '@/lib/utils/tmdb-helpers'

export async function GET(request: NextRequest) {
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
          const tmdbMovie = await fetchTmdbMovieById(movie.tmdb_id!)
          if (!tmdbMovie) {
            logger.warn('Failed to fetch TMDB movie data', { tmdbId: movie.tmdb_id })
            return
          }
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
  } catch (error) {
    logger.error('Error fetching watchlist:', { error: String(error) })
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

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
    let movieId = body.movie_id || body.movieId // Support both formats
    const notes = body.notes

    if (!movieId) {
      return NextResponse.json({ success: false, error: 'Movie ID is required' }, { status: 400 })
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
          const tmdbMovie = await fetchTmdbMovieById(tmdbId)
          if (!tmdbMovie) {
            throw new Error('Failed to fetch movie from TMDB')
          }
          const movieData = {
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
          }
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
      return NextResponse.json(
        { success: false, error: 'Movie is already in watchlist' },
        { status: 400 }
      )
    }

    const result = await watchlistRepo.addToWatchlist(user.id, movieId, notes)
    logger.info('Movie added to watchlist', { userId: user.id, movieId })

    return NextResponse.json({
      success: true,
      data: result,
    })
  } catch (error) {
    logger.error('Error adding to watchlist:', { error: String(error) })
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
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

    const { searchParams } = new URL(request.url)
    let movieId = searchParams.get('movie_id') || searchParams.get('movieId')

    if (!movieId) {
      return NextResponse.json({ success: false, error: 'Movie ID is required' }, { status: 400 })
    }

    const movieRepo = new MovieRepository(supabase)
    const watchlistRepo = new WatchlistRepository(supabase)

    // Handle TMDB IDs - convert to actual UUID
    if (movieId.startsWith('tmdb_')) {
      const tmdbId = parseInt(movieId.replace('tmdb_', ''), 10)
      const movie = await movieRepo.findByTmdbId(tmdbId)
      if (movie) {
        movieId = movie.id
      }
    }

    logger.info('Removing from watchlist', { userId: user.id, movieId })
    await watchlistRepo.removeFromWatchlist(user.id, movieId)
    logger.info('Movie removed from watchlist', { userId: user.id, movieId })

    return NextResponse.json({
      success: true,
      message: 'Removed from watchlist',
    })
  } catch (error) {
    logger.error('Error removing from watchlist:', { error: String(error) })
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
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
    const { movie_id, watchlist_id, watched, rating, notes } = body

    if (!movie_id && !watchlist_id) {
      return NextResponse.json(
        { success: false, error: 'Movie ID or Watchlist ID is required' },
        { status: 400 }
      )
    }

    const watchlistRepo = new WatchlistRepository(supabase)

    // Use the general update method that handles both watched true/false
    if (watchlist_id) {
      const updates: { watched?: boolean; rating?: number; notes?: string } = {}

      if (watched !== undefined) updates.watched = watched
      if (rating !== undefined) updates.rating = rating
      if (notes !== undefined) updates.notes = notes

      const result = await watchlistRepo.updateWatchlistItem(watchlist_id, user.id, updates)
      logger.info('Watchlist item updated', { watchlistId: watchlist_id, userId: user.id, updates })

      // Clear recommendation cache if movie was marked as watched
      if (updates.watched === true) {
        RecommendationCacheManager.clearUserRecommendations(user.id)
        logger.info('🗑️ Cleared recommendation cache due to movie marked as watched', {
          userId: user.id,
          watchlistId: watchlist_id
        })
      }

      return NextResponse.json({
        success: true,
        data: result,
      })
    }

    return NextResponse.json(
      { success: false, error: 'Watchlist ID is required for updates' },
      { status: 400 }
    )
  } catch (error) {
    logger.error('Error updating watchlist:', { error: String(error) })
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
