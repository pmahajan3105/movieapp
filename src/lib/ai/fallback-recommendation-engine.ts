/**
 * Fallback Recommendation Engine
 * Phase 4.4: Robust fallback systems for when AI services fail
 */

import { logger } from '@/lib/logger'
import { SmartCacheManager } from './smart-cache-manager'
import { PerformanceMonitor, measurePerformance } from './performance-monitor'
import type { Movie } from '@/types'

interface FallbackOptions {
  userId: string
  userQuery?: string
  preferredGenres?: string[]
  mood?: string
  limit?: number
  context?: 'dashboard' | 'search' | 'detail' | 'recommendations'
  fallbackLevel?: 'basic' | 'enhanced' | 'comprehensive'
}

interface FallbackResult {
  movies: Movie[]
  fallbackMethod: FallbackMethod
  confidence: number
  processingTime: number
  metadata: {
    source: string
    strategy: string
    dataPoints: number
    reasons: string[]
  }
}

type FallbackMethod = 
  | 'user_history_based'
  | 'genre_popularity'
  | 'trending_movies'
  | 'collaborative_filtering'
  | 'content_based_simple'
  | 'random_popular'
  | 'emergency_static'

interface UserFallbackProfile {
  userId: string
  topGenres: string[]
  averageRating: number
  watchedMovies: string[]
  preferredReleaseYears: number[]
  lastUpdateTime: number
}

interface FallbackStrategy {
  method: FallbackMethod
  weight: number
  minConfidence: number
  requiresUserData: boolean
  maxResponseTime: number
}

export class FallbackRecommendationEngine {
  private static instance: FallbackRecommendationEngine
  private cache: SmartCacheManager
  private monitor: PerformanceMonitor
  
  private readonly FALLBACK_STRATEGIES: FallbackStrategy[] = [
    {
      method: 'user_history_based',
      weight: 1.0,
      minConfidence: 0.8,
      requiresUserData: true,
      maxResponseTime: 500
    },
    {
      method: 'collaborative_filtering',
      weight: 0.9,
      minConfidence: 0.7,
      requiresUserData: true,
      maxResponseTime: 800
    },
    {
      method: 'content_based_simple',
      weight: 0.8,
      minConfidence: 0.6,
      requiresUserData: false,
      maxResponseTime: 300
    },
    {
      method: 'genre_popularity',
      weight: 0.7,
      minConfidence: 0.5,
      requiresUserData: false,
      maxResponseTime: 200
    },
    {
      method: 'trending_movies',
      weight: 0.6,
      minConfidence: 0.4,
      requiresUserData: false,
      maxResponseTime: 150
    },
    {
      method: 'random_popular',
      weight: 0.3,
      minConfidence: 0.2,
      requiresUserData: false,
      maxResponseTime: 100
    },
    {
      method: 'emergency_static',
      weight: 0.1,
      minConfidence: 0.1,
      requiresUserData: false,
      maxResponseTime: 50
    }
  ]
  
  private readonly EMERGENCY_RECOMMENDATIONS: Movie[] = [
    // High-quality, broadly appealing movies as last resort
  ]

  private constructor() {
    this.cache = SmartCacheManager.getInstance()
    this.monitor = PerformanceMonitor.getInstance()
  }

  static getInstance(): FallbackRecommendationEngine {
    if (!FallbackRecommendationEngine.instance) {
      FallbackRecommendationEngine.instance = new FallbackRecommendationEngine()
    }
    return FallbackRecommendationEngine.instance
  }

  /**
   * Generate fallback recommendations using cascading strategies
   */
  async getFallbackRecommendations(options: FallbackOptions): Promise<FallbackResult> {
    const startTime = performance.now()
    
    try {
      // Get user profile for personalized fallbacks
      const userProfile = await this.getUserFallbackProfile(options.userId)
      
      // Try strategies in order of preference
      for (const strategy of this.FALLBACK_STRATEGIES) {
        try {
          // Skip if strategy requires user data but we don't have it
          if (strategy.requiresUserData && !userProfile) {
            continue
          }
          
          const result = await this.executeStrategy(strategy, options, userProfile || undefined)
          
          if (result && result.movies.length > 0 && result.confidence >= strategy.minConfidence) {
            this.monitor.incrementCounter('fallback_success')
            return {
              ...result,
              processingTime: performance.now() - startTime
            }
          }
          
        } catch (error) {
          logger.warn(`Fallback strategy ${strategy.method} failed`, { 
            strategy: strategy.method,
            error: error instanceof Error ? error.message : String(error)
          })
          continue
        }
      }
      
      // If all strategies fail, return emergency recommendations
      this.monitor.incrementCounter('fallback_emergency')
      return this.getEmergencyRecommendations(options, startTime)
      
    } catch (error) {
      this.monitor.incrementCounter('fallback_error')
      logger.error('Fallback recommendation engine failed', { 
        error: error instanceof Error ? error.message : String(error),
        options 
      })
      
      return this.getEmergencyRecommendations(options, startTime)
    }
  }

