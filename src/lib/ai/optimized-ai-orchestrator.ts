/**
 * Optimized AI Orchestrator
 * Phase 4.1: High-performance AI engine coordination with parallel processing
 */

import { logger } from '@/lib/logger'

interface AIRequest {
  id: string
  type: 'recommendation' | 'explanation' | 'analysis' | 'embedding'
  userId: string
  data: any
  priority: 'high' | 'medium' | 'low'
  timeout?: number
}

interface AIResponse<T = any> {
  id: string
  success: boolean
  data?: T
  error?: string
  processingTime: number
  cacheHit: boolean
}

interface BatchResult {
  results: AIResponse[]
  totalTime: number
  successRate: number
  cacheHitRate: number
}

export class OptimizedAIOrchestrator {
  private static instance: OptimizedAIOrchestrator
  private requestQueue: Map<string, AIRequest[]> = new Map()
  private processingQueue: Set<string> = new Set()
  private circuitBreakers: Map<string, CircuitBreaker> = new Map()
  private batchProcessor: BatchProcessor
  
  private readonly MAX_CONCURRENT_REQUESTS = 10
  private readonly BATCH_SIZE = 5
  private readonly BATCH_TIMEOUT = 100 // ms
  
  private constructor() {
    this.batchProcessor = new BatchProcessor(this.BATCH_SIZE, this.BATCH_TIMEOUT)
    this.initializeCircuitBreakers()
  }

  static getInstance(): OptimizedAIOrchestrator {
    if (!OptimizedAIOrchestrator.instance) {
      OptimizedAIOrchestrator.instance = new OptimizedAIOrchestrator()
    }
    return OptimizedAIOrchestrator.instance
  }

  /**
   * Process multiple AI requests in parallel with intelligent batching
   */
  async processRequests(requests: AIRequest[]): Promise<BatchResult> {
    const startTime = performance.now()
    
    try {
      // Group requests by type for optimal batching
      const groupedRequests = this.groupRequestsByType(requests)
      
      // Process each group in parallel
      const processPromises = Object.entries(groupedRequests).map(([type, typeRequests]) =>
        this.processRequestGroup(type, typeRequests)
      )
      
      const groupResults = await Promise.allSettled(processPromises)
      
      // Flatten and aggregate results
      const allResults = groupResults
        .filter((result): result is PromiseFulfilledResult<AIResponse[]> => 
          result.status === 'fulfilled'
        )
        .flatMap(result => result.value)
      
      const totalTime = performance.now() - startTime
      const successRate = allResults.filter(r => r.success).length / allResults.length
      const cacheHitRate = allResults.filter(r => r.cacheHit).length / allResults.length
      
      logger.info('Batch AI processing completed', {
        requestCount: requests.length,
        totalTime,
        successRate,
        cacheHitRate
      })
      
      return {
        results: allResults,
        totalTime,
        successRate,
        cacheHitRate
      }
      
    } catch (error) {
      logger.error('Batch AI processing failed', { 
        error: error instanceof Error ? error.message : String(error),
        requestCount: requests.length
      })
      
      // Return failed responses for all requests
      return {
        results: requests.map(req => ({
          id: req.id,
          success: false,
          error: 'Batch processing failed',
          processingTime: performance.now() - startTime,
          cacheHit: false
        })),
        totalTime: performance.now() - startTime,
        successRate: 0,
        cacheHitRate: 0
      }
    }
  }

  /**
   * Process a single high-priority request immediately
   */
  async processUrgentRequest(request: AIRequest): Promise<AIResponse> {
    const startTime = performance.now()
    
    try {
      // Check circuit breaker
      const breaker = this.circuitBreakers.get(request.type)
      if (breaker?.isOpen()) {
        return {
          id: request.id,
          success: false,
          error: 'Circuit breaker open',
          processingTime: performance.now() - startTime,
          cacheHit: false
        }
      }
      
      // Process immediately
      const result = await this.executeRequest(request)
      
      breaker?.recordSuccess()
      return result
      
    } catch (error) {
      const breaker = this.circuitBreakers.get(request.type)
      breaker?.recordFailure()
      
      return {
        id: request.id,
        success: false,
        error: error instanceof Error ? error.message : String(error),
        processingTime: performance.now() - startTime,
        cacheHit: false
      }
    }
  }

  private groupRequestsByType(requests: AIRequest[]): Record<string, AIRequest[]> {
    return requests.reduce((groups, request) => {
      if (!groups[request.type]) {
        groups[request.type] = []
      }
      groups[request.type].push(request)
      return groups
    }, {} as Record<string, AIRequest[]>)
  }

  private async processRequestGroup(type: string, requests: AIRequest[]): Promise<AIResponse[]> {
    // Sort by priority
    requests.sort((a, b) => {
      const priorityWeight = { high: 3, medium: 2, low: 1 }
      return priorityWeight[b.priority] - priorityWeight[a.priority]
    })
    
    // Process in batches
    const results: AIResponse[] = []
    for (let i = 0; i < requests.length; i += this.BATCH_SIZE) {
      const batch = requests.slice(i, i + this.BATCH_SIZE)
      const batchResults = await this.processBatch(batch)
      results.push(...batchResults)
    }
    
    return results
  }

