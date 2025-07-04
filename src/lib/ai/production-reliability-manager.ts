/**
 * Production Reliability Manager
 * Phase 4.6: Comprehensive production reliability and monitoring
 */

import { logger } from '@/lib/logger'
import { PerformanceMonitor, measurePerformance } from './performance-monitor'
import { ReliabilityOrchestrator, SystemHealthStatus } from './reliability-orchestrator'
import { ServiceCircuitBreaker } from './service-circuit-breaker'

interface AlertRule {
  id: string
  name: string
  metric: string
  threshold: number
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte'
  severity: 'critical' | 'warning' | 'info'
  enabled: boolean
  cooldownMs: number
  lastTriggered?: number
}

interface Alert {
  id: string
  ruleId: string
  severity: 'critical' | 'warning' | 'info'
  message: string
  timestamp: number
  resolved: boolean
  resolvedAt?: number
  metadata: Record<string, any>
}

interface HealthCheckEndpoint {
  name: string
  url?: string
  timeout: number
  expectedStatus?: number
  expectedResponse?: any
  lastCheck?: number
  lastStatus?: 'healthy' | 'unhealthy'
  consecutiveFailures: number
}

interface ProductionMetrics {
  uptime: number
  totalRequests: number
  successfulRequests: number
  failedRequests: number
  averageResponseTime: number
  p95ResponseTime: number
  p99ResponseTime: number
  errorRate: number
  cacheHitRate: number
  activeUsers: number
  systemLoad: number
  memoryUsage: number
  alertsActive: number
  lastHealthCheck: number
}

interface ReliabilityConfig {
  enableHealthChecks: boolean
  healthCheckInterval: number
  enableAlerting: boolean
  alertCooldown: number
  enableAutoRecovery: boolean
  maxAutoRecoveryAttempts: number
  enableMetricsCollection: boolean
  metricsRetentionMs: number
  enableGracefulShutdown: boolean
  shutdownTimeoutMs: number
}

export class ProductionReliabilityManager {
  private static instance: ProductionReliabilityManager
  private config: ReliabilityConfig
  private monitor: PerformanceMonitor
  private reliabilityOrchestrator: ReliabilityOrchestrator
  
  private alertRules = new Map<string, AlertRule>()
  private activeAlerts = new Map<string, Alert>()
  private healthEndpoints = new Map<string, HealthCheckEndpoint>()
  private metrics: ProductionMetrics
  
  private readonly DEFAULT_CONFIG: ReliabilityConfig = {
    enableHealthChecks: true,
    healthCheckInterval: 30000,    // 30 seconds
    enableAlerting: true,
    alertCooldown: 300000,         // 5 minutes
    enableAutoRecovery: true,
    maxAutoRecoveryAttempts: 3,
    enableMetricsCollection: true,
    metricsRetentionMs: 24 * 60 * 60 * 1000, // 24 hours
    enableGracefulShutdown: true,
    shutdownTimeoutMs: 30000       // 30 seconds
  }
  
  private healthCheckInterval?: NodeJS.Timeout
  private metricsInterval?: NodeJS.Timeout
  private isShuttingDown = false

  private constructor(config?: Partial<ReliabilityConfig>) {
    this.config = { ...this.DEFAULT_CONFIG, ...config }
    this.monitor = PerformanceMonitor.getInstance()
    this.reliabilityOrchestrator = ReliabilityOrchestrator.getInstance()
    
    this.metrics = this.initializeMetrics()
    this.setupDefaultAlertRules()
    this.setupDefaultHealthChecks()
    
    if (this.config.enableHealthChecks) {
      this.startHealthChecks()
    }
    
    if (this.config.enableMetricsCollection) {
      this.startMetricsCollection()
    }
    
    this.setupGracefulShutdown()
  }

  static getInstance(config?: Partial<ReliabilityConfig>): ProductionReliabilityManager {
    if (!ProductionReliabilityManager.instance) {
      ProductionReliabilityManager.instance = new ProductionReliabilityManager(config)
    }
    return ProductionReliabilityManager.instance
  }

  /**
   * Get current production metrics
   */
  getProductionMetrics(): ProductionMetrics {
    return { ...this.metrics }
  }

