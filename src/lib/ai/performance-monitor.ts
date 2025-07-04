/**
 * Performance Monitor
 * Phase 4: Real-time performance tracking and optimization insights
 */

import { logger } from '@/lib/logger'

interface PerformanceMetric {
  name: string
  value: number
  unit: 'ms' | 'bytes' | 'count' | 'percentage'
  timestamp: number
  context?: Record<string, any>
}

interface PerformanceReport {
  period: {
    start: number
    end: number
    duration: number
  }
  metrics: {
    averageResponseTime: number
    p95ResponseTime: number
    p99ResponseTime: number
    throughput: number
    errorRate: number
    cacheHitRate: number
    memoryUsage: number
    cpuUsage: number
  }
  insights: string[]
  recommendations: string[]
}

interface PerformanceThreshold {
  metric: string
  warning: number
  critical: number
  unit: string
}

export class PerformanceMonitor {
  private static instance: PerformanceMonitor
  private metrics: PerformanceMetric[] = []
  private timers: Map<string, number> = new Map()
  private counters: Map<string, number> = new Map()
  private watchers: Map<string, (metric: PerformanceMetric) => void> = new Map()
  
  private readonly MAX_METRICS = 10000
  private readonly CLEANUP_INTERVAL = 60000 // 1 minute
  private readonly METRIC_RETENTION = 24 * 60 * 60 * 1000 // 24 hours
  
  private readonly THRESHOLDS: PerformanceThreshold[] = [
    { metric: 'response_time', warning: 500, critical: 1000, unit: 'ms' },
    { metric: 'memory_usage', warning: 80, critical: 95, unit: 'percentage' },
    { metric: 'error_rate', warning: 5, critical: 10, unit: 'percentage' },
    { metric: 'cache_hit_rate', warning: 70, critical: 50, unit: 'percentage' }
  ]

