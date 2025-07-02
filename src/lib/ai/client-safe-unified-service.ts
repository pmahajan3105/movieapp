/**
 * Client-Safe Unified AI Service
 * Provides the same interface as UnifiedAIService but safe for client-side imports
 */

import type { Movie } from '@/types'
import type { RecommendationExplanation } from '@/types/explanation'

// Define interfaces without importing server-side services
export interface ClientUnifiedRecommendationRequest {
  userId: string
  algorithm?: 'smart' | 'hyper-personalized' | 'behavioral' | 'hybrid' | 'thematic' | 'advanced'
  context?: {
    query?: string
    mood?: string
    genres?: string[]
    limit?: number
    includeExplanations?: boolean
    diversityFactor?: number
    enableAdvancedQuery?: boolean
    enableThematicAnalysis?: boolean
    enableStyleMatching?: boolean
    enableEmotionalJourney?: boolean
    analysisDepth?: 'basic' | 'standard' | 'comprehensive' | 'expert'
    requireEducationalInsights?: boolean
  }
  fallbackOptions?: {
    enableFallback?: boolean
    fallbackAlgorithm?: 'smart' | 'popular'
  }
}

export interface ClientUnifiedRecommendationResponse {
  movies: Movie[]
  algorithm: string
  explanations?: Record<string, RecommendationExplanation>
  insights?: {
    primaryReasons: string[]
    confidence: number
    diversityScore: number
    personalizations?: any
    thematicMatches?: Record<string, number>
    emotionalCompatibility?: Record<string, number>
    styleAlignment?: Record<string, number>
    queryComplexity?: 'simple' | 'moderate' | 'complex' | 'expert'
  }
  performance: {
    latency: number
    source: string
    fallback?: boolean
  }
  queryAnalysis?: {
    originalQuery?: string
    complexity?: string
    detectedIntents?: any[]
    confidence?: number
  }
  educationalInsights?: string[]
}

/**
 * Client-safe unified AI service that makes API calls instead of direct imports
 */
export class ClientSafeUnifiedAIService {
  private static instance: ClientSafeUnifiedAIService

  static getInstance(): ClientSafeUnifiedAIService {
    if (!ClientSafeUnifiedAIService.instance) {
      ClientSafeUnifiedAIService.instance = new ClientSafeUnifiedAIService()
    }
    return ClientSafeUnifiedAIService.instance
  }

  /**
   * Get recommendations using API calls (client-safe)
   */
  async getRecommendations(request: ClientUnifiedRecommendationRequest): Promise<ClientUnifiedRecommendationResponse> {
    const params = new URLSearchParams()
    
    // Map algorithm to API parameters
    if (request.algorithm === 'smart') {
      params.set('smart', 'true')
    } else if (request.algorithm === 'behavioral') {
      params.set('behavioral', 'true')
    } else if (request.algorithm === 'thematic') {
      params.set('thematic', 'true')
    } else if (request.algorithm === 'advanced') {
      params.set('advanced', 'true')
    }

    // Add context parameters
    if (request.context?.query) {
      params.set('query', request.context.query)
    }
    if (request.context?.mood) {
      params.set('mood', request.context.mood)
    }
    if (request.context?.genres?.length) {
      params.set('genres', request.context.genres.join(','))
    }
    if (request.context?.limit) {
      params.set('limit', request.context.limit.toString())
    }
    if (request.context?.enableAdvancedQuery) {
      params.set('enableAdvancedQuery', 'true')
    }
    if (request.context?.analysisDepth) {
      params.set('analysisDepth', request.context.analysisDepth)
    }

    const response = await fetch(`/api/movies?${params.toString()}`)
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`)
    }

    const data = await response.json()
    
    return {
      movies: data.movies || [],
      algorithm: data.algorithm || request.algorithm || 'unknown',
      explanations: data.explanations,
      insights: data.insights,
      performance: data.performance || { latency: 0, source: 'api' },
      queryAnalysis: data.queryAnalysis,
      educationalInsights: data.educationalInsights
    }
  }

  /**
   * Process advanced query (client-safe)
   */
  async processAdvancedQuery(query: string, userId: string) {
    const response = await fetch('/api/query/intelligence', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, includeRecommendations: false })
    })

    if (!response.ok) {
      throw new Error(`Query processing failed: ${response.status}`)
    }

    return response.json()
  }

  /**
   * Get thematic analysis (client-safe)
   */
  async getThematicAnalysis(movieId: string, analysisDepth: string = 'standard') {
    const params = new URLSearchParams({
      movieId,
      depth: analysisDepth
    })

    const response = await fetch(`/api/movies/thematic?${params.toString()}`)
    
    if (!response.ok) {
      throw new Error(`Thematic analysis failed: ${response.status}`)
    }

    const data = await response.json()
    return data.thematicProfile
  }

  /**
   * Get emotional analysis (client-safe)
   */
  async getEmotionalAnalysis(movieId: string, userMoodContext?: string) {
    const params = new URLSearchParams({ movieId })
    if (userMoodContext) {
      params.set('mood', userMoodContext)
    }

    const response = await fetch(`/api/movies/emotional?${params.toString()}`)
    
    if (!response.ok) {
      throw new Error(`Emotional analysis failed: ${response.status}`)
    }

    const data = await response.json()
    return data.emotionalJourney
  }

  /**
   * Get style analysis (client-safe)
   */
  async getStyleAnalysis(movieId: string, focusAreas?: string[]) {
    const params = new URLSearchParams({ movieId })
    if (focusAreas?.length) {
      params.set('focusAreas', focusAreas.join(','))
    }

    const response = await fetch(`/api/movies/style?${params.toString()}`)
    
    if (!response.ok) {
      throw new Error(`Style analysis failed: ${response.status}`)
    }

    const data = await response.json()
    return data.cinematicStyle
  }
}

// Export singleton instance
export const clientSafeUnifiedAI = ClientSafeUnifiedAIService.getInstance()

// Export convenience functions
export async function getAdvancedRecommendations(request: ClientUnifiedRecommendationRequest): Promise<ClientUnifiedRecommendationResponse> {
  return clientSafeUnifiedAI.getRecommendations(request)
}

export async function processAdvancedQuery(query: string, userId: string) {
  return clientSafeUnifiedAI.processAdvancedQuery(query, userId)
}

export async function getThematicAnalysis(movieId: string, analysisDepth?: string) {
  return clientSafeUnifiedAI.getThematicAnalysis(movieId, analysisDepth)
}

export async function getEmotionalAnalysis(movieId: string, userMoodContext?: string) {
  return clientSafeUnifiedAI.getEmotionalAnalysis(movieId, userMoodContext)
}

export async function getStyleAnalysis(movieId: string, focusAreas?: string[]) {
  return clientSafeUnifiedAI.getStyleAnalysis(movieId, focusAreas)
}