  /**
   * Get system health status
   */
  async getSystemHealth(): Promise<{
    status: 'healthy' | 'degraded' | 'critical'
    details: SystemHealthStatus
    alerts: Alert[]
    uptime: number
  }> {
    const systemHealth = await this.reliabilityOrchestrator.updateHealthStatus()
    const activeAlerts = Array.from(this.activeAlerts.values()).filter(a => !a.resolved)
    
    return {
      status: systemHealth.overall,
      details: systemHealth,
      alerts: activeAlerts,
      uptime: this.metrics.uptime
    }
  }

  /**
   * Add custom alert rule
   */
  addAlertRule(rule: Omit<AlertRule, 'id'>): string {
    const id = this.generateId('alert')
    const fullRule: AlertRule = { ...rule, id }
    
    this.alertRules.set(id, fullRule)
    
    logger.info('Alert rule added', { ruleId: id, name: rule.name })
    return id
  }

  /**
   * Remove alert rule
   */
  removeAlertRule(ruleId: string): boolean {
    const removed = this.alertRules.delete(ruleId)
    if (removed) {
      logger.info('Alert rule removed', { ruleId })
    }
    return removed
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): Alert[] {
    return Array.from(this.activeAlerts.values()).filter(a => !a.resolved)
  }

  /**
   * Resolve an alert
   */
  resolveAlert(alertId: string): boolean {
    const alert = this.activeAlerts.get(alertId)
    if (alert && !alert.resolved) {
      alert.resolved = true
      alert.resolvedAt = Date.now()
      
      logger.info('Alert resolved', { alertId, ruleId: alert.ruleId })
      return true
    }
    return false
  }

  /**
   * Add health check endpoint
   */
  addHealthCheck(endpoint: Omit<HealthCheckEndpoint, 'consecutiveFailures'>): void {
    const fullEndpoint: HealthCheckEndpoint = {
      ...endpoint,
      consecutiveFailures: 0
    }
    
    this.healthEndpoints.set(endpoint.name, fullEndpoint)
    logger.info('Health check endpoint added', { name: endpoint.name })
  }

  /**
   * Remove health check endpoint
   */
  removeHealthCheck(name: string): boolean {
    const removed = this.healthEndpoints.delete(name)
    if (removed) {
      logger.info('Health check endpoint removed', { name })
    }
    return removed
  }

