/**
 * Background Job Optimizer
 * Phase 4.5: Intelligent background processing and job scheduling
 */

import { logger } from '@/lib/logger'
import { PerformanceMonitor, measurePerformance } from './performance-monitor'
import { SmartCacheManager } from './smart-cache-manager'

type JobPriority = 'critical' | 'high' | 'medium' | 'low' | 'idle'
type JobStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
type JobType = 'cache_warm' | 'data_precompute' | 'cleanup' | 'analytics' | 'model_update' | 'user_analysis'

interface BackgroundJob {
  id: string
  type: JobType
  priority: JobPriority
  payload: any
  status: JobStatus
  createdAt: number
  startedAt?: number
  completedAt?: number
  retryCount: number
  maxRetries: number
  timeout: number
  dependencies?: string[]
  estimatedDuration?: number
  actualDuration?: number
  error?: string
}

interface JobExecutor<T = any> {
  execute(payload: T): Promise<any>
  estimate(payload: T): number // Estimated duration in ms
  canExecute(systemLoad: number): boolean
}

interface JobSchedulerConfig {
  maxConcurrentJobs: number
  maxJobsPerType: number
  adaptiveScheduling: boolean
  loadThreshold: number        // System load % before throttling
  idleThreshold: number        // System load % for idle jobs
  cleanupInterval: number      // Job cleanup frequency
  retryDelayMs: number        // Base retry delay
}

interface SystemLoadMetrics {
  cpuUsage: number
  memoryUsage: number
  activeJobs: number
  queueLength: number
  avgResponseTime: number
  errorRate: number
  timestamp: number
}

export class BackgroundJobOptimizer {
  private static instance: BackgroundJobOptimizer
  private config: JobSchedulerConfig
  private monitor: PerformanceMonitor
  private cache: SmartCacheManager
  
  private jobQueue = new Map<JobPriority, BackgroundJob[]>()
  private runningJobs = new Map<string, BackgroundJob>()
  private completedJobs = new Map<string, BackgroundJob>()
  private jobExecutors = new Map<JobType, JobExecutor>()
  
  private readonly PRIORITY_ORDER: JobPriority[] = ['critical', 'high', 'medium', 'low', 'idle']
  private readonly DEFAULT_CONFIG: JobSchedulerConfig = {
    maxConcurrentJobs: 5,
    maxJobsPerType: 3,
    adaptiveScheduling: true,
    loadThreshold: 80,
    idleThreshold: 30,
    cleanupInterval: 300000,    // 5 minutes
    retryDelayMs: 5000         // 5 seconds
  }

  private processingInterval?: NodeJS.Timeout
  private cleanupInterval?: NodeJS.Timeout

  private constructor(config?: Partial<JobSchedulerConfig>) {
    this.config = { ...this.DEFAULT_CONFIG, ...config }
    this.monitor = PerformanceMonitor.getInstance()
    this.cache = SmartCacheManager.getInstance()
    
    this.initializeQueues()
    this.registerBuiltInExecutors()
    this.startProcessing()
    this.startCleanup()
  }

  static getInstance(config?: Partial<JobSchedulerConfig>): BackgroundJobOptimizer {
    if (!BackgroundJobOptimizer.instance) {
      BackgroundJobOptimizer.instance = new BackgroundJobOptimizer(config)
    }
    return BackgroundJobOptimizer.instance
  }

  /**
   * Schedule a background job
   */
  scheduleJob(
    type: JobType,
    payload: any,
    options: {
      priority?: JobPriority
      timeout?: number
      maxRetries?: number
      dependencies?: string[]
      delayMs?: number
    } = {}
  ): string {
    
    const job: BackgroundJob = {
      id: this.generateJobId(),
      type,
      priority: options.priority || 'medium',
      payload,
      status: 'pending',
      createdAt: Date.now() + (options.delayMs || 0),
      retryCount: 0,
      maxRetries: options.maxRetries || 3,
      timeout: options.timeout || 30000,
      dependencies: options.dependencies,
      estimatedDuration: this.estimateJobDuration(type, payload)
    }
    
    this.addJobToQueue(job)
    
    logger.info('Background job scheduled', {
      jobId: job.id,
      type: job.type,
      priority: job.priority,
      estimatedDuration: job.estimatedDuration
    })
    
    this.monitor.incrementCounter(`job_scheduled_${type}`)
    
    return job.id
  }

