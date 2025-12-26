/**
 * Type definitions for AI services and advanced intelligence features
 */

import type { Movie, ScoredRecommendation } from './index'

// Base recommendation request and response types
export interface UnifiedRecommendationRequest {
  strategy: 'hybrid' | 'smart' | 'hyper-personalized' | 'behavioral'
  query?: string
  mood?: string
  genres?: string[]
  limit?: number
  includeExplanations?: boolean
  diversityFactor?: number
}

export interface UnifiedRecommendationResponse {
  movies: ScoredRecommendation[] | Movie[]
  metadata: {
    source: string
    personalization_applied?: boolean
    confidence_scores?: Record<string, number>
    diversity_score?: number
    overall_confidence?: number
    processing_time_ms?: number
    component_timing?: {
      recommendation_ms?: number
      explanation_ms?: number
    }
    error?: string
    explanation_error?: string
    behavioral_analysis_error?: string
    personalization_error?: string
    profile_warning?: string
  }
  explanations?: RecommendationExplanation[]
}

// Query processing types
export interface ExtractedEntities {
  genres?: string[]
  directors?: string[]
  actors?: string[]
  years?: number[]
  keywords?: string[]
}

export interface DetectedIntents {
  primary: 'search' | 'recommend' | 'explore' | 'similar' | 'info'
  secondary?: string[]
  confidence: number
}

export interface SearchFilters {
  genres?: string[]
  years?: { min?: number; max?: number }
  rating?: { min?: number }
  runtime?: { min?: number; max?: number }
}

export interface QueryProcessingResult {
  originalQuery: string
  processedQuery: string
  extractedEntities: ExtractedEntities
  detectedIntents: DetectedIntents
  implicitPreferences: Record<string, number>
  contextualFactors: Record<string, string | number | boolean>
  queryComplexity: 'simple' | 'moderate' | 'complex'
  confidence: number
  recommendationStrategy: 'content-based' | 'collaborative' | 'hybrid' | 'exploratory'
  requiresExplanation: boolean
  searchFilters: SearchFilters
  timestamp: string
  recommendationsAvailable?: boolean
  recommendationEndpoint?: string
}

// Advanced analysis types
export interface ThematicProfile {
  themes: Array<{
    theme: string
    strength: number
    examples: string[]
  }>
  narrativePreferences: {
    complexity: number
    pacing: string
    structure: string[]
  }
  emotionalResonance: Record<string, number>
}

export interface EmotionalJourney {
  emotionalArc: Array<{
    emotion: string
    intensity: number
    phase: string
  }>
  catharticElements: string[]
  empathyFactors: Record<string, number>
  triggerWarnings?: string[]
}

export interface CinematicStyle {
  visualStyle: {
    cinematography: string[]
    colorPalette: string[]
    visualEffects: string[]
  }
  audioStyle: {
    musicGenres: string[]
    soundDesign: string[]
    dialogueStyle: string
  }
  narrativeTechniques: string[]
  directorSignatures: Record<string, number>
}

// Recommendation explanation types
export interface RecommendationExplanation {
  movie_id: string
  confidence: number
  discovery_factor: 'safe' | 'stretch' | 'adventure'
  primary_reason: string
  supporting_evidence: string[]
  optimal_viewing_time: string
}

// Weight configuration types
export interface WeightConfiguration {
  semantic: number
  collaborative: number
  popularity: number
  diversity: number
  recency: number
  quality: number
  genre_affinity: number
  director_preference: number
  temporal_boost: number
  exploration: number
}

// AI service response types
export interface AIServiceResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  metadata?: Record<string, unknown>
}

// Behavioral analysis types
export interface BehavioralAnalysis {
  behavioral_patterns: {
    preferred_genres: string[]
    quality_preference: number
    temporal_patterns: {
      preferred_times: string[]
    }
  }
  confidence: number
}

// Personalized scoring types
export interface PersonalizedScoring {
  scores: Record<string, number>
  factors: {
    genre_affinity: number
    quality_match: number
    director_preference: number
  }
}

// Voice and conversation types
export interface ConversationExchange {
  id: string
  user_message: string
  ai_response: string
  ai_audio_url?: string | null
  created_at: string
  isPlaying?: boolean
}

// Audio manager types
export interface AudioManagerState {
  isPlaying: boolean
  currentSource: string | null
  currentDescription?: string | null
}

// Error handling types
export interface APIError {
  code: string
  status: number
  message: string
  details?: Record<string, unknown>
  timestamp?: string
}

export interface ErrorContext {
  errorCode: string
  status: number
  endpoint: string
  userId?: string
  method?: string
  requestId: string
  details: Record<string, unknown>
  originalError: Error | unknown
  metadata?: Record<string, unknown>
}

// User interaction types
export interface UserInteraction {
  user_id: string
  movie_id: string
  interaction_type: 'view' | 'rate' | 'save' | 'skip' | 'click'
  interaction_value: number
  context?: Record<string, unknown>
  created_at?: string
}

// Preference insight types
export interface PreferenceInsight {
  user_id: string
  insight_type: string
  insight_data: Record<string, unknown>
  confidence: number
  computed_at?: string
}

// Memory types
export interface ConversationalMemory {
  user_id: string
  conversation_id?: string
  memory_key?: string
  user_message?: string
  ai_response?: string
  ai_audio_url?: string | null
  memory_text?: string
  preference_strength?: number
  times_reinforced?: number
  context?: Record<string, unknown>
  created_at?: string
  last_updated?: string
}
