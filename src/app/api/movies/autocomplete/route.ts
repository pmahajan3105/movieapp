import { NextRequest, NextResponse } from 'next/server'
import type { AutocompleteResponse } from '@/types/search'
import { logger } from '@/lib/logger'
import { createServerClient } from '@/lib/supabase/server-client'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('query')
    const limit = parseInt(searchParams.get('limit') || '5')
    const supabase = await createServerClient()

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
      throw new Error('Failed to search movies')
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
    logger.apiError('autocomplete-error', error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