  /**
   * Warm fallback data for faster responses
   */
  async warmFallbackData(userId: string): Promise<void> {
    try {
      // Pre-compute user profile
      await this.getUserFallbackProfile(userId, true)
      
      // Pre-cache popular movies by genre
      await this.cachePopularByGenre()
      
      // Pre-cache trending movies
      await this.cacheTrendingMovies()
      
      logger.info('Fallback data warming completed', { userId })
      
    } catch (error) {
      logger.error('Fallback data warming failed', { userId, error })
    }
  }

  private async executeStrategy(
    strategy: FallbackStrategy,
    options: FallbackOptions,
    userProfile?: UserFallbackProfile
  ): Promise<FallbackResult | null> {
    
    const timeoutPromise = new Promise<null>((_, reject) => 
      setTimeout(() => reject(new Error('Strategy timeout')), strategy.maxResponseTime)
    )
    
    const strategyPromise = this.runStrategy(strategy.method, options, userProfile)
    
    try {
      return await Promise.race([strategyPromise, timeoutPromise])
    } catch (error) {
      logger.warn(`Strategy ${strategy.method} timed out or failed`, { error })
      return null
    }
  }

  private async runStrategy(
    method: FallbackMethod,
    options: FallbackOptions,
    userProfile?: UserFallbackProfile
  ): Promise<FallbackResult | null> {
    
    switch (method) {
      case 'user_history_based':
        return await this.getUserHistoryBasedRecommendations(options, userProfile!)
        
      case 'collaborative_filtering':
        return await this.getCollaborativeFilteringRecommendations(options, userProfile!)
        
      case 'content_based_simple':
        return await this.getContentBasedRecommendations(options)
        
      case 'genre_popularity':
        return await this.getGenrePopularityRecommendations(options)
        
      case 'trending_movies':
        return await this.getTrendingRecommendations(options)
        
      case 'random_popular':
        return await this.getRandomPopularRecommendations(options)
        
      case 'emergency_static':
        return await this.getStaticRecommendations(options)
        
      default:
        return null
    }
  }

  private async getUserHistoryBasedRecommendations(
    options: FallbackOptions,
    userProfile: UserFallbackProfile
  ): Promise<FallbackResult> {
    
    // Find movies similar to user's watch history
    const cacheKey = `fallback:history:${options.userId}:${options.limit || 12}`
    let movies = await this.cache.get<Movie[]>(cacheKey)
    
    if (!movies) {
      // This would integrate with existing movie service to find similar movies
      movies = await this.findSimilarToWatchHistory(userProfile)
      
      await this.cache.set(cacheKey, movies, {
        ttl: 30 * 60 * 1000, // 30 minutes
        tags: [`user:${options.userId}`, 'fallback', 'history'],
        priority: 'high'
      })
    }
    
    return {
      movies: movies.slice(0, options.limit || 12),
      fallbackMethod: 'user_history_based',
      confidence: 0.8,
      processingTime: 0,
      metadata: {
        source: 'user_history',
        strategy: 'similarity_based',
        dataPoints: userProfile.watchedMovies.length,
        reasons: ['Based on your viewing history', 'Similar to movies you enjoyed']
      }
    }
  }

