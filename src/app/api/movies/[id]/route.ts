import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: movieId } = await params

    if (!movieId) {
      return NextResponse.json({ error: 'Movie ID is required' }, { status: 400 })
    }

    // Fetch the movie details
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
        created_at,
        updated_at
      `
      )
      .eq('id', movieId)
      .single()

    if (error) {
      console.error('Database error:', error)
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Movie not found' }, { status: 404 })
      }
      return NextResponse.json({ error: 'Failed to fetch movie' }, { status: 500 })
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
