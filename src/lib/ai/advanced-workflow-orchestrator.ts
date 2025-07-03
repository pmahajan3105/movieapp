/**
 * Advanced AI Workflow Orchestrator
 * Combines multiple AI services for comprehensive end-to-end user experiences
 */

import { logger } from '@/lib/logger'
import {
  UnifiedAIService,
  processAdvancedQuery,
  getThematicAnalysis,
  getEmotionalAnalysis,
  getStyleAnalysis,
} from './unified-ai-service'
import type { Movie } from '@/types'
import type { QueryProcessingResult } from '@/types/ai-services'
import type {
  ThematicProfile,
  EmotionalJourney,
  CinematicStyle,
} from '@/types/advanced-intelligence'

export interface AdvancedWorkflowRequest {
  userId: string
  query: string
  workflowType:
    | 'comprehensive_discovery'
    | 'educational_analysis'
    | 'style_exploration'
    | 'mood_journey'
    | 'comparative_analysis'
  context?: {
    referenceMovies?: string[]
    moodState?: string
    learningGoals?: string[]
    timeConstraints?: 'quick' | 'standard' | 'deep'
  }
}

export interface AdvancedWorkflowResult {
  movies: Movie[]
  insights: {
    queryAnalysis: QueryProcessingResult
    thematicAnalysis?: Record<string, ThematicProfile>
    emotionalJourneys?: Record<string, EmotionalJourney>
    cinematicStyles?: Record<string, CinematicStyle>
    educationalContent?: string[]
    personalizedReasons: string[]
    confidence: number
  }
  visualizations: {
    moodSpectrum?: Array<{ mood: string; intensity: number; movies: string[] }>
    themeNetwork?: Array<{ theme: string; connections: string[]; strength: number }>
    styleComparison?: Array<{ director: string; signature: string[]; examples: string[] }>
    emotionalArc?: Array<{ phase: string; intensity: number; description: string }>
  }
  performance: {
    totalTime: number
    serviceBreakdown: Record<string, number>
    cacheHits: number
    apiCalls: number
  }
}

export class AdvancedWorkflowOrchestrator {
  private static instance: AdvancedWorkflowOrchestrator
  private aiService: UnifiedAIService
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>()

  private constructor() {
    this.aiService = UnifiedAIService.getInstance()
  }

  static getInstance(): AdvancedWorkflowOrchestrator {
    if (!AdvancedWorkflowOrchestrator.instance) {
      AdvancedWorkflowOrchestrator.instance = new AdvancedWorkflowOrchestrator()
    }
    return AdvancedWorkflowOrchestrator.instance
  }

  async executeWorkflow(request: AdvancedWorkflowRequest): Promise<AdvancedWorkflowResult> {
    const serviceMetrics: Record<string, number> = {}

    logger.info('🚀 Starting advanced AI workflow', {
      userId: request.userId,
      workflowType: request.workflowType,
      query: request.query.slice(0, 100),
    })

    try {
      switch (request.workflowType) {
        case 'comprehensive_discovery':
          return await this.executeComprehensiveDiscovery(request, serviceMetrics)
        case 'educational_analysis':
          return await this.executeEducationalAnalysis(request, serviceMetrics)
        case 'style_exploration':
          return await this.executeStyleExploration(request, serviceMetrics)
        case 'mood_journey':
          return await this.executeMoodJourney(request, serviceMetrics)
        case 'comparative_analysis':
          return await this.executeComparativeAnalysis(request, serviceMetrics)
        default:
          throw new Error(`Unknown workflow type: ${request.workflowType}`)
      }
    } catch (error) {
      logger.error('Advanced workflow failed', {
        error: error instanceof Error ? error.message : String(error),
        workflowType: request.workflowType,
        userId: request.userId,
      })
      throw error
    }
  }

