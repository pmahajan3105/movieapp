/**
 * User AI Insights API
 * Phase 3: Generates and provides AI insights about user preferences and behavior
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

      // Get user's preference insights (similar to taste profile)
      const { data: tasteProfile } = await supabase
        .from('user_preference_insights')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      // Get user's rating history
      const { data: ratings } = await supabase
        .from('ratings')
        .select(`
          rating,
          created_at,
          movies!inner (
            title,
            genre,
            year,
            director
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50)

      // Get recent recommendations
      const { data: recommendations } = await supabase
        .from('recommendations')
        .select('analysis_source, confidence, ai_insights, generated_at, reason')
        .eq('user_id', user.id)
        .order('generated_at', { ascending: false })
        .limit(20)

      // Get recent conversation sessions
      const { data: conversations } = await supabase
        .from('conversation_sessions')
        .select('session_type, session_insights, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10)

      // Generate AI insights
      const insights = generateAIInsights({
        tasteProfile,
        ratings: ratings || [],
        recommendations: recommendations || [],
        conversations: conversations || []
      })

      logger.info('Generated AI insights for user', { 
        userId: user.id, 
        insightsCount: insights.length,
        hasProfile: !!tasteProfile
      })

      return ok({
        insights,
        summary: {
          totalInsights: insights.length,
          highConfidenceInsights: insights.filter(i => i.confidence > 0.8).length,
          recentInsights: insights.filter(i => 
            new Date(i.timestamp) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          ).length
        }
      })

    } catch (error) {
      logger.error('Error generating AI insights', { 
        error: error instanceof Error ? error.message : String(error) 
      })
      return fail('Internal server error', 500)
    }
  })
)

interface InsightGenerationData {
  tasteProfile: any
  ratings: any[]
  recommendations: any[]
  conversations: any[]
}

function generateAIInsights(data: InsightGenerationData) {
  const insights: Array<{
    type: string
    title: string
    description: string
    confidence: number
    learnedFrom: string
    timestamp: string
    metadata?: any
  }> = []

  const { tasteProfile, ratings, recommendations, conversations } = data

  // Genre Preference Insights
  if (ratings.length >= 5) {
    const genreAnalysis = analyzeGenrePreferences(ratings)
    if (genreAnalysis.dominantGenre) {
      insights.push({
        type: 'genre_preference',
        title: `Strong ${genreAnalysis.dominantGenre} Preference`,
        description: `You consistently rate ${genreAnalysis.dominantGenre} movies highly (${genreAnalysis.percentage}% of your top ratings)`,
        confidence: Math.min(genreAnalysis.confidence, 0.95),
        learnedFrom: `Analysis of ${ratings.length} ratings`,
        timestamp: getLatestTimestamp(ratings),
        metadata: genreAnalysis
      })
    }

    if (genreAnalysis.emergingGenre) {
      insights.push({
        type: 'genre_discovery',
        title: `Growing Interest in ${genreAnalysis.emergingGenre}`,
        description: `Recent ratings show increasing appreciation for ${genreAnalysis.emergingGenre} films`,
        confidence: 0.7,
        learnedFrom: 'Recent rating patterns',
        timestamp: getLatestTimestamp(ratings.slice(0, 10)),
        metadata: { genre: genreAnalysis.emergingGenre }
      })
    }
  }

  // Quality Threshold Insights
  if (ratings.length >= 10) {
    const qualityAnalysis = analyzeQualityThreshold(ratings)
    insights.push({
      type: 'quality_preference',
      title: qualityAnalysis.title,
      description: qualityAnalysis.description,
      confidence: qualityAnalysis.confidence,
      learnedFrom: `Quality analysis of ${ratings.length} ratings`,
      timestamp: getLatestTimestamp(ratings),
      metadata: qualityAnalysis
    })
  }

  // Director/Actor Preferences
  if (ratings.length >= 15) {
    const creatorAnalysis = analyzeCreatorPreferences(ratings)
    if (creatorAnalysis.favoriteDirector) {
      insights.push({
        type: 'creator_preference',
        title: `Appreciates ${creatorAnalysis.favoriteDirector}'s Work`,
        description: `Consistently rates ${creatorAnalysis.favoriteDirector} films highly (${creatorAnalysis.directorRating.toFixed(1)} avg rating)`,
        confidence: creatorAnalysis.confidence,
        learnedFrom: 'Director analysis across ratings',
        timestamp: getLatestTimestamp(ratings),
        metadata: creatorAnalysis
      })
    }
  }

  // Recommendation Success Insights
  if (recommendations.length >= 5) {
    const recAnalysis = analyzeRecommendationSuccess(recommendations)
    insights.push({
      type: 'ai_performance',
      title: recAnalysis.title,
      description: recAnalysis.description,
      confidence: recAnalysis.confidence,
      learnedFrom: 'Recommendation analysis',
      timestamp: getLatestTimestamp(recommendations),
      metadata: recAnalysis
    })
  }

  // Behavioral Pattern Insights
  if (ratings.length >= 10) {
    const behaviorAnalysis = analyzeBehavioralPatterns(ratings)
    if (behaviorAnalysis.insight) {
      insights.push({
        type: 'behavioral_pattern',
        title: behaviorAnalysis.title,
        description: behaviorAnalysis.description,
        confidence: behaviorAnalysis.confidence,
        learnedFrom: 'Viewing behavior analysis',
        timestamp: getLatestTimestamp(ratings),
        metadata: behaviorAnalysis
      })
    }
  }

  // Conversation Learning Insights
  if (conversations.length >= 3) {
    const conversationAnalysis = analyzeConversationLearning(conversations)
    if (conversationAnalysis.insight) {
      insights.push({
        type: 'conversation_learning',
        // @ts-ignore - conversationAnalysis properties are guaranteed to exist when insight is true
        title: conversationAnalysis.title,
        // @ts-ignore - conversationAnalysis properties are guaranteed to exist when insight is true
        description: conversationAnalysis.description,
        // @ts-ignore - conversationAnalysis properties are guaranteed to exist when insight is true
        confidence: conversationAnalysis.confidence,
        learnedFrom: 'AI conversation analysis',
        timestamp: getLatestTimestamp(conversations),
        metadata: conversationAnalysis
      })
    }
  }

  // Profile Completeness Insight
  if (tasteProfile) {
    const completenessAnalysis = analyzeProfileCompleteness(tasteProfile, ratings, conversations)
    insights.push({
      type: 'profile_completeness',
      // @ts-ignore - completenessAnalysis properties are guaranteed to exist
      title: completenessAnalysis.title,
      // @ts-ignore - completenessAnalysis properties are guaranteed to exist
      description: completenessAnalysis.description,
      // @ts-ignore - completenessAnalysis properties are guaranteed to exist
      confidence: completenessAnalysis.confidence,
      learnedFrom: 'Profile analysis',
      // @ts-ignore - tasteProfile is checked for existence above
      timestamp: tasteProfile.updated_at,
      metadata: completenessAnalysis
    })
  }

  // Sort by confidence and recency
  return insights
    .sort((a, b) => {
      const confidenceDiff = b.confidence - a.confidence
      if (Math.abs(confidenceDiff) > 0.1) return confidenceDiff
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    })
    .slice(0, 8) // Return top 8 insights
}

function analyzeGenrePreferences(ratings: any[]) {
  const genreCounts: Record<string, { total: number; highRatings: number; avgRating: number; ratings: number[] }> = {}
  
  ratings.forEach(rating => {
    if (rating.movies?.genre) {
      rating.movies.genre.forEach((genre: string) => {
        if (!genreCounts[genre]) {
          genreCounts[genre] = { total: 0, highRatings: 0, avgRating: 0, ratings: [] }
        }
        genreCounts[genre].total++
        genreCounts[genre].ratings.push(rating.rating)
        if (rating.rating >= 4) {
          genreCounts[genre].highRatings++
        }
      })
    }
  })

  // Calculate average ratings for each genre
  Object.keys(genreCounts).forEach(genre => {
    // @ts-ignore - genreCounts[genre] is guaranteed to exist in this context
    const ratings = genreCounts[genre].ratings
    // @ts-ignore - genreCounts[genre] is guaranteed to exist in this context
    genreCounts[genre].avgRating = ratings.reduce((sum, r) => sum + r, 0) / ratings.length
  })

  // Find dominant genre (highest average rating with sufficient sample size)
  const genresByAvg = Object.entries(genreCounts)
    .filter(([_, data]) => data.total >= 3) // Minimum 3 ratings
    .sort(([_, a], [__, b]) => b.avgRating - a.avgRating)

  const dominantGenre = genresByAvg[0]
  const emergingGenre = findEmergingGenre(ratings)

  return {
    dominantGenre: dominantGenre?.[0],
    percentage: dominantGenre ? Math.round((dominantGenre[1].highRatings / dominantGenre[1].total) * 100) : 0,
    confidence: dominantGenre ? Math.min(dominantGenre[1].total * 0.15, 0.9) : 0,
    emergingGenre,
    allGenres: genreCounts
  }
}

function findEmergingGenre(ratings: any[]) {
  if (ratings.length < 10) return null

  const recentRatings = ratings.slice(0, Math.floor(ratings.length / 3)) // Recent third
  const olderRatings = ratings.slice(Math.floor(ratings.length / 3)) // Older ratings

  const recentGenres = extractGenreCounts(recentRatings)
  const olderGenres = extractGenreCounts(olderRatings)

  // Find genres that appear more frequently in recent ratings
  for (const [genre, recentCount] of Object.entries(recentGenres)) {
    const olderCount = olderGenres[genre] || 0
    const recentRatio = recentCount / recentRatings.length
    const olderRatio = olderCount / olderRatings.length

    if (recentRatio > olderRatio * 1.5 && recentCount >= 2) {
      return genre
    }
  }

  return null
}

function extractGenreCounts(ratings: any[]) {
  const counts: Record<string, number> = {}
  ratings.forEach(rating => {
    if (rating.movies?.genre) {
      rating.movies.genre.forEach((genre: string) => {
        counts[genre] = (counts[genre] || 0) + 1
      })
    }
  })
  return counts
}

function analyzeQualityThreshold(ratings: any[]) {
  const avgRating = ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length
  const highRatings = ratings.filter(r => r.rating >= 4).length
  const lowRatings = ratings.filter(r => r.rating <= 2).length

  if (avgRating >= 4.0) {
    return {
      title: 'High Quality Standards',
      description: `You maintain high standards with an average rating of ${avgRating.toFixed(1)}/5`,
      confidence: 0.85,
      avgRating,
      selectivity: (lowRatings / ratings.length) * 100
    }
  } else if (avgRating <= 2.5) {
    return {
      title: 'Critical Evaluator',
      description: `You're selective with high ratings, averaging ${avgRating.toFixed(1)}/5`,
      confidence: 0.75,
      avgRating,
      selectivity: (highRatings / ratings.length) * 100
    }
  } else {
    return {
      title: 'Balanced Rater',
      description: `You provide balanced ratings with an average of ${avgRating.toFixed(1)}/5`,
      confidence: 0.7,
      avgRating,
      selectivity: 50
    }
  }
}

function analyzeCreatorPreferences(ratings: any[]) {
  const directorCounts: Record<string, { ratings: number[]; count: number }> = {}
  
  ratings.forEach(rating => {
    if (rating.movies?.director) {
      const directors = Array.isArray(rating.movies.director) ? rating.movies.director : [rating.movies.director]
      directors.forEach((director: string) => {
        if (!directorCounts[director]) {
          directorCounts[director] = { ratings: [], count: 0 }
        }
        directorCounts[director].ratings.push(rating.rating)
        directorCounts[director].count++
      })
    }
  })

  // Find favorite director (minimum 2 movies, highest average rating)
  const favoriteDirector = Object.entries(directorCounts)
    .filter(([_, data]) => data.count >= 2)
    .map(([director, data]) => ({
      director,
      avgRating: data.ratings.reduce((sum, r) => sum + r, 0) / data.ratings.length,
      count: data.count
    }))
    .sort((a, b) => b.avgRating - a.avgRating)[0]

  return {
    favoriteDirector: favoriteDirector?.director,
    directorRating: favoriteDirector?.avgRating || 0,
    confidence: favoriteDirector ? Math.min(favoriteDirector.count * 0.2, 0.9) : 0,
    totalDirectors: Object.keys(directorCounts).length
  }
}

function analyzeRecommendationSuccess(recommendations: any[]) {
  const enhancedRecs = recommendations.filter(r => r.analysis_source === 'enhanced' || r.analysis_source === 'full_ai')
  const avgConfidence = recommendations.reduce((sum, r) => sum + (r.confidence || 0), 0) / recommendations.length

  if (avgConfidence >= 0.8) {
    return {
      title: 'High-Quality AI Matches',
      description: `AI generates ${(avgConfidence * 100).toFixed(0)}% confidence recommendations with ${enhancedRecs.length}/${recommendations.length} using enhanced analysis`,
      confidence: 0.9,
      avgConfidence,
      enhancedRatio: enhancedRecs.length / recommendations.length
    }
  } else if (avgConfidence >= 0.6) {
    return {
      title: 'Good AI Understanding',
      description: `AI shows solid understanding with ${(avgConfidence * 100).toFixed(0)}% confidence matches`,
      confidence: 0.75,
      avgConfidence,
      enhancedRatio: enhancedRecs.length / recommendations.length
    }
  } else {
    return {
      title: 'AI Still Learning',
      description: `AI is building understanding of your preferences (${(avgConfidence * 100).toFixed(0)}% confidence)`,
      confidence: 0.6,
      avgConfidence,
      enhancedRatio: enhancedRecs.length / recommendations.length
    }
  }
}

function analyzeBehavioralPatterns(ratings: any[]) {
  const currentYear = new Date().getFullYear()
  const recentMovies = ratings.filter(r => r.movies?.year >= currentYear - 3).length
  const classicMovies = ratings.filter(r => r.movies?.year <= currentYear - 20).length

  if (recentMovies > ratings.length * 0.7) {
    return {
      insight: true,
      title: 'Contemporary Film Focus',
      description: `You prefer recent releases (${Math.round((recentMovies / ratings.length) * 100)}% from last 3 years)`,
      confidence: 0.8,
      pattern: 'contemporary'
    }
  } else if (classicMovies > ratings.length * 0.4) {
    return {
      insight: true,
      title: 'Classic Film Appreciation',
      description: `You appreciate classic cinema (${Math.round((classicMovies / ratings.length) * 100)}% from 20+ years ago)`,
      confidence: 0.8,
      pattern: 'classic'
    }
  } else {
    return {
      insight: true,
      title: 'Era-Balanced Viewer',
      description: 'You enjoy films from across different eras and decades',
      confidence: 0.7,
      pattern: 'balanced'
    }
  }
}

function analyzeConversationLearning(conversations: any[]) {
  const learningEvents = conversations.filter(c => c.session_insights && Object.keys(c.session_insights).length > 0)
  
  if (learningEvents.length >= 2) {
    return {
      insight: true,
      title: 'Active AI Learner',
      description: `You actively help AI learn through conversations (${learningEvents.length} learning events)`,
      confidence: 0.85,
      events: learningEvents.length
    }
  }

  return { insight: false }
}

function analyzeProfileCompleteness(tasteProfile: any, ratings: any[], conversations: any[]) {
  let completenessScore = 0.2 // Base score

  if (tasteProfile.favorite_genres?.length > 0) completenessScore += 0.3
  if (tasteProfile.preferences?.visual_style) completenessScore += 0.2
  if (ratings.length >= 10) completenessScore += 0.2
  if (conversations.length >= 3) completenessScore += 0.1

  if (completenessScore >= 0.8) {
    return {
      title: 'Rich AI Profile',
      description: 'Your AI profile is well-developed with comprehensive preference data',
      confidence: 0.9,
      completeness: completenessScore
    }
  } else if (completenessScore >= 0.5) {
    return {
      title: 'Developing AI Profile',
      description: 'Your AI profile is growing - rate more movies to improve recommendations',
      confidence: 0.7,
      completeness: completenessScore
    }
  } else {
    return {
      title: 'Early AI Learning',
      description: 'Your AI profile is just getting started - help it learn by rating movies',
      confidence: 0.6,
      completeness: completenessScore
    }
  }
}

function getLatestTimestamp(items: any[]) {
  if (items.length === 0) return new Date().toISOString()
  return items[0].created_at || items[0].generated_at || items[0].timestamp || new Date().toISOString()
}