  private constructor() {
    this.startCleanupTimer()
    this.startResourceMonitoring()
  }

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor()
    }
    return PerformanceMonitor.instance
  }

  /**
   * Start timing an operation
   */
  startTimer(operationId: string, context?: Record<string, any>): void {
    this.timers.set(operationId, performance.now())
    
    if (context) {
      this.recordMetric('operation_started', 1, 'count', context)
    }
  }

  /**
   * End timing and record the duration
   */
  endTimer(operationId: string, context?: Record<string, any>): number {
    const startTime = this.timers.get(operationId)
    if (!startTime) {
      logger.warn('Timer not found', { operationId })
      return 0
    }
    
    const duration = performance.now() - startTime
    this.timers.delete(operationId)
    
    this.recordMetric(`${operationId}_duration`, duration, 'ms', context)
    
    // Check thresholds
    this.checkThresholds('response_time', duration, context)
    
    return duration
  }

  /**
   * Record a custom metric
   */
  recordMetric(
    name: string, 
    value: number, 
    unit: 'ms' | 'bytes' | 'count' | 'percentage',
    context?: Record<string, any>
  ): void {
    const metric: PerformanceMetric = {
      name,
      value,
      unit,
      timestamp: Date.now(),
      context
    }
    
    this.metrics.push(metric)
    
    // Notify watchers
    const watchers = Array.from(this.watchers.values())
    watchers.forEach(watcher => {
      try {
        watcher(metric)
      } catch (error) {
        logger.warn('Performance watcher error', { error })
      }
    })
    
    // Cleanup if needed
    if (this.metrics.length > this.MAX_METRICS) {
      this.cleanup()
    }
  }

  /**
   * Increment a counter
   */
  incrementCounter(name: string, increment = 1, context?: Record<string, any>): void {
    const current = this.counters.get(name) || 0
    this.counters.set(name, current + increment)
    this.recordMetric(name, current + increment, 'count', context)
  }

  /**
   * Record memory usage
   */
  recordMemoryUsage(context?: Record<string, any>): void {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const usage = process.memoryUsage()
      this.recordMetric('memory_heap_used', usage.heapUsed, 'bytes', context)
      this.recordMetric('memory_heap_total', usage.heapTotal, 'bytes', context)
      this.recordMetric('memory_rss', usage.rss, 'bytes', context)
    }
  }

  /**
   * Generate performance report for a time period
   */
  generateReport(periodMs = 60000): PerformanceReport {
    const now = Date.now()
    const start = now - periodMs
    
    const periodMetrics = this.metrics.filter(m => 
      m.timestamp >= start && m.timestamp <= now
    )
    
    const responseTimes = this.getMetricValues(periodMetrics, '_duration')
    const errors = this.getMetricValues(periodMetrics, 'error')
    const cacheHits = this.getMetricValues(periodMetrics, 'cache_hit')
    const memoryUsage = this.getMetricValues(periodMetrics, 'memory_heap_used')
    
    const report: PerformanceReport = {
      period: { start, end: now, duration: periodMs },
      metrics: {
        averageResponseTime: this.calculateAverage(responseTimes),
        p95ResponseTime: this.calculatePercentile(responseTimes, 95),
        p99ResponseTime: this.calculatePercentile(responseTimes, 99),
        throughput: periodMetrics.filter(m => m.name.includes('operation_started')).length,
        errorRate: this.calculateRate(errors, periodMetrics.length),
        cacheHitRate: this.calculateRate(cacheHits, periodMetrics.length),
        memoryUsage: this.calculateAverage(memoryUsage),
        cpuUsage: 0 // Would be implemented with OS-specific monitoring
      },
      insights: [],
      recommendations: []
    }
    
    // Generate insights and recommendations
    this.generateInsights(report)
    this.generateRecommendations(report)
    
    return report
  }

  /**
   * Watch for specific performance events
   */
  watchMetric(name: string, callback: (metric: PerformanceMetric) => void): void {
    this.watchers.set(name, callback)
  }

  /**
   * Remove metric watcher
   */
  unwatchMetric(name: string): void {
    this.watchers.delete(name)
  }

  /**
   * Get recent metrics by name pattern
   */
  getRecentMetrics(namePattern: string, limitMs = 300000): PerformanceMetric[] {
    const cutoff = Date.now() - limitMs
    return this.metrics
      .filter(m => m.timestamp >= cutoff && m.name.includes(namePattern))
      .sort((a, b) => b.timestamp - a.timestamp)
  }

  /**
   * Clear all metrics
   */
  clearMetrics(): void {
    this.metrics.length = 0
    this.counters.clear()
    this.timers.clear()
  }

  private getMetricValues(metrics: PerformanceMetric[], namePattern: string): number[] {
    return metrics
      .filter(m => m.name.includes(namePattern))
      .map(m => m.value)
  }

  private calculateAverage(values: number[]): number {
    if (values.length === 0) return 0
    return values.reduce((sum, val) => sum + val, 0) / values.length
  }

  private calculatePercentile(values: number[], percentile: number): number {
    if (values.length === 0) return 0
    
    const sorted = [...values].sort((a, b) => a - b)
    const index = Math.ceil((percentile / 100) * sorted.length) - 1
    return sorted[Math.max(0, index)]
  }

  private calculateRate(successes: number[], total: number): number {
    if (total === 0) return 0
    return (successes.length / total) * 100
  }

  private checkThresholds(metricType: string, value: number, context?: Record<string, any>): void {
    const threshold = this.THRESHOLDS.find(t => t.metric === metricType)
    if (!threshold) return
    
    if (value >= threshold.critical) {
      logger.error('Performance critical threshold exceeded', {
        metric: metricType,
        value,
        threshold: threshold.critical,
        context
      })
    } else if (value >= threshold.warning) {
      logger.warn('Performance warning threshold exceeded', {
        metric: metricType,
        value,
        threshold: threshold.warning,
        context
      })
    }
  }

  private generateInsights(report: PerformanceReport): void {
    const { metrics } = report
    
    if (metrics.averageResponseTime > 500) {
      report.insights.push(`Average response time of ${metrics.averageResponseTime.toFixed(0)}ms exceeds target of 500ms`)
    }
    
    if (metrics.errorRate > 5) {
      report.insights.push(`Error rate of ${metrics.errorRate.toFixed(1)}% is above acceptable threshold`)
    }
    
    if (metrics.cacheHitRate < 70) {
      report.insights.push(`Cache hit rate of ${metrics.cacheHitRate.toFixed(1)}% suggests optimization opportunities`)
    }
    
    if (metrics.p99ResponseTime > metrics.averageResponseTime * 3) {
      report.insights.push('High response time variance detected - investigate slow queries')
    }
  }

  private generateRecommendations(report: PerformanceReport): void {
    const { metrics } = report
    
    if (metrics.averageResponseTime > 500) {
      report.recommendations.push('Consider implementing request batching and parallel processing')
      report.recommendations.push('Review database query optimization opportunities')
    }
    
    if (metrics.cacheHitRate < 70) {
      report.recommendations.push('Implement cache warming for frequently accessed data')
      report.recommendations.push('Review cache TTL settings and eviction policies')
    }
    
    if (metrics.memoryUsage > 80 * 1024 * 1024) { // 80MB
      report.recommendations.push('Consider implementing memory-efficient data structures')
      report.recommendations.push('Review cache size limits and cleanup policies')
    }
    
    if (metrics.throughput < 10) {
      report.recommendations.push('Consider horizontal scaling or load balancing')
    }
  }

  private cleanup(): void {
    const cutoff = Date.now() - this.METRIC_RETENTION
    const originalLength = this.metrics.length
    
    this.metrics = this.metrics.filter(m => m.timestamp >= cutoff)
    
    const removed = originalLength - this.metrics.length
    if (removed > 0) {
      logger.debug('Performance metrics cleanup', { removed, remaining: this.metrics.length })
    }
  }

  private startCleanupTimer(): void {
    setInterval(() => {
      this.cleanup()
    }, this.CLEANUP_INTERVAL)
  }

  private startResourceMonitoring(): void {
    // Record memory usage every 30 seconds
    setInterval(() => {
      this.recordMemoryUsage()
    }, 30000)
  }
}

/**
 * Performance measurement decorator
 */
export function measurePerformance(operationName: string) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value
    
    descriptor.value = async function (...args: any[]) {
      const monitor = PerformanceMonitor.getInstance()
      const operationId = `${operationName}_${Date.now()}`
      
      monitor.startTimer(operationId, { 
        operation: operationName,
        method: propertyName,
        args: args.length
      })
      
      try {
        const result = await method.apply(this, args)
        monitor.endTimer(operationId)
        monitor.incrementCounter(`${operationName}_success`)
        return result
      } catch (error) {
        monitor.endTimer(operationId)
        monitor.incrementCounter(`${operationName}_error`)
        throw error
      }
    }
    
    return descriptor
  }
}

export { PerformanceMetric, PerformanceReport, PerformanceThreshold }