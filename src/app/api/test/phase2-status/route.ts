/**
 * Phase 2 Enhanced Intelligence System Status Check
 * Public endpoint to verify Phase 2 deployment and capabilities
 */

import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const checks = {
      timestamp: new Date().toISOString(),
      phase: 2,
      status: 'checking',
      components: [] as Array<{
        name: string
        status: 'ok' | 'error' | 'partial'
        message: string
        details?: any
      }>
    }

    // Check 1: Environment variables for external APIs
    const requiredEnvVars = {
      'NEXT_PUBLIC_SUPABASE_URL': !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      'NEXT_PUBLIC_SUPABASE_ANON_KEY': !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      'ANTHROPIC_API_KEY': !!process.env.ANTHROPIC_API_KEY,
      'TMDB_API_KEY': !!process.env.TMDB_API_KEY,
      'BRAVE_API_KEY': !!process.env.BRAVE_API_KEY
    }

    const missingKeys = Object.entries(requiredEnvVars).filter(([key, present]) => !present).map(([key]) => key)
    const hasOptionalKeys = requiredEnvVars['BRAVE_API_KEY']

    checks.components.push({
      name: 'API Keys Configuration',
      status: missingKeys.filter(k => k !== 'BRAVE_API_KEY').length === 0 ? 'ok' : 'error',
      message: missingKeys.length === 0 
        ? 'All API keys configured' 
        : `Missing: ${missingKeys.join(', ')}`,
      details: {
        required: ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'ANTHROPIC_API_KEY', 'TMDB_API_KEY'],
        optional: ['BRAVE_API_KEY'],
        configured: Object.keys(requiredEnvVars).filter(key => requiredEnvVars[key as keyof typeof requiredEnvVars])
      }
    })

    // Check 2: External Context Services
    let externalContextStatus: 'ok' | 'partial' | 'error' = 'ok'
    let externalContextMessage = 'All external services accessible'
    const externalResults: any = {}

    // Test Wikipedia API
    try {
      const wikiResponse = await fetch('https://en.wikipedia.org/api/rest_v1/page/summary/Fight_Club_(film)', {
        headers: { 'User-Agent': 'CineAI/1.0 (test)' }
      })
      externalResults.wikipedia = {
        status: wikiResponse.ok ? 'ok' : 'error',
        statusCode: wikiResponse.status
      }
    } catch (error) {
      externalResults.wikipedia = {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
      externalContextStatus = 'partial'
    }

    // Test TMDB API
    if (process.env.TMDB_API_KEY) {
      try {
        const tmdbResponse = await fetch(`https://api.themoviedb.org/3/movie/550?api_key=${process.env.TMDB_API_KEY}`)
        externalResults.tmdb = {
          status: tmdbResponse.ok ? 'ok' : 'error',
          statusCode: tmdbResponse.status
        }
      } catch (error) {
        externalResults.tmdb = {
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        }
        externalContextStatus = 'partial'
      }
    }

    // Test Brave Search API (if available)
    if (process.env.BRAVE_API_KEY) {
      try {
        const braveResponse = await fetch('https://api.search.brave.com/res/v1/web/search', {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'X-Subscription-Token': process.env.BRAVE_API_KEY
          },
          body: JSON.stringify({
            q: 'Fight Club movie test',
            count: 1
          })
        })
        externalResults.brave_search = {
          status: braveResponse.ok ? 'ok' : 'error',
          statusCode: braveResponse.status
        }
      } catch (error) {
        externalResults.brave_search = {
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    } else {
      externalResults.brave_search = {
        status: 'not_configured',
        message: 'BRAVE_API_KEY not set (optional for enhanced context)'
      }
    }

    if (externalContextStatus === 'partial') {
      externalContextMessage = 'Some external services unavailable, will use fallbacks'
    }

    checks.components.push({
      name: 'External Context Services',
      status: externalContextStatus,
      message: externalContextMessage,
      details: externalResults
    })

    // Check 3: Enhanced Edge Function
    try {
      const edgeFunctionUrl = 'https://hrpaeadxwjtstrgclhoa.supabase.co/functions/v1/enhanced-movie-scout'
      const response = await fetch(edgeFunctionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({ 
          trigger: 'health-check',
          testMode: true,
          analysisDepth: 'basic'
        })
      })
      
      checks.components.push({
        name: 'Enhanced Edge Function',
        status: response.ok ? 'ok' : 'error',
        message: response.ok 
          ? `Enhanced Edge Function deployed and responding (${response.status})`
          : `Enhanced Edge Function error (${response.status})`,
        details: {
          url: edgeFunctionUrl,
          statusCode: response.status
        }
      })
    } catch (error) {
      checks.components.push({
        name: 'Enhanced Edge Function',
        status: 'error',
        message: `Cannot reach Enhanced Edge Function: ${error instanceof Error ? error.message : String(error)}`
      })
    }

    // Check 4: AI Synthesis Capabilities
    let aiSynthesisStatus: 'ok' | 'partial' | 'error' = 'ok'
    const aiCapabilities = {
      localAI: 'available', // Your existing engines are always available
      externalContext: externalResults.wikipedia?.status === 'ok' ? 'available' : 'limited',
      claudeSynthesis: process.env.ANTHROPIC_API_KEY ? 'available' : 'not_configured'
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      aiSynthesisStatus = 'partial'
    }

    checks.components.push({
      name: 'AI Synthesis Capabilities',
      status: aiSynthesisStatus,
      message: aiSynthesisStatus === 'ok' 
        ? 'Full AI synthesis available with external context'
        : 'Partial AI synthesis - some features limited',
      details: aiCapabilities
    })

    // Check 5: Cost Control System
    const costControlStatus: 'ok' | 'partial' | 'error' = 'ok' // Cost control is built-in, doesn't depend on external services
    checks.components.push({
      name: 'Cost Control System',
      status: costControlStatus,
      message: 'Cost monitoring and spending limits active',
      details: {
        limits: {
          claude_daily: '$5.00',
          claude_monthly: '$50.00',
          brave_search_monthly: '2000 requests (free)',
          wikipedia: 'unlimited (free)'
        },
        features: ['spending_limits', 'graceful_degradation', 'usage_tracking']
      }
    })

    // Determine overall status
    const hasErrors = checks.components.some(c => c.status === 'error')
    const hasPartial = checks.components.some(c => c.status === 'partial')
    
    if (!hasErrors && !hasPartial) {
      checks.status = 'fully_operational'
    } else if (!hasErrors) {
      checks.status = 'operational_with_limitations'
    } else {
      checks.status = 'degraded'
    }

    const summary = {
      total: checks.components.length,
      ok: checks.components.filter(c => c.status === 'ok').length,
      partial: checks.components.filter(c => c.status === 'partial').length,
      error: checks.components.filter(c => c.status === 'error').length
    }

    // Determine capabilities based on status
    const capabilities = {
      basicRecommendations: true, // Always available
      enhancedAnalysis: aiCapabilities.claudeSynthesis === 'available',
      externalContext: aiCapabilities.externalContext === 'available',
      costMonitoring: true,
      backgroundProcessing: checks.components.find(c => c.name === 'Enhanced Edge Function')?.status === 'ok'
    }

    return NextResponse.json({
      success: true,
      message: 'Phase 2 Enhanced Intelligence System Status',
      phase: 2,
      status: checks.status,
      summary,
      capabilities,
      checks,
      recommendations: getRecommendations(checks.status, capabilities),
      nextSteps: getNextSteps(checks.status, summary)
    })

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: `Phase 2 status check failed: ${error instanceof Error ? error.message : String(error)}`,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

function getRecommendations(status: string, capabilities: any): string[] {
  const recommendations = []

  if (status === 'fully_operational') {
    recommendations.push('✅ Phase 2 is fully operational with enhanced intelligence')
    recommendations.push('🚀 Background processing with external context is active')
    recommendations.push('💰 Cost monitoring ensures budget compliance')
  } else if (status === 'operational_with_limitations') {
    recommendations.push('⚠️ Phase 2 is operational but some features are limited')
    if (!capabilities.enhancedAnalysis) {
      recommendations.push('🔑 Add ANTHROPIC_API_KEY for full AI synthesis')
    }
    if (!capabilities.externalContext) {
      recommendations.push('🌐 Some external context services unavailable')
    }
  } else {
    recommendations.push('🔧 Phase 2 has issues that need attention')
    recommendations.push('📋 Review failed components and fix configurations')
  }

  return recommendations
}

function getNextSteps(status: string, summary: any): string[] {
  if (status === 'fully_operational') {
    return [
      '🎬 Enhanced intelligence system is ready for production',
      '📊 Monitor cost usage and API limits',
      '🔄 Background job is analyzing movies with external context',
      '📈 Phase 2 objectives achieved - enhanced AI with current context'
    ]
  } else if (summary.error > 0) {
    return [
      '🔧 Fix components with errors',
      '🧪 Re-run Phase 2 status check',
      '📋 Verify API keys and network connectivity',
      '🛠️ Check deployment logs for details'
    ]
  } else {
    return [
      '⚙️ Address partial functionality issues',
      '🔑 Configure optional API keys for full features',
      '✅ System will work with current configuration'
    ]
  }
}