import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET - Fetch user's watchlist
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const { searchParams } = new URL(request.url)
    const watched = searchParams.get('watched') // 'true', 'false', or null for all
    const sortBy = searchParams.get('sort') || 'added_at' // 'added_at', 'rating', 'year', 'title'
    const order = searchParams.get('order') || 'desc' // 'asc' or 'desc'
    const limit = parseInt(searchParams.get('limit') || '50')

    // Create authenticated Supabase client
    const authSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            cookie: cookieStore.toString(),
          },
        },
      }
    )

    // Get current user
    const { data: { user }, error: authError } = await authSupabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Build the query
    let query = supabase
      .from('watchlist')
      .select(`
        id,
        movie_id,
        added_at,
        watched,
        watched_at,
        rating,
        notes,
        movies (
          id,
          title,
          year,
          genre,
          director,
          plot,
          poster_url,
          rating,
          runtime,
          created_at
        )
      `)
      .eq('user_id', user.id)

    // Filter by watched status
    if (watched === 'true') {
      query = query.eq('watched', true)
    } else if (watched === 'false') {
      query = query.eq('watched', false)
    }

    // Apply sorting
    const orderDirection = order === 'asc'
    if (sortBy === 'rating') {
      query = query.order('rating', { ascending: orderDirection, nullsFirst: false })
    } else if (sortBy === 'year') {
      query = query.order('movies(year)', { ascending: orderDirection })
    } else if (sortBy === 'title') {
      query = query.order('movies(title)', { ascending: orderDirection })
    } else {
      query = query.order('added_at', { ascending: orderDirection })
    }

    const { data: watchlistItems, error } = await query.limit(limit)

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: 'Failed to fetch watchlist' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: watchlistItems || [],
      total: watchlistItems?.length || 0,
      filters: {
        watched,
        sortBy,
        order,
        limit,
      },
    })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Add movie to watchlist
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const { movie_id, notes } = await request.json()

    if (!movie_id) {
      return NextResponse.json({ error: 'Movie ID is required' }, { status: 400 })
    }

    // Create authenticated Supabase client
    const authSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            cookie: cookieStore.toString(),
          },
        },
      }
    )

    // Get current user
    const { data: { user }, error: authError } = await authSupabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if movie exists
    const { data: movie, error: movieError } = await supabase
      .from('movies')
      .select('id')
      .eq('id', movie_id)
      .single()

    if (movieError || !movie) {
      return NextResponse.json({ error: 'Movie not found' }, { status: 404 })
    }

    // Add to watchlist (handle duplicates)
    const { data: watchlistItem, error } = await supabase
      .from('watchlist')
      .upsert(
        {
          user_id: user.id,
          movie_id,
          notes: notes || null,
          added_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id,movie_id',
        }
      )
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: 'Failed to add to watchlist' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: watchlistItem,
      message: 'Movie added to watchlist',
    })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT - Update watchlist item (mark as watched, add rating, update notes)
export async function PUT(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const { watchlist_id, watched, rating, notes } = await request.json()

    if (!watchlist_id) {
      return NextResponse.json({ error: 'Watchlist ID is required' }, { status: 400 })
    }

    // Validate rating if provided
    if (rating !== undefined && (rating < 1 || rating > 5)) {
      return NextResponse.json({ error: 'Rating must be between 1 and 5' }, { status: 400 })
    }

    // Create authenticated Supabase client
    const authSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            cookie: cookieStore.toString(),
          },
        },
      }
    )

    // Get current user
    const { data: { user }, error: authError } = await authSupabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Prepare update data
    const updateData: { 
      watched?: boolean
      watched_at?: string | null
      rating?: number
      notes?: string | null
    } = {}
    
    if (watched !== undefined) {
      updateData.watched = watched
      updateData.watched_at = watched ? new Date().toISOString() : null
    }
    
    if (rating !== undefined) {
      updateData.rating = rating
    }
    
    if (notes !== undefined) {
      updateData.notes = notes
    }

    // Update the watchlist item
    const { data: updatedItem, error } = await supabase
      .from('watchlist')
      .update(updateData)
      .eq('id', watchlist_id)
      .eq('user_id', user.id) // Security: ensure user owns this item
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Watchlist item not found' }, { status: 404 })
      }
      return NextResponse.json({ error: 'Failed to update watchlist item' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: updatedItem,
      message: 'Watchlist item updated',
    })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Remove movie from watchlist
export async function DELETE(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const { searchParams } = new URL(request.url)
    const watchlist_id = searchParams.get('id')
    const movie_id = searchParams.get('movie_id')

    if (!watchlist_id && !movie_id) {
      return NextResponse.json({ 
        error: 'Either watchlist_id or movie_id is required' 
      }, { status: 400 })
    }

    // Create authenticated Supabase client
    const authSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            cookie: cookieStore.toString(),
          },
        },
      }
    )

    // Get current user
    const { data: { user }, error: authError } = await authSupabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Build delete query
    let deleteQuery = supabase
      .from('watchlist')
      .delete()
      .eq('user_id', user.id) // Security: ensure user owns this item

    if (watchlist_id) {
      deleteQuery = deleteQuery.eq('id', watchlist_id)
    } else if (movie_id) {
      deleteQuery = deleteQuery.eq('movie_id', movie_id)
    }

    const { error } = await deleteQuery

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: 'Failed to remove from watchlist' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Movie removed from watchlist',
    })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 