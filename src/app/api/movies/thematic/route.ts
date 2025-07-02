/**
 * Thematic Analysis API Route
 * Provides thematic analysis and theme-based recommendations
 */

import { NextRequest, NextResponse } from 'next/server'
import { APIErrorHandler } from '@/lib/error-handling'
import { logger } from '@/lib/logger'
import { getUserId } from '@/lib/user-utils'
import { getThematicAnalysis } from '@/lib/ai/unified-ai-service'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    // Supabase client instance (currently unused in this handler)
    // const supabase = createRouteSupabaseClient(request)
    
    const movieId = searchParams.get('movieId')
    const analysisDepth = searchParams.get('depth') as 'basic' | 'standard' | 'comprehensive' | 'expert' || 'standard'
    
    if (!movieId) {
      return NextResponse.json(
        { error: 'movieId parameter is required' },
        { status: 400 }
      )
    }

    const userId = await getUserId(request)
    if (!userId) {
      return NextResponse.json(
        { error: 'User authentication required' },
        { status: 401 }
      )
    }

    logger.info('Getting thematic analysis', { movieId, analysisDepth, userId })

    const thematicProfile = await getThematicAnalysis(movieId, analysisDepth)

    return NextResponse.json({
      movieId,
      thematicProfile,
      analysisDepth,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    logger.error('Thematic analysis request failed', {
      error: error instanceof Error ? error.message : String(error)
    })

    return APIErrorHandler.handle(error, {
      endpoint: '/api/movies/thematic',
      method: 'GET'
    })
  }
}

export async function POST(request: NextRequest) {
  try {
    // Supabase client instance (currently unused in this handler)
    // const supabase = createRouteSupabaseClient(request)
    const body = await request.json()
    
    const { movieIds, analysisDepth = 'standard' } = body
    
    if (!Array.isArray(movieIds) || movieIds.length === 0) {
      return NextResponse.json(
        { error: 'movieIds array is required' },
        { status: 400 }
      )
    }

    const userId = await getUserId(request)
    if (!userId) {
      return NextResponse.json(
        { error: 'User authentication required' },
        { status: 401 }
      )
    }

    logger.info('Batch thematic analysis request', { 
      movieIds: movieIds.slice(0, 5), // Log first 5 for brevity
      count: movieIds.length,
      analysisDepth,
      userId 
    })

    // Process multiple movies (limit to prevent abuse)
    const limitedMovieIds = movieIds.slice(0, 10)
    
    const analyses = await Promise.allSettled(
      limitedMovieIds.map(movieId => 
        getThematicAnalysis(movieId, analysisDepth)
      )
    )

    const results = analyses.map((result, index) => ({
      movieId: limitedMovieIds[index],
      status: result.status,
      thematicProfile: result.status === 'fulfilled' ? result.value : null,
      error: result.status === 'rejected' ? result.reason?.message : null
    }))

    return NextResponse.json({
      results,
      analysisDepth,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    logger.error('Batch thematic analysis failed', {
      error: error instanceof Error ? error.message : String(error)
    })

    return APIErrorHandler.handle(error, {
      endpoint: '/api/movies/thematic',
      method: 'POST'
    })
  }
}