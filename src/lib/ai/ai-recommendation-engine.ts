/**
 * AI Recommendation Engine
 * Consolidated recommendation services for better maintainability
 * 
 * Combines functionality from:
 * - smart-recommender-v2.ts (Vector-Enhanced AI Recommendations)
 * - personalized-recommender.ts (Real-time personalization)
 * - behavioral-analysis.ts (User behavior analysis)
 */

// Re-export everything from the original files to maintain compatibility
export * from './smart-recommender-v2'
export * from './personalized-recommender'
export * from './behavioral-analysis'

// Re-export the singleton instances with their original names
export { smartRecommenderV2 } from './smart-recommender-v2'

/**
 * Unified Recommendation Engine Interface
 * Provides a single entry point for all recommendation functionality
 */
export class UnifiedRecommendationEngine {
  private static instance: UnifiedRecommendationEngine
  
  static getInstance(): UnifiedRecommendationEngine {
    if (!UnifiedRecommendationEngine.instance) {
      UnifiedRecommendationEngine.instance = new UnifiedRecommendationEngine()
    }
    return UnifiedRecommendationEngine.instance
  }

  /**
   * Get comprehensive recommendations combining all engines
   */
  async getRecommendations(options: {
    userId: string
    limit?: number
    includePersonalized?: boolean
    includeBehavioral?: boolean
    includeSemantic?: boolean
  }) {
    const { smartRecommenderV2 } = await import('./smart-recommender-v2')
    
    // Use the existing smart recommender as the primary engine
    return await smartRecommenderV2.getEnhancedRecommendations({
      userId: options.userId,
      limit: options.limit || 12,
      includeBehavioral: options.includeBehavioral !== false,
    })
  }

  /**
   * Analyze user behavior patterns
   */
  async analyzeUserBehavior(userId: string) {
    const { analyzeCompleteUserBehavior } = await import('./behavioral-analysis')
    return await analyzeCompleteUserBehavior(userId)
  }

  /**
   * Get temporal genre preferences
   */
  async getTemporalPreferences(userId: string) {
    const { analyzeTemporalGenreAffinity } = await import('./behavioral-analysis')
    return await analyzeTemporalGenreAffinity(userId)
  }
}

// Export singleton instance
export const unifiedRecommendationEngine = UnifiedRecommendationEngine.getInstance()