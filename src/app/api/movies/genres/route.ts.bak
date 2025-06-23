import { NextResponse } from 'next/server'
import { withSupabase, withError } from '@/lib/api/factory'
import { logger } from '@/lib/logger'

interface MovieWithGenre {
  genre: string[] | null
}

export const GET = withError(
  withSupabase(async ({ supabase }) => {
    logger.info('Fetching movie genres')

    // Get all movies with genres
    const { data: moviesData, error: moviesError } = await supabase
      .from('movies')
      .select('genre')
      .not('genre', 'is', null)

    if (moviesError) {
      logger.dbError('fetch-movies-for-genres', new Error(moviesError.message), {
        errorCode: moviesError.code,
      })
      return NextResponse.json({ error: 'Failed to fetch movies' }, { status: 500 })
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

    logger.info(`Genres calculated`, {
      genreCount: genres.length,
      totalMovies: moviesData?.length || 0,
    })

    return NextResponse.json({
      success: true,
      data: genres,
    })
  })
)
