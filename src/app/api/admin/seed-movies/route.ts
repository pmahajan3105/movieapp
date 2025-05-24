import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const sampleMovies = [
      {
        title: 'The Shawshank Redemption',
        year: 1994,
        genre: ['Drama'],
        director: ['Frank Darabont'],
        plot: 'Two imprisoned men bond over a number of years, finding solace and eventual redemption through acts of common decency.',
        poster_url: 'https://image.tmdb.org/t/p/w500/q6y0Go1tsGEsmtFryDOJo3dEmqu.jpg',
        rating: 9.3,
        runtime: 142,
        omdb_id: 'tt0111161',
      },
      {
        title: 'The Godfather',
        year: 1972,
        genre: ['Crime', 'Drama'],
        director: ['Francis Ford Coppola'],
        plot: 'The aging patriarch of an organized crime dynasty transfers control of his clandestine empire to his reluctant son.',
        poster_url: 'https://image.tmdb.org/t/p/w500/3bhkrj58Vtu7enYsRolD1fZdja1.jpg',
        rating: 9.2,
        runtime: 175,
        omdb_id: 'tt0068646',
      },
      {
        title: 'The Dark Knight',
        year: 2008,
        genre: ['Action', 'Crime', 'Drama'],
        director: ['Christopher Nolan'],
        plot: 'When a menace known as the Joker emerges from his mysterious past, he wreaks havoc and chaos on the people of Gotham.',
        poster_url: 'https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg',
        rating: 9.0,
        runtime: 152,
        omdb_id: 'tt0468569',
      },
      {
        title: 'Pulp Fiction',
        year: 1994,
        genre: ['Crime', 'Drama'],
        director: ['Quentin Tarantino'],
        plot: 'The lives of two mob hitmen, a boxer, a gangster and his wife intertwine in four tales of violence and redemption.',
        poster_url: 'https://image.tmdb.org/t/p/w500/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg',
        rating: 8.9,
        runtime: 154,
        omdb_id: 'tt0110912',
      },
      {
        title: 'Forrest Gump',
        year: 1994,
        genre: ['Drama', 'Romance'],
        director: ['Robert Zemeckis'],
        plot: "The history of the United States from the 1950s to the '70s unfolds from the perspective of an Alabama man with an IQ of 75.",
        poster_url: 'https://image.tmdb.org/t/p/w500/arw2vcBveWOVZr6pxd9XTd1TdQa.jpg',
        rating: 8.8,
        runtime: 142,
        omdb_id: 'tt0109830',
      },
    ]

    // Use service role to bypass RLS
    const { data, error } = await supabase.from('movies').insert(sampleMovies).select()

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        {
          error: 'Failed to seed movies',
          details: error,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `Successfully seeded ${data.length} movies`,
      data: data,
    })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error,
      },
      { status: 500 }
    )
  }
}
