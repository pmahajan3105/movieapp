/**
 * Reliability Orchestrator
 * Phase 4.4: Comprehensive reliability system with intelligent fallbacks
 */

import { logger } from '@/lib/logger'
import { PerformanceMonitor, measurePerformance } from './performance-monitor'
import { FallbackRecommendationEngine, FallbackOptions, FallbackResult } from './fallback-recommendation-engine'
import { ServiceCircuitBreaker, CircuitResult } from './service-circuit-breaker'
import { SmartCacheManager } from './smart-cache-manager'
import { OptimizedSmartRecommender, OptimizedRecommendationOptions, OptimizedRecommendationResult } from './optimized-smart-recommender'

interface ReliabilityConfig {
  maxRetries: number
  retryDelayMs: number
  fallbackThreshold: number      // Error rate % before using fallbacks
  degradedModeThreshold: number  // Error rate % for degraded mode
  healthCheckInterval: number    // Health check frequency
  enableGracefulDegradation: boolean
}

interface SystemHealthStatus {
  overall: 'healthy' | 'degraded' | 'critical'
  services: {
    ai: ServiceHealth
    cache: ServiceHealth
    fallback: ServiceHealth
    database: ServiceHealth
  }
  metrics: {
    successRate: number
    averageResponseTime: number
    errorRate: number
    cacheHitRate: number
  }
  lastHealthCheck: number
}

interface ServiceHealth {
  status: 'healthy' | 'degraded' | 'down'
  responseTime: number
  errorRate: number
  lastCheck: number
}

interface ReliableRecommendationResult extends OptimizedRecommendationResult {
  reliability: {
    source: 'primary' | 'fallback' | 'cache' | 'degraded'
    fallbackUsed: boolean
    retryCount: number
    circuitBreakerState: string
    healthStatus: 'healthy' | 'degraded' | 'critical'
  }
}

export class ReliabilityOrchestrator {
  private static instance: ReliabilityOrchestrator
  private config: ReliabilityConfig
  private monitor: PerformanceMonitor
  private cache: SmartCacheManager
  private fallbackEngine: FallbackRecommendationEngine
  private aiCircuitBreaker: ServiceCircuitBreaker
  private cacheCircuitBreaker: ServiceCircuitBreaker
  private primaryRecommender: OptimizedSmartRecommender
  private systemHealth: SystemHealthStatus
  
  private readonly DEFAULT_CONFIG: ReliabilityConfig = {
    maxRetries: 3,
    retryDelayMs: 1000,
    fallbackThreshold: 10,        // 10% error rate
    degradedModeThreshold: 25,    // 25% error rate
    healthCheckInterval: 30000,   // 30 seconds
    enableGracefulDegradation: true
  }

  private constructor(config?: Partial<ReliabilityConfig>) {
    this.config = { ...this.DEFAULT_CONFIG, ...config }
    this.monitor = PerformanceMonitor.getInstance()
    this.cache = SmartCacheManager.getInstance()
    this.fallbackEngine = FallbackRecommendationEngine.getInstance()
    this.primaryRecommender = OptimizedSmartRecommender.getInstance()
    
    // Initialize circuit breakers
    this.aiCircuitBreaker = ServiceCircuitBreaker.getInstance('ai_recommendations', {
      failureThreshold: 5,
      recoveryTimeout: 60000,
      timeout: 15000
    })
    
    this.cacheCircuitBreaker = ServiceCircuitBreaker.getInstance('cache_service', {
      failureThreshold: 10,
      recoveryTimeout: 30000,
      timeout: 5000
    })
    
    this.systemHealth = this.initializeSystemHealth()
    this.startHealthMonitoring()
  }

  static getInstance(config?: Partial<ReliabilityConfig>): ReliabilityOrchestrator {
    if (!ReliabilityOrchestrator.instance) {
      ReliabilityOrchestrator.instance = new ReliabilityOrchestrator(config)
    }
    return ReliabilityOrchestrator.instance
  }