  private async processBatch(batch: AIRequest[]): Promise<AIResponse[]> {
    // Use semaphore to limit concurrent processing
    if (this.processingQueue.size >= this.MAX_CONCURRENT_REQUESTS) {
      await this.waitForAvailableSlot()
    }
    
    const batchId = `batch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    this.processingQueue.add(batchId)
    
    try {
      const promises = batch.map(request => this.executeRequest(request))
      const results = await Promise.allSettled(promises)
      
      return results.map((result, index) => {
        if (result.status === 'fulfilled') {
          return result.value
        } else {
          return {
            id: batch[index].id,
            success: false,
            error: result.reason?.message || 'Unknown error',
            processingTime: 0,
            cacheHit: false
          }
        }
      })
      
    } finally {
      this.processingQueue.delete(batchId)
    }
  }

  private async executeRequest(request: AIRequest): Promise<AIResponse> {
    const startTime = performance.now()
    
    try {
      let result: any
      let cacheHit = false
      
      switch (request.type) {
        case 'recommendation':
          result = await this.processRecommendationRequest(request)
          break
        case 'explanation':
          result = await this.processExplanationRequest(request)
          break
        case 'analysis':
          result = await this.processAnalysisRequest(request)
          break
        case 'embedding':
          result = await this.processEmbeddingRequest(request)
          break
        default:
          throw new Error(`Unknown request type: ${request.type}`)
      }
      
      return {
        id: request.id,
        success: true,
        data: result.data,
        processingTime: performance.now() - startTime,
        cacheHit: result.cacheHit || false
      }
      
    } catch (error) {
      return {
        id: request.id,
        success: false,
        error: error instanceof Error ? error.message : String(error),
        processingTime: performance.now() - startTime,
        cacheHit: false
      }
    }
  }

  private async processRecommendationRequest(request: AIRequest) {
    // Import services dynamically to avoid circular dependencies
    const { SmartRecommenderV2 } = await import('./smart-recommender-v2')
    const recommender = SmartRecommenderV2.getInstance()
    
    return await recommender.getEnhancedRecommendations({
      userId: request.userId,
      ...request.data
    })
  }

  private async processExplanationRequest(request: AIRequest) {
    const { ExplanationService } = await import('./explanation-service')
    const explanationService = ExplanationService.getInstance()
    
    return await explanationService.generateExplanation(
      request.data.movie,
      request.data.userPreferences
    )
  }

  private async processAnalysisRequest(request: AIRequest) {
    const { UnifiedAIService } = await import('./unified-ai-service')
    const aiService = UnifiedAIService.getInstance()
    
    return await aiService.analyzeMovie(request.data.movie, request.userId)
  }

  private async processEmbeddingRequest(request: AIRequest) {
    const { EmbeddingService } = await import('./embedding-service')
    const embeddingService = new EmbeddingService()
    
    return await embeddingService.generateEmbedding(request.data.text)
  }

  private async waitForAvailableSlot(): Promise<void> {
    return new Promise((resolve) => {
      const checkSlot = () => {
        if (this.processingQueue.size < this.MAX_CONCURRENT_REQUESTS) {
          resolve()
        } else {
          setTimeout(checkSlot, 10)
        }
      }
      checkSlot()
    })
  }

  private initializeCircuitBreakers() {
    const types = ['recommendation', 'explanation', 'analysis', 'embedding']
    types.forEach(type => {
      this.circuitBreakers.set(type, new CircuitBreaker({
        failureThreshold: 5,
        resetTimeout: 30000,
        monitoringPeriod: 60000
      }))
    })
  }
}

/**
 * Circuit Breaker Implementation
 */
class CircuitBreaker {
  private failures = 0
  private lastFailureTime = 0
  private state: 'closed' | 'open' | 'half-open' = 'closed'
  
  constructor(private config: {
    failureThreshold: number
    resetTimeout: number
    monitoringPeriod: number
  }) {}

  isOpen(): boolean {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime > this.config.resetTimeout) {
        this.state = 'half-open'
        return false
      }
      return true
    }
    return false
  }

  recordSuccess() {
    this.failures = 0
    this.state = 'closed'
  }

  recordFailure() {
    this.failures++
    this.lastFailureTime = Date.now()
    
    if (this.failures >= this.config.failureThreshold) {
      this.state = 'open'
    }
  }
}

/**
 * Batch Processor for intelligent request batching
 */
class BatchProcessor {
  private pendingBatches: Map<string, {
    requests: AIRequest[]
    timer: NodeJS.Timeout
    resolve: (results: AIResponse[]) => void
  }> = new Map()

  constructor(
    private batchSize: number,
    private batchTimeout: number
  ) {}

  async addToBatch(request: AIRequest): Promise<AIResponse> {
    return new Promise((resolve) => {
      const batchKey = `${request.type}-${request.userId}`
      
      if (!this.pendingBatches.has(batchKey)) {
        this.createNewBatch(batchKey, request, resolve)
      } else {
        this.addToBatch(request)
      }
    })
  }

  private createNewBatch(
    batchKey: string, 
    request: AIRequest, 
    resolve: (result: AIResponse) => void
  ) {
    const timer = setTimeout(() => {
      this.processBatch(batchKey)
    }, this.batchTimeout)

    this.pendingBatches.set(batchKey, {
      requests: [request],
      timer,
      resolve
    })
  }

  private async processBatch(batchKey: string) {
    const batch = this.pendingBatches.get(batchKey)
    if (!batch) return

    clearTimeout(batch.timer)
    this.pendingBatches.delete(batchKey)

    // Process the batch
    // Implementation would call the appropriate AI service
  }
}

export { AIRequest, AIResponse, BatchResult }