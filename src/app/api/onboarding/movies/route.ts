import { NextResponse } from 'next/server'
import { ConfigService } from '@/lib/config/config-service'
import { logger } from '@/lib/logger'

// Curated list of popular, recognizable movies for taste onboarding
// These are TMDB IDs of well-known movies across different genres
const ONBOARDING_MOVIES = [
  // Action
  { tmdb_id: 155, title: 'The Dark Knight', year: 2008, genres: ['Action', 'Crime', 'Drama'] },
  { tmdb_id: 27205, title: 'Inception', year: 2010, genres: ['Action', 'Science Fiction', 'Adventure'] },
  { tmdb_id: 603, title: 'The Matrix', year: 1999, genres: ['Action', 'Science Fiction'] },
  { tmdb_id: 245891, title: 'John Wick', year: 2014, genres: ['Action', 'Thriller'] },
  { tmdb_id: 76341, title: 'Mad Max: Fury Road', year: 2015, genres: ['Action', 'Adventure', 'Science Fiction'] },
  { tmdb_id: 299536, title: 'Avengers: Infinity War', year: 2018, genres: ['Action', 'Adventure', 'Science Fiction'] },

  // Comedy
  { tmdb_id: 18785, title: 'The Hangover', year: 2009, genres: ['Comedy'] },
  { tmdb_id: 8363, title: 'Superbad', year: 2007, genres: ['Comedy'] },
  { tmdb_id: 120467, title: 'The Grand Budapest Hotel', year: 2014, genres: ['Comedy', 'Drama'] },
  { tmdb_id: 284053, title: 'Thor: Ragnarok', year: 2017, genres: ['Action', 'Adventure', 'Comedy'] },
  { tmdb_id: 425, title: 'Mean Girls', year: 2004, genres: ['Comedy'] },

  // Drama
  { tmdb_id: 278, title: 'The Shawshank Redemption', year: 1994, genres: ['Drama', 'Crime'] },
  { tmdb_id: 13, title: 'Forrest Gump', year: 1994, genres: ['Drama', 'Romance'] },
  { tmdb_id: 496243, title: 'Parasite', year: 2019, genres: ['Comedy', 'Thriller', 'Drama'] },
  { tmdb_id: 240, title: 'The Godfather', year: 1972, genres: ['Drama', 'Crime'] },
  { tmdb_id: 11216, title: 'Cinema Paradiso', year: 1988, genres: ['Drama', 'Romance'] },
  { tmdb_id: 550, title: 'Fight Club', year: 1999, genres: ['Drama'] },

  // Sci-Fi
  { tmdb_id: 157336, title: 'Interstellar', year: 2014, genres: ['Adventure', 'Drama', 'Science Fiction'] },
  { tmdb_id: 335984, title: 'Blade Runner 2049', year: 2017, genres: ['Science Fiction', 'Drama'] },
  { tmdb_id: 264660, title: 'Ex Machina', year: 2014, genres: ['Drama', 'Science Fiction'] },
  { tmdb_id: 329, title: 'Jurassic Park', year: 1993, genres: ['Adventure', 'Science Fiction'] },
  { tmdb_id: 140607, title: 'Star Wars: The Force Awakens', year: 2015, genres: ['Action', 'Adventure', 'Science Fiction'] },

  // Horror/Thriller
  { tmdb_id: 419430, title: 'Get Out', year: 2017, genres: ['Horror', 'Mystery', 'Thriller'] },
  { tmdb_id: 138843, title: 'The Conjuring', year: 2013, genres: ['Horror', 'Thriller'] },
  { tmdb_id: 447332, title: 'A Quiet Place', year: 2018, genres: ['Horror', 'Drama', 'Science Fiction'] },
  { tmdb_id: 807, title: 'Se7en', year: 1995, genres: ['Crime', 'Mystery', 'Thriller'] },
  { tmdb_id: 210577, title: 'Gone Girl', year: 2014, genres: ['Mystery', 'Thriller', 'Drama'] },

  // Romance
  { tmdb_id: 11036, title: 'The Notebook', year: 2004, genres: ['Romance', 'Drama'] },
  { tmdb_id: 313369, title: 'La La Land', year: 2016, genres: ['Comedy', 'Drama', 'Romance', 'Music'] },
  { tmdb_id: 455207, title: 'Crazy Rich Asians', year: 2018, genres: ['Comedy', 'Drama', 'Romance'] },
  { tmdb_id: 508947, title: 'Turning Red', year: 2022, genres: ['Animation', 'Family', 'Comedy', 'Fantasy'] },

  // Animation
  { tmdb_id: 862, title: 'Toy Story', year: 1995, genres: ['Animation', 'Adventure', 'Family', 'Comedy'] },
  { tmdb_id: 324857, title: 'Spider-Man: Into the Spider-Verse', year: 2018, genres: ['Action', 'Adventure', 'Animation', 'Science Fiction'] },
  { tmdb_id: 129, title: 'Spirited Away', year: 2001, genres: ['Animation', 'Family', 'Fantasy'] },
  { tmdb_id: 372058, title: 'Your Name', year: 2016, genres: ['Animation', 'Romance', 'Drama'] },
  { tmdb_id: 508442, title: 'Soul', year: 2020, genres: ['Animation', 'Comedy', 'Drama', 'Music', 'Fantasy'] },

  // Classic/Older
  { tmdb_id: 389, title: 'E.T. the Extra-Terrestrial', year: 1982, genres: ['Science Fiction', 'Adventure', 'Family', 'Fantasy'] },
  { tmdb_id: 620, title: 'Ghostbusters', year: 1984, genres: ['Comedy', 'Fantasy'] },
  { tmdb_id: 105, title: 'Back to the Future', year: 1985, genres: ['Adventure', 'Comedy', 'Science Fiction'] },
  { tmdb_id: 597, title: 'Titanic', year: 1997, genres: ['Drama', 'Romance'] },
  { tmdb_id: 122, title: "The Lord of the Rings: The Return of the King", year: 2003, genres: ['Adventure', 'Fantasy', 'Action'] },
]