  /**
   * Get reliable recommendations with automatic fallbacks
   */
  async getReliableRecommendations(
    options: OptimizedRecommendationOptions
  ): Promise<ReliableRecommendationResult> {
    
    const startTime = performance.now()
    let retryCount = 0
    let lastError: Error | null = null
    
    // Check system health and adjust strategy
    const healthStatus = this.getSystemHealthStatus()
    const strategy = this.determineStrategy(healthStatus)
    
    while (retryCount <= this.config.maxRetries) {
      try {
        switch (strategy) {
          case 'primary':
            return await this.executePrimaryStrategy(options, retryCount, healthStatus.overall)
            
          case 'cache_first':
            return await this.executeCacheFirstStrategy(options, retryCount, healthStatus.overall)
            
          case 'fallback_only':
            return await this.executeFallbackOnlyStrategy(options, retryCount, healthStatus.overall)
            
          case 'degraded':
            return await this.executeDegradedStrategy(options, retryCount, healthStatus.overall)
            
          default:
            return await this.executePrimaryStrategy(options, retryCount, healthStatus.overall)
        }
        
      } catch (error) {
        lastError = error as Error
        retryCount++
        
        this.monitor.incrementCounter('reliability_retry')
        logger.warn(`Recommendation attempt ${retryCount} failed`, {
          error: lastError.message,
          strategy,
          retryCount
        })
        
        if (retryCount <= this.config.maxRetries) {
          await this.delay(this.config.retryDelayMs * retryCount)
        }
      }
    }
    
    // All retries failed, use emergency fallback
    return await this.executeEmergencyFallback(options, lastError, retryCount, healthStatus.overall)
  }

  /**
   * Get current system health
   */
  getSystemHealthStatus(): SystemHealthStatus {
    return { ...this.systemHealth }
  }

  /**
   * Force health check update
   */
  async updateHealthStatus(): Promise<SystemHealthStatus> {
    await this.performHealthCheck()
    return this.getSystemHealthStatus()
  }

  /**
   * Enable/disable graceful degradation
   */
  setGracefulDegradation(enabled: boolean): void {
    this.config.enableGracefulDegradation = enabled
    logger.info(`Graceful degradation ${enabled ? 'enabled' : 'disabled'}`)
  }

  private determineStrategy(health: SystemHealthStatus): 'primary' | 'cache_first' | 'fallback_only' | 'degraded' {
    if (health.overall === 'critical') {
      return 'fallback_only'
    }
    
    if (health.overall === 'degraded') {
      if (health.services.cache.status === 'healthy') {
        return 'cache_first'
      } else {
        return 'degraded'
      }
    }
    
    // Default to primary strategy for healthy systems
    return 'primary'
  }

  private async executePrimaryStrategy(
    options: OptimizedRecommendationOptions,
    retryCount: number,
    healthStatus: string
  ): Promise<ReliableRecommendationResult> {
    
    const result = await this.aiCircuitBreaker.execute(
      () => this.primaryRecommender.getRecommendations(options),
      () => this.executeFallbackStrategy(options)
    )
    
    if (result.success && result.data) {
      return this.enrichWithReliabilityInfo(result.data, {
        source: result.fromFallback ? 'fallback' : 'primary',
        fallbackUsed: result.fromFallback,
        retryCount,
        circuitBreakerState: result.circuitState,
        healthStatus: healthStatus as any
      })
    }
    
    throw new Error(result.error?.message || 'Primary strategy failed')
  }

  private async executeCacheFirstStrategy(
    options: OptimizedRecommendationOptions,
    retryCount: number,
    healthStatus: string
  ): Promise<ReliableRecommendationResult> {
    
    // Try cache first with circuit breaker
    const cacheResult = await this.cacheCircuitBreaker.execute(
      () => this.getCachedRecommendations(options)
    )
    
    if (cacheResult.success && cacheResult.data) {
      return this.enrichWithReliabilityInfo(cacheResult.data, {
        source: 'cache',
        fallbackUsed: false,
        retryCount,
        circuitBreakerState: cacheResult.circuitState,
        healthStatus: healthStatus as any
      })
    }
    
    // Cache failed, try primary with fallback
    return await this.executePrimaryStrategy(options, retryCount, healthStatus)
  }

