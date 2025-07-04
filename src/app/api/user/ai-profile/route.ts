/**
 * User AI Profile API
 * Phase 3: Provides complete AI profile including taste preferences and learning history
 */

import { withSupabase, withError, ok, fail } from '@/lib/api/factory'
import { logger } from '@/lib/logger'

export const GET = withError(
  withSupabase(async ({ request, supabase }) => {
    try {
      // Get current user
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        return fail('Unauthorized', 401)
      }

      // Get user preference insights (similar to taste profile)
      const { data: tasteProfile, error: profileError } = await supabase
        .from('user_preference_insights')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (profileError && profileError.code !== 'PGRST116') { // Ignore "not found" error
        logger.error('Failed to fetch taste profile', { error: profileError.message, userId: user.id })
        return fail('Failed to fetch taste profile', 500)
      }

      // Get user's rating history for basic preferences if no taste profile exists
      let basicPreferences = null
      if (!tasteProfile) {
        const { data: ratings } = await supabase
          .from('ratings')
          .select(`
            rating,
            movies!inner (
              genre
            )
          `)
          .eq('user_id', user.id)
          .gte('rating', 4) // Good ratings only
          .limit(20)

        if (ratings && ratings.length > 0) {
          // Extract favorite genres from ratings
          const genreCounts: Record<string, number> = {}
          ratings.forEach(rating => {
            if (rating.movies?.genre) {
              rating.movies.genre.forEach((genre: string) => {
                genreCounts[genre] = (genreCounts[genre] || 0) + 1
              })
            }
          })

          const favoriteGenres = Object.entries(genreCounts)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 3)
            .map(([genre]) => genre)

          basicPreferences = {
            favorite_genres: favoriteGenres,
            total_ratings: ratings.length,
            source: 'ratings_analysis'
          }
        }
      }

      // Get recent conversations for learning context
      // @ts-ignore - temporary fix for non-essential AI feature
      const { data: recentConversations } = await supabase
        .from('conversation_sessions')
        .select('session_type, created_at, session_insights')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5)

      // Get recommendation statistics
      const { data: recommendationStats } = await supabase
        .from('recommendations')
        .select('analysis_source, confidence, generated_at')
        .eq('user_id', user.id)
        .order('generated_at', { ascending: false })
        .limit(20)

      // Calculate AI learning statistics
      // @ts-ignore - temporary fix for non-essential AI feature
      const learningStats = calculateLearningStats(tasteProfile, recommendationStats, recentConversations)

      const profile = tasteProfile || {
        user_id: user.id,
        preferences: basicPreferences || {},
        favorite_genres: basicPreferences?.favorite_genres || [],
        ai_confidence: basicPreferences ? 0.4 : 0.2,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      logger.info('Retrieved user AI profile', { 
        userId: user.id, 
        hasProfile: !!tasteProfile,
        aiConfidence: ('ai_confidence' in profile ? (profile as any).ai_confidence : (profile as any).confidence_score ?? 0),
        favoriteGenres: (profile as any).favorite_genres?.length || 0
      })

      return ok({
        profile,
        learningStats,
        recentConversations: recentConversations || [],
        recommendationHistory: {
          total: recommendationStats?.length || 0,
          bySource: groupRecommendationsBySource(recommendationStats || []),
          averageConfidence: calculateAverageConfidence(recommendationStats || [])
        },
        aiConfidence: ('ai_confidence' in profile ? (profile as any).ai_confidence : (profile as any).confidence_score ?? 0)
      })

    } catch (error) {
      logger.error('Error fetching user AI profile', { 
        error: error instanceof Error ? error.message : String(error) 
      })
      return fail('Internal server error', 500)
    }
  })
)

export const PUT = withError(
  withSupabase(async ({ request, supabase }) => {
    try {
      const { preferences, favorite_genres, ai_confidence } = await request.json()

      // Get current user
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        return fail('Unauthorized', 401)
      }

      // Update taste profile
      const { data: updatedProfile, error: updateError } = await supabase
        .from('user_preference_insights')
        .upsert({
          user_id: user.id,
          insight_type: 'taste_profile',
          insights: {
            preferences,
            favorite_genres,
            ai_confidence
          },
          confidence_score: ai_confidence,
          time_window: 'all_time',
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (updateError) {
        logger.error('Failed to update taste profile', { error: updateError.message, userId: user.id })
        return fail('Failed to update taste profile', 500)
      }

      logger.info('Updated user taste profile', { 
        userId: user.id,
        aiConfidence: ai_confidence,
        favoriteGenres: favorite_genres?.length || 0
      })

      return ok({
        profile: updatedProfile,
        message: 'Taste profile updated successfully'
      })

    } catch (error) {
      logger.error('Error updating user AI profile', { 
        error: error instanceof Error ? error.message : String(error) 
      })
      return fail('Internal server error', 500)
    }
  })
)

function calculateLearningStats(tasteProfile: any, recommendations: any[], conversations: any[]) {
  const stats = {
    totalLearningEvents: 0,
    lastLearningEvent: null as string | null,
    learningSource: {
      ratings: 0,
      conversations: 0,
      interactions: 0
    },
    aiProgress: {
      genreUnderstanding: 0,
      stylePreferences: 0,
      behavioralPattern: 0,
      overallConfidence: tasteProfile?.ai_confidence || 0.2
    }
  }

  // Count learning events
  if (tasteProfile) {
    stats.totalLearningEvents++
    stats.lastLearningEvent = tasteProfile.last_learning_event || tasteProfile.updated_at
  }

  stats.totalLearningEvents += conversations?.length || 0
  stats.learningSource.conversations = conversations?.length || 0

  // Calculate AI progress
  if (tasteProfile?.favorite_genres?.length) {
    stats.aiProgress.genreUnderstanding = Math.min(tasteProfile.favorite_genres.length * 0.25, 1.0)
  }

  if (tasteProfile?.preferences?.visual_style || tasteProfile?.preferences?.pacing_preference) {
    stats.aiProgress.stylePreferences = 0.8
  }

  if (recommendations?.length > 5) {
    stats.aiProgress.behavioralPattern = Math.min(recommendations.length * 0.1, 1.0)
  }

  return stats
}

function groupRecommendationsBySource(recommendations: any[]) {
  const grouped = recommendations.reduce((acc, rec) => {
    const source = rec.analysis_source || 'unknown'
    acc[source] = (acc[source] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  return grouped
}

function calculateAverageConfidence(recommendations: any[]) {
  if (recommendations.length === 0) return 0

  const totalConfidence = recommendations.reduce((sum, rec) => sum + (rec.confidence || 0), 0)
  return totalConfidence / recommendations.length
}