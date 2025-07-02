/**
 * AI Services Export Index
 * Central exports for all AI-powered features
 */

// Main unified service (recommended)
export { 
  UnifiedAIService,
  unifiedAI,
  getRecommendations,
  getExplanation,
  enhanceSearch,
  getServiceHealth
} from './unified-ai-service'

// Individual services (for specific use cases)
export { ExplanationService } from './explanation-service'
export { SmartRecommenderV2, smartRecommenderV2 } from './smart-recommender-v2'
export { HyperPersonalizedEngine } from './hyper-personalized-engine'
export { SmartSearchEngine } from './smart-search-engine'

// Utility services
export { embeddingService } from './embedding-service'
export { 
  analyzeCompleteUserBehavior,
  analyzeTemporalGenreAffinity
} from './behavioral-analysis'

// Types
export type {
  UnifiedRecommendationRequest,
  UnifiedRecommendationResponse,
  UnifiedExplanationRequest,
  AIServiceHealth
} from './unified-ai-service'

export type {
  SmartRecommendationOptions,
  SmartRecommendationResult,
  UserContextVector,
  UserInteractionContext
} from './smart-recommender-v2'

export type {
  HyperPersonalizedRecommendation,
  PersonalizationFactors,
  RealTimeLearningSignal
} from './hyper-personalized-engine'

export type { RecommendationExplanation } from '@/types/explanation'
export type { UserBehaviorProfile } from './behavioral-analysis'