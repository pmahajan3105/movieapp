/**
 * Advanced AI Workflow API Route
 * Provides comprehensive AI-powered movie discovery experiences
 */

import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { getUserId } from '@/lib/user-utils'
import { advancedWorkflowOrchestrator } from '@/lib/ai/advanced-workflow-orchestrator'
import { performanceOptimizationService } from '@/lib/ai/performance-optimization-service'
import { APIErrorHandler } from '@/lib/error-handling'
import type { AdvancedWorkflowRequest } from '@/lib/ai/advanced-workflow-orchestrator'

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  let userId: string | null = null

  try {
    // Get user ID from session
    userId = await getUserId(request)
    if (!userId) {
      return NextResponse.json(
        {
          error: 'Authentication required',
          message: 'Please log in to access advanced AI workflows',
        },
        { status: 401 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { query, workflowType = 'comprehensive_discovery', context = {} } = body

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        {
          error: 'Invalid request',
          message: 'Query is required and must be a string',
        },
        { status: 400 }
      )
    }

    // Validate workflow type
    const validWorkflowTypes = [
      'comprehensive_discovery',
      'educational_analysis',
      'style_exploration',
      'mood_journey',
      'comparative_analysis',
    ]

    if (!validWorkflowTypes.includes(workflowType)) {
      return NextResponse.json(
        {
          error: 'Invalid workflow type',
          message: `Workflow type must be one of: ${validWorkflowTypes.join(', ')}`,
        },
        { status: 400 }
      )
    }

    logger.info('🚀 Advanced AI workflow requested', {
      userId,
      workflowType,
      query: query.slice(0, 100),
      hasContext: Object.keys(context).length > 0,
    })

    // Check performance optimization cache first
    const cacheKey = `workflow:${userId}:${workflowType}:${Buffer.from(query).toString('base64').slice(0, 50)}`
    const cachedResult = await performanceOptimizationService.getCachedRecommendations(cacheKey)

    if (cachedResult) {
      performanceOptimizationService.recordCacheHit()
      performanceOptimizationService.recordRequestTime(startTime)

      logger.info('✅ Returning cached workflow result', {
        userId,
        workflowType,
        cacheKey: cacheKey.slice(0, 50),
        responseTime: Date.now() - startTime,
      })

      return NextResponse.json({
        movies: cachedResult,
        insights: {
          confidence: 0.85,
          personalizedReasons: ['Cached recommendation based on previous analysis'],
          queryAnalysis: {
            originalQuery: query,
            confidence: 0.85,
            extractedEntities: [],
            detectedIntents: [],
            complexityLevel: 'moderate' as const,
          },
        },
        visualizations: {
          moodSpectrum: [],
          themeNetwork: [],
          styleComparison: [],
          emotionalArc: [],
        },
        performance: {
          totalTime: Date.now() - startTime,
          serviceBreakdown: { cache: Date.now() - startTime },
          cacheHits: 1,
          apiCalls: 0,
        },
        cached: true,
      })
    }

    // Prepare workflow request
    const workflowRequest: AdvancedWorkflowRequest = {
      userId,
      query,
      workflowType: workflowType as any,
      context: {
        ...context,
        timeConstraints: context.timeConstraints || 'standard',
      },
    }

    // Execute advanced workflow
    const result = await advancedWorkflowOrchestrator.executeWorkflow(workflowRequest)

    // Cache the result for future requests
    await performanceOptimizationService.setCachedRecommendations(
      cacheKey,
      result.movies,
      7 // High priority for advanced workflows
    )

    // Record performance metrics
    performanceOptimizationService.recordRequestTime(startTime)

    logger.info('✅ Advanced AI workflow completed', {
      userId,
      workflowType,
      movieCount: result.movies.length,
      confidence: result.insights.confidence,
      totalTime: result.performance.totalTime,
      cacheHits: result.performance.cacheHits,
      apiCalls: result.performance.apiCalls,
    })

    return NextResponse.json({
      ...result,
      cached: false,
    })
  } catch (error) {
    // Record performance for failed requests too
    performanceOptimizationService.recordRequestTime(startTime)

    logger.error('❌ Advanced AI workflow failed', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      requestDuration: Date.now() - startTime,
    })

    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes('rate limit')) {
        return NextResponse.json(
          {
            error: 'Rate limit exceeded',
            message: 'Too many requests. Please try again in a moment.',
            retryAfter: 60,
          },
          { status: 429 }
        )
      }

      if (error.message.includes('timeout')) {
        return NextResponse.json(
          {
            error: 'Request timeout',
            message: 'The AI analysis is taking longer than expected. Please try a simpler query.',
            suggestion: 'Try using fewer movies or a more specific query',
          },
          { status: 504 }
        )
      }
    }

    // Use centralized error handler
    return APIErrorHandler.handle(error, {
      endpoint: '/api/ai/advanced-workflow',
      method: 'POST',
      userId: userId || undefined,
    })
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get user ID from session
    const userId = await getUserId(request)
    if (!userId) {
      return NextResponse.json(
        {
          error: 'Authentication required',
          message: 'Please log in to access performance metrics',
        },
        { status: 401 }
      )
    }

    // Get performance metrics and cache stats
    const metrics = performanceOptimizationService.getPerformanceMetrics()
    const cacheStats = performanceOptimizationService.getCacheStats()

    return NextResponse.json({
      performance: metrics,
      cache: cacheStats,
      availableWorkflows: [
        {
          type: 'comprehensive_discovery',
          name: 'Comprehensive Discovery',
          description: 'Deep analysis with thematic, emotional, and stylistic insights',
          estimatedTime: '5-10 seconds',
          features: [
            'Advanced query processing',
            'Multi-dimensional analysis',
            'Rich visualizations',
          ],
        },
        {
          type: 'educational_analysis',
          name: 'Educational Analysis',
          description: 'Film analysis with educational insights and learning content',
          estimatedTime: '3-7 seconds',
          features: ['Educational content', 'Film techniques', 'Historical context'],
        },
        {
          type: 'style_exploration',
          name: 'Style Exploration',
          description: 'Focus on cinematographic and directorial styles',
          estimatedTime: '4-8 seconds',
          features: ['Visual analysis', 'Directorial signatures', 'Style comparisons'],
        },
        {
          type: 'mood_journey',
          name: 'Mood Journey',
          description: 'Emotional analysis and mood-based recommendations',
          estimatedTime: '3-6 seconds',
          features: ['Emotional mapping', 'Mood spectrum', 'Journey analysis'],
        },
        {
          type: 'comparative_analysis',
          name: 'Comparative Analysis',
          description: 'Side-by-side analysis of different movies and styles',
          estimatedTime: '4-7 seconds',
          features: ['Multi-movie comparison', 'Thematic analysis', 'Style comparison'],
        },
      ],
    })
  } catch (error) {
    logger.error('Failed to get advanced workflow info', {
      error: error instanceof Error ? error.message : String(error),
    })

    return APIErrorHandler.handle(error, {
      endpoint: '/api/ai/advanced-workflow',
      method: 'GET',
    })
  }
}
