import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server-client'
import { PerformanceMonitor } from '@/lib/utils/performance-monitor'

export async function GET() {
  try {
    const startTime = Date.now()
    const supabase = await createServerClient()
    const monitor = PerformanceMonitor.getInstance()

    // Check database connection
    const { data: healthCheck, error: dbError } = await supabase
      .from('movies')
      .select('count')
      .limit(1)
      .single()

    if (dbError) {
      throw new Error(`Database health check failed: ${dbError.message}`)
    }

    // Get performance stats
    const performanceStats = monitor.getStats()

    // System performance metrics
    const responseTime = Date.now() - startTime

    const healthData = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.2.0',
      environment: process.env.NODE_ENV,
      services: {
        database: {
          status: 'healthy',
          responseTimeMs: responseTime,
          movieCount: healthCheck?.count || 0,
        },
        cache: {
          status: 'operational',
          stats: performanceStats.cache,
        },
        ai: {
          anthropic: process.env.ANTHROPIC_API_KEY ? 'configured' : 'not configured',
        },
      },
      performance: {
        responseTimeMs: responseTime,
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        queries: performanceStats.queries,
      },
    }

    return NextResponse.json(healthData)
  } catch (error) {
    console.error('Health check failed:', error)

    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
        services: {
          database: { status: 'error' },
          cache: { status: 'unknown' },
          ai: { status: 'unknown' },
        },
      },
      { status: 503 }
    )
  }
}
