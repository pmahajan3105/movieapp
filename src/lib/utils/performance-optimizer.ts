/**
 * Performance optimization utilities for CineAI
 * Includes caching, memoization, and performance monitoring
 */

import React from 'react'
import { logger } from '@/lib/logger'

// Generic memory cache with TTL
export class MemoryCache<T = any> {
  private cache = new Map<string, { value: T; expiry: number }>()
  private defaultTTL: number

  constructor(defaultTTLMs: number = 5 * 60 * 1000) { // 5 minutes default
    this.defaultTTL = defaultTTLMs
  }

  set(key: string, value: T, ttlMs?: number): void {
    const expiry = Date.now() + (ttlMs || this.defaultTTL)
    this.cache.set(key, { value, expiry })
    
    // Cleanup expired entries periodically
    if (this.cache.size > 100) {
      this.cleanup()
    }
  }

  get(key: string): T | null {
    const entry = this.cache.get(key)
    if (!entry) return null

    if (Date.now() > entry.expiry) {
      this.cache.delete(key)
      return null
    }

    return entry.value
  }

  has(key: string): boolean {
    return this.get(key) !== null
  }

  delete(key: string): boolean {
    return this.cache.delete(key)
  }

  clear(): void {
    this.cache.clear()
  }

  size(): number {
    this.cleanup()
    return this.cache.size
  }

  private cleanup(): void {
    const now = Date.now()
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiry) {
        this.cache.delete(key)
      }
    }
  }
}

// Performance monitoring utilities
export class PerformanceMonitor {
  private static measurements = new Map<string, number[]>()

  static startMeasurement(id: string): () => number {
    const startTime = performance.now()
    
    return () => {
      const duration = performance.now() - startTime
      this.recordMeasurement(id, duration)
      return duration
    }
  }

  static recordMeasurement(id: string, duration: number): void {
    if (!this.measurements.has(id)) {
      this.measurements.set(id, [])
    }
    
    const measurements = this.measurements.get(id)!
    measurements.push(duration)
    
    // Keep only last 100 measurements per ID
    if (measurements.length > 100) {
      measurements.shift()
    }
  }

  static getStats(id: string): { avg: number; min: number; max: number; count: number } | null {
    const measurements = this.measurements.get(id)
    if (!measurements || measurements.length === 0) return null

    const avg = measurements.reduce((sum, val) => sum + val, 0) / measurements.length
    const min = Math.min(...measurements)
    const max = Math.max(...measurements)

    return { avg, min, max, count: measurements.length }
  }

  static logStats(): void {
    for (const [id, measurements] of this.measurements.entries()) {
      if (measurements.length > 0) {
        const stats = this.getStats(id)
        if (stats) {
          logger.info('Performance stats', {
            operation: id,
            avgMs: Math.round(stats.avg * 100) / 100,
            minMs: Math.round(stats.min * 100) / 100,
            maxMs: Math.round(stats.max * 100) / 100,
            samples: stats.count
          })
        }
      }
    }
  }
}

// Async function memoization with TTL
export function memoizeAsync<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  keyGenerator?: (...args: Parameters<T>) => string,
  ttlMs?: number
): T {
  const cache = new MemoryCache<Awaited<ReturnType<T>>>(ttlMs)
  
  return (async (...args: Parameters<T>): Promise<Awaited<ReturnType<T>>> => {
    const key = keyGenerator ? keyGenerator(...args) : JSON.stringify(args)
    
    // Check cache first
    const cached = cache.get(key)
    if (cached !== null) {
      return cached
    }

    // Execute function and cache result
    try {
      const result = await fn(...args)
      cache.set(key, result)
      return result
    } catch (error) {
      // Don't cache errors
      throw error
    }
  }) as T
}

// React hook for component performance monitoring
export function usePerformanceMonitor(componentName: string) {
  const endMeasurement = React.useRef<(() => number) | null>(null)

  React.useEffect(() => {
    endMeasurement.current = PerformanceMonitor.startMeasurement(`${componentName}-render`)
    
    return () => {
      if (endMeasurement.current) {
        endMeasurement.current()
      }
    }
  })
}

// Batch operations utility
export class BatchProcessor<T, R> {
  private queue: T[] = []
  private processor: (batch: T[]) => Promise<R[]>
  private batchSize: number
  private delayMs: number
  private timeout: NodeJS.Timeout | null = null

  constructor(
    processor: (batch: T[]) => Promise<R[]>,
    batchSize: number = 10,
    delayMs: number = 100
  ) {
    this.processor = processor
    this.batchSize = batchSize
    this.delayMs = delayMs
  }

  add(item: T): Promise<R> {
    return new Promise((resolve, reject) => {
      this.queue.push({ item, resolve, reject } as any)
      this.scheduleProcess()
    })
  }

  private scheduleProcess(): void {
    if (this.timeout) return

    this.timeout = setTimeout(() => {
      this.process()
    }, this.delayMs)
  }

  private async process(): Promise<void> {
    if (this.queue.length === 0) return

    const batch = this.queue.splice(0, this.batchSize)
    this.timeout = null

    try {
      const items = batch.map((b: any) => b.item)
      const results = await this.processor(items)
      
      batch.forEach((b: any, index) => {
        b.resolve(results[index])
      })
    } catch (error) {
      batch.forEach((b: any) => {
        b.reject(error)
      })
    }

    // Process remaining items
    if (this.queue.length > 0) {
      this.scheduleProcess()
    }
  }
}

// Global cache instances
export const apiCache = new MemoryCache(10 * 60 * 1000) // 10 minutes
export const userDataCache = new MemoryCache(5 * 60 * 1000) // 5 minutes
export const staticDataCache = new MemoryCache(60 * 60 * 1000) // 1 hour

// Performance measurement decorator
export function measurePerformance(operationName: string) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value

    descriptor.value = async function (...args: any[]) {
      const endMeasurement = PerformanceMonitor.startMeasurement(operationName)
      try {
        const result = await method.apply(this, args)
        return result
      } finally {
        endMeasurement()
      }
    }

    return descriptor
  }
}

// Log performance stats periodically (in development)
if (process.env.NODE_ENV === 'development') {
  setInterval(() => {
    PerformanceMonitor.logStats()
  }, 30000) // Every 30 seconds
}