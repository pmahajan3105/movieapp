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

    if (authError || !user) {
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

    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    let { movie_id, notes } = body

    if (!movie_id) {
      return NextResponse.json({ success: false, error: 'Movie ID is required' }, { status: 400 })
    }

    // First, try to find the movie in our local database
    // For TMDB movies, check both by ID and by metadata
    let movieQuery = supabase.from('movies').select('id, title')

    if (movie_id.startsWith('tmdb_')) {
      // For TMDB movies, also check if we already have this movie by tmdb_id
      const tmdbId = parseInt(movie_id.replace('tmdb_', ''))
      movieQuery = movieQuery.or(`id.eq.${movie_id},tmdb_id.eq.${tmdbId}`)
    } else {
      movieQuery = movieQuery.eq('id', movie_id)
    }

    const { data: movieExists, error: movieError } = await movieQuery.single()

    // If we found the movie by tmdb_id, update movie_id to use the UUID
    if (movieExists && movie_id.startsWith('tmdb_')) {
      movie_id = movieExists.id
      console.log('✅ Found existing TMDB movie by tmdb_id:', {
        originalId: body.movie_id,
        foundId: movie_id,
        title: movieExists.title,
      })
    }

    // If movie doesn't exist locally and it's a TMDB ID, try to fetch from TMDB and insert
    if ((movieError || !movieExists) && movie_id.startsWith('tmdb_')) {
      // Extract TMDB ID from the format 'tmdb_123456'
      const tmdbId = movie_id.replace('tmdb_', '')

      try {
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
            // Generate a proper UUID for the movie
            title: tmdbMovie.title,
            year: tmdbMovie.release_date ? new Date(tmdbMovie.release_date).getFullYear() : null,
            genre: genres,
            director: directors,
            // Remove cast field to avoid schema issues
            plot: tmdbMovie.overview || null,
            poster_url: tmdbMovie.poster_path
              ? `https://image.tmdb.org/t/p/w500${tmdbMovie.poster_path}`
              : null,
            rating: tmdbMovie.vote_average || null,
            runtime: tmdbMovie.runtime || null,
            imdb_id: tmdbMovie.imdb_id || null,
            tmdb_id: parseInt(tmdbId),
            metadata: {
              tmdb_original_id: movie_id, // Store the original tmdb_xxx format for reference
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

          // Insert movie into our database and get the generated UUID
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

          // Update movie_id to use the generated UUID instead of the tmdb_xxx format
          movie_id = insertedMovie.id
          console.log('✅ Successfully inserted TMDB movie:', {
            originalId: body.movie_id,
            newId: movie_id,
            title: insertedMovie.title,
          })
        } else {
          console.error('❌ Error fetching from TMDB:', tmdbResponse.status)
          return NextResponse.json(
            {
              success: false,
              error: 'Movie not found',
            },
            { status: 404 }
          )
        }
      } catch (tmdbError) {
        console.error('❌ Error fetching from TMDB:', tmdbError)
        return NextResponse.json(
          {
            success: false,
            error: 'Failed to fetch movie details',
          },
          { status: 500 }
        )
      }
    }

    // Re-check if movie exists after potential TMDB insertion
    const { data: movie, error: finalMovieError } = await supabase
      .from('movies')
      .select('id, title')
      .eq('id', movie_id)
      .single()

    if (finalMovieError || !movie) {
      return NextResponse.json(
        {
          success: false,
          error: 'Movie not found',
        },
        { status: 404 }
      )
    }

    // Check if movie is already in watchlist
    const { data: existingItem, error: checkError } = await supabase
      .from('watchlist')
      .select('id')
      .eq('user_id', user.id)
      .eq('movie_id', movie_id)
      .single()

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('❌ Error checking existing watchlist item:', checkError.message)
      return NextResponse.json(
        {
          success: false,
          error: 'Database error',
        },
        { status: 500 }
      )
    }

    if (existingItem) {
      return NextResponse.json(
        {
          success: false,
          error: 'Movie already in watchlist',
        },
        { status: 409 }
      )
    }

    // Add to watchlist
    const { data: newItem, error: insertError } = await supabase
      .from('watchlist')
      .insert({
        user_id: user.id,
        movie_id: movie_id,
        notes: notes || null,
        added_at: new Date().toISOString(),
      })
      .select(
        `
        id,
        added_at,
        notes,
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
      .single()

    if (insertError) {
      console.error('❌ Watchlist add error:', insertError.message)
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to add to watchlist',
        },
        { status: 500 }
      )
    }

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
      if (process.env.NODE_ENV === 'development') {
        console.log('❌ Watchlist DELETE: Authentication failed', { authError: authError?.message })
      }
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('✅ Watchlist DELETE: User authenticated', { userId: user.id, email: user.email })
    }

    const { searchParams } = new URL(request.url)
    const movieId = searchParams.get('movie_id')

    if (process.env.NODE_ENV === 'development') {
      console.log('📝 Watchlist DELETE: Request data', {
        movieId,
        userId: user.id,
        searchParams: Object.fromEntries(searchParams),
      })
    }

    if (!movieId) {
      if (process.env.NODE_ENV === 'development') {
        console.log('❌ Watchlist DELETE: Missing movie_id')
      }
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
      console.log('⚠️ Movie not in watchlist', {
        userId: user.id,
        movieId,
      })
      return NextResponse.json({ success: false, error: 'Movie not in watchlist' }, { status: 404 })
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('🗑️ Removing movie from watchlist...', {
        watchlistId: existing.id,
        movieId,
        userId: user.id,
      })
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

    if (process.env.NODE_ENV === 'development') {
      console.log('✅ Successfully removed from watchlist', {
        userId: user.id,
        movieId,
        watchlistId: existing.id,
      })
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