  private async executeComprehensiveDiscovery(
    request: AdvancedWorkflowRequest,
    metrics: Record<string, number>
  ): Promise<AdvancedWorkflowResult> {
    const startTime = Date.now()

    // Step 1: Advanced query processing
    const queryStart = Date.now()
    const queryAnalysis = await processAdvancedQuery(request.query, request.userId)
    metrics.queryProcessing = Date.now() - queryStart

    // Step 2: Get initial recommendations
    const recsStart = Date.now()
    const recommendations = await this.aiService.getRecommendations({
      userId: request.userId,
      algorithm: 'hybrid',
      context: {
        query: request.query,
        limit: 20,
        includeExplanations: true,
      },
    })
    metrics.recommendations = Date.now() - recsStart

    // Step 3: Parallel deep analysis of top movies
    const analysisStart = Date.now()
    const topMovies = recommendations.movies.slice(0, 5)

    const [thematicAnalysis, emotionalJourneys, cinematicStyles] = await Promise.all([
      this.analyzeMoviesThematically(topMovies),
      this.analyzeMoviesEmotionally(topMovies, request.context?.moodState),
      this.analyzeMoviesStyleistically(topMovies),
    ])
    metrics.deepAnalysis = Date.now() - analysisStart

    // Step 4: Generate rich visualizations
    const visualizations = await this.generateComprehensiveVisualizations(
      topMovies,
      thematicAnalysis,
      emotionalJourneys,
      cinematicStyles
    )

    return {
      movies: recommendations.movies,
      insights: {
        queryAnalysis,
        thematicAnalysis,
        emotionalJourneys,
        cinematicStyles,
        personalizedReasons: recommendations.insights?.primaryReasons || [],
        confidence: recommendations.insights?.confidence || 0.8,
      },
      visualizations,
      performance: {
        totalTime: Date.now() - startTime,
        serviceBreakdown: metrics,
        cacheHits: 0,
        apiCalls: 4,
      },
    }
  }

  private async executeEducationalAnalysis(
    request: AdvancedWorkflowRequest,
    metrics: Record<string, number>
  ): Promise<AdvancedWorkflowResult> {
    const startTime = Date.now()

    // Focus on educational content and deep explanations
    const queryAnalysis = await processAdvancedQuery(request.query, request.userId)

    const recommendations = await this.aiService.getRecommendations({
      userId: request.userId,
      algorithm: 'smart',
      context: {
        query: request.query,
        limit: 10,
        includeExplanations: true,
      },
    })

    // Generate educational content
    const educationalContent = await this.generateEducationalContent(
      recommendations.movies.slice(0, 3),
      request.context?.learningGoals || []
    )

    const visualizations = {
      themeNetwork: await this.generateThemeNetwork(recommendations.movies),
      styleComparison: await this.generateStyleComparison(recommendations.movies),
    }

    return {
      movies: recommendations.movies,
      insights: {
        queryAnalysis,
        educationalContent,
        personalizedReasons: recommendations.insights?.primaryReasons || [],
        confidence: 0.9,
      },
      visualizations,
      performance: {
        totalTime: Date.now() - startTime,
        serviceBreakdown: metrics,
        cacheHits: 0,
        apiCalls: 3,
      },
    }
  }

  private async executeStyleExploration(
    request: AdvancedWorkflowRequest,
    metrics: Record<string, number>
  ): Promise<AdvancedWorkflowResult> {
    const startTime = Date.now()

    const queryAnalysis = await processAdvancedQuery(request.query, request.userId)

    const recommendations = await this.aiService.getRecommendations({
      userId: request.userId,
      algorithm: 'smart',
      context: {
        query: request.query,
        limit: 15,
        includeExplanations: true,
      },
    })

    // Deep style analysis
    const cinematicStyles = await this.analyzeMoviesStyleistically(
      recommendations.movies.slice(0, 6)
    )

    const visualizations = {
      styleComparison: await this.generateStyleComparison(recommendations.movies),
      themeNetwork: await this.generateThemeNetwork(recommendations.movies),
    }

    return {
      movies: recommendations.movies,
      insights: {
        queryAnalysis,
        cinematicStyles,
        personalizedReasons: recommendations.insights?.primaryReasons || [],
        confidence: 0.85,
      },
      visualizations,
      performance: {
        totalTime: Date.now() - startTime,
        serviceBreakdown: metrics,
        cacheHits: 0,
        apiCalls: 2,
      },
    }
  }

