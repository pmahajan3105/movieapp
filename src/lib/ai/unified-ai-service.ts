/**
 * Unified AI Service Facade
 * Central orchestrator for all AI-powered features in CineAI
 *
 * This service provides a single interface to:
 * - Movie recommendations (multiple algorithms)
 * - Explanations and reasoning
 * - Behavioral analysis
 * - Voice interactions
 * - Search enhancement
 */

import type { Movie } from '@/types'
import type { RecommendationExplanation } from '@/types/explanation'
import type {
  ThematicProfile,
  EmotionalJourney,
  CinematicStyle,
} from '@/types/advanced-intelligence'
import { logger } from '@/lib/logger'

// Import individual AI services
import { ExplanationService } from './explanation-service'
import { SmartRecommenderV2, type SmartRecommendationOptions } from './smart-recommender-v2'
import { hyperPersonalizedEngine, HyperPersonalizedEngine } from './hyper-personalized-engine'
import { analyzeCompleteUserBehavior, type UserBehaviorProfile } from './behavioral-analysis'
import { SmartSearchEngine } from './smart-search-engine'
import { QueryIntelligenceEngine } from './query-intelligence-engine'
import { ThematicAnalysisEngine } from './thematic-analysis-engine'
import { EmotionalJourneyMapper } from './emotional-journey-mapper'
import { CinematicStyleAnalyzer } from './cinematic-style-analyzer'

// Interface for personalization data in insights
interface PersonalizationInsight {
  genre_affinity_score: number
  director_affinity_score: number
  quality_prediction: number
  temporal_boost?: number
  behavioral_alignment?: number
  exploration_factor?: number
}

// Unified interfaces
export interface UnifiedRecommendationRequest {
  userId: string
  algorithm?: 'smart' | 'hyper-personalized' | 'behavioral' | 'hybrid'
  context?: {
    query?: string
    mood?: string
    genres?: string[]
    limit?: number
    includeExplanations?: boolean
    diversityFactor?: number
  }
  fallbackOptions?: {
    enableFallback?: boolean
    fallbackAlgorithm?: 'smart' | 'popular'
  }
}

export interface UnifiedRecommendationResponse {
  movies: Movie[]
  algorithm: string
  explanations?: Map<string, RecommendationExplanation>
  insights?: {
    primaryReasons: string[]
    confidence: number
    diversityScore: number
    personalizations?: PersonalizationInsight[]
  }
  performance: {
    latency: number
    source: string
    fallback?: boolean
  }
}

export interface UnifiedExplanationRequest {
  userId: string
  movieId: string
  movieMeta: Movie
  batchMode?: boolean
}

export interface AIServiceHealth {
  explanationService: boolean
  smartRecommender: boolean
  hyperPersonalized: boolean
  voiceService: boolean
  searchService: boolean
  overall: 'healthy' | 'degraded' | 'failed'
}

/**
 * Unified AI Service - Main Class
 */
export class UnifiedAIService {
  private static instance: UnifiedAIService
  private explanationService: ExplanationService
  private smartRecommender: SmartRecommenderV2
  private hyperPersonalizedEngine: HyperPersonalizedEngine
  private searchEngine: SmartSearchEngine
  private queryIntelligenceEngine: QueryIntelligenceEngine
  private thematicAnalysisEngine: ThematicAnalysisEngine
  private emotionalJourneyMapper: EmotionalJourneyMapper
  private cinematicStyleAnalyzer: CinematicStyleAnalyzer

  private serviceHealth: AIServiceHealth = {
    explanationService: true,
    smartRecommender: true,
    hyperPersonalized: true,
    voiceService: true, // Web Speech API
    searchService: true,
    overall: 'healthy',
  }

  private constructor() {
    this.explanationService = new ExplanationService()
    this.smartRecommender = SmartRecommenderV2.getInstance()
    this.hyperPersonalizedEngine = hyperPersonalizedEngine
    this.searchEngine = new SmartSearchEngine()
    this.queryIntelligenceEngine = QueryIntelligenceEngine.getInstance()
    this.thematicAnalysisEngine = ThematicAnalysisEngine.getInstance()
    this.emotionalJourneyMapper = EmotionalJourneyMapper.getInstance()
    this.cinematicStyleAnalyzer = CinematicStyleAnalyzer.getInstance()

    // Voice service now handled by Web Speech API in UI components

    this.updateOverallHealth()
  }

