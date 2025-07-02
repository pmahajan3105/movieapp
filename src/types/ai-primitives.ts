/**
 * Shared AI Type Primitives
 * Common types used across all AI services for consistency and reusability
 */

// Base score/confidence types (0-1 normalized)
export type ConfidenceScore = number // 0-1
export type SimilarityScore = number // 0-1  
export type AffinityScore = number // 0-1
export type CompatibilityScore = number // 0-1

// Weight/factor types for algorithmic balancing
export type Weight = number // 0-1
export type Factor = number // 0-1  
export type Multiplier = number // typically 0.1-2.0

// Analysis depth levels
export type AnalysisDepth = 'basic' | 'standard' | 'comprehensive' | 'expert'

// Common algorithm sources
export type AlgorithmSource = 'semantic' | 'behavioral' | 'collaborative' | 'content' | 'hybrid'

// Base interfaces for scored results
export interface ScoredResult {
  score: ConfidenceScore
  confidence: ConfidenceScore
  source: AlgorithmSource
}

export interface WeightedResult extends ScoredResult {
  weight: Weight
  explanation?: string
}

// Analysis request base interface
export interface AnalysisRequest {
  userId: string
  depth: AnalysisDepth
  forceRefresh?: boolean
  includeExplanation?: boolean
}

// Analysis response base interface  
export interface AnalysisResponse<T> {
  result: T
  confidence: ConfidenceScore
  analysisDate: string
  source: AlgorithmSource
  processingTime?: number
  explanation?: string
}

// Preference strength indicators
export interface PreferenceStrength {
  strength: AffinityScore
  confidence: ConfidenceScore
  sampleSize: number
  lastUpdated: string
}

// Match scoring interface
export interface MatchScore {
  overall: CompatibilityScore
  breakdown: Record<string, SimilarityScore>
  explanation: string
  confidence: ConfidenceScore
}

// Temporal context for time-aware algorithms
export interface TemporalContext {
  timeOfDay?: number // 0-23
  dayOfWeek?: number // 0-6
  seasonality?: string
  recentActivity?: boolean
}

// User context aggregation
export interface UserAnalysisContext {
  userId: string
  temporal?: TemporalContext
  preferences?: Record<string, PreferenceStrength>
  behaviorSignals?: Record<string, Weight>
  explicitFeedback?: Record<string, AffinityScore>
}

// Algorithm performance metrics
export interface AlgorithmMetrics {
  accuracy: ConfidenceScore
  precision: ConfidenceScore  
  recall: ConfidenceScore
  diversity: ConfidenceScore
  latency: number // milliseconds
  lastEvaluated: string
}

// Fallback strategy configuration
export interface FallbackConfig {
  enabled: boolean
  threshold: ConfidenceScore // below this confidence, use fallback
  strategy: AlgorithmSource
  maxRetries: number
}

// Explanation granularity levels
export type ExplanationLevel = 'none' | 'basic' | 'detailed' | 'technical'

// Common error categories for AI services
export type AIErrorCategory = 
  | 'model_unavailable'
  | 'insufficient_data' 
  | 'rate_limited'
  | 'invalid_input'
  | 'processing_timeout'
  | 'configuration_error'

export interface AIServiceError {
  category: AIErrorCategory
  message: string
  code: string
  retryable: boolean
  context?: Record<string, unknown>
}

// Real-time learning signal
export interface LearningSignal {
  type: 'positive' | 'negative' | 'neutral'
  strength: Factor // how strong the signal is
  context: string // what caused this signal  
  timestamp: string
  userId: string
  movieId?: string
}

// Batch processing configuration
export interface BatchConfig {
  batchSize: number
  maxConcurrency: number
  timeout: number
  retryPolicy: {
    maxRetries: number
    backoffMs: number
  }
}

// Service health status
export interface ServiceHealth {
  healthy: boolean
  latency: number
  errorRate: ConfidenceScore
  lastCheck: string
  details?: Record<string, unknown>
}