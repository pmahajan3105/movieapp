import { NextResponse } from 'next/server'
import { withSupabase, withError } from '@/lib/api/factory'

export const GET = withError(
  withSupabase(async ({ request, supabase }) => {
    const movieId = request.nextUrl.pathname.split('/').pop() || ''

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
  })
)
