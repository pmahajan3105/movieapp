/**
 * Query Intelligence API Route
 * Provides advanced query understanding and processing
 */

import { NextRequest, NextResponse } from 'next/server'
import { APIErrorHandler } from '@/lib/error-handling'
import { logger } from '@/lib/logger'
import { getUserId } from '@/lib/user-utils'
import { processAdvancedQuery } from '@/lib/ai/unified-ai-service'

export async function POST(request: NextRequest) {
  try {
    // const supabase = createRouteSupabaseClient(request)
    const body = await request.json()
    
    const { query, includeRecommendations = false } = body
    
    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'query string is required' },
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

    logger.info('Processing advanced query intelligence', { 
      query: query.slice(0, 100), // Log first 100 chars for privacy
      includeRecommendations,
      userId 
    })

    // Process query with advanced intelligence
    const queryResult = await processAdvancedQuery(query, userId)

    const response: any = {
      originalQuery: query,
      processedQuery: queryResult.advancedQuery.processedQuery,
      
      // Query understanding
      extractedEntities: queryResult.advancedQuery.extractedEntities,
      detectedIntents: queryResult.prioritizedIntents,
      implicitPreferences: queryResult.advancedQuery.implicitPreferences,
      contextualFactors: queryResult.advancedQuery.contextualFactors,
      
      // Analysis metadata
      queryComplexity: queryResult.queryComplexity,
      confidence: queryResult.advancedQuery.confidence,
      recommendationStrategy: queryResult.recommendationStrategy,
      requiresExplanation: queryResult.requiresExplanation,
      
      // Search filters generated
      searchFilters: queryResult.searchFilters,
      
      timestamp: new Date().toISOString()
    }

    // Optionally include recommendations
    if (includeRecommendations) {
      // This would trigger the recommendation pipeline
      // For now, just indicate that recommendations are available
      response.recommendationsAvailable = true
      response.recommendationEndpoint = '/api/movies?advanced=true&query=' + encodeURIComponent(query)
    }

    logger.info('Query intelligence processing completed', {
      userId,
      complexity: queryResult.queryComplexity,
      strategy: queryResult.recommendationStrategy,
      entityCount: queryResult.advancedQuery.extractedEntities.length,
      intentCount: queryResult.prioritizedIntents.length
    })

    return NextResponse.json(response)

  } catch (error) {
    logger.error('Query intelligence processing failed', {
      error: error instanceof Error ? error.message : String(error)
    })

    return APIErrorHandler.handle(error, {
      endpoint: '/api/query/intelligence',
      method: 'POST'
    })
  }
}

// GET endpoint for query examples and capabilities
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const examples = searchParams.get('examples') === 'true'
    
    if (examples) {
      return NextResponse.json({
        queryExamples: [
          {
            category: 'Thematic Exploration',
            examples: [
              'Movies that explore identity crisis like Fight Club but more emotional',
              'Films about redemption and second chances',
              'Stories that deal with mortality and the meaning of life'
            ]
          },
          {
            category: 'Style Matching',
            examples: [
              'Movies with Kubrick\'s visual style but contemporary themes',
              'Films with the cinematography of Blade Runner',
              'Wes Anderson style but darker themes'
            ]
          },
          {
            category: 'Emotional Journey',
            examples: [
              'Something uplifting after a hard day',
              'Movies with bittersweet endings',
              'Films that build emotional intensity gradually'
            ]
          },
          {
            category: 'Comparative Analysis',
            examples: [
              'Movies like Inception but more character-driven',
              'Similar to Her but in a different genre',
              'Compare the themes of Arrival and Interstellar'
            ]
          },
          {
            category: 'Educational',
            examples: [
              'Explain why Citizen Kane is considered a masterpiece',
              'What makes Tarkovsky\'s films unique?',
              'Analyze the use of color in Amélie'
            ]
          }
        ],
        
        capabilities: [
          'Multi-intent query understanding',
          'Thematic and narrative analysis',
          'Emotional journey mapping',
          'Cinematic style recognition',
          'Educational insights generation',
          'Complex preference extraction',
          'Contextual recommendation filtering'
        ],
        
        supportedIntents: [
          'discover', 'similar_to', 'mood_match', 'thematic_explore', 
          'style_match', 'educational', 'compare'
        ],
        
        analysisDepths: [
          'basic', 'standard', 'comprehensive', 'expert'
        ]
      })
    }

    return NextResponse.json({
      message: 'Query Intelligence API',
      version: '1.0.0',
      endpoints: {
        'POST /api/query/intelligence': 'Process advanced query',
        'GET /api/query/intelligence?examples=true': 'Get query examples and capabilities'
      }
    })

  } catch (error) {
    return APIErrorHandler.handle(error, {
      endpoint: '/api/query/intelligence',
      method: 'GET'
    })
  }
}