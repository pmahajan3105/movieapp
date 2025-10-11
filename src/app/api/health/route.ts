import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server-client'
import { applyRateLimit, rateLimiters } from '@/lib/utils/rate-limiter'

/**
 * Health Check API Endpoint
 * 
 * Returns the overall system status including:
 * - Supabase connection status
 * - Database migration status  
 * - API key presence (not values)
 * - Required environment variables check
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
      checks: {} as Record<string, string>,
      responseTime: 0
    }

    // Check Supabase connection
    try {
      const supabase = await createServerClient()
      const { data, error } = await supabase
        .from('user_profiles')
        .select('count')
        .limit(1)
      
      if (error) {
        healthCheck.checks.supabase = '❌ connection failed'
        healthCheck.status = 'unhealthy'
      } else {
        healthCheck.checks.supabase = '✅ connected'
      }
    } catch (error) {
      healthCheck.checks.supabase = '❌ connection error'
      healthCheck.status = 'unhealthy'
    }

    // Check database migrations
    try {
      const supabase = await createServerClient()
      const { data, error } = await supabase
        .from('movies')
        .select('count')
        .limit(1)
      
      if (error) {
        healthCheck.checks.database = '❌ migrations not applied'
        healthCheck.status = 'unhealthy'
      } else {
        healthCheck.checks.database = '✅ migrations applied'
      }
    } catch (error) {
      healthCheck.checks.database = '❌ database error'
      healthCheck.status = 'unhealthy'
    }

    // Check environment variables
    const requiredEnvVars = [
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      'OPENAI_API_KEY',
      'ANTHROPIC_API_KEY',
      'TMDB_API_KEY'
    ]

    let envVarsValid = true
    for (const envVar of requiredEnvVars) {
      const value = process.env[envVar]
      if (!value || value.includes('your_') || value.includes('_here')) {
        healthCheck.checks[envVar.toLowerCase()] = '❌ not configured'
        envVarsValid = false
        healthCheck.status = 'unhealthy'
      } else {
        healthCheck.checks[envVar.toLowerCase()] = '✅ configured'
      }
    }

    // Check API key formats (basic validation)
    if (process.env.OPENAI_API_KEY && !process.env.OPENAI_API_KEY.startsWith('sk-')) {
      healthCheck.checks.openai_format = '⚠️ invalid format'
    } else if (process.env.OPENAI_API_KEY) {
      healthCheck.checks.openai_format = '✅ valid format'
    }

    if (process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_API_KEY.startsWith('sk-ant-')) {
      healthCheck.checks.anthropic_format = '⚠️ invalid format'
    } else if (process.env.ANTHROPIC_API_KEY) {
      healthCheck.checks.anthropic_format = '✅ valid format'
    }

    // Check if app is running in development mode
    healthCheck.checks.environment = process.env.NODE_ENV === 'development' ? '✅ development' : '✅ production'
    
    // Check single user mode
    const singleUserMode = process.env.SINGLE_USER_MODE === 'true'
    healthCheck.checks.single_user_mode = singleUserMode ? '✅ enabled (frictionless)' : '✅ disabled (auth required)'

    // Calculate response time
    healthCheck.responseTime = Date.now() - startTime

    // Determine overall status
    const failedChecks = Object.values(healthCheck.checks).filter(check => check.includes('❌')).length
    if (failedChecks > 0) {
      healthCheck.status = 'unhealthy'
    }

    // Return appropriate status code
    const statusCode = healthCheck.status === 'healthy' ? 200 : 503

    return NextResponse.json(healthCheck, { status: statusCode })

  } catch (error) {
    // Global error handler
    const errorResponse = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      version: '2.0.0',
      error: 'Health check failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      responseTime: Date.now() - startTime
    }

    return NextResponse.json(errorResponse, { status: 503 })
  }
}
