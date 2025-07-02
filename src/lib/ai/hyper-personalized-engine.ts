import { createClient } from '@supabase/supabase-js'
import type { Movie } from '@/types'
import { analyzeCompleteUserBehavior, type UserBehaviorProfile } from './behavioral-analysis'
import { logger } from '@/lib/logger'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export interface PersonalizationFactors {
  behavioral_weight: number // 0-1, how much to trust user's past behavior
  temporal_weight: number // 0-1, how much to consider time-based patterns
  exploration_weight: number // 0-1, how much to encourage new discoveries
  quality_threshold_weight: number // 0-1, how strictly to filter by quality
  recency_weight: number // 0-1, how much to favor recent preferences
}

export interface HyperPersonalizedRecommendation {
  movie: Movie
  confidence_score: number // 0-100
  personalization_factors: {
    genre_affinity_score: number
    director_affinity_score: number
    quality_prediction: number
    temporal_fit_score: number
    exploration_bonus: number
    behavioral_consistency_score: number
  }
  explanation: string
  reasoning: string[]
}

export interface RealTimeLearningSignal {
  userId: string
  movieId: string
  action: 'view' | 'click' | 'save' | 'rate' | 'skip' | 'remove' | 'watch_time'
  value?: number // rating for 'rate', watch_time in minutes for 'watch_time'
  context: {
    page_type: string
    recommendation_type?: string
    position_in_list?: number
    session_id?: string
  }
  timestamp: string
}

/**
 * F-1 Hyper-Personalized Recommendation Engine
 * Combines behavioral analysis with real-time learning and advanced scoring
 */
export class HyperPersonalizedEngine {
  private defaultFactors: PersonalizationFactors = {
    behavioral_weight: 0.4,
    temporal_weight: 0.2,
    exploration_weight: 0.15,
    quality_threshold_weight: 0.15,
    recency_weight: 0.1
  }

  /**
   * Generate hyper-personalized recommendations for a user
   */
  async generateRecommendations(
    userId: string,
    options: {
      count?: number
      factors?: Partial<PersonalizationFactors>
      context?: string
      excludeWatched?: boolean
      supabaseClient?: any
    } = {}
  ): Promise<HyperPersonalizedRecommendation[]> {
    try {
      logger.info('🤖 Starting hyper-personalized recommendation generation', { 
        userId, 
        optionsCount: options.count,
        context: options.context 
      })

      // Get user behavioral profile
      const behaviorProfile = await analyzeCompleteUserBehavior(userId)
      
      // Get candidate movies
      const candidates = await this.getCandidateMovies(userId, options.excludeWatched, options.supabaseClient)
      
      // Apply real-time learning adjustments
      const adjustedFactors = await this.adjustFactorsWithRealTimeLearning(
        userId, 
        { ...this.defaultFactors, ...options.factors }
      )

      // Score each candidate
      const scoredRecommendations = await Promise.all(
        candidates.map(async (movie) => {
          const score = await this.calculatePersonalizationScore(
            movie,
            behaviorProfile,
            adjustedFactors,
            options.context
          )
          return score
        })
      )

      // Sort by confidence and apply diversity
      const ranked = scoredRecommendations
        .filter(rec => rec.confidence_score > 30) // Quality threshold
        .sort((a, b) => b.confidence_score - a.confidence_score)

      // Apply diversity to prevent over-recommendation of similar movies
      const diversified = this.applyDiversification(ranked, options.count || 10)

      logger.info('✅ Hyper-personalized recommendations generated', {
        candidateCount: candidates.length,
        scoredCount: scoredRecommendations.length,
        finalCount: diversified.length,
        averageConfidence: diversified.reduce((sum, r) => sum + r.confidence_score, 0) / diversified.length
      })

      return diversified.slice(0, options.count || 10)

          } catch (error) {
        logger.error('❌ Failed to generate hyper-personalized recommendations', { 
          errorMessage: error instanceof Error ? error.message : String(error),
          userId 
        })
        throw error
      }
  }

