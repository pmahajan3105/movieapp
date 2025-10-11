import { NextRequest, NextResponse } from 'next/server'
import { createRouteSupabaseClient } from '@/lib/supabase/route-client'
import { hyperPersonalizedEngine } from '@/lib/ai/hyper-personalized-engine'
import { UserMemoryService } from '@/lib/services/user-memory-service'
import { logger } from '@/lib/logger'
import { getUserContext } from '@/lib/utils/single-user-mode'
import { applyRateLimit, rateLimiters } from '@/lib/utils/rate-limiter'
import { createRecommendationResponse, StandardErrors } from '@/lib/utils/api-response'

export async function GET(request: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResponse = await applyRateLimit(request, rateLimiters.ai)
    if (rateLimitResponse) {
      return rateLimitResponse
    }

    const { searchParams } = new URL(request.url)
    const count = parseInt(searchParams.get('count') || '10')
    const context = searchParams.get('context') || undefined
    const excludeWatched = searchParams.get('excludeWatched') !== 'false'
    
    // Custom personalization factors (optional)
    const behavioralWeight = searchParams.get('behavioral_weight')
    const temporalWeight = searchParams.get('temporal_weight')
    const explorationWeight = searchParams.get('exploration_weight')
    const qualityThresholdWeight = searchParams.get('quality_threshold_weight')
    const recencyWeight = searchParams.get('recency_weight')

    const supabase = createRouteSupabaseClient(request)
    
    // Get authenticated user (with SINGLE_USER_MODE support)
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
    
    // Get user context (handles SINGLE_USER_MODE)
    let user
    try {
      const userContext = getUserContext(authUser?.id)
      user = {
        id: userContext.id,
        email: userContext.email,
        isSingleUser: userContext.isSingleUser
      }
    } catch (error) {
      return NextResponse.json(
        { error: 'Authentication required' }, 
        { status: 401 }
      )
    }

    logger.info('🤖 Generating hyper-personalized recommendations', { 
      userId: user.id, 
      count, 
      context,
      excludeWatched 
    })

    // Build custom factors if provided
    const customFactors: any = {}
    if (behavioralWeight) customFactors.behavioral_weight = parseFloat(behavioralWeight)
    if (temporalWeight) customFactors.temporal_weight = parseFloat(temporalWeight)
    if (explorationWeight) customFactors.exploration_weight = parseFloat(explorationWeight)
    if (qualityThresholdWeight) customFactors.quality_threshold_weight = parseFloat(qualityThresholdWeight)
    if (recencyWeight) customFactors.recency_weight = parseFloat(recencyWeight)

    // Generate recommendations using the hyper-personalized engine
    let recommendations = await hyperPersonalizedEngine.generateRecommendations(
      user.id,
      {
        count,
        context,
        excludeWatched,
        factors: Object.keys(customFactors).length > 0 ? customFactors : undefined,
        supabaseClient: supabase
      }
    )

    // Filter using memory service to remove seen movies
    if (excludeWatched) {
      const memoryService = new UserMemoryService()
      // Extract movies from recommendations for filtering
      const movies = recommendations.map(r => r.movie)
      const filteredMovies = await memoryService.filterUnseenMovies(user.id, movies)
      // Filter recommendations to only include those with movies that passed the filter
      recommendations = recommendations.filter(r => 
        filteredMovies.some(m => m.id === r.movie.id)
      )
      
      // Apply novelty penalties to avoid recommending similar recent movies
      recommendations = await memoryService.applyNoveltyPenalties(user.id, recommendations)
    }

    logger.info('✅ Hyper-personalized recommendations generated', { 
      userId: user.id,
      recommendationCount: recommendations.length,
      averageConfidence: recommendations.reduce((sum, r) => sum + r.confidence_score, 0) / recommendations.length
    })

    // Calculate scoring transparency
    const averageConfidence = recommendations.reduce((sum, r) => sum + r.confidence_score, 0) / recommendations.length
    const noveltyPenalties = recommendations.filter(r => r.noveltyPenalty).length
    
    return createRecommendationResponse(
      recommendations,
      {
        algorithm: 'hyper-personalized',
        confidence: Math.round(averageConfidence * 100) / 100,
        factors: ['user_preferences', 'behavioral_signals', 'recency_decay', 'novelty_tracking'],
        userPreferences: {}, // Would be populated from memory service
        noveltyPenalty: noveltyPenalties > 0,
        recencyDecay: 0.95
      },
      `Generated ${recommendations.length} hyper-personalized recommendations`
    )

  } catch (error) {
    logger.error('❌ Failed to generate hyper-personalized recommendations', { 
      errorMessage: error instanceof Error ? error.message : String(error)
    })

    return StandardErrors.INTERNAL_ERROR(
      error instanceof Error ? error.message : String(error)
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteSupabaseClient(request)
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' }, 
        { status: 401 }
      )
    }

    const body = await request.json()
    const { 
      movieId, 
      action, 
      value, 
      context = {} 
    } = body

    if (!movieId || !action) {
      return NextResponse.json(
        { error: 'movieId and action are required' }, 
        { status: 400 }
      )
    }

    // Record learning signal
    await hyperPersonalizedEngine.recordLearningSignal({
      userId: user.id,
      movieId: String(movieId),
      action,
      value,
      context: {
        page_type: context.page_type || 'unknown',
        recommendation_type: context.recommendation_type,
        position_in_list: context.position_in_list,
        session_id: context.session_id
      },
      timestamp: new Date().toISOString()
    })

    logger.info('📊 Learning signal recorded', { 
      userId: user.id, 
      movieId, 
      action,
      contextType: context.page_type 
    })

    return NextResponse.json({
      success: true,
      message: 'Learning signal recorded'
    })

  } catch (error) {
    logger.error('❌ Failed to record learning signal', { 
      errorMessage: error instanceof Error ? error.message : String(error)
    })

    return NextResponse.json(
      { 
        error: 'Failed to record learning signal',
        details: error instanceof Error ? error.message : String(error)
      }, 
      { status: 500 }
    )
  }
} 