  private async executeFallbackOnlyStrategy(
    options: OptimizedRecommendationOptions,
    retryCount: number,
    healthStatus: string
  ): Promise<ReliableRecommendationResult> {
    
    const fallbackOptions: FallbackOptions = {
      userId: options.userId,
      userQuery: options.userQuery,
      preferredGenres: options.preferredGenres,
      mood: options.mood,
      limit: options.limit,
      fallbackLevel: 'comprehensive'
    }
    
    const fallbackResult = await this.fallbackEngine.getFallbackRecommendations(fallbackOptions)
    
    // Convert fallback result to optimized format
    const optimizedResult: OptimizedRecommendationResult = {
      movies: fallbackResult.movies.map(movie => ({
        ...movie,
        recommendationReason: fallbackResult.metadata.reasons[0] || 'Fallback recommendation',
        confidenceScore: fallbackResult.confidence
      })),
      metadata: {
        totalTime: fallbackResult.processingTime,
        cacheHit: false,
        aiProcessingTime: 0,
        source: 'fallback',
        confidence: fallbackResult.confidence
      }
    }
    
    return this.enrichWithReliabilityInfo(optimizedResult, {
      source: 'fallback',
      fallbackUsed: true,
      retryCount,
      circuitBreakerState: 'N/A',
      healthStatus: healthStatus as any
    })
  }

  private async executeDegradedStrategy(
    options: OptimizedRecommendationOptions,
    retryCount: number,
    healthStatus: string
  ): Promise<ReliableRecommendationResult> {
    
    // Simplified recommendations with reduced functionality
    const degradedOptions: FallbackOptions = {
      userId: options.userId,
      preferredGenres: options.preferredGenres,
      limit: Math.min(options.limit || 12, 6), // Reduced limit
      fallbackLevel: 'basic'
    }
    
    const fallbackResult = await this.fallbackEngine.getFallbackRecommendations(degradedOptions)
    
    const optimizedResult: OptimizedRecommendationResult = {
      movies: fallbackResult.movies.map(movie => ({
        ...movie,
        recommendationReason: 'Simplified recommendation (degraded mode)',
        confidenceScore: fallbackResult.confidence * 0.8 // Reduced confidence
      })),
      metadata: {
        totalTime: fallbackResult.processingTime,
        cacheHit: false,
        aiProcessingTime: 0,
        source: 'fallback',
        confidence: fallbackResult.confidence * 0.8
      }
    }
    
    return this.enrichWithReliabilityInfo(optimizedResult, {
      source: 'degraded',
      fallbackUsed: true,
      retryCount,
      circuitBreakerState: 'N/A',
      healthStatus: healthStatus as any
    })
  }

  private async executeEmergencyFallback(
    options: OptimizedRecommendationOptions,
    lastError: Error | null,
    retryCount: number,
    healthStatus: string
  ): Promise<ReliableRecommendationResult> {
    
    this.monitor.incrementCounter('reliability_emergency_fallback')
    logger.error('All recommendation strategies failed, using emergency fallback', {
      lastError: lastError?.message,
      retryCount,
      options
    })
    
    // Minimal emergency response
    const emergencyResult: OptimizedRecommendationResult = {
      movies: [], // Empty results in emergency
      metadata: {
        totalTime: 0,
        cacheHit: false,
        aiProcessingTime: 0,
        source: 'fallback',
        confidence: 0
      }
    }
    
    return this.enrichWithReliabilityInfo(emergencyResult, {
      source: 'fallback',
      fallbackUsed: true,
      retryCount,
      circuitBreakerState: 'EMERGENCY',
      healthStatus: healthStatus as any
    })
  }

  private async executeFallbackStrategy(options: OptimizedRecommendationOptions): Promise<OptimizedRecommendationResult> {
    const fallbackOptions: FallbackOptions = {
      userId: options.userId,
      userQuery: options.userQuery,
      preferredGenres: options.preferredGenres,
      mood: options.mood,
      limit: options.limit,
      fallbackLevel: 'enhanced'
    }
    
    const result = await this.fallbackEngine.getFallbackRecommendations(fallbackOptions)
    
    return {
      movies: result.movies.map(movie => ({
        ...movie,
        recommendationReason: result.metadata.reasons[0] || 'Fallback recommendation',
        confidenceScore: result.confidence
      })),
      metadata: {
        totalTime: result.processingTime,
        cacheHit: false,
        aiProcessingTime: 0,
        source: 'fallback',
        confidence: result.confidence
      }
    }
  }

  private async getCachedRecommendations(options: OptimizedRecommendationOptions): Promise<OptimizedRecommendationResult> {
    const cacheKey = this.generateCacheKey(options)
    const cached = await this.cache.get<OptimizedRecommendationResult>(cacheKey)
    
    if (!cached) {
      throw new Error('No cached recommendations available')
    }
    
    return cached
  }

