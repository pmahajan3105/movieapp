/**
 * Performance Optimization Service
 * Provides intelligent caching, background processing, and response time improvements for AI services
 */

import { logger } from '@/lib/logger'
import type { Movie } from '@/types'
import type { QueryProcessingResult } from '@/types/ai-services'
import type {
  ThematicProfile,
  EmotionalJourney,
  CinematicStyle,
} from '@/types/advanced-intelligence'

export interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
  accessCount: number
  lastAccessed: number
  priority: number
}

export interface CacheStats {
  size: number
  hitRate: number
  missRate: number
  totalRequests: number
  evictions: number
  avgResponseTime: number
}

export interface BackgroundTask {
  id: string
  type: 'thematic_analysis' | 'emotional_analysis' | 'style_analysis' | 'query_processing'
  priority: number
  payload: any
  retries: number
  maxRetries: number
  createdAt: number
  estimatedDuration: number
}

export interface PerformanceMetrics {
  cacheHitRate: number
  avgResponseTime: number
  backgroundTasksQueued: number
  backgroundTasksCompleted: number
  memoryUsage: number
  errorRate: number
  lastOptimized: number
}

export class PerformanceOptimizationService {
  private static instance: PerformanceOptimizationService

  // Multi-level caching system
  private queryCache = new Map<string, CacheEntry<QueryProcessingResult>>()
  private thematicCache = new Map<string, CacheEntry<ThematicProfile>>()
  private emotionalCache = new Map<string, CacheEntry<EmotionalJourney>>()
  private styleCache = new Map<string, CacheEntry<CinematicStyle>>()
  private recommendationCache = new Map<string, CacheEntry<Movie[]>>()

  // Background processing
  private backgroundQueue: BackgroundTask[] = []
  private isProcessingBackground = false
  private maxBackgroundTasks = 10

  // Performance tracking
  private metrics: PerformanceMetrics = {
    cacheHitRate: 0,
    avgResponseTime: 0,
    backgroundTasksQueued: 0,
    backgroundTasksCompleted: 0,
    memoryUsage: 0,
    errorRate: 0,
    lastOptimized: Date.now(),
  }

  private requestTimes: number[] = []
  private totalRequests = 0
  private cacheHits = 0

  // Cache configuration
  private readonly cacheConfig = {
    query: { ttl: 30 * 60 * 1000, maxSize: 1000, priority: 10 }, // 30 minutes
    thematic: { ttl: 24 * 60 * 60 * 1000, maxSize: 500, priority: 8 }, // 24 hours
    emotional: { ttl: 12 * 60 * 60 * 1000, maxSize: 500, priority: 8 }, // 12 hours
    style: { ttl: 24 * 60 * 60 * 1000, maxSize: 500, priority: 8 }, // 24 hours
    recommendation: { ttl: 60 * 60 * 1000, maxSize: 200, priority: 9 }, // 1 hour
  }

  private constructor() {
    // Start background task processor
    this.startBackgroundProcessor()

    // Start periodic optimization
    setInterval(
      () => {
        this.optimizePerformance()
      },
      5 * 60 * 1000
    ) // Every 5 minutes
  }

  static getInstance(): PerformanceOptimizationService {
    if (!PerformanceOptimizationService.instance) {
      PerformanceOptimizationService.instance = new PerformanceOptimizationService()
    }
    return PerformanceOptimizationService.instance
  }

  // Cache operations with intelligent eviction
  async getCachedQuery(key: string): Promise<QueryProcessingResult | null> {
    return this.getFromCache(this.queryCache, key)
  }

  async setCachedQuery(key: string, data: QueryProcessingResult, priority = 5): Promise<void> {
    this.setInCache(this.queryCache, key, data, this.cacheConfig.query, priority)
  }

  async getCachedThematic(movieId: string): Promise<ThematicProfile | null> {
    return this.getFromCache(this.thematicCache, movieId)
  }

  async setCachedThematic(movieId: string, data: ThematicProfile, priority = 5): Promise<void> {
    this.setInCache(this.thematicCache, movieId, data, this.cacheConfig.thematic, priority)
  }

  async getCachedEmotional(movieId: string, context?: string): Promise<EmotionalJourney | null> {
    const key = context ? `${movieId}:${context}` : movieId
    return this.getFromCache(this.emotionalCache, key)
  }

  async setCachedEmotional(
    movieId: string,
    data: EmotionalJourney,
    context?: string,
    priority = 5
  ): Promise<void> {
    const key = context ? `${movieId}:${context}` : movieId
    this.setInCache(this.emotionalCache, key, data, this.cacheConfig.emotional, priority)
  }

  async getCachedStyle(movieId: string): Promise<CinematicStyle | null> {
    return this.getFromCache(this.styleCache, movieId)
  }

