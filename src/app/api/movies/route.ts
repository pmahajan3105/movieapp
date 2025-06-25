import { NextRequest, NextResponse } from 'next/server'
import { movieService } from '@/lib/services/movie-service'

export async function GET(request: NextRequest) {
  try {
    // Input validation with detailed error messages
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('query')
    const limit = parseInt(searchParams.get('limit') || '20')
    const page = Math.max(1, parseInt(searchParams.get('page') || '1') || 1)

    // Enhanced validation with specific error messages
    if (!query || query.trim().length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Search query is required and cannot be empty',
          error_code: 'VALIDATION_ERROR',
        },
        { status: 400 }
      )
    }

    if (query.trim().length < 2) {
      return NextResponse.json(
        {
          success: false,
          error: 'Search query must be at least 2 characters long',
          error_code: 'VALIDATION_ERROR',
        },
        { status: 400 }
      )
    }

    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      return NextResponse.json(
        {
          success: false,
          error: 'Limit must be an integer between 1 and 100',
          error_code: 'VALIDATION_ERROR',
        },
        { status: 400 }
      )
    }

    if (!Number.isInteger(page) || page < 1) {
      return NextResponse.json(
        {
          success: false,
          error: 'Page must be a positive integer',
          error_code: 'VALIDATION_ERROR',
        },
        { status: 400 }
      )
    }

    try {
      // Search for movies using the movie service
      const result = await movieService.searchMovies(query.trim(), { limit, page })

      return NextResponse.json({
        success: true,
        data: result.movies,
        pagination: {
          limit,
          page,
          query: query.trim(),
          count: result.movies.length,
          totalResults: result.totalResults,
          totalPages: result.totalPages,
          hasMore: page < result.totalPages,
        },
      })
    } catch (serviceError) {
      console.error('Movie service error:', serviceError)

      // Check for rate limiting from external APIs
      if (serviceError instanceof Error && serviceError.message.includes('rate limit')) {
        return NextResponse.json(
          {
            success: false,
            error:
              'Movie search service is temporarily rate limited. Please try again in a moment.',
            error_code: 'RATE_LIMIT_ERROR',
          },
          { status: 429 }
        )
      }

      // Check for service availability
      if (
        serviceError instanceof Error &&
        (serviceError.message.includes('timeout') || serviceError.message.includes('ECONNREFUSED'))
      ) {
        return NextResponse.json(
          {
            success: false,
            error: 'Movie search service is temporarily unavailable. Please try again later.',
            error_code: 'SERVICE_UNAVAILABLE',
          },
          { status: 503 }
        )
      }

      throw serviceError // Re-throw if it's not a handled error type
    }
  } catch (error) {
    console.error('GET /api/movies error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error occurred while searching movies',
        error_code: 'INTERNAL_ERROR',
      },
      { status: 500 }
    )
  }
}