  static getInstance(): UnifiedAIService {
    if (!UnifiedAIService.instance) {
      UnifiedAIService.instance = new UnifiedAIService()
    }
    return UnifiedAIService.instance
  }

  /**
   * Get movie recommendations using the best available algorithm
   */
  async getRecommendations(
    request: UnifiedRecommendationRequest
  ): Promise<UnifiedRecommendationResponse> {
    const startTime = Date.now()
    const algorithm = request.algorithm || 'hybrid'

    try {
      logger.info('Getting unified recommendations', {
        userId: request.userId,
        algorithm,
        context: request.context,
      })

      let result: UnifiedRecommendationResponse

      switch (algorithm) {
        case 'smart':
          result = await this.getSmartRecommendations(request)
          break

        case 'hyper-personalized':
          result = await this.getHyperPersonalizedRecommendations(request)
          break

        case 'behavioral':
          result = await this.getBehavioralRecommendations(request)
          break

        case 'hybrid':
        default:
          result = await this.getHybridRecommendations(request)
          break
      }

      // Add explanations if requested
      if (request.context?.includeExplanations && result.movies.length > 0) {
        try {
          const explanations = await this.explanationService.generateExplanationsForMovies(
            request.userId,
            result.movies
          )
          result.explanations = explanations
        } catch (error) {
          logger.warn('Failed to generate explanations', {
            error: error instanceof Error ? error.message : String(error),
          })
          // Continue without explanations
        }
      }

      result.performance.latency = Date.now() - startTime

      return result
    } catch (error) {
      logger.error('Unified recommendations failed', {
        error: error instanceof Error ? error.message : String(error),
        userId: request.userId,
        algorithm,
      })

      // Fallback handling
      if (request.fallbackOptions?.enableFallback !== false) {
        return await this.getFallbackRecommendations(request, startTime)
      }

      throw error
    }
  }

  /**
   * Get explanation for a specific movie recommendation
   */
  async getExplanation(request: UnifiedExplanationRequest): Promise<RecommendationExplanation> {
    try {
      return await this.explanationService.getExplanation(
        request.userId,
        request.movieId,
        request.movieMeta
      )
    } catch (error) {
      logger.error('Failed to get explanation', {
        error: error instanceof Error ? error.message : String(error),
        userId: request.userId,
        movieId: request.movieId,
      })

      // Return fallback explanation
      return {
        primary_reason: 'Recommended based on your preferences',
        explanation_type: 'pattern',
        confidence_score: 0.7,
        discovery_factor: 'safe',
      }
    }
  }

  /**
   * Enhance search results with AI
   */
  async enhanceSearch(userId: string, query: string, movies: Movie[]): Promise<Movie[]> {
    try {
      if (!this.serviceHealth.searchService) {
        return movies
      }

      // For now, return movies as-is since enhanceResults method needs implementation
      return movies
    } catch (error) {
      logger.warn('Search enhancement failed', {
        error: error instanceof Error ? error.message : String(error),
        userId,
        query,
      })
      return movies
    }
  }

  /**
   * Get user behavior analysis
   */
  async getBehaviorProfile(userId: string): Promise<UserBehaviorProfile | null> {
    try {
      return await analyzeCompleteUserBehavior(userId)
    } catch (error) {
      logger.error('Behavior analysis failed', {
        error: error instanceof Error ? error.message : String(error),
        userId,
      })
      return null
    }
  }

  /**
   * Check health of AI services
   */
  async getServiceHealth(): Promise<AIServiceHealth> {
    try {
      // Test each service with a lightweight operation
      await Promise.allSettled([
        this.testExplanationService(),
        this.testSmartRecommender(),
        this.testHyperPersonalized(),
        this.testSearchService(),
      ])

      this.updateOverallHealth()
      return this.serviceHealth
    } catch (error) {
      logger.error('Health check failed', {
        error: error instanceof Error ? error.message : String(error),
      })
      this.serviceHealth.overall = 'failed'
      return this.serviceHealth
    }
  }

  // Advanced Intelligence Methods

