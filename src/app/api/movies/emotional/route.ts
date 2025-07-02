/**
 * Emotional Journey Analysis API Route
 * Provides emotional arc analysis and mood-based recommendations
 */

import { NextRequest, NextResponse } from 'next/server'
import { createRouteSupabaseClient } from '@/lib/supabase/route-client'
import { APIErrorHandler } from '@/lib/error-handling'
import { logger } from '@/lib/logger'
import { getUserId } from '@/lib/user-utils'
import { getEmotionalAnalysis } from '@/lib/ai/unified-ai-service'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const supabase = createRouteSupabaseClient(request)
    
    const movieId = searchParams.get('movieId')
    const userMoodContext = searchParams.get('mood') || undefined
    
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

    logger.info('Getting emotional analysis', { movieId, userMoodContext, userId })

    const emotionalJourney = await getEmotionalAnalysis(movieId, userMoodContext)

    return NextResponse.json({
      movieId,
      emotionalJourney,
      userMoodContext,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    logger.error('Emotional analysis request failed', {
      error: error instanceof Error ? error.message : String(error)
    })

    return APIErrorHandler.handle(error, {
      endpoint: '/api/movies/emotional',
      method: 'GET'
    })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteSupabaseClient(request)
    const body = await request.json()
    
    const { movieId, userPreferences, currentMood } = body
    
    if (!movieId) {
      return NextResponse.json(
        { error: 'movieId is required' },
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

    logger.info('Emotional compatibility analysis', { 
      movieId, 
      currentMood,
      userId 
    })

    // Get emotional journey for the movie
    const emotionalJourney = await getEmotionalAnalysis(movieId, currentMood)

    // Calculate compatibility (this would be enhanced with more sophisticated logic)
    const compatibility = {
      overall: 0.7, // Placeholder
      moodAlignment: 0.8,
      intensityMatch: 0.6,
      journeyFit: 0.7,
      catharticPotential: 0.5
    }

    return NextResponse.json({
      movieId,
      emotionalJourney,
      compatibility,
      userContext: {
        currentMood,
        preferences: userPreferences
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    logger.error('Emotional compatibility analysis failed', {
      error: error instanceof Error ? error.message : String(error)
    })

    return APIErrorHandler.handle(error, {
      endpoint: '/api/movies/emotional',
      method: 'POST'
    })
  }
}