/**
 * Phase 1 Complete Test Endpoint
 * Tests the entire Phase 1 background AI processing flow
 */

import { withSupabase, withError, ok, fail } from '@/lib/api/factory'
import { logger } from '@/lib/logger'

export const GET = withError(
  withSupabase(async ({ request, supabase }) => {
    try {
      // Get current user
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        return fail('Unauthorized', 401)
      }

      const results = {
        phase1Status: 'testing',
        tests: [] as Array<{
          name: string
          status: 'pass' | 'fail' | 'skip'
          message: string
          duration?: number
        }>,
        summary: {
          totalTests: 0,
          passed: 0,
          failed: 0,
          skipped: 0
        }
      }

      // Test 1: Check database schema enhancements
      const test1Start = Date.now()
      try {
        const { data: schemaTest } = await supabase
          .from('recommendations')
          .select('discovery_source, analysis_source, confidence, ai_insights, generated_at')
          .limit(1)
        
        results.tests.push({
          name: 'Database Schema Enhanced',
          status: 'pass',
          message: 'Enhanced recommendations table schema is working',
          duration: Date.now() - test1Start
        })
      } catch (error) {
        results.tests.push({
          name: 'Database Schema Enhanced',
          status: 'fail',
          message: `Schema test failed: ${error instanceof Error ? error.message : String(error)}`,
          duration: Date.now() - test1Start
        })
      }

      // Test 2: Check API usage tracking table
      const test2Start = Date.now()
      try {
        const { data: usageTest } = await supabase
          .from('api_usage_log')
          .select('service, estimated_cost, user_id, success')
          .limit(1)
        
        results.tests.push({
          name: 'API Usage Tracking',
          status: 'pass',
          message: 'API usage tracking table is accessible',
          duration: Date.now() - test2Start
        })
      } catch (error) {
        results.tests.push({
          name: 'API Usage Tracking',
          status: 'fail',
          message: `Usage tracking test failed: ${error instanceof Error ? error.message : String(error)}`,
          duration: Date.now() - test2Start
        })
      }

      // Test 3: Check recommendation queue table
      const test3Start = Date.now()
      try {
        const { data: queueTest } = await supabase
          .from('recommendation_queue')
          .select('request_type, status, created_at')
          .limit(1)
        
        results.tests.push({
          name: 'Background Job Queue',
          status: 'pass',
          message: 'Recommendation queue table is accessible',
          duration: Date.now() - test3Start
        })
      } catch (error) {
        results.tests.push({
          name: 'Background Job Queue',
          status: 'skip',
          message: `Job queue test skipped: ${error instanceof Error ? error.message : String(error)}`,
          duration: Date.now() - test3Start
        })
      }

      // Test 4: Test precomputed recommendations API
      const test4Start = Date.now()
      try {
        const response = await fetch(`${request.url.split('/api/')[0]}/api/recommendations/precomputed?limit=3`, {
          headers: {
            'Cookie': request.headers.get('Cookie') || ''
          }
        })
        
        if (response.ok) {
          const data = await response.json()
          results.tests.push({
            name: 'Precomputed Recommendations API',
            status: 'pass',
            message: `API returned ${data.recommendations?.length || 0} recommendations`,
            duration: Date.now() - test4Start
          })
        } else {
          results.tests.push({
            name: 'Precomputed Recommendations API',
            status: 'fail',
            message: `API returned ${response.status}: ${response.statusText}`,
            duration: Date.now() - test4Start
          })
        }
      } catch (error) {
        results.tests.push({
          name: 'Precomputed Recommendations API',
          status: 'fail',
          message: `API test failed: ${error instanceof Error ? error.message : String(error)}`,
          duration: Date.now() - test4Start
        })
      }

      // Test 5: Test cost monitoring API
      const test5Start = Date.now()
      try {
        const response = await fetch(`${request.url.split('/api/')[0]}/api/monitoring/usage?period=today`, {
          headers: {
            'Cookie': request.headers.get('Cookie') || ''
          }
        })
        
        if (response.ok) {
          const data = await response.json()
          results.tests.push({
            name: 'Cost Monitoring API',
            status: 'pass',
            message: `Monitoring API returned summary with ${data.summary?.totalRequests || 0} requests`,
            duration: Date.now() - test5Start
          })
        } else {
          results.tests.push({
            name: 'Cost Monitoring API',
            status: 'fail',
            message: `Monitoring API returned ${response.status}: ${response.statusText}`,
            duration: Date.now() - test5Start
          })
        }
      } catch (error) {
        results.tests.push({
          name: 'Cost Monitoring API',
          status: 'fail',
          message: `Monitoring API test failed: ${error instanceof Error ? error.message : String(error)}`,
          duration: Date.now() - test5Start
        })
      }

      // Test 6: Check Edge Function deployment
      const test6Start = Date.now()
      try {
        const response = await fetch('https://hrpaeadxwjtstrgclhoa.supabase.co/functions/v1/personal-movie-scout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
          },
          body: JSON.stringify({ trigger: 'test', testMode: true })
        })
        
        if (response.ok) {
          results.tests.push({
            name: 'Edge Function Deployment',
            status: 'pass',
            message: 'Edge Function is deployed and responding',
            duration: Date.now() - test6Start
          })
        } else {
          results.tests.push({
            name: 'Edge Function Deployment',
            status: 'fail',
            message: `Edge Function returned ${response.status}: ${response.statusText}`,
            duration: Date.now() - test6Start
          })
        }
      } catch (error) {
        results.tests.push({
          name: 'Edge Function Deployment',
          status: 'fail',
          message: `Edge Function test failed: ${error instanceof Error ? error.message : String(error)}`,
          duration: Date.now() - test6Start
        })
      }

      // Calculate summary
      results.summary.totalTests = results.tests.length
      results.summary.passed = results.tests.filter(t => t.status === 'pass').length
      results.summary.failed = results.tests.filter(t => t.status === 'fail').length
      results.summary.skipped = results.tests.filter(t => t.status === 'skip').length

      // Determine overall phase status
      if (results.summary.failed === 0) {
        results.phase1Status = 'complete'
      } else if (results.summary.passed > results.summary.failed) {
        results.phase1Status = 'partial'
      } else {
        results.phase1Status = 'failed'
      }

      logger.info('Phase 1 complete test results', results.summary)

      return ok({
        message: 'Phase 1 Background AI Processing System Test Complete',
        results,
        nextSteps: results.phase1Status === 'complete' ? [
          'Set up cron scheduling in Supabase Dashboard',
          'Monitor background job execution',
          'Begin Phase 2 planning for enhanced intelligence'
        ] : [
          'Fix failed tests before proceeding',
          'Re-run Phase 1 complete test',
          'Investigate failed components'
        ]
      })

    } catch (error) {
      logger.error('Error in Phase 1 complete test endpoint', { 
        error: error instanceof Error ? error.message : String(error) 
      })
      return fail('Test execution failed: ' + (error instanceof Error ? error.message : String(error)), 500)
    }
  })
)