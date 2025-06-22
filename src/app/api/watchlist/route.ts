import { NextResponse } from 'next/server'
import { withSupabase, withError } from '@/lib/api/factory'
import { WatchlistRepository, MovieRepository } from '@/repositories'

// Helper to parse JSON body
async function parseJsonBody<T = unknown>(request: Request): Promise<T> {
  try {
    return await request.json()
  } catch {
    throw new Error('Invalid JSON body')
  }
}

// Helper to get query parameters
function getQueryParams(request: Request) {
  const { searchParams } = new URL(request.url)
  return {
    get: (key: string, defaultValue?: string) => searchParams.get(key) || defaultValue,
    getNumber: (key: string, defaultValue = 0) => {
      const value = searchParams.get(key)
      return value ? parseInt(value, 10) : defaultValue
    },
    getBoolean: (key: string, defaultValue = false) => {
      const value = searchParams.get(key)
      if (value === null) return defaultValue
      return value === 'true' || value === '1'
    },
  }
}

// Helper for pagination
function getPagination(request: Request) {
  const params = getQueryParams(request)
  const page = Math.max(1, params.getNumber('page', 1))
  const limit = Math.max(1, Math.min(100, params.getNumber('limit', 20))) // Cap at 100
  const offset = (page - 1) * limit

  return {
    page,
    limit,
    offset,
    range: [offset, offset + limit - 1] as [number, number],
  }
}

interface TMDBGenre {
  id: number
  name: string
}

interface TMDBCrewMember {
  job: string
  name: string
}

interface TMDBCredits {
  crew: TMDBCrewMember[]
}

interface TMDBMovieResponse {
  title: string
  release_date?: string
  genres?: TMDBGenre[]
  credits?: TMDBCredits
  overview?: string
  poster_path?: string | null
  vote_average?: number
  runtime?: number
  imdb_id?: string | null
}

// ------------------------------------------------------------------
// helper – fetch full movie details from TMDB and return a Movie row
async function fetchTmdbMovie(tmdbId: number) {
  const apiKey = process.env.TMDB_API_KEY
  const resp = await fetch(
    `https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${apiKey}&append_to_response=credits`
  )

  if (!resp.ok) {
    throw new Error(`TMDB API error: ${resp.status} ${resp.statusText}`)
  }

  const m: TMDBMovieResponse = await resp.json()

  return {
    title: m.title,
    year: m.release_date ? new Date(m.release_date).getFullYear() : undefined,
    genre: (m.genres || []).map(g => g.name),
    director: (m.credits?.crew || []).filter(c => c.job === 'Director').map(d => d.name),
    plot: m.overview,
    poster_url: m.poster_path ? `https://image.tmdb.org/t/p/w500${m.poster_path}` : undefined,
    rating: m.vote_average,
    runtime: m.runtime,
    tmdb_id: tmdbId,
    imdb_id: m.imdb_id || undefined,
  }
}
// ------------------------------------------------------------------

// GET /api/watchlist - Get user's watchlist items
export const GET = withError(
  withSupabase(async ({ request, supabase }) => {
    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const params = getQueryParams(request)
    const pagination = getPagination(request)
    const watched = params.get('watched')

    const watchlistRepo = new WatchlistRepository(supabase)

    try {
      const filters = {
        watched: watched !== null ? watched === 'true' : undefined,
        limit: pagination.limit,
        offset: pagination.offset,
      }

      const data = await watchlistRepo.getUserWatchlist(user.id, filters)

      return NextResponse.json({
        success: true,
        data: {
          data: data || [],
          pagination: {
            page: pagination.page,
            limit: pagination.limit,
            hasMore: data && data.length === pagination.limit,
          },
        },
      })
    } catch (error) {
      console.error('Watchlist fetch error:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch watchlist' },
        { status: 500 }
      )
    }
  })
)

