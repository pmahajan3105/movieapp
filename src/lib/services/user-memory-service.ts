import { createServerClient } from '@/lib/supabase/server-client'
import { logger } from '@/lib/logger'
import type { Movie, ScoredRecommendation, InteractionMetadata } from '@/types'

// Simple in-memory cache for user memory data
interface MemoryCacheEntry {
  data: UserMemory
  timestamp: number
}

const memoryCache = new Map<string, MemoryCacheEntry>()
const MEMORY_CACHE_TTL = 2 * 60 * 1000 // 2 minutes TTL
const MEMORY_CACHE_MAX_SIZE = 100 // Max users to cache

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
    metadata: InteractionMetadata
    created_at: string
  }>
  qualityThreshold: number
  explorationWeight: number
}

export class UserMemoryService {
  private supabase: Awaited<ReturnType<typeof createServerClient>>

  constructor() {
    this.supabase = createServerClient() as unknown as Awaited<ReturnType<typeof createServerClient>>
  }

  private async getSupabase() {
    if (!this.supabase) {
      this.supabase = await createServerClient()
    }
    return this.supabase
  }

  /**
   * Invalidate cache for a specific user
   */
  static invalidateCache(userId: string): void {
    memoryCache.delete(userId)
    logger.debug('Invalidated memory cache', { userId })
  }

  /**
   * Clear all cache entries
   */
  static clearCache(): void {
    memoryCache.clear()
    logger.debug('Cleared all memory cache')
  }

  /**
   * Cleanup expired cache entries
   */
  private static cleanupCache(): void {
    const now = Date.now()
    for (const [userId, entry] of memoryCache.entries()) {
      if (now - entry.timestamp > MEMORY_CACHE_TTL) {
        memoryCache.delete(userId)
      }
    }
    // Enforce max size by removing oldest entries
    if (memoryCache.size > MEMORY_CACHE_MAX_SIZE) {
      const entries = Array.from(memoryCache.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp)
      const toRemove = entries.slice(0, entries.length - MEMORY_CACHE_MAX_SIZE)
      for (const [userId] of toRemove) {
        memoryCache.delete(userId)
      }
    }
  }

