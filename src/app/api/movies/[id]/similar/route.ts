import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const movieId = params.id
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '6')

    if (!movieId) {
      return NextResponse.json({ error: 'Movie ID is required' }, { status: 400 })
    }

    // First, get the current movie details
    const { data: currentMovie, error: currentMovieError } = await supabase
      .from('movies')
      .select('genre, director, year')
      .eq('id', movieId)
      .single()

    if (currentMovieError) {
      console.error('Error fetching current movie:', currentMovieError)
      return NextResponse.json({ error: 'Movie not found' }, { status: 404 })
    }

    // Find similar movies based on:
    // 1. Shared genres (highest priority)
    // 2. Same director (medium priority) 
    // 3. Similar year range (lowest priority)
    let query = supabase
      .from('movies')
      .select(`
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
      `)
      .neq('id', movieId) // Exclude the current movie

    // Find movies with overlapping genres
    if (currentMovie.genre && currentMovie.genre.length > 0) {
      query = query.overlaps('genre', currentMovie.genre)
    }

    const { data: similarMovies, error } = await query
      .order('rating', { ascending: false })
      .limit(limit * 2) // Get more to allow for filtering

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: 'Failed to fetch similar movies' }, { status: 500 })
    }

    // Score and sort the movies based on similarity
    const scoredMovies = (similarMovies || []).map(movie => {
      let score = 0
      
      // Genre matching (0-3 points)
      if (movie.genre && currentMovie.genre) {
        const sharedGenres = movie.genre.filter((g: string) => currentMovie.genre.includes(g))
        score += sharedGenres.length
      }
      
      // Director matching (2 points)
      if (movie.director && currentMovie.director) {
        const sharedDirectors = movie.director.filter((d: string) => currentMovie.director.includes(d))
        if (sharedDirectors.length > 0) score += 2
      }
      
      // Year proximity (0-1 points)
      if (movie.year && currentMovie.year) {
        const yearDiff = Math.abs(movie.year - currentMovie.year)
        if (yearDiff <= 5) score += 1
        else if (yearDiff <= 10) score += 0.5
      }
      
      // Rating bonus (higher rated movies get slight boost)
      if (movie.rating) {
        score += movie.rating / 10
      }

      return { ...movie, similarity_score: score }
    })

    // Sort by similarity score and take the top results
    const topSimilar = scoredMovies
      .sort((a, b) => b.similarity_score - a.similarity_score)
      .slice(0, limit)
      .map(movie => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { similarity_score, ...movieWithoutScore } = movie
        return movieWithoutScore
      }) // Remove the score from response

    return NextResponse.json({
      success: true,
      data: topSimilar,
      total: topSimilar.length,
      movie_id: movieId,
    })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 