  /**
   * Calculate personalization score for a movie
   */
  private async calculatePersonalizationScore(
    movie: Movie,
    profile: UserBehaviorProfile,
    factors: PersonalizationFactors,
    context?: string
  ): Promise<HyperPersonalizedRecommendation> {
    const scores = {
      genre_affinity_score: this.calculateGenreAffinity(movie, profile),
      director_affinity_score: this.calculateDirectorAffinity(movie, profile),
      quality_prediction: this.predictQualityScore(movie, profile),
      temporal_fit_score: this.calculateTemporalFit(movie, profile, context),
      exploration_bonus: this.calculateExplorationBonus(movie, profile),
      behavioral_consistency_score: this.calculateBehavioralConsistency(movie, profile)
    }

    // Weighted combination
    const confidence_score = Math.min(100, Math.max(0,
      (scores.genre_affinity_score * factors.behavioral_weight * 100) +
      (scores.director_affinity_score * factors.behavioral_weight * 80) +
      (scores.quality_prediction * factors.quality_threshold_weight * 100) +
      (scores.temporal_fit_score * factors.temporal_weight * 60) +
      (scores.exploration_bonus * factors.exploration_weight * 40) +
      (scores.behavioral_consistency_score * factors.recency_weight * 50)
    ))

    const reasoning = this.generateReasoning(movie, scores, profile)
    const explanation = this.generateExplanation(movie, scores, profile)

    // Debug logging for explanation generation
    logger.info('🎯 Generated recommendation explanation', {
      movieTitle: movie.title,
      confidence: Math.round(confidence_score),
      scores: {
        genre: Math.round(scores.genre_affinity_score * 100) / 100,
        director: Math.round(scores.director_affinity_score * 100) / 100,
        quality: Math.round(scores.quality_prediction * 100) / 100,
        exploration: Math.round(scores.exploration_bonus * 100) / 100
      },
      explanation,
      reasoningCount: reasoning.length,
      userRatings: profile.rating_patterns.total_ratings
    })

    return {
      movie,
      confidence_score: Math.round(confidence_score),
      personalization_factors: scores,
      explanation,
      reasoning
    }
  }

  /**
   * Calculate genre affinity based on user's rating patterns
   */
  private calculateGenreAffinity(movie: Movie, profile: UserBehaviorProfile): number {
    if (!movie.genre || movie.genre.length === 0) return 0.3

    let totalAffinity = 0
    let genreCount = 0

    movie.genre.forEach(genre => {
      const avgRating = profile.rating_patterns.genre_rating_averages.get(genre)
      if (avgRating !== undefined) {
        // Convert 1-5 rating to 0-1 affinity
        totalAffinity += (avgRating - 1) / 4
        genreCount++
      }
    })

    return genreCount > 0 ? totalAffinity / genreCount : 0.3
  }

  /**
   * Calculate director affinity based on user's rating patterns
   */
  private calculateDirectorAffinity(movie: Movie, profile: UserBehaviorProfile): number {
    if (!movie.director || movie.director.length === 0) return 0.5

    let totalAffinity = 0
    let directorCount = 0

    movie.director.forEach(director => {
      const avgRating = profile.rating_patterns.director_rating_averages.get(director)
      if (avgRating !== undefined) {
        totalAffinity += (avgRating - 1) / 4
        directorCount++
      }
    })

    return directorCount > 0 ? totalAffinity / directorCount : 0.5
  }

  /**
   * Predict quality score based on user's taste patterns
   */
  private predictQualityScore(movie: Movie, profile: UserBehaviorProfile): number {
    const userQualityThreshold = profile.intelligence_insights.quality_threshold
    const movieRating = movie.rating || 7.0

    // Users with high standards (threshold > 4) prefer higher-rated movies
    if (userQualityThreshold > 4 && movieRating < 7.5) return 0.2
    if (userQualityThreshold > 3.5 && movieRating < 7.0) return 0.4
    if (userQualityThreshold < 3 && movieRating > 8.5) return 0.9

    // Standard quality mapping
    return Math.min(1, Math.max(0, (movieRating - 5) / 5))
  }

  /**
   * Calculate temporal fit based on time patterns
   */
  private calculateTemporalFit(movie: Movie, profile: UserBehaviorProfile, context?: string): number {
    const now = new Date()
    const isWeekend = now.getDay() === 0 || now.getDay() === 6

    let temporalScore = 0.5 // base score

    if (movie.genre) {
      const relevantGenres = isWeekend 
        ? profile.temporal_patterns.weekend_genres 
        : profile.temporal_patterns.weekday_genres

      const genreMatch = movie.genre.some(g => relevantGenres.includes(g))
      if (genreMatch) temporalScore += 0.3
    }

    // Context-based adjustments
    if (context === 'evening' && movie.runtime && movie.runtime > 150) {
      temporalScore -= 0.2 // Long movies less suitable for evening
    }
    if (context === 'quick' && movie.runtime && movie.runtime < 100) {
      temporalScore += 0.2 // Short movies better for quick viewing
    }

    return Math.min(1, Math.max(0, temporalScore))
  }

  /**
   * Calculate exploration bonus for discovering new content
   */
  private calculateExplorationBonus(movie: Movie, profile: UserBehaviorProfile): number {
    const explorationRatio = profile.intelligence_insights.exploration_vs_comfort_ratio

    // Users who explore more get bonus for unfamiliar genres/directors
    if (explorationRatio > 0.6) {
      const hasUnfamiliarGenre = movie.genre?.some(g => 
        !profile.rating_patterns.genre_rating_averages.has(g)
      )
      const hasUnfamiliarDirector = movie.director?.some(d => 
        !profile.rating_patterns.director_rating_averages.has(d)
      )

      if (hasUnfamiliarGenre || hasUnfamiliarDirector) return 0.8
    }

    return 0.3
  }

