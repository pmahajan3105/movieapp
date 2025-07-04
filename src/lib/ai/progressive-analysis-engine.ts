/**
 * Progressive Analysis Engine
 * Phase 4.3: Adaptive AI analysis depth based on context and performance
 */

import { logger } from '@/lib/logger'
import { PerformanceMonitor, measurePerformance } from './performance-monitor'
import { SmartCacheManager } from './smart-cache-manager'

type AnalysisDepth = 'minimal' | 'standard' | 'enhanced' | 'comprehensive'
type AnalysisContext = 'dashboard' | 'detail' | 'search' | 'background' | 'real-time'

interface AnalysisRequest {
  movieId: string
  userId: string
  context: AnalysisContext
  requestedDepth?: AnalysisDepth
  priority?: 'high' | 'medium' | 'low'
  timeoutMs?: number
  requireExplanations?: boolean
}

interface AnalysisResult {
  movieId: string
  depth: AnalysisDepth
  confidence: number
  processingTime: number
  analysis: {
    basic?: BasicAnalysis
    semantic?: SemanticAnalysis
    emotional?: EmotionalAnalysis
    thematic?: ThematicAnalysis
    cinematic?: CinematicAnalysis
    personalization?: PersonalizationAnalysis
  }
  explanations?: AnalysisExplanation[]
  metadata: {
    source: 'cache' | 'computed' | 'fallback'
    cacheKey: string
    fallbackReason?: string
  }
}

interface BasicAnalysis {
  genres: string[]
  rating: number
  popularity: number
  releaseYear: number
  runtime: number
  language: string
}

interface SemanticAnalysis {
  plotEmbedding: number[]
  genreEmbedding: number[]
  similarityScore: number
  relatedMovies: string[]
}

interface EmotionalAnalysis {
  primaryEmotions: string[]
  emotionalIntensity: number
  moodProfile: Record<string, number>
  emotionalJourney: string
}

interface ThematicAnalysis {
  coreThemes: string[]
  narrativeStructure: string
  philosophicalElements: string[]
  culturalContext: string
}

interface CinematicAnalysis {
  visualStyle: string
  cinematography: string
  soundDesign: string
  editingStyle: string
  technicalExcellence: number
}

interface PersonalizationAnalysis {
  userMatchScore: number
  genrePreference: number
  styleAlignment: number
  behavioralMatch: number
  recommendationReason: string
}

interface AnalysisExplanation {
  aspect: string
  reasoning: string
  confidence: number
  evidence: string[]
}

interface PerformanceProfile {
  avgResponseTime: number
  currentLoad: number
  errorRate: number
  cacheHitRate: number
}

export class ProgressiveAnalysisEngine {
  private static instance: ProgressiveAnalysisEngine
  private cache: SmartCacheManager
  private monitor: PerformanceMonitor
  
  private readonly DEPTH_TIMEOUTS = {
    minimal: 100,     // 100ms
    standard: 500,    // 500ms
    enhanced: 1500,   // 1.5s
    comprehensive: 5000 // 5s
  }
  
  private readonly DEPTH_REQUIREMENTS = {
    minimal: ['basic'],
    standard: ['basic', 'semantic'],
    enhanced: ['basic', 'semantic', 'emotional', 'personalization'],
    comprehensive: ['basic', 'semantic', 'emotional', 'thematic', 'cinematic', 'personalization']
  }

  private constructor() {
    this.cache = SmartCacheManager.getInstance()
    this.monitor = PerformanceMonitor.getInstance()
  }

  static getInstance(): ProgressiveAnalysisEngine {
    if (!ProgressiveAnalysisEngine.instance) {
      ProgressiveAnalysisEngine.instance = new ProgressiveAnalysisEngine()
    }
    return ProgressiveAnalysisEngine.instance
  }

  /**
   * Analyze movie with adaptive depth based on context and performance
   */
  async analyzeMovie(request: AnalysisRequest): Promise<AnalysisResult> {
    const startTime = performance.now()
    const cacheKey = this.generateCacheKey(request)
    
    try {
      // Check cache first
      const cached = await this.cache.get<AnalysisResult>(cacheKey)
      if (cached && this.isCachedResultSufficient(cached, request.requestedDepth)) {
        this.monitor.incrementCounter('analysis_cache_hit')
        return {
          ...cached,
          metadata: {
            ...cached.metadata,
            source: 'cache'
          }
        }
      }
      
      this.monitor.incrementCounter('analysis_cache_miss')
      
      // Determine optimal analysis depth
      const optimalDepth = await this.determineOptimalDepth(request)
      
      // Perform progressive analysis
      const result = await this.performProgressiveAnalysis(request, optimalDepth)
      
      // Cache the result
      await this.cacheAnalysisResult(cacheKey, result, request)
      
      return result
      
    } catch (error) {
      this.monitor.incrementCounter('analysis_error')
      logger.error('Progressive analysis failed', { 
        error: error instanceof Error ? error.message : String(error),
        request 
      })
      
      return this.createFallbackAnalysis(request, startTime)
    }
  }

