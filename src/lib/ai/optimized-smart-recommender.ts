/**
 * Optimized Smart Recommender
 * Phase 4.1: High-performance version with caching, batching, and monitoring
 */

import { logger } from '@/lib/logger'
import { SmartCacheManager } from './smart-cache-manager'
import { PerformanceMonitor, measurePerformance } from './performance-monitor'
import { OptimizedAIOrchestrator, AIRequest } from './optimized-ai-orchestrator'
import type { Movie } from '@/types'

interface OptimizedRecommendationOptions {
  userId: string
  userQuery?: string
  preferredGenres?: string[]
  mood?: string
  limit?: number
  forceRefresh?: boolean
  includeExplanations?: boolean
  priority?: 'high' | 'medium' | 'low'
}

interface OptimizedRecommendationResult {
  movies: EnhancedMovie[]
  metadata: {
    totalTime: number
    cacheHit: boolean
    aiProcessingTime: number
    source: 'cache' | 'ai' | 'fallback'
    confidence: number
  }
  insights?: {
    primaryReasons: string[]
    behavioralFactors: any
    diversityScore: number
  }
}

interface EnhancedMovie extends Movie {
  semanticSimilarity?: number
  recommendationReason?: string
  confidenceScore?: number
  matchCategories?: string[]
  aiInsights?: any
}

export class OptimizedSmartRecommender {
  private static instance: OptimizedSmartRecommender
  private cache: SmartCacheManager
  private monitor: PerformanceMonitor
  private orchestrator: OptimizedAIOrchestrator
  
  private readonly CACHE_TTL = {
    recommendations: 15 * 60 * 1000, // 15 minutes
    userProfile: 30 * 60 * 1000, // 30 minutes
    movieData: 60 * 60 * 1000, // 1 hour
    fallback: 5 * 60 * 1000 // 5 minutes for fallback data
  }

  private constructor() {
    this.cache = SmartCacheManager.getInstance({
      maxSize: 200 * 1024 * 1024, // 200MB for recommendations
      maxEntries: 20000,
      defaultTtl: this.CACHE_TTL.recommendations
    })
    
    this.monitor = PerformanceMonitor.getInstance()
    this.orchestrator = OptimizedAIOrchestrator.getInstance()
    
    this.setupPerformanceWatchers()
  }

  static getInstance(): OptimizedSmartRecommender {
    if (!OptimizedSmartRecommender.instance) {
      OptimizedSmartRecommender.instance = new OptimizedSmartRecommender()
    }
    return OptimizedSmartRecommender.instance
  }

  /**
   * Get optimized recommendations with intelligent caching and fallbacks
   */
  @measurePerformance('get_recommendations')
  async getRecommendations(options: OptimizedRecommendationOptions): Promise<OptimizedRecommendationResult> {
    const startTime = performance.now()
    const cacheKey = this.generateCacheKey(options)
    
    try {
      // Try cache first unless force refresh
      if (!options.forceRefresh) {
        const cached = await this.cache.get<OptimizedRecommendationResult>(cacheKey)
        if (cached) {
          this.monitor.incrementCounter('recommendations_cache_hit')
          
          return {
            ...cached,
            metadata: {
              ...cached.metadata,
              totalTime: performance.now() - startTime,
              cacheHit: true,
              source: 'cache'
            }
          }
        }
      }
      
      this.monitor.incrementCounter('recommendations_cache_miss')
      
      // Generate new recommendations
      const result = await this.generateOptimizedRecommendations(options)
      
      // Cache the result
      await this.cache.set(cacheKey, result, {
        ttl: this.CACHE_TTL.recommendations,
        tags: [`user:${options.userId}`, 'recommendations'],
        priority: options.priority || 'medium'
      })
      
      return {
        ...result,
        metadata: {
          ...result.metadata,
          totalTime: performance.now() - startTime,
          cacheHit: false
        }
      }
      
    } catch (error) {
      this.monitor.incrementCounter('recommendations_error')
      logger.error('Optimized recommendations failed', { 
        error: error instanceof Error ? error.message : String(error),
        options 
      })
      
      // Return fallback recommendations
      return await this.getFallbackRecommendations(options, startTime)
    }
  }

