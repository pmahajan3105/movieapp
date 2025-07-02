import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
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
    timeSpent?: number // Time spent on movie details page
    ratingValue?: number
    position?: number // Position in search results or recommendations
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

    // Create Supabase client
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value
          },
          set() {
            // API routes don't set cookies
          },
          remove() {
            // API routes don't remove cookies
          },
        },
      }
    )

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Prepare interaction data
    const interactionData = {
      user_id: user.id,
      movie_id: movieId,
      interaction_type: type,
      interaction_context: {
        tags: context || [],
        ...(metadata?.searchQuery && { searchQuery: metadata.searchQuery }),
        ...(metadata?.recommendationType && { recommendationType: metadata.recommendationType }),
        ...(metadata?.position && { position: metadata.position })
      },
      time_of_day: browserContext.timeOfDay,
      day_of_week: browserContext.dayOfWeek,
      metadata: {
        ...(metadata?.timeSpent && { timeSpent: metadata.timeSpent }),
        ...(metadata?.ratingValue && { ratingValue: metadata.ratingValue }),
        userAgent: request.headers.get('user-agent') || 'unknown',
        timestamp: new Date().toISOString()
      },
      created_at: new Date().toISOString()
    }

    // Insert interaction into database
    const { error: insertError } = await supabase
      .from('user_interactions')
      .insert(interactionData)

    if (insertError) {
      logger.error('Failed to track user interaction', {
        error: insertError.message,
        userId: user.id,
        movieId,
        type
      })
      return NextResponse.json(
        { error: 'Failed to track interaction' },
        { status: 500 }
      )
    }

    // Log successful tracking for analytics
    logger.info('User interaction tracked', {
      userId: user.id,
      movieId,
      type,
      context: context?.join(','),
      timeOfDay: browserContext.timeOfDay
    })

    return NextResponse.json({ 
      success: true,
      tracked: {
        movieId,
        type,
        timestamp: new Date().toISOString()
      }
    })

  } catch (error) {
    logger.error('User interaction tracking endpoint error', { 
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
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

    // Create Supabase client
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value
          },
          set() {},
          remove() {},
        },
      }
    )

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Build query
    let query = supabase
      .from('user_interactions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(Math.min(limit, 100)) // Cap at 100 for performance

    // Apply filters
    if (type) {
      query = query.eq('interaction_type', type)
    }
    if (movieId) {
      query = query.eq('movie_id', movieId)
    }

    const { data: interactions, error: fetchError } = await query

    if (fetchError) {
      logger.error('Failed to fetch user interactions', {
        error: fetchError.message,
        userId: user.id
      })
      return NextResponse.json(
        { error: 'Failed to fetch interactions' },
        { status: 500 }
      )
    }

    // Return interactions with basic analytics
    const analytics = {
      totalInteractions: interactions?.length || 0,
      typeBreakdown: interactions?.reduce((acc, interaction) => {
        acc[interaction.interaction_type] = (acc[interaction.interaction_type] || 0) + 1
        return acc
      }, {} as Record<string, number>) || {},
      recentActivity: interactions?.slice(0, 10) || []
    }

    return NextResponse.json({
      interactions: interactions || [],
      analytics,
      pagination: {
        limit,
        returned: interactions?.length || 0
      }
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
