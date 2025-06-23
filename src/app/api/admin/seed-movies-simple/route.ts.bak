import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { logger } from '@/lib/logger'

export async function POST() {
  try {
    // Use the anon key first to test connection
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // Check if movies already exist
    const { data: existingMovies } = await supabase.from('movies').select('id').limit(1)

    if (existingMovies && existingMovies.length > 0) {
      return NextResponse.json({
        success: true,
        message: 'Movies already exist in database',
        skipped: true,
      })
    }

    // Simple hardcoded movies for testing
    const testMovies = [
      {
        title: 'The Shawshank Redemption',
        year: 1994,
        genre: ['Drama'],
        director: ['Frank Darabont'],
        plot: 'Two imprisoned men bond over a number of years, finding solace and eventual redemption through acts of common decency.',
        poster_url:
          'https://m.media-amazon.com/images/M/MV5BNDE3ODcxYzMtY2YzZC00NmNlLWJiNDMtZDViZWM2MzIxZDYwXkEyXkFqcGdeQXVyNjAwNDUxODI@._V1_SX300.jpg',
        rating: 9.3,
        runtime: 142,
        imdb_id: 'tt0111161',
        tmdb_id: 278,
      },
      {
        title: 'The Godfather',
        year: 1972,
        genre: ['Crime', 'Drama'],
        director: ['Francis Ford Coppola'],
        plot: 'The aging patriarch of an organized crime dynasty transfers control of his clandestine empire to his reluctant son.',
        poster_url:
          'https://m.media-amazon.com/images/M/MV5BM2MyNjYxNmUtYTAwNi00MTYxLWJmNWYtYzZlODY3ZTk3OTFlXkEyXkFqcGdeQXVyNzUwNDM@._V1_SX300.jpg',
        rating: 9.2,
        runtime: 175,
        imdb_id: 'tt0068646',
        tmdb_id: 238,
      },
      {
        title: 'The Dark Knight',
        year: 2008,
        genre: ['Action', 'Crime', 'Drama'],
        director: ['Christopher Nolan'],
        plot: 'When a menace known as the Joker emerges from his mysterious past, he wreaks havoc and chaos on the people of Gotham.',
        poster_url:
          'https://m.media-amazon.com/images/M/MV5BMTMxNTMwODM0NF5BMl5BanBnXkFtZTcwODAyMTk2Mw@@._V1_SX300.jpg',
        rating: 9.0,
        runtime: 152,
        imdb_id: 'tt0468569',
        tmdb_id: 155,
      },
      {
        title: 'Inception',
        year: 2010,
        genre: ['Action', 'Sci-Fi', 'Thriller'],
        director: ['Christopher Nolan'],
        plot: 'A thief who steals corporate secrets through dream-sharing technology is given the inverse task of planting an idea into the mind of a C.E.O.',
        poster_url:
          'https://m.media-amazon.com/images/M/MV5BMjAxMzY3NjcxNF5BMl5BanBnXkFtZTcwNTI5OTM0Mw@@._V1_SX300.jpg',
        rating: 8.8,
        runtime: 148,
        imdb_id: 'tt1375666',
        tmdb_id: 27205,
      },
      {
        title: 'Pulp Fiction',
        year: 1994,
        genre: ['Crime', 'Drama'],
        director: ['Quentin Tarantino'],
        plot: 'The lives of two mob hitmen, a boxer, a gangster and his wife intertwine in four tales of violence and redemption.',
        poster_url:
          'https://m.media-amazon.com/images/M/MV5BNGNhMDIzZTUtNTBlZi00MTRlLWFjM2ItYzViMjE3YzI5MjljXkEyXkFqcGdeQXVyNjU0OTQ0OTY@._V1_SX300.jpg',
        rating: 8.9,
        runtime: 154,
        imdb_id: 'tt0110912',
        tmdb_id: 680,
      },
    ]

    logger.info('Attempting to seed with test movies')

    const { data, error } = await supabase.from('movies').insert(testMovies).select()

    if (error) {
      logger.dbError('database-insertion', new Error(error.message), {
        errorCode: error.code,
        movieCount: testMovies.length,
      })
      return NextResponse.json({
        success: false,
        error: 'Database insertion failed',
        details: error.message,
      })
    }

    logger.info('Successfully seeded test movies', {
      seedCount: data.length,
      totalMovies: testMovies.length,
    })

    return NextResponse.json({
      success: true,
      message: `Successfully seeded ${data.length} test movies`,
      movies: data,
    })
  } catch (error) {
    logger.error('Seeding error', {
      error: error instanceof Error ? error.message : String(error),
    })
    return NextResponse.json({
      success: false,
      error: 'Failed to seed database',
      details: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}