  /**
   * Calculate behavioral consistency score
   */
  private calculateBehavioralConsistency(movie: Movie, profile: UserBehaviorProfile): number {
    const consistencyScore = profile.intelligence_insights.taste_consistency_score

    // Highly consistent users get bonus for movies that match their patterns
    if (consistencyScore > 0.8) {
      const genreMatch = movie.genre?.some(g => 
        profile.rating_patterns.genre_rating_averages.get(g) >= 4
      )
      if (genreMatch) return 0.9
    }

    return 0.5
  }

  /**
   * Get candidate movies for recommendation
   */
  private async getCandidateMovies(
    userId: string, 
    excludeWatched: boolean = true,
    supabaseClient?: any
  ): Promise<Movie[]> {
    const client = supabaseClient || supabase
    let query = client
      .from('movies')
      .select('*')
      .order('rating', { ascending: false })
      .limit(500)

    if (excludeWatched) {
      // Exclude movies the user has already rated or watched
      const { data: ratedIds } = await client
        .from('ratings')
        .select('movie_id')
        .eq('user_id', userId)

      // Also exclude movies marked as watched in the watchlist
      const { data: watchedIds } = await client
        .from('watchlist')
        .select('movie_id')
        .eq('user_id', userId)
        .eq('watched', true)

      const excludeMovieIds = new Set<string>()
      
      // Add rated movie IDs
      if (ratedIds && ratedIds.length > 0) {
        ratedIds.forEach(r => {
          if (r.movie_id) excludeMovieIds.add(r.movie_id)
        })
      }
      
      // Add watched movie IDs
      if (watchedIds && watchedIds.length > 0) {
        watchedIds.forEach(w => {
          if (w.movie_id) excludeMovieIds.add(w.movie_id)
        })
      }

      // Apply exclusions if we have any
      if (excludeMovieIds.size > 0) {
        const movieIds = Array.from(excludeMovieIds)
        // Use Supabase's not() filter with in() operator
        query = query.not('id', 'in', `(${movieIds.join(',')})`)
        
        logger.info('🚫 Excluding watched/rated movies from recommendations', {
          userId,
          excludedCount: excludeMovieIds.size,
          ratedMoviesCount: ratedIds?.length || 0,
          watchedMoviesCount: watchedIds?.length || 0,
          sampleExcludedIds: movieIds.slice(0, 5), // Show first 5 for debugging
          queryFilter: `NOT id IN (${movieIds.slice(0, 3).join(',')}...)` // Debug the actual query
        })
      }
    }

    const { data: movies, error } = await query

    if (error) throw error
    return movies || []
  }

  /**
   * Adjust factors based on real-time learning signals
   */
  private async adjustFactorsWithRealTimeLearning(
    userId: string,
    baseFactor: PersonalizationFactors
  ): Promise<PersonalizationFactors> {
    try {
      // Get recent learning signals (last 7 days)
      const { data: signals } = await supabase
        .from('user_behavior_signals')
        .select('*')
        .eq('user_id', userId)
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false })
        .limit(100)

      if (!signals || signals.length === 0) return baseFactor

      // Analyze signals to adjust factors
      const adjustedFactors = { ...baseFactor }

      // If user is skipping a lot, increase exploration
      const skipRate = signals.filter(s => s.action === 'skip').length / signals.length
      if (skipRate > 0.3) {
        adjustedFactors.exploration_weight += 0.1
        adjustedFactors.behavioral_weight -= 0.05
      }

      // If user is rating consistently high, trust behavioral patterns more
      const ratingSignals = signals.filter(s => s.action === 'rate' && s.value)
      if (ratingSignals.length > 5) {
        const avgRating = ratingSignals.reduce((sum, s) => sum + s.value!, 0) / ratingSignals.length
        if (avgRating > 4) {
          adjustedFactors.behavioral_weight += 0.1
          adjustedFactors.exploration_weight -= 0.05
        }
      }