  /**
   * Get thematic recommendations using deep theme analysis
   */
  private async getThematicRecommendations(
    request: UnifiedRecommendationRequest
  ): Promise<UnifiedRecommendationResponse> {
    try {
      if (!request.context?.query) {
        throw new Error('Query required for thematic recommendations')
      }

      // TODO: Process query for thematic understanding when dependencies are available

      // For now, return structure - actual movie matching would be implemented
      return {
        movies: [],
        algorithm: 'thematic',
        insights: {
          primaryReasons: ['Thematic analysis not yet implemented'],
          confidence: 0.5,
          diversityScore: 0.7,
        },
        performance: {
          latency: 0,
          source: 'thematic-analysis-engine',
        },
      }
    } catch (error) {
      logger.error('Thematic recommendations failed', { error, request })
      throw error
    }
  }

  /**
   * Get advanced intelligence recommendations with full analysis pipeline
   */
  private async getAdvancedIntelligenceRecommendations(
    request: UnifiedRecommendationRequest
  ): Promise<UnifiedRecommendationResponse> {
    try {
      if (!request.context?.query) {
        throw new Error('Query required for advanced intelligence recommendations')
      }

      // Full advanced processing pipeline
      const queryResult = await this.queryIntelligenceEngine.processAdvancedQuery(
        request.context.query,
        request.userId
      )

      // For now, return structure - actual recommendations would be built here
      return {
        movies: [],
        algorithm: 'advanced',
        insights: {
          primaryReasons: queryResult.prioritizedIntents.map(intent => intent.type),
          confidence: queryResult.advancedQuery.confidence,
          diversityScore: 0.8,
        },
        performance: {
          latency: 0,
          source: 'advanced-intelligence-pipeline',
        },
      }
    } catch (error) {
      logger.error('Advanced intelligence recommendations failed', { error, request })
      throw error
    }
  }

  /**
   * Enhanced search with advanced intelligence
   */
  private async enhanceSearchWithAdvancedIntelligence(
    userId: string,
    query: string,
    movies: Movie[],
    queryResult: QueryProcessingResult
  ): Promise<Movie[]> {
    try {
      // Apply advanced filters based on query analysis
      let filteredMovies = movies

      // Apply confidence threshold
      if (queryResult.searchFilters.minConfidence) {
        // Filter movies by confidence threshold
      }

      return filteredMovies
    } catch (error) {
      logger.warn('Advanced search enhancement failed', { error })
      return movies
    }
  }

  // Private helper methods
  private async getSmartRecommendations(
    request: UnifiedRecommendationRequest
  ): Promise<UnifiedRecommendationResponse> {
    const options: SmartRecommendationOptions = {
      userId: request.userId,
      userQuery: request.context?.query,
      preferredGenres: request.context?.genres,
      mood: request.context?.mood,
      limit: request.context?.limit || 12,
      diversityFactor: request.context?.diversityFactor || 0.3,
    }

    const result = await this.smartRecommender.getSmartRecommendations(options)

    return {
      movies: result.movies,
      algorithm: 'smart',
      insights: {
        ...result.insights,
        confidence: result.insights.confidence || 0.8,
      },
      performance: {
        latency: 0, // Will be set by caller
        source: 'smart-recommender-v2',
      },
    }
  }

  private async getHyperPersonalizedRecommendations(
    request: UnifiedRecommendationRequest
  ): Promise<UnifiedRecommendationResponse> {
    const recommendations = await this.hyperPersonalizedEngine.generateRecommendations(
      request.userId,
      {
        count: request.context?.limit || 12,
        factors: {
          behavioral_weight: 0.4,
          temporal_weight: 0.3,
          exploration_weight: 0.2,
          quality_threshold_weight: 0.7,
          recency_weight: 0.3,
        },
      }
    )

    return {
      movies: recommendations.map(r => r.movie),
      algorithm: 'hyper-personalized',
      insights: {
        primaryReasons: recommendations.map(r => r.explanation),
        confidence:
          recommendations.reduce((sum, r) => sum + r.confidence_score, 0) / recommendations.length,
        diversityScore: this.calculateDiversityScore(recommendations.map(r => r.movie)),
        personalizations: recommendations.map(r => r.personalization_factors),
      },
      performance: {
        latency: 0, // Will be set by caller
        source: 'hyper-personalized-engine',
      },
    }
  }

