import { NextRequest, NextResponse } from 'next/server'
import type { SearchFilters, SearchResponse } from '@/types/search'

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

    console.log('🔍 OMDB Search request:', filters)

    // Check if OMDB API key is configured
    const apiKey = process.env.OMDB_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'OMDB API key not configured' },
        { status: 500 }
      )
    }

    // Use query for search, or default to popular movies if no query
    const searchTerm = filters.query?.trim() || 'movie'

    // Calculate page for OMDB (OMDB uses 1-based pagination)
    const page = Math.floor((filters.offset || 0) / 10) + 1

    // Build OMDB API URL
    let omdbUrl = `http://www.omdbapi.com/?apikey=${apiKey}&s=${encodeURIComponent(searchTerm)}&type=movie&page=${page}`

    // Add year filter if specified
    if (filters.yearRange && filters.yearRange[0] === filters.yearRange[1]) {
      omdbUrl += `&y=${filters.yearRange[0]}`
    }

    console.log('🌐 Calling OMDB API:', omdbUrl.replace(apiKey, 'API_KEY'))

    // Fetch from OMDB API
    const omdbResponse = await fetch(omdbUrl)

    if (!omdbResponse.ok) {
      return NextResponse.json(
        { success: false, error: 'Failed to fetch from OMDB' },
        { status: 500 }
      )
    }

    const omdbData = await omdbResponse.json()

    // Handle OMDB API errors or no results
    if (omdbData.Response === 'False') {
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

    // Transform OMDB data to our format and get detailed info for each movie
    const moviePromises = (omdbData.Search || []).map(
      async (movie: {
        imdbID: string
        Title: string
        Year: string
        Poster: string
        Type: string
      }) => {
        // Get detailed movie info
        try {
          const detailResponse = await fetch(
            `http://www.omdbapi.com/?apikey=${apiKey}&i=${movie.imdbID}&plot=short`
          )

          if (detailResponse.ok) {
            const details = await detailResponse.json()

            if (details.Response !== 'False') {
              // Apply filters on detailed data
              const movieYear = parseInt(details.Year)
              const movieRating = parseFloat(details.imdbRating)

              // Year range filter
              if (filters.yearRange) {
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
                  details.Director?.toLowerCase().includes(director.toLowerCase())
                )
                if (!hasMatchingDirector) {
                  return null
                }
              }

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
        // OMDB already returns results by relevance
        break
    }

    // Apply pagination (client-side since we already fetched the page)
    const startIndex = (filters.offset || 0) % 10
    const paginatedMovies = sortedMovies.slice(startIndex, startIndex + (filters.limit || 20))

    const executionTime = Date.now() - startTime
    const totalResults = parseInt(omdbData.totalResults) || sortedMovies.length

    // Generate basic facets from current results
    const genreCounts: Record<string, number> = {}
    const yearCounts: Record<number, number> = {}

    sortedMovies.forEach(movie => {
      // Count genres
      movie.genre.forEach((genre: string) => {
        genreCounts[genre] = (genreCounts[genre] || 0) + 1
      })

      // Count years by decade
      if (movie.year) {
        const decade = Math.floor(movie.year / 10) * 10
        yearCounts[decade] = (yearCounts[decade] || 0) + 1
      }
    })

    const searchResponse: SearchResponse = {
      success: true,
      data: {
        movies: paginatedMovies,
        totalCount: totalResults,
        facets: {
          genres: Object.entries(genreCounts)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10),
          years: Object.entries(yearCounts)
            .map(([year, count]) => ({ year: parseInt(year), count }))
            .sort((a, b) => b.year - a.year),
          directors: [], // Could implement if needed
          ratingRanges: [],
        },
        searchMeta: {
          query: filters.query || '',
          appliedFilters: filters as Record<string, unknown>,
          resultCount: sortedMovies.length,
          executionTime,
        },
      },
    }

    console.log(`🔍 OMDB Search completed: ${paginatedMovies.length} results in ${executionTime}ms`)
    return NextResponse.json(searchResponse)
  } catch (error) {
    console.error('OMDB Search API error:', error)
    return NextResponse.json(
      { success: false, error: `Internal server error: ${error}` },
      { status: 500 }
    )
  }
}
