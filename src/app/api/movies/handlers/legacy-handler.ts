import { NextRequest, NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getMovieService } from '@/lib/services/movie-service'
import { ExplanationService } from '@/lib/ai/explanation-service'
import { logger } from '@/lib/logger'

export async function handleLegacyRequest(request: NextRequest, supabase: SupabaseClient) {
  const { searchParams } = new URL(request.url)
  const limit = Math.max(1, parseInt(searchParams.get('limit') || '12') || 12)
  const page = Math.max(1, parseInt(searchParams.get('page') || '1') || 1)
  const usePreferences = searchParams.get('preferences') === 'true'

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const movieService = getMovieService()
  let result = null

  if (usePreferences && user) {
    const preferencesResult = await movieService.getMoviesByPreferences(user.id, { limit, page })
    if (preferencesResult) {
      result = {
        success: true,
        data: preferencesResult.movies,
        total: preferencesResult.totalResults,
        page: preferencesResult.page,
        limit,
        hasMore: preferencesResult.page * limit < preferencesResult.totalResults,
        source: preferencesResult.source,
      }
    }
  }

  // Fallback to popular movies if preferences fail or are not requested
  if (!result) {
    const popularResult = await movieService.getPopularMovies({ limit, page })
    result = {
      success: true,
      data: popularResult.movies,
      total: popularResult.totalResults,
      page: popularResult.page,
      limit,
      hasMore: popularResult.page * limit < popularResult.totalResults,
      source: popularResult.source,
    }
  }

  // Attach explanations if authenticated user
  const {
    data: { user: legacyUser },
  } = await supabase.auth.getUser()

  if (legacyUser && result.data?.length) {
    const explanationService = new ExplanationService()
    try {
      const explanations = await explanationService.generateExplanationsForMovies(legacyUser.id, result.data)
      result.data = result.data.map((movie: any) => ({
        ...movie,
        explanation: explanations.get(movie.id) || null
      }))
    } catch (error) {
      logger.warn('Failed to generate batch explanations for legacy', { 
        error: error instanceof Error ? error.message : String(error) 
      })
      // Continue without explanations
    }
  }

  const response = {
    success: result.success,
    data: result.data,
    total: result.total,
    pagination: {
      currentPage: result.page,
      limit: limit,
      hasMore: result.hasMore,
      totalPages: Math.ceil(result.total / limit),
    },
    source: result.source,
  }

  return NextResponse.json(response)
}