import { NextResponse } from 'next/server'
import { withErrorHandling } from '@/lib/api/factory'
import { logger } from '@/lib/logger'
import { createServerClient } from '@/lib/supabase/server-client'

interface MovieWithGenre {
  genre: string[] | null
}

export const GET = withErrorHandling(async () => {
  logger.info('Fetching movie genres')
  const supabase = await createServerClient()

  // Get all movies with genres
  const { data: moviesData, error: moviesError } = await supabase
    .from('movies')
    .select('genre')
    .not('genre', 'is', null)

  if (moviesError) {
    logger.dbError('fetch-movies-for-genres', new Error(moviesError.message), {
      errorCode: moviesError.code,
    })
    throw new Error('Failed to fetch movies')
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