// POST /api/watchlist - Add movie to watchlist
export const POST = withError(
  withSupabase(async ({ request, supabase }) => {
    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await parseJsonBody<{ movie_id: string; notes?: string }>(request)
    let { movie_id, notes } = body

    if (!movie_id) {
      return NextResponse.json({ success: false, error: 'Movie ID is required' }, { status: 400 })
    }

    const movieRepo = new MovieRepository(supabase)
    const watchlistRepo = new WatchlistRepository(supabase)

    try {
      // First, try to find the movie in our local database
      let movie = null

      if (movie_id.startsWith('tmdb_')) {
        // For TMDB movies, check by tmdb_id
        const tmdbId = parseInt(movie_id.replace('tmdb_', ''))
        movie = await movieRepo.findByTmdbId(tmdbId)

        // If not found, create it from TMDB
        if (!movie) {
          try {
            const movieData = await fetchTmdbMovie(tmdbId)
            movie = await movieRepo.create(movieData)
          } catch (e) {
            console.warn('⚠️ TMDB import failed, creating stub:', e)
            movie = await movieRepo.create({
              title: '[Imported from TMDB]',
              tmdb_id: tmdbId,
            })
          }
        }
        movie_id = movie.id
      } else if (movie_id.startsWith('tt')) {
        // For IMDB movies, check by imdb_id
        movie = await movieRepo.findByImdbId(movie_id)

        if (!movie) {
          movie = await movieRepo.create({
            title: '[Imported from IMDB]',
            imdb_id: movie_id,
          })
        }
        movie_id = movie.id
      } else {
        // For UUID or other formats, check by ID
        movie = await movieRepo.findById(movie_id)

        if (!movie) {
          return NextResponse.json({ success: false, error: 'Movie not found' }, { status: 404 })
        }
      }

      // Check if movie is already in watchlist
      const isInWatchlist = await watchlistRepo.checkIfInWatchlist(user.id, movie_id)

      if (isInWatchlist) {
        return NextResponse.json(
          { success: false, error: 'Movie is already in watchlist' },
          { status: 400 }
        )
      }

      // Add to watchlist
      const data = await watchlistRepo.addToWatchlist(user.id, movie_id, notes)

      return NextResponse.json({ success: true, data }, { status: 200 })
    } catch (error) {
      console.error('Watchlist insert error:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to add to watchlist' },
        { status: 500 }
      )
    }
  })
)

// PATCH /api/watchlist - Update watchlist item (mark as watched, add rating, etc.)
export const PATCH = withError(
  withSupabase(async ({ request, supabase }) => {
    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await parseJsonBody<{
      movie_id?: string
      watchlist_id?: string
      watched?: boolean
      rating?: number
      notes?: string
    }>(request)

    const { movie_id, watchlist_id, watched, rating, notes } = body

    if (!movie_id && !watchlist_id) {
      return NextResponse.json(
        { success: false, error: 'Movie ID or Watchlist ID is required' },
        { status: 400 }
      )
    }

    const watchlistRepo = new WatchlistRepository(supabase)
    const movieRepo = new MovieRepository(supabase)

    try {
      let data

      if (watched === true && watchlist_id) {
        // Mark as watched with optional rating and notes
        data = await watchlistRepo.markAsWatched(watchlist_id, user.id, { rating, notes })
      } else {
        // General update
        const itemId = watchlist_id || movie_id!
        data = await watchlistRepo.updateWatchlistItem(itemId, user.id, {
          watched,
          rating,
          notes,
        })
      }

      // If marking as watched and movie is a stub, fetch full TMDB details
      if (watched === true && data && data.movie) {
        const movie = data.movie
        if (movie.tmdb_id && (!movie.poster_url || movie.title.startsWith('[Imported'))) {
          try {
            const fullMovieData = await fetchTmdbMovie(movie.tmdb_id)
            const updatedMovie = await movieRepo.update(movie.id, fullMovieData)
            // Update the response with enriched movie data
            data.movie = updatedMovie
          } catch (e) {
            console.warn('TMDB enrichment failed:', e)
          }
        }
      }

      return NextResponse.json({
        success: true,
        data,
      })
    } catch (error) {
      console.error('Watchlist update error:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to update watchlist item' },
        { status: 500 }
      )
    }
  })
)

// DELETE /api/watchlist - Remove movie from watchlist
export const DELETE = withError(
  withSupabase(async ({ request, supabase }) => {
    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const params = getQueryParams(request)
    const movie_id = params.get('movie_id')

    if (!movie_id) {
      return NextResponse.json({ success: false, error: 'Movie ID is required' }, { status: 400 })
    }

    const watchlistRepo = new WatchlistRepository(supabase)

    try {
      await watchlistRepo.removeFromWatchlist(user.id, movie_id)
      return NextResponse.json(
        { success: true, message: 'Removed from watchlist' },
        { status: 200 }
      )
    } catch (error) {
      console.error('Watchlist delete error:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to remove from watchlist' },
        { status: 500 }
      )
    }
  })
)
