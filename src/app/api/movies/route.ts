import { NextRequest, NextResponse } from 'next/server'

import { createRouteSupabaseClient } from '@/lib/supabase/route-client'
import { APIErrorHandler } from '@/lib/error-handling'
import { withErrorRecovery, ErrorRecoveryConfigs } from '@/lib/middleware/error-recovery'
import { logger } from '@/lib/logger'
import {
  handleLegacyRequest,
  handleRealTimeMovies,
  handleSmartRecommendations,
  handleBehavioralRecommendations
} from './handlers'

async function handleMoviesRequest(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url)
  const supabase = createRouteSupabaseClient(request)

  const smartMode = searchParams.get('smart') === 'true'
  const behavioralMode = searchParams.get('behavioral') === 'true'
  const realTime = searchParams.get('realtime') === 'true'
  const databaseId = searchParams.get('database')
  const query = searchParams.get('query') || ''
  const mood = searchParams.get('mood') || ''
  const genres = searchParams.get('genres')?.split(',').filter(Boolean) || []
  const limit = Math.max(1, parseInt(searchParams.get('limit') || '12') || 12)
  const page = Math.max(1, parseInt(searchParams.get('page') || '1') || 1)

  try {
    const includeExplanations = true
    const includePreferenceInsights = searchParams.get('includePreferenceInsights') === 'true'

    // Advanced intelligence parameters (temporarily disabled)
    const thematicMode = searchParams.get('thematic') === 'true'
    const advancedMode = searchParams.get('advanced') === 'true'
    const enableAdvancedQuery = searchParams.get('enableAdvancedQuery') === 'true'
    const analysisDepth = searchParams.get('analysisDepth') as 'basic' | 'standard' | 'comprehensive' | 'expert' || 'standard'

    // TODO: Re-enable after fixing hydration issues
    // if (advancedMode && query) {
    //   return await handleAdvancedIntelligenceRequest(supabase, query, limit, analysisDepth)
    // }

    // if (thematicMode && query) {
    //   return await handleThematicRecommendations(supabase, query, limit, analysisDepth)
    // }

    if (behavioralMode) {
      const response = await handleBehavioralRecommendations(supabase, limit, page, includeExplanations, includePreferenceInsights)
      // Cache behavioral recommendations for 5 minutes
      response.headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600')
      return response
    }

    if (realTime || databaseId) {
      const skipExplanations = searchParams.get('skipExplanations') === 'true'
      const response = await handleRealTimeMovies(
        limit,
        page,
        query,
        databaseId || undefined,
        supabase,
        smartMode || enableAdvancedQuery,
        skipExplanations
      )
      // Cache TMDB data for 15 minutes
      response.headers.set('Cache-Control', 'public, s-maxage=900, stale-while-revalidate=1800')
      return response
    }

    if (smartMode) {
      const response = await handleSmartRecommendations(supabase, limit, page, query, mood, genres)
      // Cache smart recommendations for 10 minutes
      response.headers.set('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=1200')
      return response
    }

    // Default to legacy handling (which now uses the service)
    return await handleLegacyRequest(request, supabase)
  } catch (error) {
    return APIErrorHandler.handle(error, {
      endpoint: '/api/movies',
      method: 'GET',
      metadata: {
        smartMode: smartMode,
        behavioralMode: behavioralMode,
        realTime: realTime,
        databaseId: databaseId,
        query: query,
        mood: mood,
        genres: genres.join(','),
        limit: limit,
        page: page
      }
    })
  }
}

// Wrap the handler with error recovery middleware
export const GET = withErrorRecovery(handleMoviesRequest, {
  ...ErrorRecoveryConfigs.dataFetch,
  fallbackResponse: {
    success: true,
    data: [],
    total: 0,
    pagination: {
      currentPage: 1,
      hasMore: false,
      totalPages: 0
    },
    source: 'fallback',
    message: 'Movies temporarily unavailable. Please try again later.'
  }
})
