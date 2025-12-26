import { NextResponse } from 'next/server'
import { databaseExists, getDatabasePath } from '@/lib/db'
import { ConfigService } from '@/lib/config/config-service'
import { applyRateLimit, rateLimiters } from '@/lib/utils/rate-limiter'

/**
 * Health Check API Endpoint
 *
 * Returns the overall system status including:
 * - Local database status
 * - Configuration status
 * - API key presence (not values)
 * - Timestamp and version info
 */

export async function GET(request: Request) {
  const startTime = Date.now()

  try {
    // Apply rate limiting
    const rateLimitResponse = await applyRateLimit(request, rateLimiters.health)
    if (rateLimitResponse) {
      return rateLimitResponse
    }

    // Initialize response object
    const healthCheck = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '2.0.0',
      architecture: 'local-first',
      checks: {} as Record<string, string>,
      responseTime: 0
    }

    // Check local database
    try {
      const dbExists = databaseExists()
      if (dbExists) {
        healthCheck.checks.database = '✅ SQLite database exists'
        healthCheck.checks.database_path = getDatabasePath()
      } else {
        healthCheck.checks.database = '⚠️ Database will be created on first use'
      }
    } catch (error) {
      healthCheck.checks.database = '❌ Database error'
      healthCheck.status = 'unhealthy'
    }

    // Check configuration
    try {
      const configExists = ConfigService.configExists()
      const setupCompleted = ConfigService.isSetupCompleted()

      if (setupCompleted) {
        healthCheck.checks.config = '✅ Setup completed'
      } else if (configExists) {
        healthCheck.checks.config = '⚠️ Config exists but setup not completed'
      } else {
        healthCheck.checks.config = '⚠️ No config - run setup at /setup'
      }
    } catch (error) {
      healthCheck.checks.config = '❌ Config error'
    }

    // Check API keys
    const apiKeys = ConfigService.getApiKeys()

    // TMDB (required for movie data)
    if (apiKeys.tmdb) {
      healthCheck.checks.tmdb_api = '✅ configured'
    } else if (process.env.TMDB_API_KEY) {
      healthCheck.checks.tmdb_api = '✅ configured (env)'
    } else {
      healthCheck.checks.tmdb_api = '❌ not configured'
      healthCheck.status = 'degraded'
    }

    // OpenAI (optional)
    if (apiKeys.openai) {
      healthCheck.checks.openai_api = '✅ configured'
    } else if (process.env.OPENAI_API_KEY) {
      healthCheck.checks.openai_api = '✅ configured (env)'
    } else {
      healthCheck.checks.openai_api = '⚠️ not configured (AI features limited)'
    }

    // Anthropic (optional)
    if (apiKeys.anthropic) {
      healthCheck.checks.anthropic_api = '✅ configured'
    } else if (process.env.ANTHROPIC_API_KEY) {
      healthCheck.checks.anthropic_api = '✅ configured (env)'
    } else {
      healthCheck.checks.anthropic_api = '⚠️ not configured (AI features limited)'
    }

    // Check if at least one AI provider is available
    const hasAI = apiKeys.openai || apiKeys.anthropic ||
                  process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY
    healthCheck.checks.ai_available = hasAI ? '✅ at least one AI provider' : '⚠️ no AI provider'

    // Environment info
    healthCheck.checks.environment = process.env.NODE_ENV === 'development' ? '✅ development' : '✅ production'
    healthCheck.checks.data_directory = ConfigService.getDataDirectory()

    // Calculate response time
    healthCheck.responseTime = Date.now() - startTime

    // Determine overall status
    const criticalFailed = Object.values(healthCheck.checks).filter(check =>
      check.includes('❌') && !check.includes('not configured')
    ).length

    if (criticalFailed > 0) {
      healthCheck.status = 'unhealthy'
    }

    // Return appropriate status code
    const statusCode = healthCheck.status === 'healthy' ? 200 :
                       healthCheck.status === 'degraded' ? 200 : 503

    return NextResponse.json(healthCheck, { status: statusCode })

  } catch (error) {
    // Global error handler
    const errorResponse = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      version: '2.0.0',
      architecture: 'local-first',
      error: 'Health check failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      responseTime: Date.now() - startTime
    }

    return NextResponse.json(errorResponse, { status: 503 })
  }
}
