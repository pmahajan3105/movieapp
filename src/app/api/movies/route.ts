import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20')

    // Check if OMDB API key is configured
    const apiKey = process.env.OMDB_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'OMDB API key not configured' }, { status: 500 })
    }

    // Use popular search terms for dashboard recommendations
    const popularSearchTerms = [
      'avengers',
      'batman',
      'spider',
      'star wars',
      'marvel',
      'action',
      'comedy',
      'drama',
      'thriller',
      'adventure',
    ]

    // Pick a random search term for variety
    const searchTerm = popularSearchTerms[Math.floor(Math.random() * popularSearchTerms.length)]

    // Build OMDB API URL
    const omdbUrl = `http://www.omdbapi.com/?apikey=${apiKey}&s=${encodeURIComponent(searchTerm)}&type=movie&page=1`

    console.log('🎬 Fetching popular movies from OMDB with term:', searchTerm)

    // Fetch from OMDB API
    const response = await fetch(omdbUrl)

    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch movies' }, { status: 500 })
    }

    const omdbData = await response.json()

    // Handle OMDB API errors
    if (omdbData.Response === 'False') {
      return NextResponse.json({
        success: true,
        data: [],
        total: 0,
      })
    }

    // Get detailed info for each movie (limited to requested amount)
    const moviePromises = (omdbData.Search || [])
      .slice(0, limit)
      .map(
        async (movie: {
          imdbID: string
          Title: string
          Year: string
          Poster: string
          Type: string
        }) => {
          try {
            // Get detailed movie info
            const detailResponse = await fetch(
              `http://www.omdbapi.com/?apikey=${apiKey}&i=${movie.imdbID}&plot=short`
            )

            if (detailResponse.ok) {
              const details = await detailResponse.json()

              if (details.Response !== 'False') {
                // Transform to our format
                return {
                  id: details.imdbID,
                  title: details.Title,
                  year: parseInt(details.Year) || null,
                  genre: details.Genre ? details.Genre.split(', ') : [],
                  director: details.Director ? details.Director.split(', ') : [],
                  plot: details.Plot !== 'N/A' ? details.Plot : '',
                  poster_url: details.Poster !== 'N/A' ? details.Poster : null,
                  rating: parseFloat(details.imdbRating) || null,
                  runtime: details.Runtime ? parseInt(details.Runtime.replace(' min', '')) : null,
                  imdb_id: details.imdbID,
                  created_at: new Date().toISOString(), // Add required field for Movie type
                }
              }
            }
          } catch (error) {
            console.error('Error fetching movie details:', error)
          }

          // Fallback to basic info if detailed fetch fails
          return {
            id: movie.imdbID,
            title: movie.Title,
            year: parseInt(movie.Year) || null,
            genre: [],
            director: [],
            plot: '',
            poster_url: movie.Poster !== 'N/A' ? movie.Poster : null,
            rating: null,
            runtime: null,
            imdb_id: movie.imdbID,
            created_at: new Date().toISOString(),
          }
        }
      )

    // Wait for all movie details
    const movies = await Promise.all(moviePromises)

    // Filter out any failed fetches and sort by rating (highest first)
    const validMovies = movies
      .filter(movie => movie !== null)
      .sort((a, b) => (b.rating || 0) - (a.rating || 0))

    return NextResponse.json({
      success: true,
      data: validMovies,
      total: validMovies.length,
    })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