  private async getCollaborativeFilteringRecommendations(
    options: FallbackOptions,
    userProfile: UserFallbackProfile
  ): Promise<FallbackResult> {
    
    // Simple collaborative filtering based on genre preferences
    const cacheKey = `fallback:collaborative:${options.userId}:${options.limit || 12}`
    let movies = await this.cache.get<Movie[]>(cacheKey)
    
    if (!movies) {
      movies = await this.findByCollaborativeFiltering(userProfile)
      
      await this.cache.set(cacheKey, movies, {
        ttl: 60 * 60 * 1000, // 1 hour
        tags: [`user:${options.userId}`, 'fallback', 'collaborative'],
        priority: 'medium'
      })
    }
    
    return {
      movies: movies.slice(0, options.limit || 12),
      fallbackMethod: 'collaborative_filtering',
      confidence: 0.7,
      processingTime: 0,
      metadata: {
        source: 'collaborative_filtering',
        strategy: 'user_similarity',
        dataPoints: userProfile.topGenres.length,
        reasons: ['Popular with users like you', 'Based on similar preferences']
      }
    }
  }

  private async getContentBasedRecommendations(options: FallbackOptions): Promise<FallbackResult> {
    const cacheKey = `fallback:content:${(options.preferredGenres || []).join(',')}:${options.limit || 12}`
    let movies = await this.cache.get<Movie[]>(cacheKey)
    
    if (!movies) {
      movies = await this.findByContentSimilarity(options)
      
      await this.cache.set(cacheKey, movies, {
        ttl: 2 * 60 * 60 * 1000, // 2 hours
        tags: ['fallback', 'content_based'],
        priority: 'medium'
      })
    }
    
    return {
      movies: movies.slice(0, options.limit || 12),
      fallbackMethod: 'content_based_simple',
      confidence: 0.6,
      processingTime: 0,
      metadata: {
        source: 'content_analysis',
        strategy: 'genre_matching',
        dataPoints: options.preferredGenres?.length || 0,
        reasons: ['Matches your preferred genres', 'Similar content style']
      }
    }
  }

  private async getGenrePopularityRecommendations(options: FallbackOptions): Promise<FallbackResult> {
    const genres = options.preferredGenres || ['Action', 'Drama', 'Comedy']
    const cacheKey = `fallback:genre_popular:${genres.join(',')}:${options.limit || 12}`
    
    let movies = await this.cache.get<Movie[]>(cacheKey)
    
    if (!movies) {
      movies = await this.getPopularMoviesByGenres(genres)
      
      await this.cache.set(cacheKey, movies, {
        ttl: 4 * 60 * 60 * 1000, // 4 hours
        tags: ['fallback', 'popular', 'genre'],
        priority: 'medium'
      })
    }
    
    return {
      movies: movies.slice(0, options.limit || 12),
      fallbackMethod: 'genre_popularity',
      confidence: 0.5,
      processingTime: 0,
      metadata: {
        source: 'popularity_data',
        strategy: 'genre_filtering',
        dataPoints: genres.length,
        reasons: ['Popular in your favorite genres', 'Highly rated by audiences']
      }
    }
  }

  private async getTrendingRecommendations(options: FallbackOptions): Promise<FallbackResult> {
    const cacheKey = `fallback:trending:${options.limit || 12}`
    let movies = await this.cache.get<Movie[]>(cacheKey)
    
    if (!movies) {
      movies = await this.getTrendingMovies()
      
      await this.cache.set(cacheKey, movies, {
        ttl: 60 * 60 * 1000, // 1 hour
        tags: ['fallback', 'trending'],
        priority: 'low'
      })
    }
    
    return {
      movies: movies.slice(0, options.limit || 12),
      fallbackMethod: 'trending_movies',
      confidence: 0.4,
      processingTime: 0,
      metadata: {
        source: 'trending_data',
        strategy: 'popularity_temporal',
        dataPoints: movies.length,
        reasons: ['Currently trending', 'Popular right now']
      }
    }
  }

  private async getRandomPopularRecommendations(options: FallbackOptions): Promise<FallbackResult> {
    const cacheKey = 'fallback:random_popular'
    let movies = await this.cache.get<Movie[]>(cacheKey)
    
    if (!movies) {
      movies = await this.getPopularMovies()
      
      await this.cache.set(cacheKey, movies, {
        ttl: 24 * 60 * 60 * 1000, // 24 hours
        tags: ['fallback', 'popular'],
        priority: 'low'
      })
    }
    
    // Randomize selection
    const shuffled = movies.sort(() => Math.random() - 0.5)
    
    return {
      movies: shuffled.slice(0, options.limit || 12),
      fallbackMethod: 'random_popular',
      confidence: 0.2,
      processingTime: 0,
      metadata: {
        source: 'popular_catalog',
        strategy: 'random_selection',
        dataPoints: movies.length,
        reasons: ['Popular movies', 'Random selection']
      }
    }
  }