  private async executeMoodJourney(
    request: AdvancedWorkflowRequest,
    metrics: Record<string, number>
  ): Promise<AdvancedWorkflowResult> {
    const startTime = Date.now()

    const queryAnalysis = await processAdvancedQuery(request.query, request.userId)

    const recommendations = await this.aiService.getRecommendations({
      userId: request.userId,
      algorithm: 'hyper-personalized',
      context: {
        query: request.query,
        mood: request.context?.moodState,
        limit: 12,
        includeExplanations: true,
      },
    })

    // Deep emotional analysis
    const emotionalJourneys = await this.analyzeMoviesEmotionally(
      recommendations.movies.slice(0, 5),
      request.context?.moodState
    )

    const visualizations = {
      moodSpectrum: await this.generateMoodSpectrum(recommendations.movies, emotionalJourneys),
      emotionalArc: await this.generateEmotionalArc(emotionalJourneys),
    }

    return {
      movies: recommendations.movies,
      insights: {
        queryAnalysis,
        emotionalJourneys,
        personalizedReasons: recommendations.insights?.primaryReasons || [],
        confidence: 0.88,
      },
      visualizations,
      performance: {
        totalTime: Date.now() - startTime,
        serviceBreakdown: metrics,
        cacheHits: 0,
        apiCalls: 2,
      },
    }
  }

  private async executeComparativeAnalysis(
    request: AdvancedWorkflowRequest,
    metrics: Record<string, number>
  ): Promise<AdvancedWorkflowResult> {
    const startTime = Date.now()

    const queryAnalysis = await processAdvancedQuery(request.query, request.userId)

    const recommendations = await this.aiService.getRecommendations({
      userId: request.userId,
      algorithm: 'smart',
      context: {
        query: request.query,
        limit: 8,
        includeExplanations: true,
      },
    })

    // Multi-dimensional analysis for comparison
    const [thematicAnalysis, cinematicStyles] = await Promise.all([
      this.analyzeMoviesThematically(recommendations.movies),
      this.analyzeMoviesStyleistically(recommendations.movies),
    ])

    const visualizations = {
      styleComparison: await this.generateStyleComparison(recommendations.movies),
      themeNetwork: await this.generateThemeNetwork(recommendations.movies),
    }

    return {
      movies: recommendations.movies,
      insights: {
        queryAnalysis,
        thematicAnalysis,
        cinematicStyles,
        personalizedReasons: recommendations.insights?.primaryReasons || [],
        confidence: 0.82,
      },
      visualizations,
      performance: {
        totalTime: Date.now() - startTime,
        serviceBreakdown: metrics,
        cacheHits: 0,
        apiCalls: 3,
      },
    }
  }

  // Helper methods for analysis
  private async analyzeMoviesThematically(
    movies: Movie[]
  ): Promise<Record<string, ThematicProfile>> {
    const results: Record<string, ThematicProfile> = {}

    for (const movie of movies) {
      try {
        results[movie.id] = await getThematicAnalysis(movie.id, 'standard')
      } catch (error) {
        logger.warn(`Thematic analysis failed for movie ${movie.id}`, { error })
      }
    }

    return results
  }

  private async analyzeMoviesEmotionally(
    movies: Movie[],
    userMoodContext?: string
  ): Promise<Record<string, EmotionalJourney>> {
    const results: Record<string, EmotionalJourney> = {}

    for (const movie of movies) {
      try {
        results[movie.id] = await getEmotionalAnalysis(movie.id, userMoodContext)
      } catch (error) {
        logger.warn(`Emotional analysis failed for movie ${movie.id}`, { error })
      }
    }

    return results
  }

