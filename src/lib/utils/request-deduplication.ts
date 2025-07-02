/**
 * Request deduplication utility to prevent duplicate expensive operations
 * Useful for AI recommendations and complex API calls
 */

interface PendingRequest<T> {
  promise: Promise<T>
  timestamp: number
}

export class RequestDeduplicator<T = any> {
  private pendingRequests = new Map<string, PendingRequest<T>>()
  private cacheTimeout: number

  constructor(cacheTimeoutMs: number = 5000) {
    this.cacheTimeout = cacheTimeoutMs
  }

  /**
   * Execute a function with deduplication based on cache key
   */
  async deduplicate<K extends T>(
    cacheKey: string,
    asyncFn: () => Promise<K>
  ): Promise<K> {
    // Clean up expired requests
    this.cleanupExpiredRequests()

    // Check if request is already pending
    const existing = this.pendingRequests.get(cacheKey)
    if (existing) {
      return existing.promise as Promise<K>
    }

    // Create new request
    const promise = asyncFn().finally(() => {
      // Clean up completed request
      this.pendingRequests.delete(cacheKey)
    })

    this.pendingRequests.set(cacheKey, {
      promise: promise as Promise<T>,
      timestamp: Date.now()
    })

    return promise
  }

  /**
   * Generate cache key from request parameters
   */
  static generateKey(params: Record<string, any>): string {
    const sortedParams = Object.keys(params)
      .sort()
      .reduce((sorted, key) => {
        sorted[key] = params[key]
        return sorted
      }, {} as Record<string, any>)

    return JSON.stringify(sortedParams)
  }

  /**
   * Clear all pending requests
   */
  clear(): void {
    this.pendingRequests.clear()
  }

  /**
   * Get current pending request count
   */
  getPendingCount(): number {
    return this.pendingRequests.size
  }

  private cleanupExpiredRequests(): void {
    const now = Date.now()
    for (const [key, request] of this.pendingRequests.entries()) {
      if (now - request.timestamp > this.cacheTimeout) {
        this.pendingRequests.delete(key)
      }
    }
  }
}

// Global instances for common use cases
export const movieRequestDeduplicator = new RequestDeduplicator(10000) // 10 seconds
export const aiRecommendationDeduplicator = new RequestDeduplicator(30000) // 30 seconds
export const searchDeduplicator = new RequestDeduplicator(5000) // 5 seconds