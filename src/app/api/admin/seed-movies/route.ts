import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Type definitions for OMDB API response
interface OMDBMovieResponse {
  Title: string
  Year: string
  Genre: string
  Director: string
  Plot: string
  Poster: string
  imdbRating: string
  Runtime: string
  imdbID: string
  Response: string
}

// Type for our movie database record
interface MovieRecord {
  title: string
  year: number | null
  genre: string[]
  director: string[]
  plot: string | null
  poster_url: string | null
  rating: number
  runtime: number
  omdb_id: string
  imdb_id: string
}

// Popular movie titles to seed from OMDB
const POPULAR_MOVIES = [
  // Classic Films
  'The Shawshank Redemption',
  'The Godfather',
  'The Dark Knight',
  'Pulp Fiction',
  'Forrest Gump',
  'Inception',
  'The Matrix',
  'Goodfellas',
  'The Godfather Part II',
  'The Lord of the Rings: The Return of the King',

  // Modern Hits
  'Parasite',
  'Avengers: Endgame',
  'Spider-Man: No Way Home',
  'Top Gun: Maverick',
  'Dune',
  'The Batman',
  'Everything Everywhere All at Once',
  'Oppenheimer',
  'Barbie',
  'John Wick',

  // Sci-Fi & Fantasy
  'Star Wars',
  'Blade Runner 2049',
  'Interstellar',
  'Mad Max: Fury Road',
  'The Lord of the Rings: The Fellowship of the Ring',
  "Harry Potter and the Philosopher's Stone",
  'Guardians of the Galaxy',
  'Avatar',
  'Iron Man',
  'Thor: Ragnarok',

  // Drama & Thriller
  'Joker',
  'Once Upon a Time in Hollywood',
  'The Departed',
  'No Country for Old Men',
  'There Will Be Blood',
  'Whiplash',
  'La La Land',
  'The Social Network',
  'Gone Girl',
  'Zodiac',

  // Comedy & Animation
  'The Grand Budapest Hotel',
  'Knives Out',
  'Toy Story',
  'Finding Nemo',
  'The Incredibles',
  'Spider-Man: Into the Spider-Verse',
  'Soul',
  'WALL-E',
  'Up',
  'Inside Out',

  // Action & Adventure
  'Casino Royale',
  'Mission: Impossible - Fallout',
  'The Bourne Identity',
  'Heat',
  'Terminator 2: Judgment Day',
  'Aliens',
  'Die Hard',
  'Seven',
  'Fight Club',
  'The Prestige',
]

async function fetchMovieFromOMDB(title: string): Promise<OMDBMovieResponse | null> {
  const OMDB_API_KEY = process.env.OMDB_API_KEY

  if (!OMDB_API_KEY) {
    throw new Error('OMDB_API_KEY is not configured')
  }

  const response = await fetch(
    `http://www.omdbapi.com/?t=${encodeURIComponent(title)}&apikey=${OMDB_API_KEY}&plot=short`
  )

  if (!response.ok) {
    throw new Error(`OMDB API error: ${response.status}`)
  }

  const data = await response.json()

  if (data.Response === 'False') {
    console.warn(`Movie not found: ${title}`)
    return null
  }

  return data
}

function transformOMDBToMovie(omdbData: OMDBMovieResponse): MovieRecord {
  // Clean up the genre array
  const genres = omdbData.Genre ? omdbData.Genre.split(', ').map((g: string) => g.trim()) : []

  // Clean up director array
  const directors = omdbData.Director
    ? omdbData.Director.split(', ').map((d: string) => d.trim())
    : []

  // Convert runtime to minutes
  let runtime = 0
  if (omdbData.Runtime && omdbData.Runtime !== 'N/A') {
    const match = omdbData.Runtime.match(/(\d+)/)
    if (match) {
      runtime = match[1] ? parseInt(match[1]) : 0
    }
  }

  // Convert rating to decimal
  let rating = 0
  if (omdbData.imdbRating && omdbData.imdbRating !== 'N/A') {
    rating = parseFloat(omdbData.imdbRating)
  }

  return {
    title: omdbData.Title,
    year: omdbData.Year && omdbData.Year !== 'N/A' ? parseInt(omdbData.Year) : null,
    genre: genres,
    director: directors,
    plot: omdbData.Plot && omdbData.Plot !== 'N/A' ? omdbData.Plot : null,
    poster_url: omdbData.Poster && omdbData.Poster !== 'N/A' ? omdbData.Poster : null,
    rating: rating,
    runtime: runtime,
    omdb_id: omdbData.imdbID,
    imdb_id: omdbData.imdbID,
  }
}

export async function POST() {
  try {
    // Check if movies already exist
    const { data: existingMovies, error: checkError } = await supabase
      .from('movies')
      .select('id')
      .limit(1)

    if (checkError) {
      console.error('Database check error:', checkError)
      return NextResponse.json(
        {
          error: 'Failed to check existing movies',
          details: checkError,
        },
        { status: 500 }
      )
    }

    if (existingMovies && existingMovies.length > 0) {
      return NextResponse.json({
        success: true,
        message: 'Movies already exist in database',
        count: existingMovies.length,
      })
    }

    console.log('Starting movie seeding from OMDB...')

    const movies = []
    let successCount = 0
    let errorCount = 0

    // Fetch movies from OMDB with delay to respect rate limits
    for (let i = 0; i < POPULAR_MOVIES.length; i++) {
      const title = POPULAR_MOVIES[i]

      try {
        console.log(`Fetching: ${title} (${i + 1}/${POPULAR_MOVIES.length})`)

        const omdbData = title ? await fetchMovieFromOMDB(title) : null

        if (omdbData) {
          const movie = transformOMDBToMovie(omdbData)
          movies.push(movie)
          successCount++
        } else {
          errorCount++
        }

        // Add delay to respect OMDB rate limits (1000 requests per day)
        if (i < POPULAR_MOVIES.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }
      } catch (error) {
        console.error(`Error fetching ${title}:`, error)
        errorCount++
      }
    }

    console.log(`Fetched ${movies.length} movies from OMDB`)

    if (movies.length === 0) {
      return NextResponse.json(
        {
          error: 'No movies could be fetched from OMDB',
          details: 'Check OMDB API key and connection',
        },
        { status: 500 }
      )
    }

    // Insert movies into database
    const { data, error } = await supabase.from('movies').insert(movies).select()

    if (error) {
      console.error('Database insertion error:', error)
      return NextResponse.json(
        {
          error: 'Failed to insert movies into database',
          details: error,
        },
        { status: 500 }
      )
    }

    console.log(`Successfully seeded ${data.length} movies`)

    return NextResponse.json({
      success: true,
      message: `Successfully seeded ${data.length} movies from OMDB`,
      inserted: data.length,
      successful_fetches: successCount,
      failed_fetches: errorCount,
      total_attempted: POPULAR_MOVIES.length,
    })
  } catch (error) {
    console.error('Seeding error:', error)
    return NextResponse.json(
      {
        error: 'Failed to seed movies',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
