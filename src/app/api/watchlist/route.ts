import {
  createAuthenticatedApiHandler,
  getQueryParams,
  getPagination,
  parseJsonBody,
} from '@/lib/api/factory'
import type { WatchlistInsert } from '@/lib/typed-supabase'

// GET /api/watchlist - Get user's watchlist items
export const GET = createAuthenticatedApiHandler(async ({ request, supabase, user }) => {
  const params = getQueryParams(request)
  const pagination = getPagination(request)
  const watched = params.get('watched')

  let query = supabase
    .from('watchlist')
    .select(
      `
      id,
      added_at,
      watched,
      watched_at,
      notes,
      rating,
      movies:movie_id (
        id,
        title,
        year,
        genre,
        director,
        plot,
        poster_url,
        rating,
        runtime,
        imdb_id
      )
    `
    )
    .eq('user_id', user.id)
    .order('added_at', { ascending: false })
    .range(...pagination.range)

  // Filter by watched status if specified
  if (watched !== null && watched !== undefined) {
    query = query.eq('watched', watched === 'true')
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Failed to fetch watchlist: ${error.message}`)
  }

  return {
    data: data || [],
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      hasMore: data && data.length === pagination.limit,
    },
  }
})

// POST /api/watchlist - Add movie to watchlist
export const POST = createAuthenticatedApiHandler(async ({ request, supabase, user }) => {
  const body = await parseJsonBody<{ movie_id: string; notes?: string }>(request)
  let { movie_id, notes } = body

  if (!movie_id) {
    throw new Error('Movie ID is required')
  }

  // First, try to find the movie in our local database
  let movieQuery = supabase.from('movies').select('id, title, imdb_id, tmdb_id')

  if (movie_id.startsWith('tmdb_')) {
    // For TMDB movies, check both by ID and by tmdb_id
    const tmdbId = parseInt(movie_id.replace('tmdb_', ''))
    movieQuery = movieQuery.or(`id.eq.${movie_id},tmdb_id.eq.${tmdbId}`)
  } else if (movie_id.startsWith('tt')) {
    // For IMDB movies, check by imdb_id or omdb_id
    movieQuery = movieQuery.or(`imdb_id.eq.${movie_id},omdb_id.eq.${movie_id}`)
  } else {
    // For UUID or other formats, check by ID
    movieQuery = movieQuery.eq('id', movie_id)
  }

  const { data: movieExists } = await movieQuery.maybeSingle()

  // If we found the movie by external ID, update movie_id to use the UUID
  if (movieExists) {
    movie_id = movieExists.id
  }

  // If movie doesn't exist locally, try to fetch from external APIs and insert
  if (!movieExists && (movie_id.startsWith('tmdb_') || movie_id.startsWith('tt'))) {
    try {
      if (movie_id.startsWith('tmdb_')) {
        // Extract TMDB ID from the format 'tmdb_123456'
        const tmdbId = movie_id.replace('tmdb_', '')

        // Fetch movie details from TMDB with credits for director and cast
        const tmdbResponse = await fetch(
          `https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${process.env.TMDB_API_KEY}&append_to_response=credits`
        )

        if (tmdbResponse.ok) {
          const tmdbMovie = await tmdbResponse.json()

          // Extract director from credits
          const directors =
            tmdbMovie.credits?.crew
              ?.filter((member: { job: string; name: string }) => member.job === 'Director')
              ?.map((director: { name: string }) => director.name) || []

          // Extract genres
          const genres = tmdbMovie.genres?.map((g: { name: string }) => g.name) || []

          const newMovie = {
            title: tmdbMovie.title,
            year: tmdbMovie.release_date ? new Date(tmdbMovie.release_date).getFullYear() : null,
            genre: genres,
            director: directors,
            plot: tmdbMovie.overview || 'No plot available',
            poster_url: tmdbMovie.poster_path
              ? `https://image.tmdb.org/t/p/w500${tmdbMovie.poster_path}`
              : null,
            rating: Math.round(tmdbMovie.vote_average * 10) / 10,
            runtime: tmdbMovie.runtime || null,
            tmdb_id: parseInt(tmdbId),
            imdb_id: tmdbMovie.imdb_id || null,
          }

          const { data: insertedMovie, error: insertError } = await supabase
            .from('movies')
            .insert(newMovie)
            .select('id')
            .single()

          if (insertError) {
            throw new Error(`Failed to insert TMDB movie: ${insertError.message}`)
          }

          movie_id = insertedMovie.id
        }
      }
      // Add similar logic for IMDB/OMDB if needed
    } catch (apiError) {
      console.error('Error fetching external movie data:', apiError)
      // Continue with the original movie_id if external fetch fails
    }
  }

  // Check if movie is already in watchlist
  const { data: existing } = await supabase
    .from('watchlist')
    .select('id')
    .eq('user_id', user.id)
    .eq('movie_id', movie_id)
    .maybeSingle()

  if (existing) {
    throw new Error('Movie is already in watchlist')
  }

  // Add to watchlist
  const watchlistItem: WatchlistInsert = {
    user_id: user.id,
    movie_id,
    notes: notes || null,
    watched: false,
  }

  const { data, error } = await supabase
    .from('watchlist')
    .insert(watchlistItem)
    .select(
      `
      id,
      added_at,
      watched,
      notes,
      rating,
      movies:movie_id (
        id,
        title,
        year,
        genre,
        director,
        plot,
        poster_url,
        rating,
        runtime
      )
    `
    )
    .single()

  if (error) {
    throw new Error(`Failed to add to watchlist: ${error.message}`)
  }

  return data
})

// PATCH /api/watchlist - Update watchlist item (mark as watched, add rating, etc.)
export const PATCH = createAuthenticatedApiHandler(async ({ request, supabase, user }) => {
  const body = await parseJsonBody<{
    movie_id: string
    watched?: boolean
    rating?: number
    notes?: string
  }>(request)

  const { movie_id, watched, rating, notes } = body

  if (!movie_id) {
    throw new Error('Movie ID is required')
  }

  // Build update object
  const updates: any = {}
  if (watched !== undefined) {
    updates.watched = watched
    if (watched) {
      updates.watched_at = new Date().toISOString()
    } else {
      updates.watched_at = null
      updates.rating = null // Clear rating if unwatching
    }
  }
  if (rating !== undefined) updates.rating = rating
  if (notes !== undefined) updates.notes = notes

  const { data, error } = await supabase
    .from('watchlist')
    .update(updates)
    .eq('user_id', user.id)
    .eq('movie_id', movie_id)
    .select(
      `
      id,
      added_at,
      watched,
      watched_at,
      notes,
      rating,
      movies:movie_id (
        id,
        title,
        year,
        genre,
        director,
        plot,
        poster_url,
        rating,
        runtime
      )
    `
    )
    .single()

  if (error) {
    throw new Error(`Failed to update watchlist item: ${error.message}`)
  }

  return data
})

// DELETE /api/watchlist - Remove movie from watchlist
export const DELETE = createAuthenticatedApiHandler(async ({ request, supabase, user }) => {
  const params = getQueryParams(request)
  const movie_id = params.get('movie_id')

  if (!movie_id) {
    throw new Error('Movie ID is required')
  }

  const { error } = await supabase
    .from('watchlist')
    .delete()
    .eq('user_id', user.id)
    .eq('movie_id', movie_id)

  if (error) {
    throw new Error(`Failed to remove from watchlist: ${error.message}`)
  }

  return { success: true }
})