  /**
   * Batch analyze multiple movies with load balancing
   */
  async batchAnalyzeMovies(requests: AnalysisRequest[]): Promise<AnalysisResult[]> {
    // Group requests by priority and context
    const groupedRequests = this.groupRequestsByPriority(requests)
    
    // Process high priority requests first
    const results: AnalysisResult[] = []
    
    for (const [priority, priorityRequests] of groupedRequests) {
      const batchSize = this.calculateOptimalBatchSize(priority)
      
      for (let i = 0; i < priorityRequests.length; i += batchSize) {
        const batch = priorityRequests.slice(i, i + batchSize)
        const batchPromises = batch.map(request => 
          this.analyzeMovie(request).catch(error => {
            logger.warn('Batch analysis item failed', { request, error })
            return this.createFallbackAnalysis(request, performance.now())
          })
        )
        
        const batchResults = await Promise.allSettled(batchPromises)
        const fulfilledResults = batchResults
          .filter((result): result is PromiseFulfilledResult<AnalysisResult> => 
            result.status === 'fulfilled'
          )
          .map(result => result.value)
        
        results.push(...fulfilledResults)
      }
    }
    
    return results
  }

  /**
   * Pre-warm analysis cache for likely requests
   */
  async warmAnalysisCache(userId: string, movieIds: string[]): Promise<void> {
    const warmingRequests: AnalysisRequest[] = movieIds.map(movieId => ({
      movieId,
      userId,
      context: 'background',
      requestedDepth: 'standard',
      priority: 'low'
    }))
    
    // Process in small batches to avoid overwhelming the system
    for (let i = 0; i < warmingRequests.length; i += 5) {
      const batch = warmingRequests.slice(i, i + 5)
      await Promise.allSettled(
        batch.map(request => this.analyzeMovie(request))
      )
      
      // Small delay between batches
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    
    logger.info('Analysis cache warming completed', { userId, movieCount: movieIds.length })
  }

  private async determineOptimalDepth(request: AnalysisRequest): Promise<AnalysisDepth> {
    // If depth is explicitly requested, respect it (with performance constraints)
    if (request.requestedDepth) {
      return this.constrainDepthByPerformance(request.requestedDepth, request.context)
    }
    
    // Determine depth based on context
    const contextDepth = this.getContextualDepth(request.context)
    
    // Adjust based on current performance
    const performance = await this.getCurrentPerformance()
    const adjustedDepth = await this.adjustDepthForPerformance(contextDepth, performance)
    
    return adjustedDepth
  }

  private getContextualDepth(context: AnalysisContext): AnalysisDepth {
    switch (context) {
      case 'dashboard':
        return 'minimal' // Fast loading for dashboard
      case 'search':
        return 'standard' // Moderate detail for search results
      case 'detail':
        return 'enhanced' // Rich detail for detail pages
      case 'background':
        return 'comprehensive' // Full analysis when time allows
      case 'real-time':
        return 'minimal' // Speed is critical
      default:
        return 'standard'
    }
  }

  private constrainDepthByPerformance(
    requestedDepth: AnalysisDepth, 
    context: AnalysisContext
  ): AnalysisDepth {
    // Real-time contexts should never exceed standard depth
    if (context === 'real-time' && (requestedDepth === 'enhanced' || requestedDepth === 'comprehensive')) {
      return 'standard'
    }
    
    // Dashboard contexts should be lightweight
    if (context === 'dashboard' && requestedDepth === 'comprehensive') {
      return 'enhanced'
    }
    
    return requestedDepth
  }

  private async adjustDepthForPerformance(
    depth: AnalysisDepth, 
    performance: PerformanceProfile
  ): Promise<AnalysisDepth> {
    if (performance.currentLoad > 80) {
      if (depth === 'comprehensive') return Promise.resolve('enhanced')
      if (depth === 'enhanced') return Promise.resolve('standard')
      if (depth === 'standard') return Promise.resolve('minimal')
    }
    
    // If error rate is high, use simpler analysis
    if (performance.errorRate > 10) {
      if (depth === 'comprehensive' || depth === 'enhanced') return Promise.resolve('standard')
    }
    
    // If response time is slow, reduce depth
    if (performance.avgResponseTime > 1000) {
      if (depth === 'comprehensive') return Promise.resolve('enhanced')
    }
    
    return Promise.resolve(depth)
  }

  private async performProgressiveAnalysis(
    request: AnalysisRequest, 
    depth: AnalysisDepth
  ): Promise<AnalysisResult> {
    const startTime = performance.now()
    const requiredComponents = this.DEPTH_REQUIREMENTS[depth]
    const timeout = request.timeoutMs || this.DEPTH_TIMEOUTS[depth]
    
    const analysis: AnalysisResult['analysis'] = {}
    const explanations: AnalysisExplanation[] = []
    
    // Perform analysis components in parallel with timeout
    const analysisPromises = requiredComponents.map(async (component) => {
      try {
        switch (component) {
          case 'basic':
            analysis.basic = await this.performBasicAnalysis(request.movieId)
            break
          case 'semantic':
            analysis.semantic = await this.performSemanticAnalysis(request.movieId)
            break
          case 'emotional':
            analysis.emotional = await this.performEmotionalAnalysis(request.movieId)
            break
          case 'thematic':
            analysis.thematic = await this.performThematicAnalysis(request.movieId)
            break
          case 'cinematic':
            analysis.cinematic = await this.performCinematicAnalysis(request.movieId)
            break
          case 'personalization':
            analysis.personalization = await this.performPersonalizationAnalysis(
              request.movieId, 
              request.userId
            )
            break
        }
        
        if (request.requireExplanations) {
          explanations.push(...this.generateExplanations(component, analysis[component as keyof typeof analysis]))
        }
        
      } catch (error) {
        logger.warn(`Analysis component ${component} failed`, { 
          movieId: request.movieId, 
          error 
        })
      }
    })
    
    // Wait for all components with timeout
    await Promise.allSettled(analysisPromises.map(p => 
      Promise.race([
        p,
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Analysis timeout')), timeout)
        )
      ])
    ))
    
    const processingTime = performance.now() - startTime
    const confidence = this.calculateConfidence(analysis, depth)
    
    return {
      movieId: request.movieId,
      depth,
      confidence,
      processingTime,
      analysis,
      explanations: request.requireExplanations ? explanations : undefined,
      metadata: {
        source: 'computed',
        cacheKey: this.generateCacheKey(request)
      }
    }
  }