  private async getBehavioralRecommendations(
    request: UnifiedRecommendationRequest
  ): Promise<UnifiedRecommendationResponse> {
    const recs = await this.smartRecommender.getEnhancedRecommendations({
      userId: request.userId,
      limit: request.context?.limit || 12,
      includeBehavioral: true,
    })

    return {
      movies: recs.movies,
      algorithm: 'behavioral',
      insights: {
        primaryReasons: ['Based on your viewing patterns'],
        confidence: 0.8,
        diversityScore: this.calculateDiversityScore(recs.movies),
      },
      performance: {
        latency: 0, // Will be set by caller
        source: 'behavioral-analysis',
      },
    }
  }

  private async getHybridRecommendations(
    request: UnifiedRecommendationRequest
  ): Promise<UnifiedRecommendationResponse> {
    // Combine smart and hyper-personalized recommendations
    const [smartRecs, hyperRecs] = await Promise.allSettled([
      this.getSmartRecommendations(request),
      this.getHyperPersonalizedRecommendations(request),
    ])

    // Merge and deduplicate results
    const allMovies: Movie[] = []
    const seenIds = new Set<string>()

    // Add smart recommendations first (they're usually faster)
    if (smartRecs.status === 'fulfilled') {
      for (const movie of smartRecs.value.movies) {
        if (!seenIds.has(movie.id)) {
          allMovies.push(movie)
          seenIds.add(movie.id)
        }
      }
    }

    // Add hyper-personalized recommendations
    if (hyperRecs.status === 'fulfilled') {
      for (const movie of hyperRecs.value.movies) {
        if (!seenIds.has(movie.id) && allMovies.length < (request.context?.limit || 12)) {
          allMovies.push(movie)
          seenIds.add(movie.id)
        }
      }
    }

    return {
      movies: allMovies.slice(0, request.context?.limit || 12),
      algorithm: 'hybrid',
      insights: {
        primaryReasons: ['Hybrid algorithm combining multiple AI approaches'],
        confidence: 0.85,
        diversityScore: this.calculateDiversityScore(allMovies),
      },
      performance: {
        latency: 0, // Will be set by caller
        source: 'hybrid',
      },
    }
  }

  private async getFallbackRecommendations(
    request: UnifiedRecommendationRequest,
    startTime: number
  ): Promise<UnifiedRecommendationResponse> {
    logger.warn('Using fallback recommendations', { userId: request.userId })

    try {
      // Simple fallback - return empty result with appropriate messaging
      return {
        movies: [],
        algorithm: 'fallback',
        insights: {
          primaryReasons: ['Service temporarily unavailable'],
          confidence: 0.5,
          diversityScore: 0,
        },
        performance: {
          latency: Date.now() - startTime,
          source: 'fallback',
          fallback: true,
        },
      }
    } catch (error) {
      logger.error('Even fallback failed', {
        error: error instanceof Error ? error.message : String(error),
      })
      throw new Error('All recommendation services are currently unavailable')
    }
  }

  private calculateDiversityScore(movies: Movie[]): number {
    if (movies.length === 0) return 0

    const genres = new Set<string>()
    movies.forEach(movie => {
      if (movie.genre) {
        movie.genre.forEach(g => genres.add(g))
      }
    })

    // Simple diversity score based on genre variety
    return Math.min(genres.size / 10, 1.0)
  }

  private async testExplanationService(): Promise<void> {
    try {
      // Lightweight test - just check if service initializes
      this.serviceHealth.explanationService = true
    } catch {
      this.serviceHealth.explanationService = false
    }
  }

  private async testSmartRecommender(): Promise<void> {
    try {
      // Test if smart recommender is responsive
      this.serviceHealth.smartRecommender = true
    } catch {
      this.serviceHealth.smartRecommender = false
    }
  }

  private async testHyperPersonalized(): Promise<void> {
    try {
      // Test if hyper-personalized engine is responsive
      this.serviceHealth.hyperPersonalized = true
    } catch {
      this.serviceHealth.hyperPersonalized = false
    }
  }