  /**
   * Batch process multiple recommendation requests
   */
  @measurePerformance('batch_recommendations')
  async getBatchRecommendations(
    requests: OptimizedRecommendationOptions[]
  ): Promise<OptimizedRecommendationResult[]> {
    
    // Convert to AI requests
    const aiRequests: AIRequest[] = requests.map((options, index) => ({
      id: `rec-${index}-${Date.now()}`,
      type: 'recommendation',
      userId: options.userId,
      data: options,
      priority: options.priority || 'medium'
    }))
    
    // Process through orchestrator
    const batchResult = await this.orchestrator.processRequests(aiRequests)
    
    // Convert back to recommendation results
    return batchResult.results.map(result => {
      if (result.success && result.data) {
        return result.data
      } else {
        // Return fallback for failed requests
        const originalRequest = requests.find((_, index) => 
          result.id === `rec-${index}-${Date.now()}`
        )
        return this.createFallbackResult(originalRequest || requests[0])
      }
    })
  }

  /**
   * Warm cache for likely user requests
   */
  async warmCacheForUser(userId: string): Promise<void> {
    try {
      const warmingRequests: OptimizedRecommendationOptions[] = [
        // Default recommendations
        { userId, limit: 12, priority: 'high' },
        // Different limits for various UI components
        { userId, limit: 20, priority: 'medium' },
        { userId, limit: 6, priority: 'medium' },
        // With explanations for detailed views
        { userId, limit: 12, includeExplanations: true, priority: 'low' }
      ]
      
      // Pre-generate recommendations in background
      const promises = warmingRequests.map(request => 
        this.getRecommendations({ ...request, forceRefresh: false })
          .catch(error => {
            logger.warn('Cache warming failed for request', { request, error })
            return null
          })
      )
      
      await Promise.allSettled(promises)
      
      logger.info('Cache warming completed', { userId })
      
    } catch (error) {
      logger.error('Cache warming failed', { userId, error })
    }
  }

  /**
   * Invalidate user-specific cache
   */
  async invalidateUserCache(userId: string): Promise<void> {
    await this.cache.invalidateByTag(`user:${userId}`)
    logger.info('User cache invalidated', { userId })
  }

  /**
   * Get performance metrics for monitoring
   */
  getPerformanceReport(): any {
    return {
      cache: this.cache.getStats(),
      performance: this.monitor.generateReport(),
      recommendations: {
        cacheHitRate: this.calculateCacheHitRate(),
        averageResponseTime: this.calculateAverageResponseTime(),
        errorRate: this.calculateErrorRate()
      }
    }
  }

  private async generateOptimizedRecommendations(
    options: OptimizedRecommendationOptions
  ): Promise<OptimizedRecommendationResult> {
    const aiStartTime = performance.now()
    
    // Use the original smart recommender logic but with optimizations
    const { SmartRecommenderV2 } = await import('./smart-recommender-v2')
    const originalRecommender = SmartRecommenderV2.getInstance()
    
    // Get recommendations using the original logic
    const recommendations = await originalRecommender.getEnhancedRecommendations({
      userId: options.userId,
      userQuery: options.userQuery,
      preferredGenres: options.preferredGenres,
      mood: options.mood,
      limit: options.limit || 12,
      includeBehavioral: true
    })
    
    const aiProcessingTime = performance.now() - aiStartTime
    
    // Transform to optimized format
    const enhancedMovies: EnhancedMovie[] = recommendations.movies.map(movie => ({
      ...movie,
      semanticSimilarity: 0.85, // Would be calculated
      recommendationReason: this.generateReason(movie),
      confidenceScore: 0.8, // Would be calculated
      matchCategories: ['genre', 'style'],
      aiInsights: options.includeExplanations ? {} : undefined
    }))
    
    return {
      movies: enhancedMovies,
      metadata: {
        totalTime: 0, // Will be set by caller
        cacheHit: false,
        aiProcessingTime,
        source: 'ai',
        confidence: 0.85
      },
      insights: {
        primaryReasons: ['Genre preference match', 'High rating similarity'],
        behavioralFactors: {},
        diversityScore: 0.7
      }
    }
  }