  private async performBasicAnalysis(movieId: string): Promise<BasicAnalysis> {
    // This would integrate with existing movie data services
    return {
      genres: ['Action', 'Adventure'],
      rating: 8.5,
      popularity: 85,
      releaseYear: 2023,
      runtime: 120,
      language: 'en'
    }
  }

  private async performSemanticAnalysis(movieId: string): Promise<SemanticAnalysis> {
    // This would use the embedding service
    return {
      plotEmbedding: new Array(768).fill(0).map(() => Math.random()),
      genreEmbedding: new Array(384).fill(0).map(() => Math.random()),
      similarityScore: 0.85,
      relatedMovies: []
    }
  }

  private async performEmotionalAnalysis(movieId: string): Promise<EmotionalAnalysis> {
    // This would use emotional analysis engines
    return {
      primaryEmotions: ['excitement', 'suspense'],
      emotionalIntensity: 0.8,
      moodProfile: { uplifting: 0.7, intense: 0.9 },
      emotionalJourney: 'Rising tension with triumphant resolution'
    }
  }

  private async performThematicAnalysis(movieId: string): Promise<ThematicAnalysis> {
    // This would use thematic analysis engines
    return {
      coreThemes: ['heroism', 'sacrifice', 'redemption'],
      narrativeStructure: 'hero_journey',
      philosophicalElements: ['moral_courage', 'personal_growth'],
      culturalContext: 'contemporary_american'
    }
  }

  private async performCinematicAnalysis(movieId: string): Promise<CinematicAnalysis> {
    // This would use cinematic analysis engines
    return {
      visualStyle: 'epic_cinematic',
      cinematography: 'dynamic_movement',
      soundDesign: 'immersive_surround',
      editingStyle: 'fast_paced',
      technicalExcellence: 0.9
    }
  }

  private async performPersonalizationAnalysis(
    movieId: string, 
    userId: string
  ): Promise<PersonalizationAnalysis> {
    // This would analyze user preferences and behavior
    return {
      userMatchScore: 0.85,
      genrePreference: 0.9,
      styleAlignment: 0.8,
      behavioralMatch: 0.75,
      recommendationReason: 'Matches your preference for action movies with strong storytelling'
    }
  }

  private generateExplanations(component: string, analysisData: any): AnalysisExplanation[] {
    // Generate explanations for the analysis component
    return [{
      aspect: component,
      reasoning: `Analysis based on ${component} characteristics`,
      confidence: 0.8,
      evidence: ['Plot structure', 'Character development', 'Visual style']
    }]
  }

