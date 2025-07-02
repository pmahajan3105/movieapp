import { NextRequest, NextResponse } from 'next/server'
import { createRouteSupabaseClient } from '@/lib/supabase/route-client'
import { hyperPersonalizedEngine } from '@/lib/ai/hyper-personalized-engine'
import { logger } from '@/lib/logger'

export async function GET(request: NextRequest) {
  try {
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
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
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
    const recommendations = await hyperPersonalizedEngine.generateRecommendations(
      user.id,
      {
        count,
        context,
        excludeWatched,
        factors: Object.keys(customFactors).length > 0 ? customFactors : undefined,
        supabaseClient: supabase
      }
    )

    logger.info('✅ Hyper-personalized recommendations generated', { 
      userId: user.id,
      recommendationCount: recommendations.length,
      averageConfidence: recommendations.reduce((sum, r) => sum + r.confidence_score, 0) / recommendations.length
    })

    return NextResponse.json({
      success: true,
      recommendations,
      metadata: {
        count: recommendations.length,
        averageConfidence: Math.round(
          recommendations.reduce((sum, r) => sum + r.confidence_score, 0) / recommendations.length
        ),
        engine: 'hyper-personalized',
        generatedAt: new Date().toISOString()
      }
    })

  } catch (error) {
    logger.error('❌ Failed to generate hyper-personalized recommendations', { 
      errorMessage: error instanceof Error ? error.message : String(error)
    })

    return NextResponse.json(
      { 
        error: 'Failed to generate recommendations',
        details: error instanceof Error ? error.message : String(error)
      }, 
      { status: 500 }
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