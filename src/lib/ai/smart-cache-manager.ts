/**
 * Smart Cache Manager
 * Phase 4.2: Multi-tier intelligent caching with LRU, TTL, and usage patterns
 */

import { logger } from '@/lib/logger'

interface CacheEntry<T = any> {
  data: T
  timestamp: number
  lastAccessed: number
  accessCount: number
  ttl: number
  size: number
  tags: string[]
  priority: 'high' | 'medium' | 'low'
}

interface CacheStats {
  hitRate: number
  missRate: number
  totalRequests: number
  totalHits: number
  totalMisses: number
  memoryUsage: number
  entryCount: number
  averageAccessTime: number
}

interface CacheConfig {
  maxSize: number // Maximum memory usage in bytes
  maxEntries: number // Maximum number of entries
  defaultTtl: number // Default TTL in milliseconds
  cleanupInterval: number // Cleanup interval in milliseconds
  enableStats: boolean
}

export class SmartCacheManager {
  private static instance: SmartCacheManager
  private cache = new Map<string, CacheEntry>()
  private accessTimes = new Map<string, number[]>()
  private stats: CacheStats
  private config: CacheConfig
  private cleanupTimer?: NodeJS.Timeout
  
  private readonly DEFAULT_CONFIG: CacheConfig = {
    maxSize: 100 * 1024 * 1024, // 100MB
    maxEntries: 10000,
    defaultTtl: 30 * 60 * 1000, // 30 minutes
    cleanupInterval: 5 * 60 * 1000, // 5 minutes
    enableStats: true
  }

  private constructor(config?: Partial<CacheConfig>) {
    this.config = { ...this.DEFAULT_CONFIG, ...config }
    this.stats = this.initializeStats()
    this.startCleanupTimer()
  }

  static getInstance(config?: Partial<CacheConfig>): SmartCacheManager {
    if (!SmartCacheManager.instance) {
      SmartCacheManager.instance = new SmartCacheManager(config)
    }
    return SmartCacheManager.instance
  }

  /**
   * Get value from cache with intelligent access tracking
   */
  async get<T>(key: string): Promise<T | null> {
    const startTime = performance.now()
    
    try {
      const entry = this.cache.get(key)
      
      if (!entry) {
        this.recordMiss(key, startTime)
        return null
      }
      
      // Check if expired
      if (Date.now() > entry.timestamp + entry.ttl) {
        this.cache.delete(key)
        this.recordMiss(key, startTime)
        return null
      }
      
      // Update access statistics
      entry.lastAccessed = Date.now()
      entry.accessCount++
      
      this.recordHit(key, startTime)
      
      logger.debug('Cache hit', { key, accessCount: entry.accessCount })
      return entry.data
      
    } catch (error) {
      logger.error('Cache get error', { 
        key, 
        error: error instanceof Error ? error.message : String(error) 
      })
      return null
    }
  }

