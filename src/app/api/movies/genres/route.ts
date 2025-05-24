import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/client'
import type { GenreOption } from '@/types/search'

interface GenresResponse {
  success: boolean
  data?: GenreOption[]
  error?: string
}

interface MovieWithGenre {
  genre: string[] | null
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(_request: NextRequest): Promise<NextResponse<GenresResponse>> {
  try {
    const supabase = await createServerClient()

    console.log('🎭 Fetching movie genres...')

    // Get all movies with genres
    const { data: moviesData, error: moviesError } = await supabase
      .from('movies')
      .select('genre')
      .not('genre', 'is', null)

    if (moviesError) {
      console.error('Genres query error:', moviesError)
      return NextResponse.json({ success: false, error: 'Failed to fetch genres' }, { status: 500 })
    }

    // Count genre occurrences
    const genreCounts: Record<string, number> = {}

    moviesData?.forEach((movie: MovieWithGenre) => {
      if (movie.genre && Array.isArray(movie.genre)) {
        movie.genre.forEach((genre: string) => {
          if (genre && genre.trim()) {
            const cleanGenre = genre.trim()
            genreCounts[cleanGenre] = (genreCounts[cleanGenre] || 0) + 1
          }
        })
      }
    })

    // Convert to array and sort by count
    const genres = Object.entries(genreCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .filter(genre => genre.count > 0) // Only include genres with movies

    console.log(`🎭 Genres calculated: ${genres.length} unique genres`)

    return NextResponse.json({
      success: true,
      data: genres,
    })
  } catch (error) {
    console.error('Genres API error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
