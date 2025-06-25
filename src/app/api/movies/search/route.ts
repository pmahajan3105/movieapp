import { NextRequest, NextResponse } from 'next/server'
import type { SearchFilters, SearchResponse } from '@/types/search'
import { logger } from '@/lib/logger'

export async function GET(request: NextRequest): Promise<NextResponse<SearchResponse>> {
  const startTime = Date.now()

  try {
    const { searchParams } = new URL(request.url)

    // Parse search parameters
    const filters: SearchFilters = {
      query: searchParams.get('query') || undefined,
      genres: searchParams.get('genres')?.split(',').filter(Boolean) || undefined,
      yearRange: searchParams.get('yearRange')
        ? JSON.parse(searchParams.get('yearRange')!)
        : undefined,
      minRating: searchParams.get('minRating')
        ? parseFloat(searchParams.get('minRating')!)
        : undefined,
      maxRating: searchParams.get('maxRating')
        ? parseFloat(searchParams.get('maxRating')!)
        : undefined,
      directors: searchParams.get('directors')?.split(',').filter(Boolean) || undefined,
      actors: searchParams.get('actors')?.split(',').filter(Boolean) || undefined,
      limit: parseInt(searchParams.get('limit') || '20'),
      offset: parseInt(searchParams.get('offset') || '0'),
      sortBy: (searchParams.get('sortBy') as SearchFilters['sortBy']) || 'relevance',
      sortOrder: (searchParams.get('sortOrder') as SearchFilters['sortOrder']) || 'desc',
    }

    logger.info('TMDB search request received', {
      query: filters.query,
      genres: filters.genres,
      yearRange: filters.yearRange,
      limit: filters.limit,
      offset: filters.offset,
      sortBy: filters.sortBy,
    })

    // Validate search parameters
    if (filters.limit && (filters.limit < 1 || filters.limit > 100)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid limit parameter. Must be between 1 and 100.',
          code: 'VALIDATION_ERROR',
        },
        { status: 400 }
      )
    }

    if (filters.offset && filters.offset < 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid offset parameter. Must be 0 or greater.',
          code: 'VALIDATION_ERROR',
        },
        { status: 400 }
      )
    }

    if (filters.query && filters.query.length < 2) {
      return NextResponse.json(
        {
          success: false,
          error: 'Search query must be at least 2 characters long.',
          code: 'VALIDATION_ERROR',
        },
        { status: 400 }
      )
    }

    // Check if TMDB API key is configured
    const apiKey = process.env.TMDB_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          error: 'Movie database service is temporarily unavailable. Please try again later.',
          code: 'SERVICE_UNAVAILABLE',
        },
        { status: 503 }
      )
    }

    // Use query for search, or default to popular movies if no query
    const searchTerm = filters.query?.trim() || 'movie'

    // Calculate page for TMDB (TMDB uses 1-based pagination)
    const page = Math.floor((filters.offset || 0) / 20) + 1

    // Build TMDB API URL
    let tmdbUrl = `https://api.themoviedb.org/3/search/movie?api_key=${apiKey}&query=${encodeURIComponent(searchTerm)}&page=${page}`

    // Add year filter if specified
    if (filters.yearRange && filters.yearRange[0] === filters.yearRange[1]) {
      tmdbUrl += `&year=${filters.yearRange[0]}`
    }

    logger.info('Calling TMDB API', {
      searchTerm,
      page,
      hasYearFilter: !!(filters.yearRange && filters.yearRange[0] === filters.yearRange[1]),
    })

    // Fetch from TMDB API
    const tmdbResponse = await fetch(tmdbUrl)

    if (!tmdbResponse.ok) {
      const errorMessage =
        tmdbResponse.status === 429
          ? 'Too many search requests. Please wait a moment and try again.'
          : tmdbResponse.status === 404
            ? 'No movies found matching your search criteria.'
            : 'Movie database service is temporarily unavailable. Please try again later.'

      return NextResponse.json(
        {
          success: false,
          error: errorMessage,
          code: tmdbResponse.status === 429 ? 'RATE_LIMIT_ERROR' : 'SERVICE_ERROR',
        },
        { status: tmdbResponse.status >= 500 ? 503 : tmdbResponse.status }
      )
    }

    const tmdbData = await tmdbResponse.json()

    // Handle TMDB API errors or no results
    if (!tmdbData.results || tmdbData.results.length === 0) {
      const executionTime = Date.now() - startTime

      return NextResponse.json({
        success: true,
        data: {
          movies: [],
          totalCount: 0,
          facets: {
            genres: [],
            years: [],
            directors: [],
            ratingRanges: [],
          },
          searchMeta: {
            query: filters.query || '',
            appliedFilters: filters as Record<string, unknown>,
            resultCount: 0,
            executionTime,
          },
        },
      })
    }

    // Transform TMDB data to our format and get detailed info for each movie
    const moviePromises = (tmdbData.results || []).map(
      async (movie: {
        id: number
        title: string
        release_date: string
        poster_path: string | null
        overview: string
        vote_average: number
        genre_ids: number[]
      }) => {
        // Get detailed movie info including credits
        try {
          const detailResponse = await fetch(
            `https://api.themoviedb.org/3/movie/${movie.id}?api_key=${apiKey}&append_to_response=credits`
          )

          if (detailResponse.ok) {
            const details = await detailResponse.json()

            // Extract director from credits
            const directors =
              details.credits?.crew
                ?.filter((member: { job: string; name: string }) => member.job === 'Director')
                ?.map((director: { name: string }) => director.name) || []

            // Extract genres
            const genres = details.genres?.map((g: { name: string }) => g.name) || []

            const movieYear = details.release_date
              ? new Date(details.release_date).getFullYear()
              : null
            const movieRating = details.vote_average || 0

            // Apply filters on detailed data
            // Year range filter
            if (filters.yearRange && movieYear) {
              if (movieYear < filters.yearRange[0] || movieYear > filters.yearRange[1]) {
                return null
              }
            }

            // Rating filter
            if (filters.minRating && movieRating < filters.minRating) {
              return null
            }
            if (filters.maxRating && movieRating > filters.maxRating) {
              return null
            }

            // Director filter
            if (filters.directors && filters.directors.length > 0) {
              const hasMatchingDirector = filters.directors.some(director =>
                directors.some((d: string) => d.toLowerCase().includes(director.toLowerCase()))
              )
              if (!hasMatchingDirector) {
                return null
              }
            }

            // Genre filter
            if (filters.genres && filters.genres.length > 0) {
              const hasMatchingGenre = filters.genres.some(genre =>
                genres.some((g: string) => g.toLowerCase().includes(genre.toLowerCase()))
              )
              if (!hasMatchingGenre) {
                return null
              }
            }

            // Transform to our format with tmdb_ prefix for consistent ID format
            return {
              id: `tmdb_${details.id}`,
              title: details.title,
              year: movieYear,
              genre: genres,
              director: directors,
              plot: details.overview || '',
              poster_url: details.poster_path
                ? `https://image.tmdb.org/t/p/w500${details.poster_path}`
                : null,
              rating: details.vote_average || null,
              runtime: details.runtime || null,
              imdb_id: details.imdb_id || null,
              tmdb_id: details.id,
            }
          }
        } catch (error) {
          logger.error('Error fetching movie details from TMDB', {
            movieId: movie.id,
            movieTitle: movie.title,
            error: error instanceof Error ? error.message : String(error),
          })
        }

        // Fallback to basic info if detailed fetch fails
        const movieYear = movie.release_date ? new Date(movie.release_date).getFullYear() : null
        return {
          id: `tmdb_${movie.id}`,
          title: movie.title,
          year: movieYear,
          genre: [],
          director: [],
          plot: movie.overview || '',
          poster_url: movie.poster_path
            ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
            : null,
          rating: movie.vote_average || null,
          runtime: null,
          imdb_id: null,
          tmdb_id: movie.id,
        }
      }
    )

    // Wait for all movie details and filter out nulls
    const allMovies = await Promise.all(moviePromises)
    const filteredMovies = allMovies.filter(movie => movie !== null)

    // Apply sorting
    const sortedMovies = [...filteredMovies]
    switch (filters.sortBy) {
      case 'title':
        sortedMovies.sort((a, b) => {
          const comparison = a.title.localeCompare(b.title)
          return filters.sortOrder === 'asc' ? comparison : -comparison
        })
        break
      case 'year':
        sortedMovies.sort((a, b) => {
          const comparison = (a.year || 0) - (b.year || 0)
          return filters.sortOrder === 'asc' ? comparison : -comparison
        })
        break
      case 'rating':
        sortedMovies.sort((a, b) => {
          const comparison = (a.rating || 0) - (b.rating || 0)
          return filters.sortOrder === 'asc' ? comparison : -comparison
        })
        break
      case 'relevance':
      default:
        // TMDB returns results in relevance order by default
        break
    }

    // Apply limit and offset
    const paginatedMovies = sortedMovies.slice(0, filters.limit)

    // Calculate facets for filtering
    const allGenres = [...new Set(filteredMovies.flatMap(movie => movie.genre))]
    const allYears = [...new Set(filteredMovies.map(movie => movie.year).filter(Boolean))]
    const allDirectors = [...new Set(filteredMovies.flatMap(movie => movie.director))]

    const executionTime = Date.now() - startTime

    logger.info('TMDB search completed', {
      resultCount: paginatedMovies.length,
      totalResults: tmdbData.total_results,
      executionTime,
      facetCounts: {
        genres: allGenres.length,
        years: allYears.length,
        directors: allDirectors.length,
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        movies: paginatedMovies,
        totalCount: tmdbData.total_results || filteredMovies.length,
        facets: {
          genres: allGenres.slice(0, 20), // Limit facets for performance
          years: allYears.sort((a, b) => b - a).slice(0, 20),
          directors: allDirectors.slice(0, 20),
          ratingRanges: [
            { range: '0-3', count: filteredMovies.filter(m => (m.rating || 0) <= 3).length },
            {
              range: '3-6',
              count: filteredMovies.filter(m => (m.rating || 0) > 3 && (m.rating || 0) <= 6).length,
            },
            {
              range: '6-8',
              count: filteredMovies.filter(m => (m.rating || 0) > 6 && (m.rating || 0) <= 8).length,
            },
            { range: '8-10', count: filteredMovies.filter(m => (m.rating || 0) > 8).length },
          ],
        },
        searchMeta: {
          query: filters.query || '',
          appliedFilters: filters as Record<string, unknown>,
          resultCount: paginatedMovies.length,
          executionTime,
        },
      },
    })
  } catch (error) {
    logger.error('Search API error', {
      error: error instanceof Error ? error.message : String(error),
    })
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
