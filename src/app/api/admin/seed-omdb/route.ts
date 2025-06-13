import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Popular movie titles to add
const ADDITIONAL_MOVIES = [
  'Forrest Gump',
  'The Matrix',
  'Goodfellas',
  'Avatar',
  'Iron Man',
  'Avengers: Endgame',
  'Parasite',
  'Joker',
  'Spider-Man: No Way Home',
  'Top Gun: Maverick',
  'Dune',
  'The Batman',
  'Oppenheimer',
  'Barbie',
  'Everything Everywhere All at Once',
  'John Wick',
  'Blade Runner 2049',
  'Interstellar',
  'Mad Max: Fury Road',
  'Guardians of the Galaxy',
]

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
  Error?: string
}

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

function transformOMDBToMovie(omdbData: OMDBMovieResponse) {
  const genres = omdbData.Genre ? omdbData.Genre.split(', ').map((g: string) => g.trim()) : []
  const directors = omdbData.Director
    ? omdbData.Director.split(', ').map((d: string) => d.trim())
    : []

  let runtime = 0
  if (omdbData.Runtime && omdbData.Runtime !== 'N/A') {
    const match = omdbData.Runtime.match(/(\d+)/)
    if (match) {
      runtime = match[1] ? parseInt(match[1]) : 0
    }
  }

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
    console.log('Starting OMDB movie seeding...')

    const movies = []
    let successCount = 0
    let errorCount = 0
    let skippedCount = 0

    // Fetch movies from OMDB
    for (let i = 0; i < ADDITIONAL_MOVIES.length; i++) {
      const title = ADDITIONAL_MOVIES[i]

      try {
        console.log(`Fetching: ${title} (${i + 1}/${ADDITIONAL_MOVIES.length})`)

        // Check if movie already exists
        const { data: existing } = await supabase
          .from('movies')
          .select('id')
          .ilike('title', `%${title}%`)
          .limit(1)

        if (existing && existing.length > 0) {
          console.log(`Skipping ${title} - already exists`)
          skippedCount++
          continue
        }

        const omdbData = title ? await fetchMovieFromOMDB(title) : null

        if (omdbData) {
          const movie = transformOMDBToMovie(omdbData)
          movies.push(movie)
          successCount++
        } else {
          errorCount++
        }

        // Add delay to respect OMDB rate limits
        if (i < ADDITIONAL_MOVIES.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 200))
        }
      } catch (error) {
        console.error(`Error fetching ${title}:`, error)
        errorCount++
      }
    }

    console.log(`Fetched ${movies.length} new movies from OMDB`)

    if (movies.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No new movies to add',
        inserted: 0,
        successful_fetches: successCount,
        failed_fetches: errorCount,
        skipped: skippedCount,
        total_attempted: ADDITIONAL_MOVIES.length,
      })
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
      skipped: skippedCount,
      total_attempted: ADDITIONAL_MOVIES.length,
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