  /**
   * Set value in cache with intelligent eviction
   */
  async set<T>(
    key: string, 
    data: T, 
    options?: {
      ttl?: number
      tags?: string[]
      priority?: 'high' | 'medium' | 'low'
    }
  ): Promise<void> {
    try {
      const size = this.calculateSize(data)
      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        lastAccessed: Date.now(),
        accessCount: 1,
        ttl: options?.ttl || this.config.defaultTtl,
        size,
        tags: options?.tags || [],
        priority: options?.priority || 'medium'
      }
      
      // Check if we need to make space
      await this.ensureSpace(size)
      
      this.cache.set(key, entry)
      
      logger.debug('Cache set', { 
        key, 
        size, 
        ttl: entry.ttl,
        priority: entry.priority
      })
      
    } catch (error) {
      logger.error('Cache set error', { 
        key, 
        error: error instanceof Error ? error.message : String(error) 
      })
    }
  }

  /**
   * Intelligent cache warming based on usage patterns
   */
  async warmCache(userId: string): Promise<void> {
    try {
      // Pre-populate cache with likely-to-be-accessed data
      const warmingTasks = [
        this.warmUserRecommendations(userId),
        this.warmPopularMovies(),
        this.warmUserProfile(userId)
      ]
      
      await Promise.allSettled(warmingTasks)
      
      logger.info('Cache warming completed', { userId })
      
    } catch (error) {
      logger.error('Cache warming failed', { 
        userId,
        error: error instanceof Error ? error.message : String(error) 
      })
    }
  }

  /**
   * Delete entries by tag for efficient cache invalidation
   */
  async invalidateByTag(tag: string): Promise<number> {
    let deletedCount = 0
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.tags.includes(tag)) {
        this.cache.delete(key)
        deletedCount++
      }
    }
    
    logger.info('Cache invalidated by tag', { tag, deletedCount })
    return deletedCount
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    if (!this.config.enableStats) {
      return this.initializeStats()
    }
    
    // Update memory usage
    this.stats.memoryUsage = this.calculateTotalMemoryUsage()
    this.stats.entryCount = this.cache.size
    
    return { ...this.stats }
  }

  /**
   * Clear entire cache
   */
  clear(): void {
    this.cache.clear()
    this.accessTimes.clear()
    this.stats = this.initializeStats()
    
    logger.info('Cache cleared')
  }

  /**
   * Graceful shutdown
   */
  shutdown(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
    }
    this.clear()
  }

  private async ensureSpace(requiredSize: number): Promise<void> {
    const currentMemoryUsage = this.calculateTotalMemoryUsage()
    const currentEntryCount = this.cache.size
    
    // Check if we need to evict entries
    if (
      currentMemoryUsage + requiredSize > this.config.maxSize ||
      currentEntryCount >= this.config.maxEntries
    ) {
      await this.evictEntries(requiredSize)
    }
  }

  private async evictEntries(requiredSize: number): Promise<void> {
    // Smart eviction algorithm: LRU + Priority + Access frequency
    const entries = Array.from(this.cache.entries())
    
    // Score entries for eviction (lower score = more likely to evict)
    const scoredEntries = entries.map(([key, entry]) => {
      const age = Date.now() - entry.lastAccessed
      const frequency = entry.accessCount
      const priorityWeight = { low: 1, medium: 2, high: 3 }
      
      const score = (frequency * priorityWeight[entry.priority]) / Math.log(age + 1)
      
      return { key, entry, score }
    })
    
    // Sort by score (ascending - lowest scores first)
    scoredEntries.sort((a, b) => a.score - b.score)
    
    let freedSpace = 0
    let evictedCount = 0
    
    for (const { key, entry } of scoredEntries) {
      this.cache.delete(key)
      this.accessTimes.delete(key)
      freedSpace += entry.size
      evictedCount++
      
      if (freedSpace >= requiredSize) {
        break
      }
    }
    
    logger.info('Cache eviction completed', { 
      evictedCount, 
      freedSpace,
      remainingEntries: this.cache.size
    })
  }

  private async warmUserRecommendations(userId: string): Promise<void> {
    // Pre-compute and cache likely recommendation requests
    const cacheKey = `recommendations:${userId}`
    
    if (!this.cache.has(cacheKey)) {
      try {
        // This would integrate with the AI services
        const { SmartRecommenderV2 } = await import('./smart-recommender-v2')
        const recommender = SmartRecommenderV2.getInstance()
        
        const recommendations = await recommender.getEnhancedRecommendations({
          userId,
          limit: 12,
          includeBehavioral: true
        })
        
        await this.set(cacheKey, recommendations, {
          ttl: 15 * 60 * 1000, // 15 minutes
          tags: [`user:${userId}`, 'recommendations'],
          priority: 'high'
        })
        
      } catch (error) {
        logger.warn('Failed to warm user recommendations', { userId, error })
      }
    }
  }

  private async warmPopularMovies(): Promise<void> {
    const cacheKey = 'popular:movies'
    
    if (!this.cache.has(cacheKey)) {
      try {
        // This would fetch popular movies from TMDB
        // Implementation would be added based on existing movie service
        
        await this.set(cacheKey, [], {
          ttl: 60 * 60 * 1000, // 1 hour
          tags: ['popular', 'movies'],
          priority: 'medium'
        })
        
      } catch (error) {
        logger.warn('Failed to warm popular movies', { error })
      }
    }
  }

  private async warmUserProfile(userId: string): Promise<void> {
    const cacheKey = `profile:${userId}`
    
    if (!this.cache.has(cacheKey)) {
      try {
        // This would fetch user profile data
        // Implementation would integrate with existing profile services
        
        await this.set(cacheKey, {}, {
          ttl: 30 * 60 * 1000, // 30 minutes
          tags: [`user:${userId}`, 'profile'],
          priority: 'high'
        })
        
      } catch (error) {
        logger.warn('Failed to warm user profile', { userId, error })
      }
    }
  }

  private calculateSize(data: any): number {
    try {
      // Rough estimation of memory usage
      const jsonString = JSON.stringify(data)
      return new Blob([jsonString]).size
    } catch {
      // Fallback for circular references or non-serializable data
      return 1024 // 1KB default
    }
  }

  private calculateTotalMemoryUsage(): number {
    let total = 0
    for (const entry of this.cache.values()) {
      total += entry.size
    }
    return total
  }

  private recordHit(key: string, startTime: number): void {
    if (!this.config.enableStats) return
    
    this.stats.totalHits++
    this.stats.totalRequests++
    this.updateAccessTime(key, startTime)
    this.updateRates()
  }

  private recordMiss(key: string, startTime: number): void {
    if (!this.config.enableStats) return
    
    this.stats.totalMisses++
    this.stats.totalRequests++
    this.updateAccessTime(key, startTime)
    this.updateRates()
  }

  private updateAccessTime(key: string, startTime: number): void {
    const accessTime = performance.now() - startTime
    
    if (!this.accessTimes.has(key)) {
      this.accessTimes.set(key, [])
    }
    
    const times = this.accessTimes.get(key)!
    times.push(accessTime)
    
    // Keep only last 100 access times
    if (times.length > 100) {
      times.shift()
    }
    
    // Update average access time
    const allTimes = Array.from(this.accessTimes.values()).flat()
    this.stats.averageAccessTime = allTimes.reduce((sum, time) => sum + time, 0) / allTimes.length
  }

  private updateRates(): void {
    this.stats.hitRate = this.stats.totalRequests > 0 
      ? this.stats.totalHits / this.stats.totalRequests 
      : 0
    this.stats.missRate = 1 - this.stats.hitRate
  }

  private initializeStats(): CacheStats {
    return {
      hitRate: 0,
      missRate: 0,
      totalRequests: 0,
      totalHits: 0,
      totalMisses: 0,
      memoryUsage: 0,
      entryCount: 0,
      averageAccessTime: 0
    }
  }

  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.performCleanup()
    }, this.config.cleanupInterval)
  }

  private performCleanup(): void {
    const now = Date.now()
    let expiredCount = 0
    
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.timestamp + entry.ttl) {
        this.cache.delete(key)
        this.accessTimes.delete(key)
        expiredCount++
      }
    }
    
    if (expiredCount > 0) {
      logger.debug('Cache cleanup completed', { 
        expiredCount, 
        remainingEntries: this.cache.size 
      })
    }
  }
}

export { CacheEntry, CacheStats, CacheConfig }