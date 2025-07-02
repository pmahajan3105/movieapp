/**
 * Request deduplication and caching utility
 * Prevents duplicate API requests within a time window
 */

interface CacheEntry<T> {
  data: T
  timestamp: number
  promise?: Promise<T>
}

interface RequestCacheOptions {
  ttl?: number // Time to live in milliseconds
  deduplicationWindow?: number // Time window for deduplication in milliseconds
  maxRetries?: number // Maximum number of retries for failed requests
  retryDelay?: number // Delay between retries in milliseconds
}

interface CircuitBreakerState {
  failures: number
  lastFailure: number
  state: 'closed' | 'open' | 'half-open'
}

export class RequestCache {
  private cache = new Map<string, CacheEntry<any>>()
  private circuitBreakers = new Map<string, CircuitBreakerState>()
  private defaultTTL = 5 * 60 * 1000 // 5 minutes
  private defaultDeduplicationWindow = 1000 // 1 second
  private failureThreshold = 5 // Number of failures before opening circuit
  private circuitOpenTime = 60 * 1000 // 1 minute circuit open time

  /**
   * Get or execute a request with caching and deduplication
   */
  async getOrExecute<T>(
    key: string,
    requestFn: () => Promise<T>,
    options: RequestCacheOptions = {}
  ): Promise<T> {
    const { ttl = this.defaultTTL, deduplicationWindow = this.defaultDeduplicationWindow } = options
    const now = Date.now()
    
    // Check circuit breaker state
    const circuitKey = key.split(':')[0] || key // Use base key for circuit breaker
    const circuitState = this.getCircuitBreakerState(circuitKey, now)
    
    if (circuitState.state === 'open') {
      // Circuit is open, check if we have stale data to return
      const existing = this.cache.get(key)
      if (existing?.data) {
        console.warn(`Circuit breaker OPEN for ${circuitKey}, returning stale data`)
        return existing.data
      }
      throw new Error(`Circuit breaker is OPEN for ${circuitKey}. Too many recent failures.`)
    }
    
    // Check if we have a cached entry
    const existing = this.cache.get(key)
    
    if (existing) {
      // If there's an ongoing request, return its promise (deduplication)
      if (existing.promise) {
        return existing.promise
      }
      
      // If cached data is still valid, return it
      if (now - existing.timestamp < ttl) {
        return existing.data
      }
      
      // If we're within deduplication window, return stale data
      if (now - existing.timestamp < deduplicationWindow) {
        return existing.data
      }
    }
    
    // Execute the request
    const promise = requestFn().then(
      (data) => {
        // Cache successful result and reset circuit breaker
        this.cache.set(key, {
          data,
          timestamp: now,
          promise: undefined
        })
        this.recordSuccess(circuitKey)
        return data
      },
      (error) => {
        // Remove failed request from cache and record failure
        this.cache.delete(key)
        this.recordFailure(circuitKey, now)
        throw error
      }
    )
    
    // Store the promise for deduplication
    this.cache.set(key, {
      data: existing?.data,
      timestamp: existing?.timestamp || now,
      promise
    })
    
    return promise
  }

  /**
   * Clear expired entries from cache
   */
  cleanup(): void {
    const now = Date.now()
    for (const [key, entry] of this.cache.entries()) {
      if (!entry.promise && now - entry.timestamp > this.defaultTTL) {
        this.cache.delete(key)
      }
    }
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear()
  }

  /**
   * Clear a specific cache entry
   */
  clearEntry(key: string): void {
    this.cache.delete(key)
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.keys()),
      circuitBreakers: Object.fromEntries(this.circuitBreakers.entries())
    }
  }

  /**
   * Get circuit breaker state
   */
  private getCircuitBreakerState(key: string, now: number): CircuitBreakerState {
    let state = this.circuitBreakers.get(key)
    
    if (!state) {
      state = { failures: 0, lastFailure: 0, state: 'closed' }
      this.circuitBreakers.set(key, state)
    }
    
    // Check if circuit should transition from open to half-open
    if (state.state === 'open' && now - state.lastFailure > this.circuitOpenTime) {
      state.state = 'half-open'
      state.failures = 0
    }
    
    return state
  }

  /**
   * Record a successful request
   */
  private recordSuccess(key: string): void {
    const state = this.circuitBreakers.get(key)
    if (state) {
      state.failures = 0
      state.state = 'closed'
    }
  }

  /**
   * Record a failed request
   */
  private recordFailure(key: string, timestamp: number): void {
    let state = this.circuitBreakers.get(key)
    
    if (!state) {
      state = { failures: 0, lastFailure: 0, state: 'closed' }
      this.circuitBreakers.set(key, state)
    }
    
    state.failures++
    state.lastFailure = timestamp
    
    if (state.failures >= this.failureThreshold) {
      state.state = 'open'
      console.warn(`Circuit breaker OPENED for ${key} after ${state.failures} failures`)
    }
  }
}

// Global cache instance
export const globalRequestCache = new RequestCache()

// Cleanup interval (runs every 5 minutes)
if (typeof window !== 'undefined') {
  setInterval(() => {
    globalRequestCache.cleanup()
  }, 5 * 60 * 1000)
}

/**
 * Higher-order function to add caching to any async function
 */
export function withCache<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  keyGenerator: (...args: T) => string,
  options?: RequestCacheOptions
) {
  return (...args: T): Promise<R> => {
    const key = keyGenerator(...args)
    return globalRequestCache.getOrExecute(key, () => fn(...args), options)
  }
}

/**
 * Specific cache for API requests
 */
export function createAPICache(baseKey: string) {
  return {
    get: <T>(key: string, requestFn: () => Promise<T>, options?: RequestCacheOptions) => 
      globalRequestCache.getOrExecute(`${baseKey}:${key}`, requestFn, options),
    
    clear: () => {
      // Clear all entries with this baseKey - use public API
      const stats = globalRequestCache.getStats()
      stats.entries.forEach(key => {
        if (key.startsWith(`${baseKey}:`)) {
          // Use a helper method to clear specific entries
          globalRequestCache.clearEntry(key)
        }
      })
    }
  }
}