      return adjustedFactors
         } catch (error) {
       logger.warn('Failed to adjust factors with real-time learning', { 
         errorMessage: error instanceof Error ? error.message : String(error) 
       })
       return baseFactor
     }
  }

  /**
   * Apply diversification to prevent over-recommendation of similar movies
   */
  private applyDiversification(
    recommendations: HyperPersonalizedRecommendation[],
    targetCount: number
  ): HyperPersonalizedRecommendation[] {
    const diversified: HyperPersonalizedRecommendation[] = []
    const usedGenres = new Set<string>()
    const usedDirectors = new Set<string>()

    for (const rec of recommendations) {
      if (diversified.length >= targetCount) break

      // Check if this adds diversity
      const newGenres = rec.movie.genre?.filter(g => !usedGenres.has(g)) || []
      const newDirectors = rec.movie.director?.filter(d => !usedDirectors.has(d)) || []

      // Always include first recommendation
      if (diversified.length === 0 || newGenres.length > 0 || newDirectors.length > 0) {
        diversified.push(rec)
        rec.movie.genre?.forEach(g => usedGenres.add(g))
        rec.movie.director?.forEach(d => usedDirectors.add(d))
      }
    }

    // Fill remaining slots with highest-scoring recommendations
    const remaining = recommendations.filter(r => !diversified.includes(r))
    diversified.push(...remaining.slice(0, targetCount - diversified.length))

    return diversified
  }

     /**
    * Generate human-readable reasoning for the recommendation
    */
   private generateReasoning(
     movie: Movie,
     scores: any,
     _profile: UserBehaviorProfile
   ): string[] {
    const reasoning: string[] = []

    if (scores.genre_affinity_score > 0.4) {
      const topGenres = movie.genre?.slice(0, 2).join(', ')
      const strength = scores.genre_affinity_score > 0.7 ? 'consistently rated' : 'shown interest in'
      reasoning.push(`You've ${strength} ${topGenres} movies highly`)
    }

    if (scores.director_affinity_score > 0.4) {
      const topDirector = movie.director?.[0]
      const strength = scores.director_affinity_score > 0.7 ? 'enjoy movies by' : 'shown interest in films by'
      reasoning.push(`You ${strength} ${topDirector}`)
    }

    if (scores.quality_prediction > 0.6) {
      const strength = scores.quality_prediction > 0.8 ? 'high standards' : 'quality preferences'
      reasoning.push(`This movie's quality aligns with your ${strength}`)
    }

    if (scores.exploration_bonus > 0.3) {
      reasoning.push(`Recommended for discovery - expanding your horizons`)
    }

    if (scores.temporal_fit_score > 0.5) {
      reasoning.push(`Good timing based on your recent viewing patterns`)
    }

    if (scores.behavioral_consistency_score > 0.5) {
      reasoning.push(`Matches your established viewing behavior`)
    }

    return reasoning
  }

  /**
   * Generate concise explanation for the recommendation
   */
  private generateExplanation(
    movie: Movie,
    scores: any,
    profile: UserBehaviorProfile
  ): string {
    const hasRatingHistory = profile.rating_patterns.total_ratings > 0
    const hasWatchlistHistory = profile.watchlist_patterns.completion_rate > 0
    
    // For new users with no history
    if (!hasRatingHistory && !hasWatchlistHistory) {
      return `Popular ${movie.genre?.[0] || 'movie'} to help us learn your preferences`
    }
    
    // For users with minimal history (1-5 ratings)
    if (profile.rating_patterns.total_ratings <= 5) {
      if (scores.genre_affinity_score > 0.3) {
        return `Another ${movie.genre?.[0]} movie - building on your early preferences`
      }
      return `Expanding your movie taste with this ${movie.rating || 'well-rated'}/10 rated film`
    }

    // Multi-factor explanations for established users
    const factors = []
    
    if (scores.genre_affinity_score > 0.5) {
      const strength = scores.genre_affinity_score > 0.7 ? 'love for' : 'interest in'
      factors.push(`your ${strength} ${movie.genre?.[0]}`)
    }
    
    if (scores.director_affinity_score > 0.5) {
      const strength = scores.director_affinity_score > 0.7 ? 'proven enjoyment of' : 'positive response to'
      factors.push(`${strength} ${movie.director?.[0]}'s work`)
    }
    
    if (scores.quality_prediction > 0.7) {
      factors.push('its high quality rating')
    }
    
    if (scores.exploration_bonus > 0.4) {
      factors.push('discovery potential')
    }

    // Combine factors or use fallback
    if (factors.length >= 2) {
      return `Recommended based on ${factors.slice(0, 2).join(' and ')}`
    } else if (factors.length === 1) {
      return `Perfect match for ${factors[0]}`
    }

    // Enhanced fallback for established users
    return `Personalized pick based on your ${profile.rating_patterns.total_ratings} ratings`
  }

  /**
   * Record real-time learning signal
   */
  async recordLearningSignal(signal: RealTimeLearningSignal): Promise<void> {
    try {
      await supabase
        .from('user_behavior_signals')
        .insert({
          user_id: signal.userId,
          movie_id: signal.movieId,
          action: signal.action,
          value: signal.value,
          context: signal.context,
          created_at: signal.timestamp
        })

      logger.info('📊 Learning signal recorded', { signal })
    } catch (error) {
      logger.warn('Failed to record learning signal', { error, signal })
    }
  }
}

// Export singleton instance
export const hyperPersonalizedEngine = new HyperPersonalizedEngine() 