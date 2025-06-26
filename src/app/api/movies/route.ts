import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '@/lib/api/factory'
import { getMovieService } from '@/lib/services/movie-service'
import { createServerClient } from '@/lib/supabase/server-client'

export const GET = withErrorHandling(async (request: NextRequest) => {
  const supabase = await createServerClient()
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('query')
  const limit = Math.max(1, parseInt(searchParams.get('limit') || '12') || 12)
  const page = Math.max(1, parseInt(searchParams.get('page') || '1') || 1)
  const usePreferences = searchParams.get('preferences') === 'true'

  // Validate pagination parameters
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new Error('Limit must be an integer between 1 and 100')
  }

  if (!Number.isInteger(page) || page < 1) {
    throw new Error('Page must be a positive integer')
  }

  const movieService = getMovieService()
  let result = null

  // Search Mode: If query is provided
  if (query && query.trim().length > 0) {
    if (query.trim().length < 2) {
      throw new Error('Search query must be at least 2 characters long')
    }

    const searchResult = await movieService.searchMovies(query.trim(), { limit, page })

    return NextResponse.json({
      success: true,
      data: searchResult.movies,
      pagination: {
        limit,
        page,
        query: query.trim(),
        count: searchResult.movies.length,
        totalResults: searchResult.totalResults,
        totalPages: searchResult.totalPages,
        hasMore: page < searchResult.totalPages,
      },
    })
  }

  // Browse Mode: No query provided - return popular/recommended movies
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Try preference-based recommendations if user is authenticated and preferences are requested
  if (usePreferences && user) {
    try {
      const preferencesResult = await movieService.getMoviesByPreferences(user.id, { limit, page })
      if (preferencesResult && preferencesResult.movies.length > 0) {
        result = {
          success: true,
          data: preferencesResult.movies,
          total: preferencesResult.totalResults,
          page: preferencesResult.page,
          limit,
          hasMore: preferencesResult.page * limit < preferencesResult.totalResults,
          source: preferencesResult.source,
        }
      }
    } catch (error) {
      console.warn(
        'Preference-based recommendations failed, falling back to popular movies:',
        error
      )
    }
  }

  // Fallback to popular movies if preferences fail or are not requested
  if (!result) {
    const popularResult = await movieService.getPopularMovies({ limit, page })
    result = {
      success: true,
      data: popularResult.movies,
      total: popularResult.totalResults,
      page: popularResult.page,
      limit,
      hasMore: popularResult.page * limit < popularResult.totalResults,
      source: popularResult.source,
    }
  }

  return NextResponse.json({
    success: result.success,
    data: result.data,
    total: result.total,
    pagination: {
      currentPage: result.page,
      limit: limit,
      hasMore: result.hasMore,
      totalPages: Math.ceil(result.total / limit),
    },
    source: result.source,
  })
})
