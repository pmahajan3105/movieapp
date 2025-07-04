/**
 * Service Circuit Breaker
 * Phase 4.4: Intelligent failure handling and service protection
 */

import { logger } from '@/lib/logger'
import { PerformanceMonitor } from './performance-monitor'

type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN'

interface CircuitConfig {
  failureThreshold: number      // Number of failures before opening
  recoveryTimeout: number       // Time to wait before trying again (ms)
  successThreshold: number      // Successes needed to close circuit
  timeout: number              // Request timeout (ms)
  monitoringWindow: number     // Time window for monitoring (ms)
}

interface CircuitMetrics {
  totalRequests: number
  successCount: number
  failureCount: number
  lastFailureTime: number
  lastSuccessTime: number
  consecutiveFailures: number
  consecutiveSuccesses: number
  state: CircuitState
  stateChangedAt: number
}

interface CircuitResult<T> {
  success: boolean
  data?: T
  error?: Error
  circuitState: CircuitState
  executionTime: number
  fromFallback: boolean
}

export class ServiceCircuitBreaker {
  private static instances = new Map<string, ServiceCircuitBreaker>()
  private readonly config: CircuitConfig
  private readonly serviceName: string
  private metrics: CircuitMetrics
  private monitor: PerformanceMonitor
  
  private readonly DEFAULT_CONFIG: CircuitConfig = {
    failureThreshold: 5,
    recoveryTimeout: 30000,    // 30 seconds
    successThreshold: 3,
    timeout: 10000,           // 10 seconds
    monitoringWindow: 300000  // 5 minutes
  }

  private constructor(serviceName: string, config?: Partial<CircuitConfig>) {
    this.serviceName = serviceName
    this.config = { ...this.DEFAULT_CONFIG, ...config }
    this.metrics = this.initializeMetrics()
    this.monitor = PerformanceMonitor.getInstance()
    
    this.startMetricsReset()
  }

