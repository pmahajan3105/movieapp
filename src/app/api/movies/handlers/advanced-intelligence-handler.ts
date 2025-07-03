/**
 * Advanced Intelligence Handler
 * Handles requests using the full advanced intelligence pipeline
 */

import { NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'

import { logger } from '@/lib/logger'
import { getUserId } from '@/lib/user-utils'
import { UnifiedAIService } from '@/lib/ai'
import { APIErrorHandler } from '@/lib/error-handling'

export async function handleAdvancedIntelligenceRequest(
  supabase: SupabaseClient,
  query: string,
  limit: number = 12,
  analysisDepth: 'basic' | 'standard' | 'comprehensive' | 'expert' = 'standard'
): Promise<NextResponse> {
  const startTime = Date.now()

  try {
    const userId = await getUserId(supabase)
    if (!userId) {
      return NextResponse.json(
        { error: 'User authentication required for advanced recommendations' },
        { status: 401 }
      )
    }

    logger.info('Processing advanced intelligence request', {
      userId,
      query,
      limit,
      analysisDepth,
    })

    // Process query with full advanced intelligence pipeline
    const unifiedAI = UnifiedAIService.getInstance()
    const queryResult = await unifiedAI.processAdvancedQuery(query, userId)

    // Get recommendations using advanced algorithm
    const recommendations = await unifiedAI.getRecommendations({
      userId,
      algorithm: 'advanced',
      context: {
        query,
        limit,
        includeExplanations: true,
        enableAdvancedQuery: true,
        enableThematicAnalysis: true,
        enableStyleMatching: true,
        enableEmotionalJourney: true,
        analysisDepth,
        requireEducationalInsights: queryResult.requiresExplanation,
      },
    })

    const processingTime = Date.now() - startTime

    // Enhanced response with advanced intelligence data
    const response = {
      movies: recommendations.movies,
      total: recommendations.movies.length,
      page: 1,
      limit,
      algorithm: recommendations.algorithm,

      // Advanced intelligence insights
      queryAnalysis: {
        originalQuery: query,
        processedQuery: queryResult.advancedQuery.processedQuery,
        complexity: queryResult.queryComplexity,
        detectedIntents: queryResult.prioritizedIntents,
        confidence: queryResult.advancedQuery.confidence,
      },

      insights: {
        ...recommendations.insights,
        recommendationStrategy: queryResult.recommendationStrategy,
        queryComplexity: queryResult.queryComplexity,
      },

      performance: {
        ...recommendations.performance,
        processingTime,
        queryProcessingTime: processingTime,
        advancedIntelligence: true,
      },

      // Educational insights if requested
      educationalInsights: queryResult.requiresExplanation
        ? recommendations.educationalInsights
        : undefined,

      // Explanations
      explanations: recommendations.explanations,
    }

    logger.info('Advanced intelligence request completed', {
      userId,
      query,
      algorithm: recommendations.algorithm,
      movieCount: recommendations.movies.length,
      processingTime,
      complexity: queryResult.queryComplexity,
    })

    return NextResponse.json(response)
  } catch (error) {
    logger.error('Advanced intelligence request failed', {
      error: error instanceof Error ? error.message : String(error),
      query,
      limit,
      analysisDepth,
    })

    return APIErrorHandler.handle(error, {
      endpoint: '/api/movies/advanced',
      method: 'GET',
      metadata: { query, limit, analysisDepth },
    })
  }
}

export async function handleThematicRecommendations(
  supabase: SupabaseClient,
  query: string,
  limit: number = 12,
  analysisDepth: 'basic' | 'standard' | 'comprehensive' | 'expert' = 'standard'
): Promise<NextResponse> {
  const startTime = Date.now()

  try {
    const userId = await getUserId(supabase)
    if (!userId) {
      return NextResponse.json(
        { error: 'User authentication required for thematic recommendations' },
        { status: 401 }
      )
    }

    logger.info('Processing thematic recommendations request', {
      userId,
      query,
      limit,
      analysisDepth,
    })

    // Get thematic recommendations
    const unifiedAI = UnifiedAIService.getInstance()
    const recommendations = await unifiedAI.getRecommendations({
      userId,
      algorithm: 'thematic',
      context: {
        query,
        limit,
        includeExplanations: true,
        enableThematicAnalysis: true,
        analysisDepth,
      },
    })

    const processingTime = Date.now() - startTime

    const response = {
      movies: recommendations.movies,
      total: recommendations.movies.length,
      page: 1,
      limit,
      algorithm: recommendations.algorithm,

      insights: {
        ...recommendations.insights,
        thematicFocus: true,
      },

      performance: {
        ...recommendations.performance,
        processingTime,
        thematicAnalysis: true,
      },

      // Thematic analysis results - handled via insights
      thematicAnalysis: recommendations.insights?.thematicMatches,

      explanations: recommendations.explanations,
    }

    logger.info('Thematic recommendations completed', {
      userId,
      query,
      movieCount: recommendations.movies.length,
      processingTime,
    })

    return NextResponse.json(response)
  } catch (error) {
    logger.error('Thematic recommendations failed', {
      error: error instanceof Error ? error.message : String(error),
      query,
      limit,
      analysisDepth,
    })

    return APIErrorHandler.handle(error, {
      endpoint: '/api/movies/thematic',
      method: 'GET',
      metadata: { query, limit, analysisDepth },
    })
  }
}
