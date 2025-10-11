// TMDB Cache Service - Reduce API calls and improve performance
import { logger } from '@/lib/logger'

interface CacheEntry<T> {
  data: T
  expiry: number
  hits: number
  createdAt: number
}

class TMDBCacheService {
  private cache: Map<string, CacheEntry<any>>
  private hits: number = 0
  private misses: number = 0

  // Cache TTL configurations (in milliseconds)
  private readonly TTL_MOVIE_DETAILS = 60 * 60 * 1000 // 1 hour
  private readonly TTL_SEARCH_RESULTS = 15 * 60 * 1000 // 15 minutes
  private readonly TTL_TRENDING = 30 * 60 * 1000 // 30 minutes
  private readonly TTL_GENRES = 24 * 60 * 60 * 1000 // 24 hours (rarely changes)

  constructor() {
    this.cache = new Map()
    // Cleanup expired entries every 10 minutes
    setInterval(() => this.cleanup(), 10 * 60 * 1000)
  }

  /**
   * Get cached data by key
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key)

    if (!entry) {
      this.misses++
      logger.debug('TMDB cache miss', { key })
      return null
    }

    // Check if expired
    if (entry.expiry < Date.now()) {
      this.cache.delete(key)
      this.misses++
      logger.debug('TMDB cache expired', { key })
      return null
    }

    // Update hit count
    entry.hits++
    this.hits++
    logger.debug('TMDB cache hit', { key, hits: entry.hits })

    return entry.data as T
  }

  /**
   * Set data in cache with custom TTL
   */
  set(key: string, data: any, ttl?: number): void {
    const now = Date.now()
    const entry: CacheEntry<any> = {
      data,
      expiry: now + (ttl || this.TTL_MOVIE_DETAILS),
      hits: 0,
      createdAt: now,
    }

    this.cache.set(key, entry)
    logger.debug('TMDB cache set', { key, ttl: ttl || this.TTL_MOVIE_DETAILS })
  }

  /**
   * Cache movie details (1 hour TTL)
   */
  cacheMovieDetails(tmdbId: number, data: any): void {
    this.set(`movie:${tmdbId}`, data, this.TTL_MOVIE_DETAILS)
  }

  /**
   * Get cached movie details
   */
  getMovieDetails<T>(tmdbId: number): T | null {
    return this.get<T>(`movie:${tmdbId}`)
  }

  /**
   * Cache search results (15 minutes TTL)
   */
  cacheSearchResults(query: string, data: any): void {
    const normalizedQuery = query.toLowerCase().trim()
    this.set(`search:${normalizedQuery}`, data, this.TTL_SEARCH_RESULTS)
  }

  /**
   * Get cached search results
   */
  getSearchResults<T>(query: string): T | null {
    const normalizedQuery = query.toLowerCase().trim()
    return this.get<T>(`search:${normalizedQuery}`)
  }

  /**
   * Cache trending movies (30 minutes TTL)
   */
  cacheTrending(timeWindow: string, data: any): void {
    this.set(`trending:${timeWindow}`, data, this.TTL_TRENDING)
  }

  /**
   * Get cached trending movies
   */
  getTrending<T>(timeWindow: string): T | null {
    return this.get<T>(`trending:${timeWindow}`)
  }

  /**
   * Cache genres (24 hours TTL)
   */
  cacheGenres(data: any): void {
    this.set('genres', data, this.TTL_GENRES)
  }

  /**
   * Get cached genres
   */
  getGenres<T>(): T | null {
    return this.get<T>('genres')
  }

  /**
   * Clear specific cache entry
   */
  clear(key: string): void {
    this.cache.delete(key)
    logger.info('TMDB cache cleared', { key })
  }

  /**
   * Clear all cache
   */
  clearAll(): void {
    const size = this.cache.size
    this.cache.clear()
    this.hits = 0
    this.misses = 0
    logger.info('TMDB cache cleared all', { entriesCleared: size })
  }

  /**
   * Clear expired entries
   */
  private cleanup(): void {
    const now = Date.now()
    let cleaned = 0

    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiry < now) {
        this.cache.delete(key)
        cleaned++
      }
    }

    if (cleaned > 0) {
      logger.info('TMDB cache cleanup', { entriesRemoved: cleaned, remainingSize: this.cache.size })
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    hits: number
    misses: number
    size: number
    hitRate: number
    entries: Array<{ key: string; hits: number; age: number }>
  } {
    const now = Date.now()
    const totalRequests = this.hits + this.misses
    const hitRate = totalRequests > 0 ? (this.hits / totalRequests) * 100 : 0

    const entries = Array.from(this.cache.entries()).map(([key, entry]) => ({
      key,
      hits: entry.hits,
      age: Math.floor((now - entry.createdAt) / 1000), // age in seconds
    }))

    return {
      hits: this.hits,
      misses: this.misses,
      size: this.cache.size,
      hitRate: Math.round(hitRate * 100) / 100, // Round to 2 decimals
      entries: entries.sort((a, b) => b.hits - a.hits).slice(0, 10), // Top 10 by hits
    }
  }

  /**
   * Log cache statistics
   */
  logStats(): void {
    const stats = this.getStats()
    logger.info('TMDB Cache Statistics', stats)
  }
}

// Export singleton instance
export const tmdbCache = new TMDBCacheService()

// Export for testing
export { TMDBCacheService }

