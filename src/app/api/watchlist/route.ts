import { createClient as createSupabaseClient } from '@/lib/supabase/server-client'
import { NextRequest, NextResponse } from 'next/server'
import type { WatchlistInsert } from '@/lib/supabase/types'
import { withSupabase, withError } from '@/lib/api/factory'

const TMDB_KEY = process.env.TMDB_API_KEY!

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

// ------------------------------------------------------------------
// helper – fetch full movie details from TMDB and return a Movie row
async function fetchTmdbMovie(tmdbId: number) {
  const resp = await fetch(
    `https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${TMDB_KEY}&append_to_response=credits`
  )
  if (!resp.ok) throw new Error(`TMDB ${resp.status}`)

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
      console.error('Watchlist fetch error:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch watchlist' },
        { status: 500 }
      )
    }

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
  })
)

// POST /api/watchlist - Add movie to watchlist
export async function POST(request: NextRequest) {
  try {
    // 1.  Create client *first* – this may mutate the cookie store
    const supabase = await createSupabaseClient()

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

    // -------------------------------------------------------------------
    // If the TMDB / IMDB movie isn't in our DB, create a placeholder row
    // -------------------------------------------------------------------
    if (!movieExists) {
      if (movie_id.startsWith('tmdb_')) {
        try {
          const tmdbId = parseInt(movie_id.replace('tmdb_', ''), 10)
          const movieData = await fetchTmdbMovie(tmdbId)

          const { data: newMovie, error: insertErr } = await supabase
            .from('movies')
            .insert(movieData)
            .select('id')
            .single()

          if (insertErr) throw insertErr
          if (!newMovie) {
            throw new Error('Movie insert returned no data')
          }
          movie_id = newMovie!.id
        } catch (e) {
          console.warn('⚠️ TMDB import failed, falling back to stub:', e)
          const { data: newMovie } = await supabase
            .from('movies')
            .insert({
              title: '[Imported from TMDB]',
              tmdb_id: parseInt(movie_id.replace('tmdb_', ''), 10),
            })
            .select('id')
            .single()
          movie_id = newMovie!.id
        }
      } else {
        // extract numeric TMDB id or keep full string
        const tmdbId = movie_id.startsWith('tmdb_')
          ? parseInt(movie_id.replace('tmdb_', ''), 10)
          : null

        const insertMovie = {
          title: '[Imported from TMDB]',
          tmdb_id: tmdbId,
          imdb_id: movie_id.startsWith('tt') ? movie_id : null,
          genre: [],
          rating: null,
        }

        const { data: newMovie, error: insertErr } = await supabase
          .from('movies')
          .insert(insertMovie)
          .select('id')
          .single()

        if (insertErr) {
          console.error('Movie auto-import failed:', insertErr)
          return NextResponse.json(
            { success: false, error: 'Failed to import movie' },
            { status: 500 }
          )
        }

        // use the real UUID we just created
        movie_id = newMovie!.id
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
      return NextResponse.json(
        { success: false, error: 'Movie is already in watchlist' },
        { status: 400 }
      )
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
      console.error('Watchlist insert error:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to add to watchlist' },
        { status: 500 }
      )
    }

    // 3.  Build the response **after** everything else,
    //     so updated cookies are included
    return NextResponse.json({ success: true, data }, { status: 200 })
  } catch (error) {
    console.error('Watchlist POST error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/watchlist - Update watchlist item (mark as watched, add rating, etc.)
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createSupabaseClient()

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

    const updates: Partial<WatchlistInsert & { rating?: number; watched_at?: string }> = {}

    if (watched !== undefined) {
      updates.watched = watched
      if (watched) {
        updates.watched_at = new Date().toISOString()
      }
    }

    if (rating !== undefined) {
      updates.rating = rating
    }

    if (notes !== undefined) {
      updates.notes = notes
    }

    let updateQuery = supabase.from('watchlist').update(updates).eq('user_id', user.id)

    if (movie_id) {
      updateQuery = updateQuery.eq('movie_id', movie_id)
    } else if (watchlist_id) {
      updateQuery = updateQuery.eq('id', watchlist_id)
    }

    const { data, error } = await updateQuery
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
      console.error('Watchlist update error:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to update watchlist item' },
        { status: 500 }
      )
    }

    // If marking as watched and movie is a stub, fetch full TMDB details and update movies table
    if (watched === true && movie_id) {
      try {
        const { data: movieRow } = await supabase
          .from('movies')
          .select('id, title, poster_url, tmdb_id')
          .eq('id', movie_id)
          .single()

        if (
          movieRow &&
          movieRow.tmdb_id &&
          (!movieRow.poster_url || movieRow.title.startsWith('[Imported'))
        ) {
          const full = await fetchTmdbMovie(movieRow.tmdb_id)
          await supabase.from('movies').update(full).eq('id', movieRow.id)
          // Optionally refresh `data.movies` in response
          if (data && (data as any).movies) {
            ;(data as any).movies = { ...(data as any).movies, ...full }
          }
        }
      } catch (e) {
        console.warn('TMDB enrichment failed:', e)
      }
    }

    return NextResponse.json({
      success: true,
      data,
    })
  } catch (error) {
    console.error('Watchlist PATCH error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/watchlist - Remove movie from watchlist
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createSupabaseClient()

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

    const { error } = await supabase
      .from('watchlist')
      .delete()
      .eq('user_id', user.id)
      .eq('movie_id', movie_id)

    if (error) {
      console.error('Watchlist delete error:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to remove from watchlist' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Watchlist DELETE error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
