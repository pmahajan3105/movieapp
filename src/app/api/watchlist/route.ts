import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/client'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()

    // Get current user (secure method)
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    console.log('🔐 Watchlist GET - Auth check:', {
      hasUser: !!user,
      userId: user?.id,
      userEmail: user?.email,
      authError: authError?.message,
      authErrorCode: authError?.code,
    })

    if (authError || !user) {
      console.log('❌ Watchlist GET - Authentication failed:', {
        error: authError?.message,
        code: authError?.code,
        hasUser: !!user,
      })
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const watched = searchParams.get('watched')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = (page - 1) * limit

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
      .range(offset, offset + limit - 1)

    // Filter by watched status if specified
    if (watched !== null) {
      query = query.eq('watched', watched === 'true')
    }

    const { data, error } = await query

    if (error) {
      console.error('❌ Watchlist fetch error:', error.message)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch watchlist' },
        { status: 500 }
      )
    }

    console.log('✅ Watchlist GET successful:', {
      userId: user.id,
      itemCount: data?.length || 0,
    })

    return NextResponse.json({
      success: true,
      data: data || [],
      pagination: {
        page,
        limit,
        hasMore: data && data.length === limit,
      },
    })
  } catch (error) {
    console.error('❌ Watchlist GET error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    console.log('🔐 Watchlist POST - Auth check:', {
      hasUser: !!user,
      userId: user?.id,
      userEmail: user?.email,
      authError: authError?.message,
      authErrorCode: authError?.code,
    })

    if (authError || !user) {
      console.log('❌ Watchlist POST - Authentication failed:', {
        error: authError?.message,
        code: authError?.code,
        hasUser: !!user,
      })
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    let { movie_id, notes } = body

    console.log('📝 Watchlist POST - Request details:', {
      userId: user.id,
      movieId: movie_id,
      hasNotes: !!notes,
    })

    if (!movie_id) {
      return NextResponse.json({ success: false, error: 'Movie ID is required' }, { status: 400 })
    }

    // First, try to find the movie in our local database
    // Handle different movie ID formats: UUID, tmdb_123456, or imdb_id (tt1234567)
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

    const { data: movieExists, error: movieError } = await movieQuery.single()

    // If we found the movie by external ID, update movie_id to use the UUID
    if (movieExists) {
      const originalId = movie_id
      movie_id = movieExists.id
      console.log('✅ Found existing movie by external ID:', {
        originalId,
        foundId: movie_id,
        title: movieExists.title,
        imdb_id: movieExists.imdb_id,
        tmdb_id: movieExists.tmdb_id,
      })
    }

    // If movie doesn't exist locally, try to fetch from external APIs and insert
    if (
      (movieError || !movieExists) &&
      (movie_id.startsWith('tmdb_') || movie_id.startsWith('tt'))
    ) {
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
              plot: tmdbMovie.overview || null,
              poster_url: tmdbMovie.poster_path
                ? `https://image.tmdb.org/t/p/w500${tmdbMovie.poster_path}`
                : null,
              rating: tmdbMovie.vote_average || null,
              runtime: tmdbMovie.runtime || null,
              imdb_id: tmdbMovie.imdb_id || null,
              tmdb_id: parseInt(tmdbId),
              metadata: {
                tmdb_original_id: movie_id,
                tmdb_data: {
                  popularity: tmdbMovie.popularity,
                  vote_count: tmdbMovie.vote_count,
                  adult: tmdbMovie.adult,
                  backdrop_path: tmdbMovie.backdrop_path,
                  original_language: tmdbMovie.original_language,
                  original_title: tmdbMovie.original_title,
                },
              },
            }

            console.log('🎬 Attempting to insert TMDB movie:', {
              title: newMovie.title,
              tmdb_id: newMovie.tmdb_id,
              fields: Object.keys(newMovie),
            })

            const { data: insertedMovie, error: insertError } = await supabase
              .from('movies')
              .insert(newMovie)
              .select('id, title')
              .single()

            if (insertError) {
              console.error('❌ Failed to insert movie from TMDB:', insertError.message)
              console.error('❌ Insert error details:', insertError)
              console.error('❌ Movie data being inserted:', JSON.stringify(newMovie, null, 2))
              return NextResponse.json(
                {
                  success: false,
                  error: 'Failed to add movie to database',
                },
                { status: 500 }
              )
            }

            movie_id = insertedMovie.id
            console.log('✅ Successfully inserted TMDB movie:', {
              originalId: movie_id,
              newId: insertedMovie.id,
              title: insertedMovie.title,
            })
          }
        }
      } catch (fetchError) {
        console.error('❌ Error fetching movie from external API:', fetchError)
        return NextResponse.json(
          {
            success: false,
            error: 'Failed to fetch movie details',
          },
          { status: 500 }
        )
      }
    }

    // Check if already in watchlist
    const { data: existing, error: existingError } = await supabase
      .from('watchlist')
      .select('id')
      .eq('user_id', user.id)
      .eq('movie_id', movie_id)
      .single()

    if (existingError && existingError.code !== 'PGRST116') {
      console.error('❌ Error checking existing watchlist item:', existingError.message)
      return NextResponse.json(
        { success: false, error: 'Error checking watchlist' },
        { status: 500 }
      )
    }

    if (existing) {
      console.log('⚠️ Movie already in watchlist:', {
        userId: user.id,
        movieId: movie_id,
        watchlistId: existing.id,
      })
      return NextResponse.json(
        { success: false, error: 'Movie already in watchlist' },
        { status: 409 }
      )
    }

    // Add to watchlist
    const { data: newItem, error } = await supabase
      .from('watchlist')
      .insert({
        user_id: user.id,
        movie_id: movie_id,
        notes: notes || null,
        watched: false,
        added_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      console.error('❌ Watchlist insert error:', error.message)
      return NextResponse.json(
        { success: false, error: 'Failed to add to watchlist' },
        { status: 500 }
      )
    }

    console.log('✅ Successfully added to watchlist:', {
      userId: user.id,
      movieId: movie_id,
      watchlistId: newItem.id,
    })

    return NextResponse.json(
      {
        success: true,
        data: newItem,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('❌ Watchlist POST error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createServerClient()

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { watchlist_id, watched, notes, rating } = body

    if (!watchlist_id) {
      return NextResponse.json(
        { success: false, error: 'Watchlist ID is required' },
        { status: 400 }
      )
    }

    const updateData: Record<string, unknown> = {}

    if (typeof watched === 'boolean') {
      updateData.watched = watched
      updateData.watched_at = watched ? new Date().toISOString() : null
    }

    if (notes !== undefined) {
      updateData.notes = notes
    }

    if (rating !== undefined && typeof rating === 'number') {
      updateData.rating = rating
    }

    const { data, error } = await supabase
      .from('watchlist')
      .update(updateData)
      .eq('id', watchlist_id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      console.error('Watchlist update error:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to update watchlist item' },
        { status: 500 }
      )
    }

    if (!data) {
      return NextResponse.json(
        { success: false, error: 'Watchlist item not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Watchlist PATCH error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createServerClient()

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const movieId = searchParams.get('movie_id')

    if (!movieId) {
      return NextResponse.json({ success: false, error: 'Movie ID is required' }, { status: 400 })
    }

    // First check if the item exists in the watchlist
    const { data: existing, error: existingError } = await supabase
      .from('watchlist')
      .select('id')
      .eq('user_id', user.id)
      .eq('movie_id', movieId)
      .single()

    if (existingError && existingError.code !== 'PGRST116') {
      console.error('❌ Error checking existing watchlist item for deletion:', {
        error: existingError.message,
        code: existingError.code,
        userId: user.id,
        movieId,
      })
      return NextResponse.json(
        { success: false, error: 'Error checking watchlist' },
        { status: 500 }
      )
    }

    if (!existing) {
      return NextResponse.json({ success: false, error: 'Movie not in watchlist' }, { status: 404 })
    }

    const { error } = await supabase
      .from('watchlist')
      .delete()
      .eq('user_id', user.id)
      .eq('movie_id', movieId)

    if (error) {
      console.error('❌ Watchlist delete error:', {
        error: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        userId: user.id,
        movieId,
      })
      return NextResponse.json(
        { success: false, error: `Failed to remove from watchlist: ${error.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, message: 'Removed from watchlist' })
  } catch (error) {
    console.error('❌ Watchlist DELETE error:', error)
    return NextResponse.json(
      {
        success: false,
        error: `Internal server error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      },
      { status: 500 }
    )
  }
}