/**
 * GET /api/onboarding/movies
 * Get curated movies for taste onboarding
 */
export async function GET() {
  try {
    const apiKeys = ConfigService.getApiKeys()

    // If TMDB key is available, fetch poster URLs
    let moviesWithPosters = ONBOARDING_MOVIES

    if (apiKeys.tmdb) {
      // Fetch poster URLs from TMDB in batches
      const moviesWithPosterPromises = ONBOARDING_MOVIES.map(async (movie) => {
        try {
          const response = await fetch(
            `https://api.themoviedb.org/3/movie/${movie.tmdb_id}?api_key=${apiKeys.tmdb}`
          )
          if (response.ok) {
            const data = await response.json()
            return {
              ...movie,
              poster_url: data.poster_path
                ? `https://image.tmdb.org/t/p/w342${data.poster_path}`
                : null,
              backdrop_url: data.backdrop_path
                ? `https://image.tmdb.org/t/p/w780${data.backdrop_path}`
                : null,
              rating: data.vote_average,
            }
          }
        } catch (error) {
          // Silently fail for individual movies
        }
        return movie
      })

      moviesWithPosters = await Promise.all(moviesWithPosterPromises)
    }

    // Shuffle the movies for variety
    const shuffled = [...moviesWithPosters].sort(() => Math.random() - 0.5)

    return NextResponse.json({
      success: true,
      movies: shuffled,
      total: shuffled.length,
      minRequired: 10,
    })
  } catch (error) {
    logger.error('Failed to get onboarding movies', {
      error: error instanceof Error ? error.message : String(error),
    })

    // Return basic list without posters as fallback
    return NextResponse.json({
      success: true,
      movies: ONBOARDING_MOVIES,
      total: ONBOARDING_MOVIES.length,
      minRequired: 10,
    })
  }
}