  private async getStaticRecommendations(options: FallbackOptions): Promise<FallbackResult> {
    return {
      movies: this.EMERGENCY_RECOMMENDATIONS.slice(0, options.limit || 12),
      fallbackMethod: 'emergency_static',
      confidence: 0.1,
      processingTime: 0,
      metadata: {
        source: 'static_data',
        strategy: 'emergency_fallback',
        dataPoints: this.EMERGENCY_RECOMMENDATIONS.length,
        reasons: ['Emergency recommendations', 'System fallback']
      }
    }
  }

  private getEmergencyRecommendations(options: FallbackOptions, startTime: number): FallbackResult {
    return {
      movies: this.EMERGENCY_RECOMMENDATIONS.slice(0, options.limit || 12),
      fallbackMethod: 'emergency_static',
      confidence: 0.1,
      processingTime: performance.now() - startTime,
      metadata: {
        source: 'emergency',
        strategy: 'static_fallback',
        dataPoints: 0,
        reasons: ['Emergency fallback', 'All strategies failed']
      }
    }
  }

  private async getUserFallbackProfile(userId: string, forceRefresh = false): Promise<UserFallbackProfile | null> {
    const cacheKey = `fallback:profile:${userId}`
    
    if (!forceRefresh) {
      const cached = await this.cache.get<UserFallbackProfile>(cacheKey)
      if (cached) return cached
    }
    
    try {
      // This would integrate with existing user services
      const profile = await this.computeUserFallbackProfile(userId)
      
      await this.cache.set(cacheKey, profile, {
        ttl: 24 * 60 * 60 * 1000, // 24 hours
        tags: [`user:${userId}`, 'fallback', 'profile'],
        priority: 'high'
      })
      
      return profile
      
    } catch (error) {
      logger.warn('Failed to get user fallback profile', { userId, error })
      return null
    }
  }

  // Integration methods (would be implemented with existing services)
  private async computeUserFallbackProfile(userId: string): Promise<UserFallbackProfile> {
    // This would integrate with existing user and rating services
    return {
      userId,
      topGenres: ['Action', 'Drama'],
      averageRating: 4.2,
      watchedMovies: [],
      preferredReleaseYears: [2020, 2021, 2022, 2023],
      lastUpdateTime: Date.now()
    }
  }

  private async findSimilarToWatchHistory(userProfile: UserFallbackProfile): Promise<Movie[]> {
    // This would integrate with existing movie similarity services
    return []
  }

  private async findByCollaborativeFiltering(userProfile: UserFallbackProfile): Promise<Movie[]> {
    // This would implement simple collaborative filtering
    return []
  }

  private async findByContentSimilarity(options: FallbackOptions): Promise<Movie[]> {
    // This would implement content-based filtering
    return []
  }

  private async getPopularMoviesByGenres(genres: string[]): Promise<Movie[]> {
    // This would integrate with existing movie service
    return []
  }

  private async getTrendingMovies(): Promise<Movie[]> {
    // This would integrate with trending data sources
    return []
  }

  private async getPopularMovies(): Promise<Movie[]> {
    // This would integrate with popular movie data
    return []
  }

  private async cachePopularByGenre(): Promise<void> {
    // Pre-cache popular movies for common genres
    const commonGenres = ['Action', 'Comedy', 'Drama', 'Thriller', 'Romance', 'Horror']
    
    for (const genre of commonGenres) {
      const cacheKey = `fallback:genre_popular:${genre}:20`
      if (!await this.cache.get(cacheKey)) {
        const movies = await this.getPopularMoviesByGenres([genre])
        await this.cache.set(cacheKey, movies, {
          ttl: 8 * 60 * 60 * 1000, // 8 hours
          tags: ['fallback', 'popular', 'genre', genre],
          priority: 'low'
        })
      }
    }
  }

  private async cacheTrendingMovies(): Promise<void> {
    const cacheKey = 'fallback:trending:20'
    if (!await this.cache.get(cacheKey)) {
      const movies = await this.getTrendingMovies()
      await this.cache.set(cacheKey, movies, {
        ttl: 2 * 60 * 60 * 1000, // 2 hours
        tags: ['fallback', 'trending'],
        priority: 'medium'
      })
    }
  }
}

export type { FallbackOptions, FallbackResult, FallbackMethod, UserFallbackProfile }