  private generateCacheKey(options: OptimizedRecommendationOptions): string {
    const keyParts = [
      'reliable_rec',
      options.userId,
      options.limit || 12,
      options.userQuery || '',
      (options.preferredGenres || []).sort().join(','),
      options.mood || ''
    ]
    
    return keyParts.join(':').replace(/[^a-zA-Z0-9:]/g, '_')
  }

  private enrichWithReliabilityInfo(
    result: OptimizedRecommendationResult,
    reliability: ReliableRecommendationResult['reliability']
  ): ReliableRecommendationResult {
    
    return {
      ...result,
      reliability
    }
  }

  private async performHealthCheck(): Promise<void> {
    const startTime = performance.now()
    
    try {
      // Check AI service health
      const aiHealth = this.aiCircuitBreaker.getHealthStatus()
      this.systemHealth.services.ai = {
        status: aiHealth.healthy ? 'healthy' : (aiHealth.state === 'OPEN' ? 'down' : 'degraded'),
        responseTime: aiHealth.avgResponseTime,
        errorRate: aiHealth.failureRate,
        lastCheck: Date.now()
      }
      
      // Check cache health
      const cacheHealth = this.cacheCircuitBreaker.getHealthStatus()
      const cacheStats = this.cache.getStats()
      this.systemHealth.services.cache = {
        status: cacheHealth.healthy ? 'healthy' : 'degraded',
        responseTime: cacheStats.averageAccessTime,
        errorRate: cacheHealth.failureRate,
        lastCheck: Date.now()
      }
      
      // Check fallback engine (always healthy as it's local)
      this.systemHealth.services.fallback = {
        status: 'healthy',
        responseTime: 50,
        errorRate: 0,
        lastCheck: Date.now()
      }
      
      // Check database health (would be implemented)
      this.systemHealth.services.database = {
        status: 'healthy',
        responseTime: 100,
        errorRate: 0,
        lastCheck: Date.now()
      }
      
      // Calculate overall metrics
      const overallErrorRate = (
        this.systemHealth.services.ai.errorRate +
        this.systemHealth.services.cache.errorRate +
        this.systemHealth.services.database.errorRate
      ) / 3
      
      this.systemHealth.metrics = {
        successRate: 100 - overallErrorRate,
        averageResponseTime: (
          this.systemHealth.services.ai.responseTime +
          this.systemHealth.services.cache.responseTime +
          this.systemHealth.services.database.responseTime
        ) / 3,
        errorRate: overallErrorRate,
        cacheHitRate: cacheStats.hitRate * 100
      }
      
      // Determine overall status
      if (overallErrorRate > this.config.degradedModeThreshold) {
        this.systemHealth.overall = 'critical'
      } else if (overallErrorRate > this.config.fallbackThreshold) {
        this.systemHealth.overall = 'degraded'
      } else {
        this.systemHealth.overall = 'healthy'
      }
      
      this.systemHealth.lastHealthCheck = Date.now()
      
      this.monitor.recordMetric('health_check_duration', performance.now() - startTime, 'ms')
      this.monitor.recordMetric('system_health_score', 100 - overallErrorRate, 'percentage')
      
    } catch (error) {
      logger.error('Health check failed', { error })
      this.systemHealth.overall = 'critical'
    }
  }

  private initializeSystemHealth(): SystemHealthStatus {
    return {
      overall: 'healthy',
      services: {
        ai: { status: 'healthy', responseTime: 0, errorRate: 0, lastCheck: 0 },
        cache: { status: 'healthy', responseTime: 0, errorRate: 0, lastCheck: 0 },
        fallback: { status: 'healthy', responseTime: 0, errorRate: 0, lastCheck: 0 },
        database: { status: 'healthy', responseTime: 0, errorRate: 0, lastCheck: 0 }
      },
      metrics: {
        successRate: 100,
        averageResponseTime: 0,
        errorRate: 0,
        cacheHitRate: 0
      },
      lastHealthCheck: Date.now()
    }
  }

  private startHealthMonitoring(): void {
    // Initial health check
    this.performHealthCheck()
    
    // Regular health checks
    setInterval(() => {
      this.performHealthCheck()
    }, this.config.healthCheckInterval)
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

export type { ReliabilityConfig, SystemHealthStatus, ServiceHealth, ReliableRecommendationResult }