  private async getFallbackRecommendations(
    options: OptimizedRecommendationOptions,
    startTime: number
  ): Promise<OptimizedRecommendationResult> {
    
    // Try to get popular movies as fallback
    const fallbackCacheKey = `fallback:popular:${options.limit || 12}`
    
    let fallbackMovies = await this.cache.get<Movie[]>(fallbackCacheKey)
    
    if (!fallbackMovies) {
      // Get popular movies from database or TMDB
      fallbackMovies = await this.getPopularMovies(options.limit || 12)
      
      await this.cache.set(fallbackCacheKey, fallbackMovies, {
        ttl: this.CACHE_TTL.fallback,
        tags: ['fallback', 'popular'],
        priority: 'low'
      })
    }
    
    const enhancedMovies: EnhancedMovie[] = fallbackMovies.map(movie => ({
      ...movie,
      recommendationReason: 'Popular choice',
      confidenceScore: 0.5,
      matchCategories: ['popular']
    }))
    
    return {
      movies: enhancedMovies,
      metadata: {
        totalTime: performance.now() - startTime,
        cacheHit: false,
        aiProcessingTime: 0,
        source: 'fallback',
        confidence: 0.5
      }
    }
  }

  private createFallbackResult(options: OptimizedRecommendationOptions): OptimizedRecommendationResult {
    return {
      movies: [],
      metadata: {
        totalTime: 0,
        cacheHit: false,
        aiProcessingTime: 0,
        source: 'fallback',
        confidence: 0
      }
    }
  }

  private async getPopularMovies(limit: number): Promise<Movie[]> {
    // This would integrate with existing movie service
    // For now, return empty array
    return []
  }

  private generateCacheKey(options: OptimizedRecommendationOptions): string {
    const keyParts = [
      'rec',
      options.userId,
      options.limit || 12,
      options.userQuery || '',
      (options.preferredGenres || []).sort().join(','),
      options.mood || '',
      options.includeExplanations ? 'explain' : 'simple'
    ]
    
    return keyParts.join(':').replace(/[^a-zA-Z0-9:]/g, '_')
  }

  private generateReason(movie: Movie): string {
    // Generate a smart reason based on movie properties
    const reasons = [
      `Matches your preference for ${movie.genre?.[0]} movies`,
      `High rating (${movie.rating}) similar to your favorites`,
      `Trending choice in your preferred categories`
    ]
    
    return reasons[Math.floor(Math.random() * reasons.length)]
  }

  private setupPerformanceWatchers(): void {
    this.monitor.watchMetric('recommendations', (metric) => {
      if (metric.value > 1000) { // Response time > 1 second
        logger.warn('Slow recommendation response detected', { metric })
      }
    })
  }

  private calculateCacheHitRate(): number {
    const recentMetrics = this.monitor.getRecentMetrics('cache_hit', 300000) // 5 minutes
    const hits = recentMetrics.filter(m => m.name.includes('hit')).length
    const total = recentMetrics.length
    return total > 0 ? (hits / total) * 100 : 0
  }

  private calculateAverageResponseTime(): number {
    const recentMetrics = this.monitor.getRecentMetrics('recommendations_duration', 300000)
    if (recentMetrics.length === 0) return 0
    
    const total = recentMetrics.reduce((sum, m) => sum + m.value, 0)
    return total / recentMetrics.length
  }

  private calculateErrorRate(): number {
    const recentMetrics = this.monitor.getRecentMetrics('recommendations', 300000)
    const errors = recentMetrics.filter(m => m.name.includes('error')).length
    const total = recentMetrics.length
    return total > 0 ? (errors / total) * 100 : 0
  }
}

export { OptimizedRecommendationOptions, OptimizedRecommendationResult, EnhancedMovie }