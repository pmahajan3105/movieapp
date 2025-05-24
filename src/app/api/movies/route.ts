import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20')
    const genre = searchParams.get('genre')
    const search = searchParams.get('search')

    let query = supabase.from('movies').select(`
        id,
        title,
        year,
        genre,
        director,
        plot,
        poster_url,
        rating,
        runtime,
        omdb_id,
        imdb_id,
        tmdb_id,
        created_at
      `)

    // Filter by genre if provided
    if (genre) {
      query = query.contains('genre', [genre])
    }

    // Search by title if provided
    if (search) {
      query = query.ilike('title', `%${search}%`)
    }

    // Order by rating and limit
    const { data: movies, error } = await query.order('rating', { ascending: false }).limit(limit)

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: 'Failed to fetch movies' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: movies || [],
      total: movies?.length || 0,
      filters: {
        genre,
        search,
        limit,
      },
    })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Get single movie by ID
export async function POST(request: NextRequest) {
  try {
    const { movie_id } = await request.json()

    if (!movie_id) {
      return NextResponse.json({ error: 'Movie ID is required' }, { status: 400 })
    }

    const { data: movie, error } = await supabase
      .from('movies')
      .select(
        `
        id,
        title,
        year,
        genre,
        director,
        plot,
        poster_url,
        rating,
        runtime,
        omdb_id,
        imdb_id,
        tmdb_id,
        created_at
      `
      )
      .eq('id', movie_id)
      .single()

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: 'Movie not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: movie,
    })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