  private calculateConfidence(analysis: AnalysisResult['analysis'], depth: AnalysisDepth): number {
    const componentCount = Object.keys(analysis).length
    const maxComponents = this.DEPTH_REQUIREMENTS[depth].length
    
    const completeness = componentCount / maxComponents
    const depthMultiplier = { minimal: 0.6, standard: 0.75, enhanced: 0.9, comprehensive: 1.0 }
    
    return Math.min(completeness * depthMultiplier[depth], 1.0)
  }

  private groupRequestsByPriority(requests: AnalysisRequest[]): Map<string, AnalysisRequest[]> {
    const groups = new Map<string, AnalysisRequest[]>()
    
    requests.forEach(request => {
      const priority = request.priority || 'medium'
      if (!groups.has(priority)) {
        groups.set(priority, [])
      }
      groups.get(priority)!.push(request)
    })
    
    // Return in priority order
    const orderedGroups = new Map()
    for (const priority of ['high', 'medium', 'low']) {
      if (groups.has(priority)) {
        orderedGroups.set(priority, groups.get(priority))
      }
    }
    
    return orderedGroups
  }

  private calculateOptimalBatchSize(priority: string): number {
    switch (priority) {
      case 'high': return 2 // Small batches for high priority
      case 'medium': return 5 // Medium batches for balanced processing
      case 'low': return 10 // Larger batches for efficiency
      default: return 5
    }
  }

  private async getCurrentPerformance(): Promise<PerformanceProfile> {
    const report = this.monitor.generateReport(60000) // Last minute
    
    return {
      avgResponseTime: report.metrics.averageResponseTime,
      currentLoad: this.estimateCurrentLoad(),
      errorRate: report.metrics.errorRate,
      cacheHitRate: report.metrics.cacheHitRate
    }
  }

  private estimateCurrentLoad(): number {
    // Estimate based on recent metrics
    const recentMetrics = this.monitor.getRecentMetrics('analysis', 30000) // Last 30 seconds
    return Math.min((recentMetrics.length / 100) * 100, 100) // Scale to percentage
  }

  private isCachedResultSufficient(cached: AnalysisResult, requestedDepth?: AnalysisDepth): boolean {
    if (!requestedDepth) return true
    
    const depthOrder = ['minimal', 'standard', 'enhanced', 'comprehensive']
    const cachedIndex = depthOrder.indexOf(cached.depth)
    const requestedIndex = depthOrder.indexOf(requestedDepth)
    
    return cachedIndex >= requestedIndex
  }

  private generateCacheKey(request: AnalysisRequest): string {
    const keyParts = [
      'analysis',
      request.movieId,
      request.userId,
      request.context,
      request.requestedDepth || 'auto',
      request.requireExplanations ? 'explain' : 'simple'
    ]
    
    return keyParts.join(':')
  }

  private async cacheAnalysisResult(
    cacheKey: string, 
    result: AnalysisResult, 
    request: AnalysisRequest
  ): Promise<void> {
    const ttl = this.getCacheTTL(result.depth, request.context)
    
    await this.cache.set(cacheKey, result, {
      ttl,
      tags: [`movie:${request.movieId}`, `user:${request.userId}`, 'analysis'],
      priority: request.priority || 'medium'
    })
  }

  private getCacheTTL(depth: AnalysisDepth, context: AnalysisContext): number {
    // Longer cache for deeper analysis
    const depthMultiplier = { minimal: 1, standard: 2, enhanced: 4, comprehensive: 8 }
    
    // Shorter cache for real-time contexts
    const contextMultiplier = {
      'real-time': 0.5,
      'dashboard': 1,
      'search': 1.5,
      'detail': 2,
      'background': 3
    }
    
    const baseTTL = 15 * 60 * 1000 // 15 minutes
    return baseTTL * depthMultiplier[depth] * contextMultiplier[context]
  }

  private createFallbackAnalysis(request: AnalysisRequest, startTime: number): AnalysisResult {
    return {
      movieId: request.movieId,
      depth: 'minimal',
      confidence: 0.3,
      processingTime: performance.now() - startTime,
      analysis: {
        basic: {
          genres: ['Unknown'],
          rating: 0,
          popularity: 0,
          releaseYear: 2023,
          runtime: 0,
          language: 'en'
        }
      },
      metadata: {
        source: 'fallback',
        cacheKey: this.generateCacheKey(request),
        fallbackReason: 'Analysis service unavailable'
      }
    }
  }
}

export type { 
  AnalysisRequest, 
  AnalysisResult, 
  AnalysisDepth, 
  AnalysisContext,
  BasicAnalysis,
  SemanticAnalysis,
  EmotionalAnalysis,
  ThematicAnalysis,
  CinematicAnalysis,
  PersonalizationAnalysis,
  AnalysisExplanation
}