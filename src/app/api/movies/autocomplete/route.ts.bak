import { NextResponse } from 'next/server'
import type { AutocompleteResponse } from '@/types/search'
import { withSupabase, withError } from '@/lib/api/factory'
import { logger } from '@/lib/logger'

export const GET = withError(
  withSupabase(async ({ request, supabase }) => {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('query')
    const limit = parseInt(searchParams.get('limit') || '5')

    if (!query || query.trim().length < 2) {
      return NextResponse.json({
        success: true,
        data: [],
        message: 'Query too short',
      })
    }

    const searchQuery = query.trim()
    logger.info('Autocomplete request', {
      query: searchQuery,
      limit,
    })

    try {
      // Get movie title suggestions
      const { data: movieSuggestions, error: movieError } = await supabase
        .from('movies')
        .select('id, title, year, poster_url')
        .ilike('title', `%${searchQuery}%`)
        .order('rating', { ascending: false, nullsFirst: false })
        .limit(limit)

      if (movieError) {
        logger.dbError('movie-autocomplete', new Error(movieError.message), {
          query: searchQuery,
          errorCode: movieError.code,
        })
        return NextResponse.json(
          {
            success: false,
            error: 'Failed to search movies',
          },
          { status: 500 }
        )
      }

      // Get director and actor suggestions (simplified for now)
      const directorSuggestions: string[] = []
      const actorSuggestions: string[] = []
      const searchSuggestions: string[] = []

      const response: AutocompleteResponse = {
        success: true,
        data: {
          movies: movieSuggestions || [],
          directors: directorSuggestions,
          actors: actorSuggestions,
          suggestions: searchSuggestions,
        },
      }

      logger.info('Autocomplete completed', {
        query: searchQuery,
        resultCount: movieSuggestions?.length || 0,
        limit,
      })

      return NextResponse.json(response)
    } catch (error) {
      logger.error('Autocomplete API error', {
        query: searchQuery,
        error: error instanceof Error ? error.message : String(error),
      })
      return NextResponse.json(
        {
          success: false,
          error: 'Internal server error',
        },
        { status: 500 }
      )
    }
  })
)
