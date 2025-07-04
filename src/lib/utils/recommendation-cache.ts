/**
 * Recommendation cache management utility
 * Handles invalidation and clearing of recommendation caches
 */

import { globalRequestCache } from './request-cache'

export class RecommendationCacheManager {
  private static readonly CACHE_PREFIXES = [
    'hyper-personalized-recommendations',
    'progressive-movies',
    'smart-recommendations',
  ]

  /**
   * Clear all recommendation caches for a specific user
   */
  static clearUserRecommendations(userId: string): void {
    try {
      const stats = globalRequestCache.getStats()
      let clearedCount = 0

      // Clear all cache entries that match user ID and recommendation prefixes
      stats.entries.forEach(key => {
        for (const prefix of this.CACHE_PREFIXES) {
          if (key.startsWith(`${prefix}:${userId}:`)) {
            globalRequestCache.clearEntry(key)
            clearedCount++
            break
          }
        }
      })

      console.info('🗑️ Cleared user recommendation cache', {
        userId,
        clearedEntries: clearedCount,
        totalCacheSize: stats.size,
      })
    } catch (error) {
      console.error('❌ Failed to clear user recommendation cache', {
        userId,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  /**
   * Clear all recommendation caches (use sparingly)
   */
  static clearAllRecommendations(): void {
    try {
      const stats = globalRequestCache.getStats()
      let clearedCount = 0

      stats.entries.forEach(key => {
        for (const prefix of this.CACHE_PREFIXES) {
          if (key.startsWith(`${prefix}:`)) {
            globalRequestCache.clearEntry(key)
            clearedCount++
            break
          }
        }
      })

      console.info('🗑️ Cleared all recommendation caches', {
        clearedEntries: clearedCount,
        totalCacheSize: stats.size,
      })
    } catch (error) {
      console.error('❌ Failed to clear all recommendation caches', {
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  /**
   * Get cache statistics for debugging
   */
  static getCacheStats(): {
    totalEntries: number
    recommendationEntries: number
    userCacheMap: Record<string, number>
  } {
    const stats = globalRequestCache.getStats()
    const userCacheMap: Record<string, number> = {}
    let recommendationEntries = 0

    stats.entries.forEach(key => {
      for (const prefix of this.CACHE_PREFIXES) {
        if (key.startsWith(`${prefix}:`)) {
          recommendationEntries++

          // Extract user ID from cache key (format: prefix:userId:params)
          const parts = key.split(':')
          if (parts.length >= 2) {
            const userId = parts[1]
            if (userId) {
              userCacheMap[userId] = (userCacheMap[userId] || 0) + 1
            }
          }
          break
        }
      }
    })

    return {
      totalEntries: stats.size,
      recommendationEntries,
      userCacheMap,
    }
  }

  /**
   * Force refresh recommendations for a user by clearing cache
   * This will cause the next request to bypass cache
   */
  static forceRefreshUserRecommendations(userId: string): void {
    this.clearUserRecommendations(userId)

    console.info('♻️ Forced recommendation refresh for user', {
      userId,
      reason: 'Cache invalidation requested',
    })
  }
}

// Export as default for easier importing
export default RecommendationCacheManager
