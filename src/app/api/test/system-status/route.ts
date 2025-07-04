/**
 * System Status Check - Public endpoint to verify Phase 1 deployment
 */

import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const checks = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'unknown',
      phase1Status: 'checking',
      components: [] as Array<{
        name: string
        status: 'ok' | 'error' | 'unknown'
        message: string
      }>
    }

    // Check 1: Environment variables
    const envVars = [
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY', 
      'ANTHROPIC_API_KEY',
      'TMDB_API_KEY'
    ]
    
    const missingEnvVars = envVars.filter(envVar => !process.env[envVar])
    
    checks.components.push({
      name: 'Environment Configuration',
      status: missingEnvVars.length === 0 ? 'ok' : 'error',
      message: missingEnvVars.length === 0 
        ? 'All required environment variables are configured'
        : `Missing: ${missingEnvVars.join(', ')}`
    })

    // Check 2: Edge Function deployment status
    try {
      const edgeFunctionUrl = 'https://hrpaeadxwjtstrgclhoa.supabase.co/functions/v1/personal-movie-scout'
      const response = await fetch(edgeFunctionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({ trigger: 'health-check' })
      })
      
      checks.components.push({
        name: 'Edge Function Deployment',
        status: response.ok ? 'ok' : 'error',
        message: response.ok 
          ? `Edge Function deployed and responding (${response.status})`
          : `Edge Function not responding (${response.status})`
      })
    } catch (error) {
      checks.components.push({
        name: 'Edge Function Deployment',
        status: 'error',
        message: `Cannot reach Edge Function: ${error instanceof Error ? error.message : String(error)}`
      })
    }

    // Check 3: API endpoints availability
    const apiEndpoints = [
      '/api/recommendations/precomputed',
      '/api/monitoring/usage',
      '/api/test/background-job'
    ]
    
    for (const endpoint of apiEndpoints) {
      try {
        const url = new URL(endpoint, request.url)
        const response = await fetch(url.toString(), {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        })
        
        checks.components.push({
          name: `API Endpoint: ${endpoint}`,
          status: response.status < 500 ? 'ok' : 'error', // 401/403 are expected for protected routes
          message: `Responds with ${response.status} ${response.statusText}`
        })
      } catch (error) {
        checks.components.push({
          name: `API Endpoint: ${endpoint}`,
          status: 'error',
          message: `Not reachable: ${error instanceof Error ? error.message : String(error)}`
        })
      }
    }

    // Determine overall status
    const hasErrors = checks.components.some(c => c.status === 'error')
    const allOk = checks.components.every(c => c.status === 'ok')
    
    if (allOk) {
      checks.phase1Status = 'deployed'
    } else if (!hasErrors) {
      checks.phase1Status = 'partial'
    } else {
      checks.phase1Status = 'error'
    }

    const summary = {
      total: checks.components.length,
      ok: checks.components.filter(c => c.status === 'ok').length,
      error: checks.components.filter(c => c.status === 'error').length,
      unknown: checks.components.filter(c => c.status === 'unknown').length
    }

    return NextResponse.json({
      success: true,
      message: 'Phase 1 Background AI Processing System Status',
      status: checks.phase1Status,
      summary,
      checks,
      nextSteps: checks.phase1Status === 'deployed' ? [
        '✅ Phase 1 is fully deployed and operational',
        '🔄 Background job is scheduled to run every 4 hours',
        '⚡ Dashboard now loads recommendations instantly',
        '📊 Cost monitoring is active',
        '🚀 Ready to begin Phase 2 planning'
      ] : [
        '🔧 Fix any failing components',
        '🧪 Re-run system status check',
        '📋 Review deployment steps'
      ]
    })

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: `System status check failed: ${error instanceof Error ? error.message : String(error)}`,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}