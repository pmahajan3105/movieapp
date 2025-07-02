/**
 * Cinematic Style Analysis API Route
 * Provides visual style analysis and style-based matching
 */

import { NextRequest, NextResponse } from 'next/server'
import { createRouteSupabaseClient } from '@/lib/supabase/route-client'
import { APIErrorHandler } from '@/lib/error-handling'
import { logger } from '@/lib/logger'
import { getUserId } from '@/lib/user-utils'
import { getStyleAnalysis } from '@/lib/ai/unified-ai-service'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const supabase = createRouteSupabaseClient(request)
    
    const movieId = searchParams.get('movieId')
    const focusAreasParam = searchParams.get('focusAreas')
    const focusAreas = focusAreasParam ? 
      focusAreasParam.split(',') as ('cinematography' | 'editing' | 'sound' | 'production_design')[] : 
      undefined
    
    if (!movieId) {
      return NextResponse.json(
        { error: 'movieId parameter is required' },
        { status: 400 }
      )
    }

    const userId = await getUserId(supabase)
    if (!userId) {
      return NextResponse.json(
        { error: 'User authentication required' },
        { status: 401 }
      )
    }

    logger.info('Getting style analysis', { movieId, focusAreas, userId })

    const cinematicStyle = await getStyleAnalysis(movieId, focusAreas)

    return NextResponse.json({
      movieId,
      cinematicStyle,
      focusAreas,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    logger.error('Style analysis request failed', {
      error: error instanceof Error ? error.message : String(error)
    })

    return APIErrorHandler.handle(error, {
      endpoint: '/api/movies/style',
      method: 'GET'
    })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteSupabaseClient(request)
    const body = await request.json()
    
    const { sourceMovieId, compareMovieIds, focusAreas } = body
    
    if (!sourceMovieId || !Array.isArray(compareMovieIds)) {
      return NextResponse.json(
        { error: 'sourceMovieId and compareMovieIds array are required' },
        { status: 400 }
      )
    }

    const userId = await getUserId(supabase)
    if (!userId) {
      return NextResponse.json(
        { error: 'User authentication required' },
        { status: 401 }
      )
    }

    logger.info('Style comparison analysis', { 
      sourceMovieId, 
      compareCount: compareMovieIds.length,
      focusAreas,
      userId 
    })

    // Get style analysis for source movie
    const sourceStyle = await getStyleAnalysis(sourceMovieId, focusAreas)

    // Get style analyses for comparison movies (limit to prevent abuse)
    const limitedCompareIds = compareMovieIds.slice(0, 5)
    
    const comparisons = await Promise.allSettled(
      limitedCompareIds.map(async (movieId) => {
        const style = await getStyleAnalysis(movieId, focusAreas)
        return {
          movieId,
          style,
          // Similarity calculation would be implemented here
          similarity: 0.7 // Placeholder
        }
      })
    )

    const results = comparisons.map((result, index) => ({
      movieId: limitedCompareIds[index],
      status: result.status,
      analysis: result.status === 'fulfilled' ? result.value : null,
      error: result.status === 'rejected' ? result.reason?.message : null
    }))

    return NextResponse.json({
      sourceMovieId,
      sourceStyle,
      comparisons: results,
      focusAreas,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    logger.error('Style comparison analysis failed', {
      error: error instanceof Error ? error.message : String(error)
    })

    return APIErrorHandler.handle(error, {
      endpoint: '/api/movies/style',
      method: 'POST'
    })
  }
}