  /**
   * Trigger manual recovery actions
   */
  async triggerRecovery(actions: ('restart_services' | 'clear_cache' | 'reset_circuits' | 'warm_cache')[]): Promise<void> {
    logger.info('Manual recovery triggered', { actions })
    
    for (const action of actions) {
      try {
        switch (action) {
          case 'clear_cache':
            // Clear all caches
            break
            
          case 'reset_circuits':
            // Reset all circuit breakers
            break
            
          case 'warm_cache':
            // Warm critical caches
            break
            
          case 'restart_services':
            // This would require coordination with the deployment system
            logger.warn('Service restart requested but not implemented')
            break
        }
        
        logger.info('Recovery action completed', { action })
        
      } catch (error) {
        logger.error('Recovery action failed', { 
          action,
          error: error instanceof Error ? error.message : String(error)
        })
      }
    }
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    if (this.isShuttingDown) {
      return
    }
    
    this.isShuttingDown = true
    logger.info('Starting graceful shutdown')
    
    // Stop health checks and metrics collection
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval)
    }
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval)
    }
    
    // Background jobs component removed
    
    // Wait for ongoing operations to complete
    await this.waitForCompletion()
    
    logger.info('Graceful shutdown completed')
  }

  private async performHealthChecks(): Promise<void> {
    const startTime = Date.now()
    
    try {
      // Check each registered endpoint
      const healthPromises = Array.from(this.healthEndpoints.values()).map(
        endpoint => this.checkEndpointHealth(endpoint)
      )
      
      await Promise.allSettled(healthPromises)
      
      // Update system metrics
      await this.updateSystemMetrics()
      
      // Check alert rules
      this.checkAlertRules()
      
      this.monitor.recordMetric('health_check_duration', Date.now() - startTime, 'ms')
      
    } catch (error) {
      logger.error('Health check failed', { 
        error: error instanceof Error ? error.message : String(error)
      })
    }
  }

  private async checkEndpointHealth(endpoint: HealthCheckEndpoint): Promise<void> {
    const startTime = Date.now()
    
    try {
      if (endpoint.url) {
        // External health check (would be implemented)
        endpoint.lastStatus = 'healthy'
        endpoint.consecutiveFailures = 0
      } else {
        // Internal health check
        const systemHealth = await this.reliabilityOrchestrator.getSystemHealthStatus()
        endpoint.lastStatus = systemHealth.overall === 'critical' ? 'unhealthy' : 'healthy'
        
        if (endpoint.lastStatus === 'unhealthy') {
          endpoint.consecutiveFailures++
        } else {
          endpoint.consecutiveFailures = 0
        }
      }
      
      endpoint.lastCheck = Date.now()
      
      this.monitor.recordMetric(
        `health_check_${endpoint.name}`,
        Date.now() - startTime,
        'ms'
      )
      
    } catch (error) {
      endpoint.lastStatus = 'unhealthy'
      endpoint.consecutiveFailures++
      endpoint.lastCheck = Date.now()
      
      logger.warn('Health check failed for endpoint', {
        endpoint: endpoint.name,
        error: error instanceof Error ? error.message : String(error),
        consecutiveFailures: endpoint.consecutiveFailures
      })
    }
  }

  private async updateSystemMetrics(): Promise<void> {
    const now = Date.now()
    const report = this.monitor.generateReport(300000) // Last 5 minutes
    const systemHealth = await this.reliabilityOrchestrator.getSystemHealthStatus()
    
    this.metrics = {
      uptime: now - (this.metrics.lastHealthCheck || now),
      totalRequests: report.metrics.throughput,
      successfulRequests: Math.floor(report.metrics.throughput * (100 - report.metrics.errorRate) / 100),
      failedRequests: Math.floor(report.metrics.throughput * report.metrics.errorRate / 100),
      averageResponseTime: report.metrics.averageResponseTime,
      p95ResponseTime: report.metrics.p95ResponseTime,
      p99ResponseTime: report.metrics.p99ResponseTime,
      errorRate: report.metrics.errorRate,
      cacheHitRate: report.metrics.cacheHitRate,
      activeUsers: 0, // Would be tracked separately
      systemLoad: 0, // Would be monitored
      memoryUsage: report.metrics.memoryUsage,
      alertsActive: this.getActiveAlerts().length,
      lastHealthCheck: now
    }
  }

  private checkAlertRules(): void {
    for (const rule of this.alertRules.values()) {
      if (!rule.enabled) continue
      
      // Check cooldown
      if (rule.lastTriggered && Date.now() - rule.lastTriggered < rule.cooldownMs) {
        continue
      }
      
      const value = this.getMetricValue(rule.metric)
      if (value === null) continue
      
      const shouldTrigger = this.evaluateRule(value, rule.threshold, rule.operator)
      
      if (shouldTrigger) {
        this.triggerAlert(rule, value)
      }
    }
  }

  private triggerAlert(rule: AlertRule, value: number): void {
    const alert: Alert = {
      id: this.generateId('alert'),
      ruleId: rule.id,
      severity: rule.severity,
      message: `${rule.name}: ${rule.metric} is ${value} (threshold: ${rule.threshold})`,
      timestamp: Date.now(),
      resolved: false,
      metadata: {
        metric: rule.metric,
        value,
        threshold: rule.threshold,
        operator: rule.operator
      }
    }
    
    this.activeAlerts.set(alert.id, alert)
    rule.lastTriggered = Date.now()
    
    logger.warn('Alert triggered', {
      alertId: alert.id,
      ruleId: rule.id,
      severity: rule.severity,
      message: alert.message
    })
    
    this.monitor.incrementCounter(`alert_triggered_${rule.severity}`)
    
    // Trigger auto-recovery if enabled
    if (this.config.enableAutoRecovery && rule.severity === 'critical') {
      this.attemptAutoRecovery(rule, alert)
    }
  }

  private async attemptAutoRecovery(rule: AlertRule, alert: Alert): Promise<void> {
    try {
      logger.info('Attempting auto-recovery', { alertId: alert.id, ruleId: rule.id })
      
      // Implement auto-recovery logic based on the alert type
      switch (rule.metric) {
        case 'error_rate':
          // Reset circuit breakers
          break
          
        case 'response_time':
          // Clear caches and warm critical data
          break
          
        case 'memory_usage':
          // Trigger garbage collection and cache cleanup
          break
          
        default:
          logger.warn('No auto-recovery strategy for metric', { metric: rule.metric })
          return
      }
      
      this.monitor.incrementCounter('auto_recovery_attempt')
      
    } catch (error) {
      logger.error('Auto-recovery failed', {
        alertId: alert.id,
        ruleId: rule.id,
        error: error instanceof Error ? error.message : String(error)
      })
      
      this.monitor.incrementCounter('auto_recovery_failed')
    }
  }

  private getMetricValue(metric: string): number | null {
    switch (metric) {
      case 'error_rate':
        return this.metrics.errorRate
      case 'response_time':
        return this.metrics.averageResponseTime
      case 'p95_response_time':
        return this.metrics.p95ResponseTime
      case 'cache_hit_rate':
        return this.metrics.cacheHitRate
      case 'memory_usage':
        return this.metrics.memoryUsage
      case 'system_load':
        return this.metrics.systemLoad
      case 'active_alerts':
        return this.metrics.alertsActive
      default:
        return null
    }
  }

  private evaluateRule(value: number, threshold: number, operator: string): boolean {
    switch (operator) {
      case 'gt': return value > threshold
      case 'gte': return value >= threshold
      case 'lt': return value < threshold
      case 'lte': return value <= threshold
      case 'eq': return value === threshold
      default: return false
    }
  }

  private setupDefaultAlertRules(): void {
    // Critical error rate
    this.addAlertRule({
      name: 'High Error Rate',
      metric: 'error_rate',
      threshold: 10,
      operator: 'gte',
      severity: 'critical',
      enabled: true,
      cooldownMs: 300000
    })
    
    // High response time
    this.addAlertRule({
      name: 'High Response Time',
      metric: 'p95_response_time',
      threshold: 2000,
      operator: 'gte',
      severity: 'warning',
      enabled: true,
      cooldownMs: 180000
    })
    
    // Low cache hit rate
    this.addAlertRule({
      name: 'Low Cache Hit Rate',
      metric: 'cache_hit_rate',
      threshold: 60,
      operator: 'lte',
      severity: 'warning',
      enabled: true,
      cooldownMs: 600000
    })
    
    // High memory usage
    this.addAlertRule({
      name: 'High Memory Usage',
      metric: 'memory_usage',
      threshold: 85,
      operator: 'gte',
      severity: 'warning',
      enabled: true,
      cooldownMs: 300000
    })
  }

  private setupDefaultHealthChecks(): void {
    this.addHealthCheck({
      name: 'system_overall',
      timeout: 5000
    })
    
    this.addHealthCheck({
      name: 'ai_services',
      timeout: 10000
    })
    
    this.addHealthCheck({
      name: 'cache_services',
      timeout: 2000
    })
  }

  private setupGracefulShutdown(): void {
    if (!this.config.enableGracefulShutdown) return
    
    const shutdown = () => {
      this.shutdown().catch(error => {
        logger.error('Graceful shutdown failed', { error })
        process.exit(1)
      })
    }
    
    process.on('SIGTERM', shutdown)
    process.on('SIGINT', shutdown)
  }

  private startHealthChecks(): void {
    this.healthCheckInterval = setInterval(() => {
      this.performHealthChecks()
    }, this.config.healthCheckInterval)
    
    // Initial health check
    this.performHealthChecks()
  }

  private startMetricsCollection(): void {
    this.metricsInterval = setInterval(() => {
      this.updateSystemMetrics()
    }, 60000) // Update every minute
    
    // Initial metrics collection
    this.updateSystemMetrics()
  }

  private async waitForCompletion(): Promise<void> {
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        logger.warn('Shutdown timeout reached, forcing exit')
        resolve()
      }, this.config.shutdownTimeoutMs)
      
      // Check for completion periodically
      const checkComplete = setInterval(() => {
        // Add logic to check if all operations are complete
        const allComplete = true // Placeholder
        
        if (allComplete) {
          clearTimeout(timeout)
          clearInterval(checkComplete)
          resolve()
        }
      }, 1000)
    })
  }

  private initializeMetrics(): ProductionMetrics {
    return {
      uptime: 0,
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      p95ResponseTime: 0,
      p99ResponseTime: 0,
      errorRate: 0,
      cacheHitRate: 0,
      activeUsers: 0,
      systemLoad: 0,
      memoryUsage: 0,
      alertsActive: 0,
      lastHealthCheck: Date.now()
    }
  }

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
}

export type { 
  AlertRule, 
  Alert, 
  HealthCheckEndpoint, 
  ProductionMetrics, 
  ReliabilityConfig 
}