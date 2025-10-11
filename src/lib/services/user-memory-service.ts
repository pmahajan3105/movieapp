import { createServerClient } from '@/lib/supabase/server-client'
import { logger } from '@/lib/logger'
import type { Movie } from '@/types'

export interface UserMemory {
  seenMovieIds: Set<number>
  seenRecent: Set<number> // Movies seen in last 30 days (for novelty tracking)
  ratedMovies: Array<{
    movie_id: string
    rating: number | null
    interested: boolean
    rated_at: string
  }>
  watchlistMovies: Array<{
    movie_id: string
    added_at: string
    watched: boolean
  }>
  genrePreferences: Map<string, number>
  recentInteractions: Array<{
    event_type: string
    movie_id: string
    metadata: any
    created_at: string
  }>
  qualityThreshold: number
  explorationWeight: number
}

export class UserMemoryService {
  private supabase: Awaited<ReturnType<typeof createServerClient>>
  
  constructor() {
    this.supabase = createServerClient() as any
  }
  
  private async getSupabase() {
    if (!this.supabase) {
      this.supabase = await createServerClient()
    }
    return this.supabase
  }
  
  /**
   * Aggregate all user context with SINGLE batch query
   * This is the core method that provides unified memory
   */
  async getUnifiedMemory(userId: string): Promise<UserMemory> {
    try {
      const supabase = await this.getSupabase()
      // Single query with joins - much faster than multiple queries
      const { data, error } = await supabase
        .from('user_profiles')
        .select(`
          id,
          preferences,
          watchlist:watchlist(movie_id, added_at, watched),
          ratings:ratings(movie_id, rating, interested, rated_at),
          behavior:user_interactions(
            interaction_type,
            movie_id,
            metadata,
            created_at
          )
        `)
        .eq('id', userId)
        .single()
      
      if (error) throw error
      
      // Process the batched data
      const seenMovieIds = new Set<number>()
      const seenRecent = new Set<number>() // Movies seen in last 30 days
      
      // Get TMDB IDs for movies in watchlist and ratings
      const movieIds = new Set<string>()
      const recentMovieIds = new Set<string>() // For novelty tracking
      
      if (data.watchlist) {
        for (const item of data.watchlist) {
          movieIds.add(item.movie_id)
          // Track recent additions (last 30 days)
          if (this.isRecent(item.added_at, 30)) {
            recentMovieIds.add(item.movie_id)
          }
        }
      }
      if (data.ratings) {
        for (const rating of data.ratings) {
          movieIds.add(rating.movie_id)
          // Track recent ratings (last 30 days)
          if (this.isRecent(rating.rated_at, 30)) {
            recentMovieIds.add(rating.movie_id)
          }
        }
      }
      
      // Fetch TMDB IDs for all seen movies
      if (movieIds.size > 0) {
        const { data: movies } = await supabase
          .from('movies')
          .select('id, tmdb_id')
          .in('id', Array.from(movieIds))
        
        if (movies) {
          for (const movie of movies) {
            if (movie.tmdb_id) {
              seenMovieIds.add(movie.tmdb_id)
              // Add to recent if it was seen recently
              if (recentMovieIds.has(movie.id)) {
                seenRecent.add(movie.tmdb_id)
              }
            }
          }
        }
      }
      
      // Calculate genre preferences with recency decay
      const genrePreferences = await this.calculateGenreWeights(data.ratings || [], data.behavior || [])
      
      // Filter recent interactions (last 30 days)
      const recentInteractions = (data.behavior || [])
        .filter(b => this.isRecent(b.created_at, 30))
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .map(b => ({
          event_type: b.interaction_type,
          movie_id: b.movie_id,
          metadata: b.metadata,
          created_at: b.created_at
        }))
      
      return {
        seenMovieIds,
        seenRecent,
        ratedMovies: data.ratings || [],
        watchlistMovies: data.watchlist || [],
        genrePreferences,
        recentInteractions,
        qualityThreshold: data.preferences?.quality_threshold ?? 7.0,
        explorationWeight: data.preferences?.exploration_weight ?? 0.2,
      }
    } catch (error) {
      logger.error('Failed to fetch unified memory', { userId, error })
      // Return empty memory on error - graceful degradation
      return this.getEmptyMemory()
    }
  }
  
  /**
   * Fallback empty memory for graceful degradation
   */
  private getEmptyMemory(): UserMemory {
    return {
      seenMovieIds: new Set<number>(),
      seenRecent: new Set<number>(),
      ratedMovies: [],
      watchlistMovies: [],
      genrePreferences: new Map(),
      recentInteractions: [],
      qualityThreshold: 7.0,
      explorationWeight: 0.2,
    }
  }
  
  /**
   * Helper to filter unseen movies
   */
  async filterUnseenMovies(userId: string, movies: Movie[]): Promise<Movie[]> {
    try {
      const memory = await this.getUnifiedMemory(userId)
      return movies.filter(movie => {
        // Filter out movies user has already seen
        return !memory.seenMovieIds.has(movie.tmdb_id || 0)
      })
    } catch (error) {
      logger.warn('Failed to filter unseen movies, returning all', { userId, error })
      return movies // Return unfiltered on error
    }
  }
  