  static getInstance(serviceName: string, config?: Partial<CircuitConfig>): ServiceCircuitBreaker {
    if (!ServiceCircuitBreaker.instances.has(serviceName)) {
      ServiceCircuitBreaker.instances.set(serviceName, new ServiceCircuitBreaker(serviceName, config))
    }
    return ServiceCircuitBreaker.instances.get(serviceName)!
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(
    operation: () => Promise<T>,
    fallback?: () => Promise<T>
  ): Promise<CircuitResult<T>> {
    const startTime = performance.now()
    
    // Check circuit state
    if (this.metrics.state === 'OPEN') {
      if (this.shouldAttemptReset()) {
        this.transitionToHalfOpen()
      } else {
        return await this.executeWithFallback(fallback, startTime)
      }
    }
    
    try {
      // Execute with timeout
      const result = await this.executeWithTimeout(operation)
      
      // Record success
      this.recordSuccess()
      
      return {
        success: true,
        data: result,
        circuitState: this.metrics.state,
        executionTime: performance.now() - startTime,
        fromFallback: false
      }
      
    } catch (error) {
      // Record failure
      this.recordFailure(error as Error)
      
      // Try fallback if available
      if (fallback) {
        return await this.executeWithFallback(fallback, startTime)
      }
      
      return {
        success: false,
        error: error as Error,
        circuitState: this.metrics.state,
        executionTime: performance.now() - startTime,
        fromFallback: false
      }
    }
  }

  /**
   * Get current circuit metrics
   */
  getMetrics(): CircuitMetrics {
    return { ...this.metrics }
  }

  /**
   * Get service health status
   */
  getHealthStatus(): {
    healthy: boolean
    state: CircuitState
    failureRate: number
    avgResponseTime: number
    lastFailure: number | null
  } {
    const totalRequests = this.metrics.totalRequests
    const failureRate = totalRequests > 0 ? (this.metrics.failureCount / totalRequests) * 100 : 0
    
    return {
      healthy: this.metrics.state === 'CLOSED' && failureRate < 10,
      state: this.metrics.state,
      failureRate,
      avgResponseTime: this.getAverageResponseTime(),
      lastFailure: this.metrics.lastFailureTime || null
    }
  }

  /**
   * Manually reset circuit (for admin operations)
   */
  reset(): void {
    this.metrics = this.initializeMetrics()
    logger.info(`Circuit breaker reset for service: ${this.serviceName}`)
  }

  /**
   * Force circuit to open (for maintenance)
   */
  forceOpen(): void {
    this.transitionToOpen(new Error('Manually opened for maintenance'))
  }

  private async executeWithTimeout<T>(operation: () => Promise<T>): Promise<T> {
    return Promise.race([
      operation(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Operation timeout')), this.config.timeout)
      )
    ])
  }

  private async executeWithFallback<T>(
    fallback: (() => Promise<T>) | undefined,
    startTime: number
  ): Promise<CircuitResult<T>> {
    
    if (!fallback) {
      return {
        success: false,
        error: new Error('Circuit breaker is OPEN and no fallback provided'),
        circuitState: this.metrics.state,
        executionTime: performance.now() - startTime,
        fromFallback: false
      }
    }
    
    try {
      const result = await fallback()
      
      return {
        success: true,
        data: result,
        circuitState: this.metrics.state,
        executionTime: performance.now() - startTime,
        fromFallback: true
      }
      
    } catch (error) {
      return {
        success: false,
        error: error as Error,
        circuitState: this.metrics.state,
        executionTime: performance.now() - startTime,
        fromFallback: true
      }
    }
  }

  private recordSuccess(): void {
    this.metrics.totalRequests++
    this.metrics.successCount++
    this.metrics.lastSuccessTime = Date.now()
    this.metrics.consecutiveFailures = 0
    this.metrics.consecutiveSuccesses++
    
    this.monitor.incrementCounter(`circuit_${this.serviceName}_success`)
    
    // Transition from HALF_OPEN to CLOSED if enough successes
    if (this.metrics.state === 'HALF_OPEN' && 
        this.metrics.consecutiveSuccesses >= this.config.successThreshold) {
      this.transitionToClosed()
    }
  }

  private recordFailure(error: Error): void {
    this.metrics.totalRequests++
    this.metrics.failureCount++
    this.metrics.lastFailureTime = Date.now()
    this.metrics.consecutiveSuccesses = 0
    this.metrics.consecutiveFailures++
    
    this.monitor.incrementCounter(`circuit_${this.serviceName}_failure`)
    
    logger.warn(`Service failure recorded: ${this.serviceName}`, {
      error: error.message,
      consecutiveFailures: this.metrics.consecutiveFailures,
      circuitState: this.metrics.state
    })
    
    // Transition to OPEN if threshold reached
    if ((this.metrics.state === 'CLOSED' || this.metrics.state === 'HALF_OPEN') &&
        this.metrics.consecutiveFailures >= this.config.failureThreshold) {
      this.transitionToOpen(error)
    }
  }

  private shouldAttemptReset(): boolean {
    return Date.now() - this.metrics.stateChangedAt > this.config.recoveryTimeout
  }

  private transitionToClosed(): void {
    const previousState = this.metrics.state
    this.metrics.state = 'CLOSED'
    this.metrics.stateChangedAt = Date.now()
    this.metrics.consecutiveFailures = 0
    
    logger.info(`Circuit breaker transitioned to CLOSED: ${this.serviceName}`, {
      previousState,
      consecutiveSuccesses: this.metrics.consecutiveSuccesses
    })
    
    this.monitor.recordMetric(`circuit_${this.serviceName}_state_change`, 1, 'count', {
      from: previousState,
      to: 'CLOSED'
    })
  }

  private transitionToOpen(error: Error): void {
    const previousState = this.metrics.state
    this.metrics.state = 'OPEN'
    this.metrics.stateChangedAt = Date.now()
    
    logger.error(`Circuit breaker transitioned to OPEN: ${this.serviceName}`, {
      previousState,
      consecutiveFailures: this.metrics.consecutiveFailures,
      error: error.message
    })
    
    this.monitor.recordMetric(`circuit_${this.serviceName}_state_change`, 1, 'count', {
      from: previousState,
      to: 'OPEN',
      reason: error.message
    })
  }

  private transitionToHalfOpen(): void {
    const previousState = this.metrics.state
    this.metrics.state = 'HALF_OPEN'
    this.metrics.stateChangedAt = Date.now()
    this.metrics.consecutiveSuccesses = 0
    
    logger.info(`Circuit breaker transitioned to HALF_OPEN: ${this.serviceName}`, {
      previousState,
      timeSinceOpen: Date.now() - this.metrics.stateChangedAt
    })
    
    this.monitor.recordMetric(`circuit_${this.serviceName}_state_change`, 1, 'count', {
      from: previousState,
      to: 'HALF_OPEN'
    })
  }

  private getAverageResponseTime(): number {
    const recentMetrics = this.monitor.getRecentMetrics(
      `circuit_${this.serviceName}`,
      this.config.monitoringWindow
    )
    
    if (recentMetrics.length === 0) return 0
    
    const durations = recentMetrics
      .filter(m => m.name.includes('duration'))
      .map(m => m.value)
    
    if (durations.length === 0) return 0
    
    return durations.reduce((sum, duration) => sum + duration, 0) / durations.length
  }

  private initializeMetrics(): CircuitMetrics {
    return {
      totalRequests: 0,
      successCount: 0,
      failureCount: 0,
      lastFailureTime: 0,
      lastSuccessTime: 0,
      consecutiveFailures: 0,
      consecutiveSuccesses: 0,
      state: 'CLOSED',
      stateChangedAt: Date.now()
    }
  }

  private startMetricsReset(): void {
    // Reset metrics periodically to prevent stale data
    setInterval(() => {
      const now = Date.now()
      const windowStart = now - this.config.monitoringWindow
      
      // Only reset if we're in a good state and haven't had recent activity
      if (this.metrics.state === 'CLOSED' && 
          this.metrics.lastFailureTime < windowStart &&
          this.metrics.totalRequests > 100) {
        
        // Soft reset - keep state but reset counters
        this.metrics.totalRequests = 0
        this.metrics.successCount = 0
        this.metrics.failureCount = 0
        this.metrics.consecutiveFailures = 0
        this.metrics.consecutiveSuccesses = 0
        
        logger.debug(`Circuit breaker metrics reset: ${this.serviceName}`)
      }
    }, this.config.monitoringWindow)
  }
}

/**
 * Circuit breaker decorator for automatic protection
 */
export function withCircuitBreaker(
  serviceName: string,
  config?: Partial<CircuitConfig>,
  fallbackFn?: () => Promise<any>
) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value
    const circuitBreaker = ServiceCircuitBreaker.getInstance(serviceName, config)
    
    descriptor.value = async function (...args: any[]) {
      const result = await circuitBreaker.execute(
        () => method.apply(this, args),
        fallbackFn
      )
      
      if (!result.success && !result.fromFallback) {
        throw result.error
      }
      
      return result.data
    }
    
    return descriptor
  }
}

export { CircuitState, CircuitConfig, CircuitMetrics, CircuitResult }