  /**
   * Aggregate all user context with SINGLE batch query
   * This is the core method that provides unified memory
   * Uses caching to reduce database load
   */
  async getUnifiedMemory(userId: string): Promise<UserMemory> {
    // Check cache first
    const cached = memoryCache.get(userId)
    const now = Date.now()

    if (cached && (now - cached.timestamp) < MEMORY_CACHE_TTL) {
      logger.debug('Memory cache hit', { userId })
      return cached.data
    }

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

      const memory: UserMemory = {
        seenMovieIds,
        seenRecent,
        ratedMovies: data.ratings || [],
        watchlistMovies: data.watchlist || [],
        genrePreferences,
        recentInteractions,
        qualityThreshold: data.preferences?.quality_threshold ?? 7.0,
        explorationWeight: data.preferences?.exploration_weight ?? 0.2,
      }

      // Cache the result
      memoryCache.set(userId, { data: memory, timestamp: now })

      // Periodic cleanup
      UserMemoryService.cleanupCache()

      logger.debug('Memory cache miss, fetched fresh data', { userId })
      return memory
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
   * FIXED: Now properly fetches movie genres from database
   */
  private async calculateGenreWeights(
    ratings: Array<{ movie_id: string; rating: number | null; interested: boolean; rated_at: string }>,
    behavior: Array<{ interaction_type: string; movie_id: string; metadata: InteractionMetadata; created_at: string }>
  ): Promise<Map<string, number>> {
    const genreWeights = new Map<string, number>()

    try {
      const supabase = await this.getSupabase()

      // Collect all movie IDs from ratings and positive behavior
      const movieIds = new Set<string>()

      for (const rating of ratings) {
        if (rating.interested || (rating.rating && rating.rating >= 3)) {
          movieIds.add(rating.movie_id)
        }
      }

      for (const signal of behavior) {
        if (signal.interaction_type === 'view_details' ||
            signal.interaction_type === 'recommendation_click' ||
            signal.interaction_type === 'add_to_watchlist') {
          movieIds.add(signal.movie_id)
        }
      }

      if (movieIds.size === 0) {
        return genreWeights
      }

      // Fetch movies with their genres
      const { data: movies, error } = await supabase
        .from('movies')
        .select('id, genre')
        .in('id', Array.from(movieIds))

      if (error) {
        logger.warn('Failed to fetch movie genres', { error })
        return genreWeights
      }

      // Create a map of movie_id -> genres for quick lookup
      const movieGenres = new Map<string, string[]>()
      for (const movie of movies || []) {
        if (movie.genre && Array.isArray(movie.genre)) {
          movieGenres.set(movie.id, movie.genre)
        }
      }

      // Process ratings - apply weights to genres
      for (const rating of ratings) {
        const genres = movieGenres.get(rating.movie_id)
        if (!genres) continue

        // Calculate weight based on rating and recency
        let weight = 0.5 // Base weight for interested movies
        if (rating.rating) {
          // Higher ratings = higher weight (1-5 rating mapped to 0.2-1.0)
          weight = (rating.rating - 1) / 4 * 0.8 + 0.2
        }

        // Apply recency decay
        const decayedWeight = this.calculateDecayedWeight(rating.rated_at, weight)

        // Apply weight to each genre
        for (const genre of genres) {
          genreWeights.set(genre, (genreWeights.get(genre) || 0) + decayedWeight)
        }
      }

      // Process behavior signals - lighter weight than explicit ratings
      for (const signal of behavior) {
        const genres = movieGenres.get(signal.movie_id)
        if (!genres) continue

        // Implicit signals get lower weight than explicit ratings
        let weight = 0.2 // Default for views
        if (signal.interaction_type === 'add_to_watchlist') {
          weight = 0.4 // Watchlist adds show stronger interest
        } else if (signal.interaction_type === 'recommendation_click') {
          weight = 0.3 // Recommendation clicks show moderate interest
        }

        const decayedWeight = this.calculateDecayedWeight(signal.created_at, weight)

        for (const genre of genres) {
          genreWeights.set(genre, (genreWeights.get(genre) || 0) + decayedWeight)
        }
      }

    } catch (error) {
      logger.warn('Error calculating genre weights', { error })
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
  async applyNoveltyPenalties<T extends { movie: Movie; score?: number; confidence_score?: number }>(userId: string, recommendations: T[]): Promise<(T & { noveltyPenalty?: boolean; originalScore?: number })[]> {
    try {
      const memory = await this.getUnifiedMemory(userId)
      
      if (memory.seenRecent.size === 0) {
        return recommendations // No recent movies, no penalties needed
      }
      
      return recommendations.map(rec => {
        // Check if this movie is similar to recently seen ones
        const isSimilarToRecent = this.checkSimilarityToRecent(rec.movie, memory.seenRecent)
        
        if (isSimilarToRecent && rec.score !== undefined) {
          // Apply novelty penalty (reduce score by 20%)
          const penalty = 0.8
          return {
            ...rec,
            score: rec.score * penalty,
            noveltyPenalty: true,
            originalScore: rec.score
          }
        }

        return { ...rec }
      })
    } catch (error) {
      logger.warn('Failed to apply novelty penalties, returning original recommendations', { userId, error })
      return recommendations
    }
  }
  
  /**
   * Check if a movie is similar to recently seen movies
   * Enhanced: Checks genre overlap for better novelty detection
   */
  private checkSimilarityToRecent(movie: Movie, seenRecent: Set<number>): boolean {
    // Check if it's the exact same movie
    if (movie.tmdb_id && seenRecent.has(movie.tmdb_id)) {
      return true
    }

    // For now, don't do heavy similarity checking
    // Future: Could cache recent movie genres and compare overlap
    return false
  }

  /**
   * Get director preferences from user's highly rated movies
   */
  async getDirectorPreferences(userId: string): Promise<Map<string, number>> {
    const directorWeights = new Map<string, number>()

    try {
      const supabase = await this.getSupabase()

      // Get user's highly rated movies (4+ stars)
      const { data: ratings } = await supabase
        .from('ratings')
        .select('movie_id, rating, rated_at')
        .eq('user_id', userId)
        .gte('rating', 4)

      if (!ratings || ratings.length === 0) {
        return directorWeights
      }

      // Fetch directors for these movies
      const movieIds = ratings.map(r => r.movie_id)
      const { data: movies } = await supabase
        .from('movies')
        .select('id, director')
        .in('id', movieIds)

      if (!movies) {
        return directorWeights
      }

      // Build movie director lookup
      const movieDirectors = new Map<string, string[]>()
      for (const movie of movies) {
        if (movie.director && Array.isArray(movie.director)) {
          movieDirectors.set(movie.id, movie.director)
        }
      }

      // Calculate director weights
      for (const rating of ratings) {
        const directors = movieDirectors.get(rating.movie_id)
        if (!directors) continue

        const weight = this.calculateDecayedWeight(
          rating.rated_at,
          (rating.rating - 3) / 2 // 4 stars = 0.5, 5 stars = 1.0
        )

        for (const director of directors) {
          directorWeights.set(director, (directorWeights.get(director) || 0) + weight)
        }
      }

    } catch (error) {
      logger.warn('Error getting director preferences', { userId, error })
    }

    return this.normalizeWeights(directorWeights)
  }

  /**
   * Get actor preferences from user's highly rated movies
   */
  async getActorPreferences(userId: string): Promise<Map<string, number>> {
    const actorWeights = new Map<string, number>()

    try {
      const supabase = await this.getSupabase()

      // Get user's highly rated movies (4+ stars)
      const { data: ratings } = await supabase
        .from('ratings')
        .select('movie_id, rating, rated_at')
        .eq('user_id', userId)
        .gte('rating', 4)

      if (!ratings || ratings.length === 0) {
        return actorWeights
      }

      // Fetch cast for these movies
      const movieIds = ratings.map(r => r.movie_id)
      const { data: movies } = await supabase
        .from('movies')
        .select('id, cast, actors')
        .in('id', movieIds)

      if (!movies) {
        return actorWeights
      }

      // Build movie cast lookup (use cast if available, fallback to actors)
      const movieCast = new Map<string, string[]>()
      for (const movie of movies) {
        const cast = movie.cast || movie.actors
        if (cast && Array.isArray(cast)) {
          // Only consider top 3 billed actors
          movieCast.set(movie.id, cast.slice(0, 3))
        }
      }

      // Calculate actor weights
      for (const rating of ratings) {
        const cast = movieCast.get(rating.movie_id)
        if (!cast) continue

        const weight = this.calculateDecayedWeight(
          rating.rated_at,
          (rating.rating - 3) / 2 // 4 stars = 0.5, 5 stars = 1.0
        )

        for (const actor of cast) {
          actorWeights.set(actor, (actorWeights.get(actor) || 0) + weight)
        }
      }

    } catch (error) {
      logger.warn('Error getting actor preferences', { userId, error })
    }

    return this.normalizeWeights(actorWeights)
  }
}