  /**
   * Cancel a pending job
   */
  cancelJob(jobId: string): boolean {
    // Find and remove from queue
    for (const [priority, jobs] of this.jobQueue.entries()) {
      const index = jobs.findIndex(job => job.id === jobId)
      if (index !== -1) {
        const job = jobs[index]
        jobs.splice(index, 1)
        if (job) {
          job.status = 'cancelled'
          job.completedAt = Date.now()
          this.completedJobs.set(jobId, job)
          logger.info('Background job cancelled', { jobId, type: job.type })
          this.monitor.incrementCounter(`job_cancelled_${job.type}`)
        }
        return true
      }
    }
    
    // Check if it's currently running
    const runningJob = this.runningJobs.get(jobId)
    if (runningJob) {
      runningJob.status = 'cancelled'
      // Note: We can't actually stop a running job, but we mark it as cancelled
      logger.warn('Cannot cancel running job, marked as cancelled', { jobId })
      return false
    }
    
    return false
  }

  /**
   * Get job status
   */
  getJobStatus(jobId: string): BackgroundJob | null {
    return this.runningJobs.get(jobId) || 
           this.completedJobs.get(jobId) || 
           this.findJobInQueue(jobId) || 
           null
  }

  /**
   * Get queue statistics
   */
  getQueueStats(): {
    totalPending: number
    totalRunning: number
    totalCompleted: number
    queueByPriority: Record<JobPriority, number>
    systemLoad: SystemLoadMetrics
  } {
    const queueByPriority = {} as Record<JobPriority, number>
    let totalPending = 0
    
    for (const [priority, jobs] of this.jobQueue.entries()) {
      queueByPriority[priority] = jobs.length
      totalPending += jobs.length
    }
    
    return {
      totalPending,
      totalRunning: this.runningJobs.size,
      totalCompleted: this.completedJobs.size,
      queueByPriority,
      systemLoad: this.getCurrentSystemLoad()
    }
  }

  /**
   * Register custom job executor
   */
  registerExecutor(type: JobType, executor: JobExecutor): void {
    this.jobExecutors.set(type, executor)
    logger.info('Job executor registered', { type })
  }

  /**
   * Warm critical caches in background
   */
  async warmCaches(userId: string): Promise<string[]> {
    const jobs: string[] = []
    
    // Schedule cache warming jobs
    jobs.push(this.scheduleJob('cache_warm', {
      type: 'user_recommendations',
      userId,
      variants: ['default', 'with_explanations', 'different_limits']
    }, { priority: 'high' }))
    
    jobs.push(this.scheduleJob('cache_warm', {
      type: 'user_profile',
      userId
    }, { priority: 'medium' }))
    
    jobs.push(this.scheduleJob('cache_warm', {
      type: 'popular_movies',
      categories: ['trending', 'top_rated', 'by_genre']
    }, { priority: 'low' }))
    
    return jobs
  }

  /**
   * Schedule user analysis jobs
   */
  async scheduleUserAnalysis(userId: string): Promise<string[]> {
    const jobs: string[] = []
    
    jobs.push(this.scheduleJob('user_analysis', {
      userId,
      analysisType: 'preference_update',
      includeRecent: true
    }, { priority: 'medium' }))
    
    jobs.push(this.scheduleJob('data_precompute', {
      userId,
      computeType: 'similarity_scores',
      scope: 'watched_movies'
    }, { priority: 'low' }))
    
    return jobs
  }