  /**
   * Enrich AI prompts with user context
   */
  async enrichPromptWithMemory(userId: string, basePrompt: string): Promise<string> {
    try {
      const memory = await this.getUnifiedMemory(userId)
      
      // Only enrich if we have meaningful data
      if (memory.seenMovieIds.size === 0) {
        return basePrompt
      }
      
      const genreList = Array.from(memory.genrePreferences.entries())
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([genre, weight]) => `${genre} (${weight.toFixed(2)})`)
        .join(', ')
      
      const recentMovies = memory.recentInteractions
        .slice(0, 5)
        .map(i => i.movie_id)
        .join(', ')
      
      return `${basePrompt}

User Context:
- Favorite genres: ${genreList || 'Not enough data yet'}
- Quality standard: ${memory.qualityThreshold}/10
- Recently interacted with movies: ${recentMovies || 'None'}

Important: DO NOT recommend any movies the user has already seen.
Already seen movies (sample): ${Array.from(memory.seenMovieIds).slice(0, 50).join(', ')}`
    } catch (error) {
      logger.warn('Failed to enrich prompt with memory, using base prompt', { userId, error })
      return basePrompt // Fallback to base prompt
    }
  }
  
  /**
   * Calculate genre preferences with recency decay
   */
  private async calculateGenreWeights(
    ratings: Array<{ movie_id: string; rating: number | null; interested: boolean; rated_at: string }>,
    behavior: Array<{ interaction_type: string; movie_id: string; metadata: any; created_at: string }>
  ): Promise<Map<string, number>> {
    const genreWeights = new Map<string, number>()
    
    // Process ratings
    for (const rating of ratings) {
      if (rating.interested && rating.rating && rating.rating >= 3) {
        // Get movie genres (this would need to be fetched from movies table)
        // For now, we'll use a simplified approach
        const weight = this.calculateDecayedWeight(rating.rated_at, rating.rating / 5.0)
        
        // This is a simplified version - in reality we'd need to fetch movie genres
        // and apply weights to each genre
        genreWeights.set('general', (genreWeights.get('general') || 0) + weight)
      }
    }
    
    // Process behavior signals
    for (const signal of behavior) {
      if (signal.interaction_type === 'view_details' || signal.interaction_type === 'recommendation_click') {
        const weight = this.calculateDecayedWeight(signal.created_at, 0.5)
        genreWeights.set('engagement', (genreWeights.get('engagement') || 0) + weight)
      }
    }
    
    return this.normalizeWeights(genreWeights)
  }
  
  /**
   * Calculate decayed weight based on time
   */
  private calculateDecayedWeight(timestamp: string, baseWeight: number): number {
    const daysSince = this.getDaysSince(timestamp)
    const decayRate = 0.95 // 95% retention per day
    const decayedWeight = Math.pow(decayRate, daysSince)
    
    return decayedWeight * baseWeight
  }
  
  /**
   * Get days since timestamp
   */
  private getDaysSince(timestamp: string): number {
    const now = new Date()
    const then = new Date(timestamp)
    const diffTime = Math.abs(now.getTime() - then.getTime())
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  }
  
  /**
   * Check if timestamp is within specified days
   */
  private isRecent(timestamp: string, days: number): boolean {
    return this.getDaysSince(timestamp) <= days
  }
  
  /**
   * Normalize weights to 0-1 range
   */
  private normalizeWeights(weights: Map<string, number>): Map<string, number> {
    const maxWeight = Math.max(...Array.from(weights.values()))
    if (maxWeight === 0) return weights
    
    const normalized = new Map<string, number>()
    for (const [genre, weight] of weights.entries()) {
      normalized.set(genre, weight / maxWeight)
    }
    
    return normalized
  }
  
  /**
   * Format genre preferences for display
   */
  private formatGenrePreferences(preferences: Map<string, number>): string {
    return Array.from(preferences.entries())
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([genre, weight]) => `${genre} (${weight.toFixed(2)})`)
      .join(', ')
  }
  
  /**
   * Apply novelty penalties to recommendations
   * Reduces scores for movies similar to recently seen ones
   */
  async applyNoveltyPenalties(userId: string, recommendations: any[]): Promise<any[]> {
    try {
      const memory = await this.getUnifiedMemory(userId)
      
      if (memory.seenRecent.size === 0) {
        return recommendations // No recent movies, no penalties needed
      }
      
      return recommendations.map(rec => {
        // Check if this movie is similar to recently seen ones
        const isSimilarToRecent = this.checkSimilarityToRecent(rec.movie, memory.seenRecent)
        
        if (isSimilarToRecent) {
          // Apply novelty penalty (reduce score by 20%)
          const penalty = 0.8
          return {
            ...rec,
            score: rec.score * penalty,
            noveltyPenalty: true,
            originalScore: rec.score
          }
        }
        
        return rec
      })
    } catch (error) {
      logger.warn('Failed to apply novelty penalties, returning original recommendations', { userId, error })
      return recommendations
    }
  }
  
  /**
   * Check if a movie is similar to recently seen movies
   * This is a simplified similarity check - could be enhanced with ML
   */
  private checkSimilarityToRecent(movie: any, seenRecent: Set<number>): boolean {
    // For now, just check if it's the same movie
    // In a real implementation, this would check genre similarity, cast, etc.
    return seenRecent.has(movie.tmdb_id)
  }
}
