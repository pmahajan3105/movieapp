/**
 * Production Monitoring Service
 * Centralized error tracking and performance monitoring for production
 */

import { logger } from '@/lib/logger'

interface ErrorReport {
  error: Error | string
  context?: Record<string, any>
  userId?: string
  timestamp: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  stackTrace?: string
  userAgent?: string
  url?: string
}

interface PerformanceMetric {
  name: string
  value: number
  unit: 'ms' | 'count' | 'bytes'
  timestamp: string
  userId?: string
  metadata?: Record<string, any>
}

class ProductionMonitor {
  private static instance: ProductionMonitor
  private errorQueue: ErrorReport[] = []
  private metricsQueue: PerformanceMetric[] = []
  private isProduction = process.env.NODE_ENV === 'production'

  private constructor() {
    if (this.isProduction) {
      this.startFlushInterval()
    }
  }

  static getInstance(): ProductionMonitor {
    if (!ProductionMonitor.instance) {
      ProductionMonitor.instance = new ProductionMonitor()
    }
    return ProductionMonitor.instance
  }

  /**
   * Report an error to the monitoring service
   */
  reportError(
    error: Error | string,
    severity: 'low' | 'medium' | 'high' | 'critical' = 'medium',
    context?: Record<string, any>,
    userId?: string
  ): void {
    const errorReport: ErrorReport = {
      error,
      context,
      userId,
      severity,
      timestamp: new Date().toISOString(),
      stackTrace: error instanceof Error ? error.stack : undefined,
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined,
      url: typeof window !== 'undefined' ? window.location.href : undefined,
    }

    this.errorQueue.push(errorReport)

    // Log immediately for critical errors
    if (severity === 'critical') {
      logger.error('Critical error reported', {
        error: error instanceof Error ? error.message : error,
        context,
        userId,
        stackTrace: errorReport.stackTrace,
      })
    }

    // Flush immediately if queue is large
    if (this.errorQueue.length >= 10) {
      this.flushErrors()
    }
  }

  /**
   * Track a performance metric
   */
  trackMetric(
    name: string,
    value: number,
    unit: 'ms' | 'count' | 'bytes' = 'ms',
    metadata?: Record<string, any>,
    userId?: string
  ): void {
    const metric: PerformanceMetric = {
      name,
      value,
      unit,
      timestamp: new Date().toISOString(),
      userId,
      metadata,
    }

    this.metricsQueue.push(metric)

    // Log slow operations
    if (unit === 'ms' && value > 1000) {
      logger.warn('Slow operation detected', {
        metric: name,
        duration: value,
        userId,
        metadata,
      })
    }

    // Flush if queue is large
    if (this.metricsQueue.length >= 20) {
      this.flushMetrics()
    }
  }

  /**
   * Track API response times
   */
  trackAPICall(
    endpoint: string,
    method: string,
    duration: number,
    statusCode: number,
    userId?: string
  ): void {
    this.trackMetric(
      'api_call_duration',
      duration,
      'ms',
      {
        endpoint,
        method,
        statusCode,
        success: statusCode < 400,
      },
      userId
    )

    // Report slow API calls as warnings
    if (duration > 2000) {
      this.reportError(
        `Slow API call: ${method} ${endpoint} took ${duration}ms`,
        'medium',
        { endpoint, method, duration, statusCode },
        userId
      )
    }
  }

  /**
   * Track user interactions for analytics
   */
  trackUserInteraction(
    action: string,
    component: string,
    userId?: string,
    metadata?: Record<string, any>
  ): void {
    this.trackMetric(
      'user_interaction',
      1,
      'count',
      {
        action,
        component,
        ...metadata,
      },
      userId
    )
  }

  /**
   * Get system health metrics
   */
  getHealthMetrics(): Record<string, any> {
    return {
      errorQueueSize: this.errorQueue.length,
      metricsQueueSize: this.metricsQueue.length,
      isProduction: this.isProduction,
      lastFlush: this.lastFlushTime,
      timestamp: new Date().toISOString(),
    }
  }

  private lastFlushTime = new Date()

  private startFlushInterval(): void {
    // Flush queues every 30 seconds in production
    setInterval(() => {
      this.flushErrors()
      this.flushMetrics()
    }, 30000)

    // Flush on page unload
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.flushErrors()
        this.flushMetrics()
      })
    }
  }

  private async flushErrors(): Promise<void> {
    if (this.errorQueue.length === 0) return

    const errors = [...this.errorQueue]
    this.errorQueue = []

    try {
      // In production, you would send to external monitoring service
      // For now, we'll use structured logging
      if (this.isProduction) {
        for (const error of errors) {
          logger.error('Production error report', {
            error: error.error instanceof Error ? error.error.message : error.error,
            severity: error.severity,
            context: error.context,
            userId: error.userId,
            url: error.url,
            userAgent: error.userAgent,
            timestamp: error.timestamp,
          })
        }
      }

      this.lastFlushTime = new Date()
    } catch (flushError) {
      // Re-add errors to queue if flush fails
      this.errorQueue.unshift(...errors)
      logger.error('Failed to flush error reports', {
        error: flushError instanceof Error ? flushError.message : String(flushError),
        errorCount: errors.length,
      })
    }
  }

  private async flushMetrics(): Promise<void> {
    if (this.metricsQueue.length === 0) return

    const metrics = [...this.metricsQueue]
    this.metricsQueue = []

    try {
      // In production, send to analytics service
      if (this.isProduction) {
        // Group metrics by name for efficient logging
        const groupedMetrics: Record<string, PerformanceMetric[]> = {}
        for (const metric of metrics) {
          if (!groupedMetrics[metric.name]) {
            groupedMetrics[metric.name] = []
          }
          groupedMetrics[metric.name]?.push(metric)
        }

        for (const [metricName, metricList] of Object.entries(groupedMetrics)) {
          if (!metricList || metricList.length === 0) continue

          const avgValue = metricList.reduce((sum, m) => sum + m.value, 0) / metricList.length

          logger.info('Performance metrics', {
            metric: metricName,
            count: metricList.length,
            averageValue: Math.round(avgValue),
            unit: metricList[0].unit,
            timeRange: {
              start: metricList[0].timestamp,
              end: metricList[metricList.length - 1].timestamp,
            },
          })
        }
      }

      this.lastFlushTime = new Date()
    } catch (flushError) {
      // Re-add metrics to queue if flush fails
      this.metricsQueue.unshift(...metrics)
      logger.error('Failed to flush performance metrics', {
        error: flushError instanceof Error ? flushError.message : String(flushError),
        metricCount: metrics.length,
      })
    }
  }
}

// Export singleton instance
export const productionMonitor = ProductionMonitor.getInstance()

// Utility functions for common monitoring patterns
export function withErrorMonitoring<T>(
  operation: () => Promise<T>,
  operationName: string,
  userId?: string
): Promise<T> {
  const startTime = Date.now()

  return operation()
    .then(result => {
      const duration = Date.now() - startTime
      productionMonitor.trackMetric(
        `operation_duration_${operationName}`,
        duration,
        'ms',
        { success: true },
        userId
      )
      return result
    })
    .catch(error => {
      const duration = Date.now() - startTime
      productionMonitor.reportError(error, 'medium', { operation: operationName, duration }, userId)
      productionMonitor.trackMetric(
        `operation_duration_${operationName}`,
        duration,
        'ms',
        { success: false },
        userId
      )
      throw error
    })
}

export function trackPageView(pageName: string, userId?: string): void {
  productionMonitor.trackUserInteraction('page_view', 'navigation', userId, {
    page: pageName,
    timestamp: new Date().toISOString(),
  })
}
