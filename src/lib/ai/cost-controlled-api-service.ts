/**
 * Cost-Controlled API Service
 * Phase 2: Smart spending limits and graceful degradation
 * 
 * Manages API usage costs and ensures budget compliance while providing
 * intelligent fallbacks when limits are reached.
 */

import { createClient } from '@supabase/supabase-js'
import { logger } from '@/lib/logger'

interface APIUsageLog {
  service: string
  operation: string
  tokens_used?: number
  requests_count: number
  estimated_cost: number
  user_id?: string
  movie_id?: string
  success: boolean
  created_at: string
}

interface CostLimits {
  daily: number
  monthly: number
  perRequest: number
  warningThreshold: number
}

interface ServiceConfig {
  claude: CostLimits
  brave_search: CostLimits
  wikipedia: CostLimits
  tmdb: CostLimits
}

interface UsageSummary {
  service: string
  dailySpend: number
  monthlySpend: number
  requestsToday: number
  requestsThisMonth: number
  canAfford: boolean
  timeToReset: number
}

export class CostControlledAPIService {
  private config: ServiceConfig
  private supabase: any

  constructor() {
    this.config = {
      claude: {
        daily: 5.00,        // $5/day max
        monthly: 50.00,     // $50/month max
        perRequest: 0.05,   // ~$0.05 per analysis
        warningThreshold: 0.8
      },
      brave_search: {
        daily: 0.00,        // Free tier
        monthly: 0.00,      // 2000 requests/month free
        perRequest: 0.00,
        warningThreshold: 0.9  // Warn at 1800 requests
      },
      wikipedia: {
        daily: 0.00,        // Always free
        monthly: 0.00,
        perRequest: 0.00,
        warningThreshold: 1.0
      },
      tmdb: {
        daily: 0.00,        // Free tier
        monthly: 0.00,      // 1000 requests/day free
        perRequest: 0.00,
        warningThreshold: 0.9  // Warn at 900 requests
      }
    }

    // Initialize Supabase client for logging
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
  }

  /**
   * Check if we can afford to make an API call
   */
  async canAffordOperation(service: keyof ServiceConfig, operation: string): Promise<boolean> {
    try {
      const usage = await this.getUsageSummary(service)
      const limits = this.config[service]

      // Check daily limit
      if (usage.dailySpend + limits.perRequest > limits.daily) {
        logger.warn(`Daily limit reached for ${service}`, { 
          current: usage.dailySpend, 
          limit: limits.daily 
        })
        return false
      }

      // Check monthly limit
      if (usage.monthlySpend + limits.perRequest > limits.monthly) {
        logger.warn(`Monthly limit reached for ${service}`, { 
          current: usage.monthlySpend, 
          limit: limits.monthly 
        })
        return false
      }

      // Check request-based limits for free tiers
      if (service === 'brave_search' && usage.requestsThisMonth >= 2000) {
        return false
      }

      if (service === 'tmdb' && usage.requestsToday >= 1000) {
        return false
      }

      return true
    } catch (error) {
      logger.error('Error checking API affordability', { service, operation, error })
      return false // Fail safe
    }
  }

  /**
   * Get current usage summary for a service
   */
  async getUsageSummary(service: string): Promise<UsageSummary> {
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    try {
      // Get daily usage
      const { data: dailyUsage } = await this.supabase
        .from('api_usage_log')
        .select('estimated_cost, requests_count')
        .eq('service', service)
        .gte('created_at', todayStart.toISOString())

      // Get monthly usage
      const { data: monthlyUsage } = await this.supabase
        .from('api_usage_log')
        .select('estimated_cost, requests_count')
        .eq('service', service)
        .gte('created_at', monthStart.toISOString())

      const dailySpend = dailyUsage?.reduce((sum, log) => sum + (log.estimated_cost || 0), 0) || 0
      const monthlySpend = monthlyUsage?.reduce((sum, log) => sum + (log.estimated_cost || 0), 0) || 0
      const requestsToday = dailyUsage?.reduce((sum, log) => sum + (log.requests_count || 0), 0) || 0
      const requestsThisMonth = monthlyUsage?.reduce((sum, log) => sum + (log.requests_count || 0), 0) || 0

      const limits = this.config[service as keyof ServiceConfig]
      const canAfford = (
        dailySpend + limits.perRequest <= limits.daily &&
        monthlySpend + limits.perRequest <= limits.monthly &&
        (service !== 'brave_search' || requestsThisMonth < 2000) &&
        (service !== 'tmdb' || requestsToday < 1000)
      )

      // Calculate time to reset (next day at midnight)
      const nextDay = new Date(todayStart)
      nextDay.setDate(nextDay.getDate() + 1)
      const timeToReset = nextDay.getTime() - now.getTime()

      return {
        service,
        dailySpend,
        monthlySpend,
        requestsToday,
        requestsThisMonth,
        canAfford,
        timeToReset
      }
    } catch (error) {
      logger.error('Error getting usage summary', { service, error })
      return {
        service,
        dailySpend: 0,
        monthlySpend: 0,
        requestsToday: 0,
        requestsThisMonth: 0,
        canAfford: false,
        timeToReset: 0
      }
    }
  }

