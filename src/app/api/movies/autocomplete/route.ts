import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@/lib/supabase/server-client'
import type { AutocompleteResponse } from '@/types/search'

export async function GET(request: NextRequest): Promise<NextResponse<AutocompleteResponse>> {
  try {
    const supabase = await createSupabaseClient()
    const { searchParams } = new URL(request.url)

    const query = searchParams.get('query')
    const limit = parseInt(searchParams.get('limit') || '8')

    if (!query || query.trim().length < 2) {
      return NextResponse.json({
        success: true,
        data: {
          movies: [],
          directors: [],
          actors: [],
          suggestions: [],
        },
      })
    }

    const searchQuery = query.trim()
    console.log('🔍 Autocomplete request:', { query: searchQuery, limit })

    // Get movie title suggestions
    const { data: movieSuggestions, error: movieError } = await supabase
      .from('movies')
      .select('id, title, year, poster_url')
      .ilike('title', `%${searchQuery}%`)
      .order('rating', { ascending: false, nullsFirst: false })
      .limit(limit)

    if (movieError) {
      console.error('Movie autocomplete error:', movieError)
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

    console.log(`🔍 Autocomplete completed: ${movieSuggestions?.length || 0} movies`)

    return NextResponse.json(response)
  } catch (error) {
    console.error('Autocomplete API error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
