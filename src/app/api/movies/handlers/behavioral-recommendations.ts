import { NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'

import { getMovieService } from '@/lib/services/movie-service'
import { logger } from '@/lib/logger'
import { UnifiedAIService } from '@/lib/ai'

export async function handleBehavioralRecommendations(
  supabase: SupabaseClient,
  limit: number,
  page: number,
  includeExplanations: boolean,
  includePreferenceInsights: boolean
) {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    // Temporarily allow unauthorized access for debugging
    logger.warn(
      'No user found in behavioral recommendations, falling back to basic recommendations'
    )
    // Return basic recommendations instead of erroring
    try {
      const movieService = getMovieService()
      const popularResult = await movieService.getPopularMovies({ limit, page })
      return NextResponse.json({
        success: true,
        data: popularResult.movies,
        total: popularResult.totalResults,
        pagination: {
          currentPage: page,
          limit,
          hasMore: page * limit < popularResult.totalResults,
          totalPages: Math.ceil(popularResult.totalResults / limit),
        },
        source: 'popular_fallback',
        note: 'Authentication failed, showing popular movies',
      })
    } catch (fallbackError) {
      logger.error('Fallback to popular movies also failed', {
        error: fallbackError instanceof Error ? fallbackError.message : 'Unknown error',
      })
      return NextResponse.json({
        success: true,
        data: [],
        total: 0,
        pagination: { currentPage: page, limit, hasMore: false, totalPages: 0 },
        source: 'empty_fallback',
        note: 'All movie services failed, showing empty result',
      })
    }
  }

  // Optionally fetch preference insights (30d window)
  let preferenceInsights: any = null
  if (includePreferenceInsights) {
    const { data: insightRow } = await supabase
      .from('user_preference_insights')
      .select('insights, confidence_score')
      .eq('user_id', user.id)
      .eq('insight_type', 'genre_preference')
      .eq('time_window', '30d')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (insightRow) {
      preferenceInsights = {
        insights: insightRow.insights,
        confidence_score: insightRow.confidence_score,
      }
    }
  }

  // Use unified AI service for behavioral recommendations
  const unifiedAI = UnifiedAIService.getInstance()
  const recommendations = await unifiedAI.getRecommendations({
    userId: user.id,
    algorithm: 'behavioral',
    context: {
      limit: limit * 3, // Get more candidates for better filtering
      includeExplanations,
    },
  })

  const start = (page - 1) * limit
  const moviesSlice = recommendations.movies.slice(start, start + limit)

  // Add explanations if they were generated
  const moviesWithExplanations = moviesSlice.map((movie: any) => ({
    ...movie,
    explanation: recommendations.explanations?.[movie.id] || null,
  }))

  return NextResponse.json({
    success: true,
    data: moviesWithExplanations,
    total: recommendations.movies.length,
    pagination: {
      currentPage: page,
      limit,
      hasMore: start + limit < recommendations.movies.length,
      totalPages: Math.ceil(recommendations.movies.length / limit),
    },
    source: 'behavioral',
    algorithm: recommendations.algorithm,
    performance: recommendations.performance,
    preferenceInsights,
  })
}