  /**
   * Log API usage with cost tracking
   */
  async logAPIUsage(usage: Omit<APIUsageLog, 'created_at'>): Promise<void> {
    try {
      await this.supabase
        .from('api_usage_log')
        .insert({
          ...usage,
          created_at: new Date().toISOString()
        })

      logger.info('API usage logged', { 
        service: usage.service, 
        operation: usage.operation,
        cost: usage.estimated_cost,
        success: usage.success
      })
    } catch (error) {
      logger.error('Failed to log API usage', { usage, error })
    }
  }

  /**
   * Call Claude API with cost control
   */
  async callClaudeAPI(
    prompt: string, 
    options: {
      userId?: string
      movieId?: string
      operation: string
      model?: string
      maxTokens?: number
    }
  ): Promise<any> {
    const { userId, movieId, operation, model = 'claude-3-haiku-20240307', maxTokens = 500 } = options

    // Check if we can afford this operation
    const canAfford = await this.canAffordOperation('claude', operation)
    if (!canAfford) {
      throw new Error('Claude API budget limit reached')
    }

    const startTime = Date.now()
    let success = false
    let tokensUsed = 0
    let estimatedCost = 0

    try {
      // Make the API call (you'll need to import your anthropic client)
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': process.env.ANTHROPIC_API_KEY!,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model,
          max_tokens: maxTokens,
          messages: [{ role: 'user', content: prompt }]
        })
      })

      if (!response.ok) {
        throw new Error(`Claude API error: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      tokensUsed = (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0)
      estimatedCost = this.calculateClaudeCost(data.usage || {})
      success = true

      // Log successful usage
      await this.logAPIUsage({
        service: 'claude',
        operation,
        tokens_used: tokensUsed,
        requests_count: 1,
        estimated_cost: estimatedCost,
        user_id: userId,
        movie_id: movieId,
        success: true
      })

      return data
    } catch (error) {
      // Log failed usage
      await this.logAPIUsage({
        service: 'claude',
        operation,
        tokens_used: tokensUsed,
        requests_count: 1,
        estimated_cost: estimatedCost,
        user_id: userId,
        movie_id: movieId,
        success: false
      })

      throw error
    }
  }

  /**
   * Call Brave Search API with quota control
   */
  async callBraveSearchAPI(query: string, operation: string): Promise<any> {
    // Check quota (2000 requests/month free)
    const usage = await this.getUsageSummary('brave_search')
    if (usage.requestsThisMonth >= 2000) {
      logger.warn('Brave Search monthly quota exceeded', { 
        requests: usage.requestsThisMonth 
      })
      return null // Graceful degradation
    }

    let success = false

    try {
      const response = await fetch('https://api.search.brave.com/res/v1/web/search', {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'X-Subscription-Token': process.env.BRAVE_API_KEY!
        },
        body: JSON.stringify({
          q: query,
          count: 5,
          freshness: 'pm'
        })
      })

      if (!response.ok) {
        throw new Error(`Brave Search API error: ${response.status}`)
      }

      const data = await response.json()
      success = true

      // Log usage
      await this.logAPIUsage({
        service: 'brave_search',
        operation,
        requests_count: 1,
        estimated_cost: 0, // Free tier
        success: true
      })

      return data
    } catch (error) {
      // Log failed usage
      await this.logAPIUsage({
        service: 'brave_search',
        operation,
        requests_count: 1,
        estimated_cost: 0,
        success: false
      })

      throw error
    }
  }

  /**
   * Call Wikipedia API (always free, just track usage)
   */
  async callWikipediaAPI(topic: string, operation: string): Promise<any> {
    let success = false

    try {
      const encodedTopic = encodeURIComponent(topic)
      const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodedTopic}`

      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'CineAI/1.0 (personal project)'
        }
      })

      if (!response.ok) {
        throw new Error(`Wikipedia API error: ${response.status}`)
      }

      const data = await response.json()
      success = true

      // Log usage (no cost)
      await this.logAPIUsage({
        service: 'wikipedia',
        operation,
        requests_count: 1,
        estimated_cost: 0,
        success: true
      })

      return data
    } catch (error) {
      // Log failed usage
      await this.logAPIUsage({
        service: 'wikipedia',
        operation,
        requests_count: 1,
        estimated_cost: 0,
        success: false
      })

      throw error
    }
  }

  /**
   * Get all service usage summaries
   */
  async getAllUsageSummaries(): Promise<UsageSummary[]> {
    const services: (keyof ServiceConfig)[] = ['claude', 'brave_search', 'wikipedia', 'tmdb']
    
    const summaries = await Promise.all(
      services.map(service => this.getUsageSummary(service))
    )

    return summaries
  }

  /**
   * Get current spending rate and budget warnings
   */
  async getBudgetWarnings(): Promise<Array<{
    service: string
    type: 'warning' | 'danger'
    message: string
    usage: number
    limit: number
  }>> {
    const warnings: Array<{
      service: string
      type: 'warning' | 'danger'
      message: string
      usage: number
      limit: number
    }> = []

    const summaries = await this.getAllUsageSummaries()

    for (const summary of summaries) {
      const limits = this.config[summary.service as keyof ServiceConfig]
      
      // Daily spending warnings
      const dailyRatio = summary.dailySpend / limits.daily
      if (dailyRatio >= 1.0) {
        warnings.push({
          service: summary.service,
          type: 'danger',
          message: 'Daily spending limit exceeded',
          usage: summary.dailySpend,
          limit: limits.daily
        })
      } else if (dailyRatio >= limits.warningThreshold) {
        warnings.push({
          service: summary.service,
          type: 'warning',
          message: 'Approaching daily spending limit',
          usage: summary.dailySpend,
          limit: limits.daily
        })
      }

      // Monthly spending warnings
      const monthlyRatio = summary.monthlySpend / limits.monthly
      if (monthlyRatio >= 1.0) {
        warnings.push({
          service: summary.service,
          type: 'danger',
          message: 'Monthly spending limit exceeded',
          usage: summary.monthlySpend,
          limit: limits.monthly
        })
      } else if (monthlyRatio >= limits.warningThreshold) {
        warnings.push({
          service: summary.service,
          type: 'warning',
          message: 'Approaching monthly spending limit',
          usage: summary.monthlySpend,
          limit: limits.monthly
        })
      }

      // Request-based warnings for free tiers
      if (summary.service === 'brave_search' && summary.requestsThisMonth >= 1800) {
        warnings.push({
          service: summary.service,
          type: 'warning',
          message: 'Approaching Brave Search free tier limit',
          usage: summary.requestsThisMonth,
          limit: 2000
        })
      }

      if (summary.service === 'tmdb' && summary.requestsToday >= 900) {
        warnings.push({
          service: summary.service,
          type: 'warning',
          message: 'Approaching TMDB daily limit',
          usage: summary.requestsToday,
          limit: 1000
        })
      }
    }

    return warnings
  }

  /**
   * Calculate Claude API cost based on usage
   */
  private calculateClaudeCost(usage: { input_tokens?: number; output_tokens?: number }): number {
    // Claude Haiku pricing: $0.25 per 1M input tokens, $1.25 per 1M output tokens
    const inputCost = ((usage.input_tokens || 0) / 1_000_000) * 0.25
    const outputCost = ((usage.output_tokens || 0) / 1_000_000) * 1.25
    return inputCost + outputCost
  }

  /**
   * Update spending limits (for user preferences)
   */
  updateLimits(service: keyof ServiceConfig, newLimits: Partial<CostLimits>): void {
    this.config[service] = { ...this.config[service], ...newLimits }
  }
}

// Singleton instance
let costControlledAPIService: CostControlledAPIService | null = null

export function getCostControlledAPIService(): CostControlledAPIService {
  if (!costControlledAPIService) {
    costControlledAPIService = new CostControlledAPIService()
  }
  return costControlledAPIService
}

export type { APIUsageLog, CostLimits, ServiceConfig, UsageSummary }