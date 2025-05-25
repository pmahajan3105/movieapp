import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/client'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      console.log('❌ Watchlist GET: Authentication failed', { authError: authError?.message })
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    console.log('✅ Watchlist GET: User authenticated', { userId: user.id, email: user.email })

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
      console.error('❌ Watchlist fetch error:', {
        error: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        userId: user.id
      })
      return NextResponse.json(
        { success: false, error: 'Failed to fetch watchlist' },
        { status: 500 }
      )
    }

    console.log('✅ Watchlist GET successful', { 
      userId: user.id, 
      itemCount: data?.length || 0 
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

    if (authError || !user) {
      console.log('❌ Watchlist POST: Authentication failed', { authError: authError?.message })
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    console.log('✅ Watchlist POST: User authenticated', { userId: user.id, email: user.email })

    const body = await request.json()
    const { movie_id, notes } = body

    console.log('📝 Watchlist POST: Request data', { 
      movie_id, 
      notes, 
      userId: user.id 
    })

    if (!movie_id) {
      console.log('❌ Watchlist POST: Missing movie_id')
      return NextResponse.json({ success: false, error: 'Movie ID is required' }, { status: 400 })
    }

    // First, verify the movie exists
    const { data: movieExists, error: movieError } = await supabase
      .from('movies')
      .select('id, title')
      .eq('id', movie_id)
      .single()

    if (movieError || !movieExists) {
      console.log('❌ Watchlist POST: Movie not found', { 
        movie_id, 
        movieError: movieError?.message 
      })
      return NextResponse.json(
        { success: false, error: 'Movie not found' }, 
        { status: 404 }
      )
    }

    console.log('✅ Movie exists', { movieId: movie_id, title: movieExists.title })

    // Check if movie already in watchlist
    const { data: existing, error: existingError } = await supabase
      .from('watchlist')
      .select('id')
      .eq('user_id', user.id)
      .eq('movie_id', movie_id)
      .single()

    if (existingError && existingError.code !== 'PGRST116') {
      console.error('❌ Error checking existing watchlist item:', {
        error: existingError.message,
        code: existingError.code,
        userId: user.id,
        movieId: movie_id
      })
      return NextResponse.json(
        { success: false, error: 'Error checking watchlist' },
        { status: 500 }
      )
    }

    if (existing) {
      console.log('⚠️ Movie already in watchlist', { 
        userId: user.id, 
        movieId: movie_id,
        existingId: existing.id
      })
      return NextResponse.json(
        { success: false, error: 'Movie already in watchlist' },
        { status: 409 }
      )
    }

    console.log('➕ Adding movie to watchlist...')

    // Add to watchlist
    const { data, error } = await supabase
      .from('watchlist')
      .insert({
        user_id: user.id,
        movie_id,
        notes: notes || null,
        watched: false,
      })
      .select(`
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
      `)
      .single()

    if (error) {
      console.error('❌ Watchlist add error:', {
        error: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        userId: user.id,
        movieId: movie_id
      })
      return NextResponse.json(
        { success: false, error: `Failed to add to watchlist: ${error.message}` },
        { status: 500 }
      )
    }

    console.log('✅ Successfully added to watchlist', { 
      userId: user.id, 
      movieId: movie_id,
      watchlistId: data?.id
    })

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('❌ Watchlist POST error:', error)
    return NextResponse.json({ 
      success: false, 
      error: `Internal server error: ${error instanceof Error ? error.message : 'Unknown error'}` 
    }, { status: 500 })
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
    const { watchlist_id, watched, notes } = body

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
      console.log('❌ Watchlist DELETE: Authentication failed', { authError: authError?.message })
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    console.log('✅ Watchlist DELETE: User authenticated', { userId: user.id, email: user.email })

    const { searchParams } = new URL(request.url)
    const movieId = searchParams.get('movie_id')

    console.log('📝 Watchlist DELETE: Request data', { 
      movieId, 
      userId: user.id,
      searchParams: Object.fromEntries(searchParams)
    })

    if (!movieId) {
      console.log('❌ Watchlist DELETE: Missing movie_id')
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
        movieId
      })
      return NextResponse.json(
        { success: false, error: 'Error checking watchlist' },
        { status: 500 }
      )
    }

    if (!existing) {
      console.log('⚠️ Movie not in watchlist', { 
        userId: user.id, 
        movieId
      })
      return NextResponse.json(
        { success: false, error: 'Movie not in watchlist' },
        { status: 404 }
      )
    }

    console.log('🗑️ Removing movie from watchlist...', { 
      watchlistId: existing.id,
      movieId,
      userId: user.id
    })

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
        movieId
      })
      return NextResponse.json(
        { success: false, error: `Failed to remove from watchlist: ${error.message}` },
        { status: 500 }
      )
    }

    console.log('✅ Successfully removed from watchlist', { 
      userId: user.id, 
      movieId,
      watchlistId: existing.id
    })

    return NextResponse.json({ success: true, message: 'Removed from watchlist' })
  } catch (error) {
    console.error('❌ Watchlist DELETE error:', error)
    return NextResponse.json({ 
      success: false, 
      error: `Internal server error: ${error instanceof Error ? error.message : 'Unknown error'}` 
    }, { status: 500 })
  }
}