  private async analyzeMoviesStyleistically(
    movies: Movie[]
  ): Promise<Record<string, CinematicStyle>> {
    const results: Record<string, CinematicStyle> = {}

    for (const movie of movies) {
      try {
        results[movie.id] = await getStyleAnalysis(movie.id)
      } catch (error) {
        logger.warn(`Style analysis failed for movie ${movie.id}`, { error })
      }
    }

    return results
  }

  // Visualization generators
  private async generateComprehensiveVisualizations(
    movies: Movie[],
    thematic: Record<string, ThematicProfile>,
    emotional: Record<string, EmotionalJourney>,
    _style: Record<string, CinematicStyle>
  ) {
    return {
      moodSpectrum: await this.generateMoodSpectrum(movies, emotional),
      themeNetwork: await this.generateThemeNetwork(movies),
      styleComparison: await this.generateStyleComparison(movies),
      emotionalArc: await this.generateEmotionalArc(emotional),
    }
  }

  private async generateMoodSpectrum(
    movies: Movie[],
    _emotional: Record<string, EmotionalJourney>
  ) {
    const moodMap = new Map<string, { intensity: number; movies: string[] }>()

    movies.forEach(movie => {
      const journey = _emotional[movie.id]
      if (journey?.emotionalBeats && journey.emotionalBeats.length > 0) {
        // Use the strongest emotional beat as the primary mood
        const strongestBeat = journey.emotionalBeats.reduce((prev, current) =>
          current.intensity > prev.intensity ? current : prev
        )
        const mood = strongestBeat.emotion
        const intensity = strongestBeat.intensity
        const existing = moodMap.get(mood) || { intensity: 0, movies: [] }
        existing.intensity = Math.max(existing.intensity, intensity)
        existing.movies.push(movie.title)
        moodMap.set(mood, existing)
      }
    })

    return Array.from(moodMap.entries()).map(([mood, data]) => ({
      mood,
      intensity: data.intensity,
      movies: data.movies,
    }))
  }

  private async generateThemeNetwork(movies: Movie[]) {
    const themes = new Set<string>()
    movies.forEach(movie => {
      if (movie.genre) {
        movie.genre.forEach(g => themes.add(g))
      }
    })

    return Array.from(themes).map(theme => ({
      theme,
      connections: Array.from(themes)
        .filter(t => t !== theme)
        .slice(0, 3),
      strength: Math.random() * 0.8 + 0.2,
    }))
  }

  private async generateStyleComparison(movies: Movie[]) {
    const directors = new Set<string>()
    movies.forEach(movie => {
      if (movie.director) {
        movie.director.forEach(d => directors.add(d))
      }
    })

    return Array.from(directors).map(director => ({
      director,
      signature: ['Visual style', 'Pacing', 'Themes'],
      examples: movies
        .filter(m => m.director?.includes(director))
        .map(m => m.title)
        .slice(0, 3),
    }))
  }

  private async generateEmotionalArc(_emotional: Record<string, EmotionalJourney>) {
    const phases = ['Opening', 'Development', 'Climax', 'Resolution']

    return phases.map(phase => ({
      phase,
      intensity: Math.random() * 0.8 + 0.2,
      description: `Emotional progression in ${phase.toLowerCase()} phase`,
    }))
  }

  private async generateEducationalContent(
    movies: Movie[],
    _learningGoals: string[]
  ): Promise<string[]> {
    return [
      `Cinematic techniques explored in ${movies[0]?.title}`,
      `Historical context and cultural impact`,
      `Directorial style analysis and influences`,
      `Thematic depth and symbolic elements`,
      `Technical achievements and innovations`,
    ]
  }
}

export const advancedWorkflowOrchestrator = AdvancedWorkflowOrchestrator.getInstance()