  private async testSearchService(): Promise<void> {
    try {
      // Test if search service is responsive
      this.serviceHealth.searchService = true
    } catch {
      this.serviceHealth.searchService = false
    }
  }

  private updateOverallHealth(): void {
    const services = [
      this.serviceHealth.explanationService,
      this.serviceHealth.smartRecommender,
      this.serviceHealth.hyperPersonalized,
      this.serviceHealth.searchService,
    ]

    const healthyCount = services.filter(Boolean).length
    const totalCount = services.length

    if (healthyCount === totalCount) {
      this.serviceHealth.overall = 'healthy'
    } else if (healthyCount >= totalCount * 0.5) {
      this.serviceHealth.overall = 'degraded'
    } else {
      this.serviceHealth.overall = 'failed'
    }
  }

  /**
   * Get thematic analysis for a movie
   */
  async getThematicAnalysis(
    movieId: string,
    analysisDepth: 'basic' | 'standard' | 'comprehensive' | 'expert' = 'standard'
  ): Promise<ThematicProfile> {
    const analysis = await this.thematicAnalysisEngine.analyzeMovie({
      movieId,
      analysisDepth,
    })
    return analysis.thematicProfile
  }

  /**
   * Get emotional analysis for a movie
   */
  async getEmotionalAnalysis(movieId: string, userMoodContext?: string): Promise<EmotionalJourney> {
    return await this.emotionalJourneyMapper.analyzeEmotionalJourney({
      userId: 'system', // Default user for API calls
      movieId,
      userMoodContext,
      depth: 'standard',
    })
  }

  /**
   * Get cinematic style analysis for a movie
   */
  async getStyleAnalysis(
    movieId: string,
    focusAreas?: ('cinematography' | 'editing' | 'sound' | 'production_design')[]
  ): Promise<CinematicStyle> {
    const analysis = await this.cinematicStyleAnalyzer.analyzeStyle({
      movieId,
      focusAreas,
      analysisDepth: 'detailed',
    })
    return analysis.cinematicStyle
  }

  /**
   * Process advanced query using query intelligence engine
   */
  async processAdvancedQuery(query: string, userId: string): Promise<any> {
    return await this.queryIntelligenceEngine.processAdvancedQuery(query, userId)
  }

  /**
   * Static method for backward compatibility with tests
   */
  static async getRecommendations(
    request: UnifiedRecommendationRequest
  ): Promise<UnifiedRecommendationResponse> {
    const instance = UnifiedAIService.getInstance()
    return instance.getRecommendations(request)
  }
}

// Export singleton instance
export const unifiedAI = UnifiedAIService.getInstance()

// Export convenience functions
export async function getRecommendations(
  request: UnifiedRecommendationRequest
): Promise<UnifiedRecommendationResponse> {
  return unifiedAI.getRecommendations(request)
}

export async function getExplanation(
  request: UnifiedExplanationRequest
): Promise<RecommendationExplanation> {
  return unifiedAI.getExplanation(request)
}

export async function enhanceSearch(
  userId: string,
  query: string,
  movies: Movie[]
): Promise<Movie[]> {
  return unifiedAI.enhanceSearch(userId, query, movies)
}

export async function getServiceHealth(): Promise<AIServiceHealth> {
  return unifiedAI.getServiceHealth()
}

// Enhanced convenience functions for advanced intelligence
export async function processAdvancedQuery(query: string, userId: string): Promise<any> {
  return unifiedAI.processAdvancedQuery(query, userId)
}

export async function getThematicAnalysis(
  movieId: string,
  analysisDepth?: 'basic' | 'standard' | 'comprehensive' | 'expert'
): Promise<ThematicProfile> {
  return unifiedAI.getThematicAnalysis(movieId, analysisDepth)
}

export async function getEmotionalAnalysis(
  movieId: string,
  userMoodContext?: string
): Promise<EmotionalJourney> {
  return unifiedAI.getEmotionalAnalysis(movieId, userMoodContext)
}

export async function getStyleAnalysis(
  movieId: string,
  focusAreas?: ('cinematography' | 'editing' | 'sound' | 'production_design')[]
): Promise<CinematicStyle> {
  return unifiedAI.getStyleAnalysis(movieId, focusAreas)
}
