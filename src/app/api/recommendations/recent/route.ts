/**
 * Recent Recommendations API
 * Phase 3: Provides recent recommendations with full AI analysis details
 */

import { withSupabase, withError, ok, fail } from '@/lib/api/factory'
import { logger } from '@/lib/logger'

export const GET = withError(
  withSupabase(async ({ request, supabase }) => {
    try {
      const url = new URL(request.url)
      const limit = parseInt(url.searchParams.get('limit') || '10')
      const includeInsights = url.searchParams.get('includeInsights') === 'true'

      // Get current user
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        return fail('Unauthorized', 401)
      }

      // Get recent recommendations with movie details
      const { data: recommendations, error: recsError } = await supabase
        .from('recommendations')
        .select(`
          id,
          movie_id,
          score,
          reason,
          discovery_source,
          analysis_source,
          confidence,
          ai_insights,
          generated_at,
          enhanced_at,
          movies!inner (
            id,
            title,
            year,
            genre,
            director,
            plot,
            poster_url,
            rating,
            runtime
          )
        `)
        .eq('user_id', user.id)
        .order('generated_at', { ascending: false })
        .limit(limit)

      if (recsError) {
        logger.error('Failed to fetch recent recommendations', { 
          error: recsError.message, 
          userId: user.id 
        })
        return fail('Failed to fetch recommendations', 500)
      }

      // Transform the data to match the expected format
      const transformedRecommendations = (recommendations || []).map(rec => ({
        id: rec.id,
        movie: {
          id: rec.movies.id,
          title: rec.movies.title,
          year: rec.movies.year,
          genre: rec.movies.genre,
          director: rec.movies.director,
          plot: rec.movies.plot,
          poster_url: rec.movies.poster_url,
          rating: rec.movies.rating,
          runtime: rec.movies.runtime
        },
        score: rec.score,
        confidence: rec.confidence,
        reason: rec.reason,
        discovery_source: rec.discovery_source,
        analysis_source: rec.analysis_source,
        ai_insights: includeInsights ? rec.ai_insights : undefined,
        generated_at: rec.generated_at,
        enhanced_at: rec.enhanced_at
      }))

      // Get summary statistics
      const summary = {
        total: transformedRecommendations.length,
        bySource: getRecommendationsBySource(transformedRecommendations),
        averageConfidence: calculateAverageConfidence(transformedRecommendations),
        latestGeneration: transformedRecommendations[0]?.generated_at,
        enhancedCount: transformedRecommendations.filter(r => 
          r.analysis_source === 'enhanced' || r.analysis_source === 'full_ai'
        ).length
      }

      logger.info('Retrieved recent recommendations', { 
        userId: user.id, 
        count: transformedRecommendations.length,
        limit,
        includeInsights
      })

      return ok({
        recommendations: transformedRecommendations,
        summary,
        meta: {
          limit,
          includeInsights,
          requestedAt: new Date().toISOString()
        }
      })

    } catch (error) {
      logger.error('Error fetching recent recommendations', { 
        error: error instanceof Error ? error.message : String(error) 
      })
      return fail('Internal server error', 500)
    }
  })
)

function getRecommendationsBySource(recommendations: any[]) {
  return recommendations.reduce((acc, rec) => {
    const source = rec.analysis_source || 'unknown'
    acc[source] = (acc[source] || 0) + 1
    return acc
  }, {} as Record<string, number>)
}

function calculateAverageConfidence(recommendations: any[]) {
  if (recommendations.length === 0) return 0
  
  const totalConfidence = recommendations.reduce((sum, rec) => sum + (rec.confidence || 0), 0)
  return Number((totalConfidence / recommendations.length).toFixed(3))
}