  async setCachedStyle(movieId: string, data: CinematicStyle, priority = 5): Promise<void> {
    this.setInCache(this.styleCache, movieId, data, this.cacheConfig.style, priority)
  }

  async getCachedRecommendations(key: string): Promise<Movie[] | null> {
    return this.getFromCache(this.recommendationCache, key)
  }

  async setCachedRecommendations(key: string, data: Movie[], priority = 5): Promise<void> {
    this.setInCache(this.recommendationCache, key, data, this.cacheConfig.recommendation, priority)
  }

  // Background processing for expensive operations
  async queueBackgroundTask(
    task: Omit<BackgroundTask, 'id' | 'createdAt' | 'retries'>
  ): Promise<string> {
    const taskId = `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    const backgroundTask: BackgroundTask = {
      id: taskId,
      createdAt: Date.now(),
      retries: 0,
      ...task,
    }

    this.backgroundQueue.push(backgroundTask)
    this.metrics.backgroundTasksQueued++

    // Sort by priority (higher priority first)
    this.backgroundQueue.sort((a, b) => b.priority - a.priority)

    logger.info('Background task queued', {
      taskId,
      type: task.type,
      priority: task.priority,
      queueLength: this.backgroundQueue.length,
    })

    return taskId
  }

  // Performance monitoring
  recordRequestTime(startTime: number): void {
    const duration = Date.now() - startTime
    this.requestTimes.push(duration)
    this.totalRequests++

    // Keep only last 1000 request times for moving average
    if (this.requestTimes.length > 1000) {
      this.requestTimes.shift()
    }

    this.updateMetrics()
  }

  recordCacheHit(): void {
    this.cacheHits++
    this.updateMetrics()
  }

  getPerformanceMetrics(): PerformanceMetrics {
    return { ...this.metrics }
  }

  getCacheStats(): Record<string, CacheStats> {
    return {
      query: this.getCacheStatsForMap(this.queryCache),
      thematic: this.getCacheStatsForMap(this.thematicCache),
      emotional: this.getCacheStatsForMap(this.emotionalCache),
      style: this.getCacheStatsForMap(this.styleCache),
      recommendation: this.getCacheStatsForMap(this.recommendationCache),
    }
  }

  // Preload frequently accessed data
  async preloadPopularMovieAnalysis(movieIds: string[]): Promise<void> {
    for (const movieId of movieIds) {
      await this.queueBackgroundTask({
        type: 'thematic_analysis',
        priority: 3,
        payload: { movieId, depth: 'standard' },
        maxRetries: 2,
        estimatedDuration: 5000,
      })

      await this.queueBackgroundTask({
        type: 'emotional_analysis',
        priority: 3,
        payload: { movieId },
        maxRetries: 2,
        estimatedDuration: 4000,
      })

      await this.queueBackgroundTask({
        type: 'style_analysis',
        priority: 3,
        payload: { movieId },
        maxRetries: 2,
        estimatedDuration: 4000,
      })
    }
  }

  // Cache warming for better user experience
  async warmCache(userId: string, userPreferences: any): Promise<void> {
    logger.info('Starting cache warming for user', { userId })

    // Pre-generate common query patterns based on user preferences
    const commonQueries = this.generateCommonQueries(userPreferences)

    for (const query of commonQueries) {
      await this.queueBackgroundTask({
        type: 'query_processing',
        priority: 2,
        payload: { query, userId },
        maxRetries: 1,
        estimatedDuration: 3000,
      })
    }
  }

  // Private helper methods
  private async getFromCache<T>(cache: Map<string, CacheEntry<T>>, key: string): Promise<T | null> {
    const entry = cache.get(key)

    if (!entry) {
      return null
    }

    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      cache.delete(key)
      return null
    }

    // Update access stats
    entry.accessCount++
    entry.lastAccessed = Date.now()

    this.recordCacheHit()
    return entry.data
  }

  private setInCache<T>(
    cache: Map<string, CacheEntry<T>>,
    key: string,
    data: T,
    config: { ttl: number; maxSize: number; priority: number },
    priority: number
  ): void {
    // Evict if cache is full
    if (cache.size >= config.maxSize) {
      this.evictLeastUseful(cache)
    }

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: config.ttl,
      accessCount: 1,
      lastAccessed: Date.now(),
      priority: priority + config.priority,
    }

    cache.set(key, entry)
  }

  private evictLeastUseful<T>(cache: Map<string, CacheEntry<T>>): void {
    let leastUsefulKey = ''
    let leastUsefulScore = Infinity

    for (const [key, entry] of cache.entries()) {
      // Calculate usefulness score based on access pattern and age
      const age = Date.now() - entry.timestamp
      const recency = Date.now() - entry.lastAccessed
      const score = (entry.accessCount * entry.priority) / ((age + recency) / 1000)

      if (score < leastUsefulScore) {
        leastUsefulScore = score
        leastUsefulKey = key
      }
    }

    if (leastUsefulKey) {
      cache.delete(leastUsefulKey)
    }
  }

  private getCacheStatsForMap<T>(cache: Map<string, CacheEntry<T>>): CacheStats {
    return {
      size: cache.size,
      hitRate: this.cacheHits / Math.max(this.totalRequests, 1),
      missRate: (this.totalRequests - this.cacheHits) / Math.max(this.totalRequests, 1),
      totalRequests: this.totalRequests,
      evictions: 0, // TODO: track evictions
      avgResponseTime:
        this.requestTimes.reduce((sum, time) => sum + time, 0) /
        Math.max(this.requestTimes.length, 1),
    }
  }

  private updateMetrics(): void {
    this.metrics.cacheHitRate = this.cacheHits / Math.max(this.totalRequests, 1)
    this.metrics.avgResponseTime =
      this.requestTimes.reduce((sum, time) => sum + time, 0) / Math.max(this.requestTimes.length, 1)

    // Estimate memory usage (rough approximation)
    const totalCacheEntries =
      this.queryCache.size +
      this.thematicCache.size +
      this.emotionalCache.size +
      this.styleCache.size +
      this.recommendationCache.size
    this.metrics.memoryUsage = totalCacheEntries * 1024 // Rough estimate in bytes
  }

  private async startBackgroundProcessor(): Promise<void> {
    if (this.isProcessingBackground) return

    this.isProcessingBackground = true

    const processNext = async () => {
      if (this.backgroundQueue.length === 0) {
        setTimeout(processNext, 1000)
        return
      }

      const task = this.backgroundQueue.shift()!

      try {
        await this.processBackgroundTask(task)
        this.metrics.backgroundTasksCompleted++
      } catch (error) {
        logger.error('Background task failed', {
          taskId: task.id,
          error: error instanceof Error ? error.message : String(error),
          retries: task.retries,
        })

        // Retry if possible
        if (task.retries < task.maxRetries) {
          task.retries++
          this.backgroundQueue.push(task)
        }
      }

      // Continue processing
      setTimeout(processNext, 100)
    }

    processNext()
  }

  private async processBackgroundTask(task: BackgroundTask): Promise<void> {
    logger.debug('Processing background task', { taskId: task.id, type: task.type })

    // Simulate processing based on task type
    switch (task.type) {
      case 'thematic_analysis':
        // Would call actual thematic analysis service
        await new Promise(resolve => setTimeout(resolve, task.estimatedDuration))
        break

      case 'emotional_analysis':
        // Would call actual emotional analysis service
        await new Promise(resolve => setTimeout(resolve, task.estimatedDuration))
        break

      case 'style_analysis':
        // Would call actual style analysis service
        await new Promise(resolve => setTimeout(resolve, task.estimatedDuration))
        break

      case 'query_processing':
        // Would call actual query processing service
        await new Promise(resolve => setTimeout(resolve, task.estimatedDuration))
        break
    }
  }

  private generateCommonQueries(_userPreferences: any): string[] {
    // Generate likely query patterns based on user preferences
    const baseQueries = [
      'Show me something like my recent favorites',
      'I want to watch something uplifting',
      'Find me a good thriller for tonight',
      'Recommend classic movies I might enjoy',
      'What are some hidden gems in drama?',
    ]

    // TODO: Customize based on actual user preferences
    return baseQueries
  }

  private async optimizePerformance(): Promise<void> {
    logger.debug('Running performance optimization')

    // Clean expired cache entries
    this.cleanExpiredEntries()

    // Rebalance background queue priorities
    this.rebalanceBackgroundQueue()

    // Update optimization timestamp
    this.metrics.lastOptimized = Date.now()
  }

  private cleanExpiredEntries(): void {
    const now = Date.now()
    const caches = [
      this.queryCache,
      this.thematicCache,
      this.emotionalCache,
      this.styleCache,
      this.recommendationCache,
    ]

    let cleanedCount = 0

    caches.forEach(cache => {
      for (const [key, entry] of cache.entries()) {
        if (now - entry.timestamp > entry.ttl) {
          cache.delete(key)
          cleanedCount++
        }
      }
    })

    if (cleanedCount > 0) {
      logger.debug(`Cleaned ${cleanedCount} expired cache entries`)
    }
  }

  private rebalanceBackgroundQueue(): void {
    // Boost priority of tasks that have been waiting too long
    const now = Date.now()
    const maxWaitTime = 10 * 60 * 1000 // 10 minutes

    this.backgroundQueue.forEach(task => {
      const waitTime = now - task.createdAt
      if (waitTime > maxWaitTime) {
        task.priority = Math.min(task.priority + 2, 10)
      }
    })

    // Re-sort by updated priorities
    this.backgroundQueue.sort((a, b) => b.priority - a.priority)
  }
}

export const performanceOptimizationService = PerformanceOptimizationService.getInstance()