  /**
   * Shutdown job processor
   */
  shutdown(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval)
    }
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
    }
    
    // Wait for running jobs to complete (with timeout)
    const shutdownTimeout = setTimeout(() => {
      logger.warn('Force shutdown: cancelling running jobs')
      for (const job of this.runningJobs.values()) {
        job.status = 'cancelled'
      }
    }, 30000)
    
    // Check if all jobs are done
    const checkComplete = setInterval(() => {
      if (this.runningJobs.size === 0) {
        clearTimeout(shutdownTimeout)
        clearInterval(checkComplete)
        logger.info('Background job processor shutdown complete')
      }
    }, 1000)
  }

  private initializeQueues(): void {
    for (const priority of this.PRIORITY_ORDER) {
      this.jobQueue.set(priority, [])
    }
  }

  private registerBuiltInExecutors(): void {
    // Cache warming executor
    this.registerExecutor('cache_warm', {
      execute: async (payload) => {
        return await this.executeCacheWarmJob(payload)
      },
      estimate: (payload) => {
        const baseTime = 2000 // 2 seconds base
        const variantMultiplier = payload.variants?.length || 1
        return baseTime * variantMultiplier
      },
      canExecute: (systemLoad) => systemLoad < 70
    })
    
    // Data precompute executor
    this.registerExecutor('data_precompute', {
      execute: async (payload) => {
        return await this.executeDataPrecomputeJob(payload)
      },
      estimate: (payload) => {
        switch (payload.computeType) {
          case 'similarity_scores': return 5000
          case 'embeddings': return 10000
          case 'recommendations': return 8000
          default: return 3000
        }
      },
      canExecute: (systemLoad) => systemLoad < 80
    })
    
    // Cleanup executor
    this.registerExecutor('cleanup', {
      execute: async (payload) => {
        return await this.executeCleanupJob(payload)
      },
      estimate: () => 1000,
      canExecute: (systemLoad) => systemLoad < 90
    })
    
    // User analysis executor
    this.registerExecutor('user_analysis', {
      execute: async (payload) => {
        return await this.executeUserAnalysisJob(payload)
      },
      estimate: (payload) => {
        switch (payload.analysisType) {
          case 'preference_update': return 3000
          case 'behavior_analysis': return 7000
          case 'full_profile': return 15000
          default: return 5000
        }
      },
      canExecute: (systemLoad) => systemLoad < 85
    })
  }

  private startProcessing(): void {
    this.processingInterval = setInterval(() => {
      this.processQueue()
    }, 1000) // Check every second
  }

  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      this.performCleanup()
    }, this.config.cleanupInterval)
  }

  private async processQueue(): Promise<void> {
    const systemLoad = this.getCurrentSystemLoad()
    
    // Check if we can process more jobs
    if (this.runningJobs.size >= this.config.maxConcurrentJobs) {
      return
    }
    
    // Don't process if system is overloaded
    if (systemLoad.cpuUsage > this.config.loadThreshold) {
      this.monitor.incrementCounter('job_processing_throttled')
      return
    }
    
    // Find next job to execute
    const job = this.getNextJob(systemLoad)
    if (!job) {
      return
    }
    
    // Start executing the job
    this.executeJob(job)
  }

  private getNextJob(systemLoad: SystemLoadMetrics): BackgroundJob | null {
    for (const priority of this.PRIORITY_ORDER) {
      if (priority === 'idle' && systemLoad.cpuUsage > this.config.idleThreshold) {
        continue
      }
      const jobs = this.jobQueue.get(priority)!
      for (let i = 0; i < jobs.length; i++) {
        const job = jobs[i]
        if (!job) continue;
        if (!this.isJobReady(job)) {
          continue
        }
        const runningOfType = Array.from(this.runningJobs.values())
          .filter(j => j.type === job.type).length
        if (runningOfType >= this.config.maxJobsPerType) {
          continue
        }
        const executor = this.jobExecutors.get(job.type)
        if (executor && !executor.canExecute(systemLoad.cpuUsage)) {
          continue
        }
        jobs.splice(i, 1)
        if (job) return job
      }
    }
    return null
  }

  private async executeJob(job: BackgroundJob): Promise<void> {
    if (!job) return;
    job.status = 'running'
    job.startedAt = Date.now()
    this.runningJobs.set(job.id, job)
    
    logger.info('Starting background job', {
      jobId: job.id,
      type: job.type,
      priority: job.priority
    })
    
    const executor = this.jobExecutors.get(job.type)
    if (!executor) {
      this.failJob(job, new Error(`No executor found for job type: ${job.type}`))
      return
    }
    
    try {
      // Execute with timeout
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Job timeout')), job.timeout)
      )
      
      const result = await Promise.race([
        executor.execute(job.payload),
        timeoutPromise
      ])
      
      this.completeJob(job, result)
      
    } catch (error) {
      this.handleJobError(job, error as Error)
    }
  }

  private completeJob(job: BackgroundJob, result: any): void {
    job.status = 'completed'
    job.completedAt = Date.now()
    job.actualDuration = job.completedAt - (job.startedAt || job.createdAt)
    
    this.runningJobs.delete(job.id)
    this.completedJobs.set(job.id, job)
    
    logger.info('Background job completed', {
      jobId: job.id,
      type: job.type,
      duration: job.actualDuration,
      estimatedDuration: job.estimatedDuration
    })
    
    this.monitor.incrementCounter(`job_completed_${job.type}`)
    this.monitor.recordMetric(
      `job_duration_${job.type}`,
      job.actualDuration || 0,
      'ms'
    )
  }

  private handleJobError(job: BackgroundJob, error: Error): void {
    logger.warn('Background job failed', {
      jobId: job.id,
      type: job.type,
      error: error.message,
      retryCount: job.retryCount
    })
    
    if (job.retryCount < job.maxRetries) {
      // Retry the job
      job.retryCount++
      job.status = 'pending'
      job.createdAt = Date.now() + (this.config.retryDelayMs * job.retryCount)
      
      this.runningJobs.delete(job.id)
      this.addJobToQueue(job)
      
      this.monitor.incrementCounter(`job_retried_${job.type}`)
    } else {
      // Max retries exceeded
      this.failJob(job, error)
    }
  }

  private failJob(job: BackgroundJob, error: Error): void {
    job.status = 'failed'
    job.completedAt = Date.now()
    job.error = error.message
    
    this.runningJobs.delete(job.id)
    this.completedJobs.set(job.id, job)
    
    logger.error('Background job failed permanently', {
      jobId: job.id,
      type: job.type,
      error: error.message,
      retryCount: job.retryCount
    })
    
    this.monitor.incrementCounter(`job_failed_${job.type}`)
  }

  private isJobReady(job: BackgroundJob): boolean {
    // Check if job is delayed
    if (job.createdAt > Date.now()) {
      return false
    }
    
    // Check dependencies
    if (job.dependencies) {
      for (const depId of job.dependencies) {
        const depJob = this.completedJobs.get(depId)
        if (!depJob || depJob.status !== 'completed') {
          return false
        }
      }
    }
    
    return true
  }

  private addJobToQueue(job: BackgroundJob): void {
    const queue = this.jobQueue.get(job.priority)
    if (!queue) return;
    // Insert job in correct position based on creation time
    let insertIndex = queue.length
    for (let i = 0; i < queue.length; i++) {
      const queuedJob = queue[i];
      if (queuedJob && queuedJob.createdAt > job.createdAt) {
        insertIndex = i
        break
      }
    }
    queue.splice(insertIndex, 0, job)
  }

  private findJobInQueue(jobId: string): BackgroundJob | null {
    for (const jobs of this.jobQueue.values()) {
      const job = jobs.find(j => j.id === jobId)
      if (job) return job
    }
    return null
  }

  private estimateJobDuration(type: JobType, payload: any): number {
    const executor = this.jobExecutors.get(type)
    return executor?.estimate(payload) || 5000 // Default 5 seconds
  }

  private getCurrentSystemLoad(): SystemLoadMetrics {
    const recentMetrics = this.monitor.getRecentMetrics('system', 60000) // Last minute
    
    return {
      cpuUsage: 50, // Would be implemented with actual CPU monitoring
      memoryUsage: 60, // Would be implemented with actual memory monitoring
      activeJobs: this.runningJobs.size,
      queueLength: Array.from(this.jobQueue.values()).reduce((sum, jobs) => sum + jobs.length, 0),
      avgResponseTime: recentMetrics
        .filter(m => m.name.includes('duration'))
        .reduce((sum, m, _, arr) => sum + m.value / arr.length, 0),
      errorRate: recentMetrics
        .filter(m => m.name.includes('error'))
        .length / Math.max(recentMetrics.length, 1) * 100,
      timestamp: Date.now()
    }
  }

  private performCleanup(): void {
    for (const jobs of this.jobQueue.values()) {
      if (!jobs) continue;
      for (let i = jobs.length - 1; i >= 0; i--) {
        const job = jobs[i]
        if (!job) continue;
        if (job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled') {
          jobs.splice(i, 1)
        }
      }
    }
  }

  private generateJobId(): string {
    return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  // Built-in job executors
  private async executeCacheWarmJob(payload: any): Promise<any> {
    switch (payload.type) {
      case 'user_recommendations':
        await this.cache.warmCache(payload.userId)
        break
      case 'user_profile':
        // Warm user profile cache
        break
      case 'popular_movies':
        // Warm popular movies cache
        break
    }
    return { success: true }
  }

  private async executeDataPrecomputeJob(payload: any): Promise<any> {
    // Implement data precomputation logic
    return { success: true, computedItems: 100 }
  }

  private async executeCleanupJob(payload: any): Promise<any> {
    // Implement cleanup logic
    return { success: true, cleanedItems: 50 }
  }

  private async executeUserAnalysisJob(payload: any): Promise<any> {
    // Implement user analysis logic
    return { success: true, analysisComplete: true }
  }
}

export type { BackgroundJob, JobExecutor, JobSchedulerConfig, SystemLoadMetrics, JobPriority, JobStatus, JobType }