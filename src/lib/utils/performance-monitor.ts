/**
 * Performance Monitoring Utilities
 * Sprint 6: Light Observability
 */

interface QueryMetrics {
  query: string
  duration: number
  timestamp: Date
  userId?: string
}

interface CacheMetrics {
  hitCount: number
  missCount: number
  lastReset: Date
}

class PerformanceMonitor {
  private static instance: PerformanceMonitor
  private queryMetrics: QueryMetrics[] = []
  private cacheMetrics: Map<string, CacheMetrics> = new Map()
  private slowQueryThreshold = 1000 // 1 second

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor()
    }
    return PerformanceMonitor.instance
  }

  /**
   * Log a database query with timing
   */
  logQuery(query: string, duration: number, userId?: string) {
    const metric: QueryMetrics = {
      query: query.substring(0, 100), // Truncate for logging
      duration,
      timestamp: new Date(),
      userId
    }

    this.queryMetrics.push(metric)

    // Log slow queries
    if (duration > this.slowQueryThreshold) {
      console.warn(`🐌 Slow Query (${duration}ms):`, {
        query: metric.query,
        userId,
        timestamp: metric.timestamp.toISOString()
      })
    }

    // Keep only last 100 queries in memory
    if (this.queryMetrics.length > 100) {
      this.queryMetrics = this.queryMetrics.slice(-100)
    }
  }

  /**
   * Track cache hit/miss
   */
  trackCache(cacheKey: string, hit: boolean) {
    const current = this.cacheMetrics.get(cacheKey) || {
      hitCount: 0,
      missCount: 0,
      lastReset: new Date()
    }

    if (hit) {
      current.hitCount++
    } else {
      current.missCount++
    }

    this.cacheMetrics.set(cacheKey, current)
  }

  /**
   * Get performance stats
   */
  getStats() {
    const recentQueries = this.queryMetrics.filter(
      q => Date.now() - q.timestamp.getTime() < 3600000 // Last hour
    )

    const slowQueries = recentQueries.filter(
      q => q.duration > this.slowQueryThreshold
    )

    const avgQueryTime = recentQueries.length > 0
      ? recentQueries.reduce((sum, q) => sum + q.duration, 0) / recentQueries.length
      : 0

    const cacheStats = Array.from(this.cacheMetrics.entries()).map(([key, metrics]) => ({
      cacheKey: key,
      hitRate: metrics.hitCount / (metrics.hitCount + metrics.missCount),
      totalRequests: metrics.hitCount + metrics.missCount,
      ...metrics
    }))

    return {
      queries: {
        total: recentQueries.length,
        slow: slowQueries.length,
        averageDurationMs: Math.round(avgQueryTime),
        slowestQuery: slowQueries.length > 0 
          ? slowQueries.reduce((prev, current) => 
              prev.duration > current.duration ? prev : current
            )
          : null
      },
      cache: cacheStats,
      memory: process.memoryUsage(),
      uptime: process.uptime()
    }
  }

  /**
   * Reset all metrics
   */
  reset() {
    this.queryMetrics = []
    this.cacheMetrics.clear()
  }
}

/**
 * Utility function to measure async operation performance
 */
export async function measurePerformance<T>(
  operation: () => Promise<T>,
  operationName: string,
  userId?: string
): Promise<T> {
  const startTime = Date.now()
  const monitor = PerformanceMonitor.getInstance()

  try {
    const result = await operation()
    const duration = Date.now() - startTime
    
    monitor.logQuery(operationName, duration, userId)
    
    return result
  } catch (error) {
    const duration = Date.now() - startTime
    monitor.logQuery(`${operationName} (ERROR)`, duration, userId)
    throw error
  }
}

export { PerformanceMonitor } 