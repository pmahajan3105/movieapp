/**
 * Semantic Recommendations API
 * Vector-enhanced movie recommendations using embeddings
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSupabaseUrl, getSupabaseServiceRoleKey } from '@/lib/env'
import { embeddingService } from '@/lib/ai/embedding-service'
import type { Movie } from '@/types'

// Request throttling to prevent infinite loops
const requestCounts = new Map<string, { count: number; resetTime: number }>()
const MAX_REQUESTS_PER_MINUTE = 10
const THROTTLE_WINDOW = 60000 // 1 minute

function checkRateLimit(clientId: string): boolean {
  const now = Date.now()
  const clientData = requestCounts.get(clientId)

  if (!clientData || now > clientData.resetTime) {
    requestCounts.set(clientId, { count: 1, resetTime: now + THROTTLE_WINDOW })
    return true
  }

  if (clientData.count >= MAX_REQUESTS_PER_MINUTE) {
    return false
  }

  clientData.count++
  return true
}

// Enhanced movie type with semantic search data
interface SemanticMovie extends Movie {
  semanticSimilarity: number
  recommendationReason: string
  confidence: number
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting check
    const clientId = request.headers.get('x-forwarded-for') || 'unknown'
    if (!checkRateLimit(clientId)) {
      return NextResponse.json(
        { success: false, error: 'Too many requests. Please wait before trying again.' },
        { status: 429 }
      )
    }

    const {
      userId,
      query,
      preferredGenres,
      mood,
      limit = 10,
      semanticThreshold = 0.7,
      // diversityFactor = 0.3 // Reserved for future diversity ranking
    } = await request.json()

    if (!userId) {
      return NextResponse.json({ success: false, error: 'User ID is required' }, { status: 400 })
    }

    console.log('🔍 Semantic search request:', { userId, query, preferredGenres, mood })

    // Get Supabase client
    const supabase = createClient(getSupabaseUrl()!, getSupabaseServiceRoleKey()!)

    let recommendedMovies: SemanticMovie[] = []
    let insights = {
      method: 'fallback',
      semanticMatches: 0,
      totalCandidates: 0,
      diversityScore: 0,
    }

    if (query) {
      // Use semantic search for query-based recommendations
      console.log('🧠 Using semantic search for query:', query)

      const semanticResults = await embeddingService.searchSimilarMovies(
        query,
        semanticThreshold,
        limit * 3 // Get more candidates for filtering
      )

      insights.semanticMatches = semanticResults.length
      insights.method = 'semantic'

      if (semanticResults.length > 0) {
        // Get full movie details
        const movieIds = semanticResults.map(r => r.movieId)
        const { data: movies } = await supabase
          .from('movies')
          .select('*')
          .in('id', movieIds)
          .limit(limit * 2)

        if (movies) {
          // Add semantic scores and apply basic filtering
          recommendedMovies = movies
            .map(movie => {
              const semanticMatch = semanticResults.find(r => r.movieId === movie.id)
              return {
                ...movie,
                semanticSimilarity: semanticMatch?.similarity || 0,
                recommendationReason: generateReason(movie, semanticMatch?.similarity || 0),
                confidence: Math.min(0.9, (semanticMatch?.similarity || 0) * 1.2),
              }
            })
            .sort((a, b) => b.semanticSimilarity - a.semanticSimilarity)
            .slice(0, limit)

          insights.totalCandidates = movies.length
        }
      }
    }

    // Fallback to preference-based recommendations
    if (recommendedMovies.length === 0) {
      console.log('📋 Using preference-based fallback')

      let query = supabase
        .from('movies')
        .select('*')
        .not('rating', 'is', null)
        .order('rating', { ascending: false })

      // Apply genre filtering if provided
      if (preferredGenres && preferredGenres.length > 0) {
        const genreConditions = preferredGenres.map((genre: string) => `genre.ilike.%${genre}%`)
        query = query.or(genreConditions.join(','))
      }

      const { data: fallbackMovies } = await query.limit(limit)

      if (fallbackMovies) {
        recommendedMovies = fallbackMovies.map(movie => ({
          ...movie,
          semanticSimilarity: 0,
          recommendationReason: 'Based on your preferences',
          confidence: 0.4,
        }))

        insights.method = 'preference-based'
        insights.totalCandidates = fallbackMovies.length
      }
    }

    // Calculate diversity score
    if (recommendedMovies.length > 0) {
      const uniqueGenres = new Set(
        recommendedMovies.flatMap(movie =>
          Array.isArray(movie.genre) ? movie.genre : [movie.genre || 'unknown']
        )
      )
      insights.diversityScore =
        Math.round((uniqueGenres.size / recommendedMovies.length) * 100) / 100
    }

    // Save user search as memory for future recommendations
    if (userId && query) {
      try {
        await embeddingService.saveUserMemory({
          userId,
          type: 'search',
          content: `Search query: ${query}`,
          metadata: {
            query,
            preferredGenres,
            mood,
            timestamp: new Date().toISOString(),
            resultsCount: recommendedMovies.length,
          },
          confidence: 0.7,
        })
      } catch (memoryError) {
        console.warn('⚠️ Failed to save search memory:', memoryError)
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        movies: recommendedMovies,
        insights,
        pagination: {
          currentPage: 1,
          limit,
          hasMore: false,
          totalResults: recommendedMovies.length,
        },
      },
    })
  } catch (error) {
    console.error('❌ Semantic recommendations error:', error)

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate recommendations',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * Generate recommendation reason based on semantic similarity
 */
function generateReason(movie: Movie, similarity: number): string {
  if (similarity > 0.8) {
    return `Perfect match • ${movie.genre ? `${Array.isArray(movie.genre) ? movie.genre.join(', ') : movie.genre}` : 'Great choice'}`
  } else if (similarity > 0.6) {
    return `Great match • ${movie.rating ? `${movie.rating}/10 rated` : 'Recommended'}`
  } else if (similarity > 0.4) {
    return `Good match • ${movie.year ? `${movie.year}` : 'Popular choice'}`
  } else {
    return `Recommended for you • ${movie.genre ? `${Array.isArray(movie.genre) ? movie.genre[0] : movie.genre}` : 'Worth watching'}`
  }
}

export async function GET(request: NextRequest) {
  try {
    // Rate limiting check
    const clientId = request.headers.get('x-forwarded-for') || 'unknown'
    if (!checkRateLimit(clientId)) {
      return NextResponse.json(
        { success: false, error: 'Too many requests. Please wait before trying again.' },
        { status: 429 }
      )
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: 'User ID is required for semantic recommendations',
        },
        { status: 400 }
      )
    }

    const query = searchParams.get('query')
    const genres = searchParams.get('genres')
    const mood = searchParams.get('mood')
    const limit = parseInt(searchParams.get('limit') || '10')

    // Convert to POST format and call the main handler
    const mockRequest = {
      json: async () => ({
        userId,
        query,
        preferredGenres: genres ? genres.split(',') : undefined,
        mood,
        limit,
      }),
      headers: request.headers, // Pass through headers for rate limiting
    } as NextRequest

    return POST(mockRequest)
  } catch (error) {
    console.error('❌ GET semantic recommendations error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process GET request',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
