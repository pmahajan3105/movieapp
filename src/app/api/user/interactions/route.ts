import { NextRequest, NextResponse } from 'next/server'
import { LocalStorageService } from '@/lib/db'
import { logger } from '@/lib/logger'

/**
 * Interface for tracking user interactions with movies in the recommendation app
 */
interface UserInteractionRequest {
  movieId: string
  type: 'view_details' | 'add_to_watchlist' | 'rate' | 'search_result_click' | 'recommendation_click'
  context?: string[]
  metadata?: {
    searchQuery?: string
    recommendationType?: string
    timeSpent?: number
    ratingValue?: number
    position?: number
  }
  timestamp: string
  browserContext: {
    timeOfDay: number
    dayOfWeek: number
  }
}

/**
 * POST /api/user/interactions
 * Tracks user interactions within the movie recommendation app
 */
export async function POST(request: NextRequest) {
  try {
    const body: UserInteractionRequest = await request.json()
    const { movieId, type, context, metadata, browserContext } = body

    // Validate required fields
    if (!movieId || !type) {
      return NextResponse.json(
        { error: 'movieId and type are required' },
        { status: 400 }
      )
    }

    // Validate interaction type
    const validTypes = ['view_details', 'add_to_watchlist', 'rate', 'search_result_click', 'recommendation_click']
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: `Invalid interaction type. Must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      )
    }

    // Record interaction in local database
    LocalStorageService.recordInteraction(type, movieId, {
      context: context || [],
      searchQuery: metadata?.searchQuery,
      recommendationType: metadata?.recommendationType,
      position: metadata?.position,
      timeSpent: metadata?.timeSpent,
      ratingValue: metadata?.ratingValue,
      timeOfDay: browserContext?.timeOfDay,
      dayOfWeek: browserContext?.dayOfWeek,
    })

    // Log successful tracking
    logger.info('User interaction tracked', {
      movieId,
      type,
      context: context?.join(','),
      timeOfDay: browserContext?.timeOfDay
    })

    return NextResponse.json({
      success: true,
      tracked: {
        movieId,
        type,
        timestamp: new Date().toISOString()
      },
      source: 'local',
    })

  } catch (error) {
    logger.error('User interaction tracking endpoint error', {
      error: error instanceof Error ? error.message : 'Unknown error',
    })

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/user/interactions
 * Retrieves user interaction history for analytics
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const type = searchParams.get('type')
    const movieId = searchParams.get('movieId')

    // Get interactions from local database
    let interactions = LocalStorageService.getInteractions(Math.min(limit, 100))

    // Apply filters
    if (type) {
      interactions = interactions.filter(i => i.interaction_type === type)
    }
    if (movieId) {
      interactions = interactions.filter(i => i.movie_id === movieId)
    }

    // Calculate basic analytics
    const analytics = {
      totalInteractions: interactions.length,
      typeBreakdown: interactions.reduce((acc, interaction) => {
        acc[interaction.interaction_type] = (acc[interaction.interaction_type] || 0) + 1
        return acc
      }, {} as Record<string, number>),
      recentActivity: interactions.slice(0, 10)
    }

    return NextResponse.json({
      interactions,
      analytics,
      pagination: {
        limit,
        returned: interactions.length
      },
      source: 'local',
    })

  } catch (error) {
    logger.error('User interaction fetch endpoint error', {
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
