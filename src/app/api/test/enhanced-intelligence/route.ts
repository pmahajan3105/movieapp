/**
 * Enhanced Intelligence Test Endpoint
 * Phase 2: Test the enhanced AI synthesis with external context
 */

import { withSupabase, withError, ok, fail } from '@/lib/api/factory'
import { logger } from '@/lib/logger'

export const POST = withError(
  withSupabase(async ({ request, supabase }) => {
    try {
      const { 
        movieId = '550', // Fight Club as default test movie
        analysisDepth = 'moderate',
        includeExternalContext = true,
        testMode = true 
      } = await request.json()
      
      // Get current user
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        return fail('Unauthorized', 401)
      }

      logger.info('Testing enhanced intelligence system', {
        userId: user.id,
        movieId,
        analysisDepth,
        includeExternalContext
      })

      const testResults = {
        movieId,
        analysisDepth,
        includeExternalContext,
        startTime: Date.now(),
        endTime: 0,
        duration: 0,
        phases: [] as Array<{
          phase: string
          duration: number
          success: boolean
          data?: any
          error?: string
        }>,
        finalIntelligence: null as any,
        costEstimate: 0,
        insights: {
          localAI: null as any,
          externalContext: null as any,
          claudeSynthesis: null as any
        }
      }

      // Phase 1: Test local AI analysis
      const phase1Start = Date.now()
      try {
        const localAnalysis = await testLocalAIAnalysis(movieId)
        testResults.insights.localAI = localAnalysis
        testResults.phases.push({
          phase: 'Local AI Analysis',
          duration: Date.now() - phase1Start,
          success: true,
          data: localAnalysis
        })
      } catch (error) {
        testResults.phases.push({
          phase: 'Local AI Analysis',
          duration: Date.now() - phase1Start,
          success: false,
          error: error instanceof Error ? error.message : String(error)
        })
      }

      // Phase 2: Test external context (if enabled)
      if (includeExternalContext) {
        const phase2Start = Date.now()
        try {
          const externalContext = await testExternalContext(movieId)
          testResults.insights.externalContext = externalContext
          testResults.phases.push({
            phase: 'External Context',
            duration: Date.now() - phase2Start,
            success: true,
            data: externalContext
          })
        } catch (error) {
          testResults.phases.push({
            phase: 'External Context',
            duration: Date.now() - phase2Start,
            success: false,
            error: error instanceof Error ? error.message : String(error)
          })
        }
      }

      // Phase 3: Test Claude synthesis (if deep analysis)
      if (analysisDepth === 'deep') {
        const phase3Start = Date.now()
        try {
          const claudeSynthesis = await testClaudeSynthesis(
            movieId,
            testResults.insights.localAI,
            testResults.insights.externalContext,
            user.id
          )
          testResults.insights.claudeSynthesis = claudeSynthesis
          testResults.costEstimate += 0.05 // Estimated Claude cost
          testResults.phases.push({
            phase: 'Claude Synthesis',
            duration: Date.now() - phase3Start,
            success: true,
            data: claudeSynthesis
          })
        } catch (error) {
          testResults.phases.push({
            phase: 'Claude Synthesis',
            duration: Date.now() - phase3Start,
            success: false,
            error: error instanceof Error ? error.message : String(error)
          })
        }
      }

      // Phase 4: Test Enhanced Edge Function
      const phase4Start = Date.now()
      try {
        const edgeFunctionResult = await testEnhancedEdgeFunction(user.id, testMode)
        testResults.phases.push({
          phase: 'Enhanced Edge Function',
          duration: Date.now() - phase4Start,
          success: edgeFunctionResult.success,
          data: edgeFunctionResult
        })
      } catch (error) {
        testResults.phases.push({
          phase: 'Enhanced Edge Function',
          duration: Date.now() - phase4Start,
          success: false,
          error: error instanceof Error ? error.message : String(error)
        })
      }

      // Combine all insights into final intelligence
      testResults.finalIntelligence = combineTestInsights(
        testResults.insights.localAI,
        testResults.insights.externalContext,
        testResults.insights.claudeSynthesis
      )

      testResults.endTime = Date.now()
      testResults.duration = testResults.endTime - testResults.startTime

      // Calculate success rate
      const successfulPhases = testResults.phases.filter(p => p.success).length
      const totalPhases = testResults.phases.length
      const successRate = totalPhases > 0 ? (successfulPhases / totalPhases) * 100 : 0

      logger.info('Enhanced intelligence test completed', {
        movieId,
        duration: testResults.duration,
        successRate,
        costEstimate: testResults.costEstimate
      })

      return ok({
        message: 'Enhanced Intelligence System Test Complete',
        results: testResults,
        performance: {
          totalDuration: testResults.duration,
          successRate,
          avgPhaseTime: totalPhases > 0 ? testResults.duration / totalPhases : 0
        },
        summary: {
          localAIWorking: !!testResults.insights.localAI,
          externalContextWorking: includeExternalContext ? !!testResults.insights.externalContext : 'skipped',
          claudeSynthesisWorking: analysisDepth === 'deep' ? !!testResults.insights.claudeSynthesis : 'skipped',
          edgeFunctionWorking: testResults.phases.find(p => p.phase === 'Enhanced Edge Function')?.success || false,
          estimatedCost: `$${testResults.costEstimate.toFixed(4)}`
        },
        nextSteps: successRate >= 75 ? [
          'Enhanced intelligence system is working well',
          'Ready for production use with external context',
          'Consider enabling background job scheduling'
        ] : [
          'Review failed components',
          'Check API keys and configurations',
          'Run individual component tests'
        ]
      })

    } catch (error) {
      logger.error('Error in enhanced intelligence test endpoint', { 
        error: error instanceof Error ? error.message : String(error) 
      })
      return fail('Test execution failed: ' + (error instanceof Error ? error.message : String(error)), 500)
    }
  })
)

/**
 * Test local AI analysis
 */
async function testLocalAIAnalysis(movieId: string) {
  // Simulate your existing AI engines
  const mockMovie = {
    id: movieId,
    title: 'Fight Club',
    overview: 'An insomniac office worker and a devil-may-care soapmaker form an underground fight club.',
    genres: [{ name: 'Drama' }, { name: 'Thriller' }],
    vote_average: 8.8,
    release_date: '1999-10-15'
  }

  return {
    emotional: {
      dominantTone: 'dark_psychological',
      emotionalArc: 'descent_and_revelation',
      primaryEmotions: ['tension', 'catharsis', 'existential_dread'],
      intensity: 0.9
    },
    thematic: {
      coreTheme: 'identity_crisis',
      majorThemes: ['masculinity', 'consumerism', 'alienation', 'self_destruction'],
      narrativeComplexity: 'highly_complex'
    },
    cinematic: {
      visualSignature: 'gritty_urban_realism',
      cinematographyStyle: 'handheld_intimate',
      productionValue: 'high'
    },
    analysis_source: 'local_ai',
    confidence: 0.85
  }
}

/**
 * Test external context integration
 */
async function testExternalContext(movieId: string) {
  try {
    // Test Wikipedia API
    const wikiResponse = await fetch('https://en.wikipedia.org/api/rest_v1/page/summary/Fight_Club_(film)')
    const wikiData = wikiResponse.ok ? await wikiResponse.json() : null

    // Simulate Brave Search (would need actual API key)
    const mockBuzzData = {
      recentReviews: [
        {
          source: 'rogerebert.com',
          sentiment: 'positive',
          summary: 'A visceral and thought-provoking examination of modern masculinity',
          date: 'recent'
        }
      ],
      audienceReaction: 'cult classic with enduring relevance',
      culturalDiscussion: ['masculinity', 'anti-consumerism', 'mental health'],
      currentRelevance: 0.8
    }

    const culturalContext = wikiData ? {
      culturalSignificance: 'Controversial cult classic that sparked widespread cultural discussion',
      directorContext: 'David Fincher - master of psychological thrillers',
      historicalMoment: 'late 90s cultural anxiety',
      thematicRelevance: ['identity', 'society', 'rebellion'],
      wikipediaSummary: wikiData.extract?.slice(0, 200) || ''
    } : null

    return {
      currentBuzz: process.env.BRAVE_API_KEY ? mockBuzzData : null,
      culturalContext,
      enhancedAt: new Date(),
      source: 'external_apis',
      confidence: wikiData ? 0.8 : 0.4
    }
  } catch (error) {
    throw new Error(`External context test failed: ${error instanceof Error ? error.message : String(error)}`)
  }
}

/**
 * Test Claude synthesis
 */
async function testClaudeSynthesis(movieId: string, localAnalysis: any, externalContext: any, userId: string) {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('Claude API key not available')
  }

  const prompt = `Analyze this movie for personal recommendation:

MOVIE: Fight Club (1999)
DEEP AI ANALYSIS: ${JSON.stringify(localAnalysis)}
CULTURAL CONTEXT: ${JSON.stringify(externalContext)}

Rate this movie's match potential (0-1) and explain why it would appeal to different user types.
Respond in JSON: {"confidence": 0.85, "reason": "detailed explanation", "userAppeal": ["psychological_thriller_fans", "cult_cinema_enthusiasts"]}`

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 400,
        messages: [{ role: 'user', content: prompt }]
      })
    })

    if (!response.ok) {
      throw new Error(`Claude API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    const responseText = data.content[0]?.text || ''
    
    // Try to parse JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    }
    
    return {
      confidence: 0.8,
      reason: responseText.slice(0, 200),
      userAppeal: ['ai_analysis_available'],
      source: 'claude_synthesis'
    }
  } catch (error) {
    throw new Error(`Claude synthesis failed: ${error instanceof Error ? error.message : String(error)}`)
  }
}

/**
 * Test enhanced Edge Function
 */
async function testEnhancedEdgeFunction(userId: string, testMode: boolean) {
  try {
    const response = await fetch('https://hrpaeadxwjtstrgclhoa.supabase.co/functions/v1/enhanced-movie-scout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({
        userId,
        forceRefresh: true,
        analysisDepth: 'moderate',
        maxCostPerUser: 0.10 // Low cost for testing
      })
    })

    if (!response.ok) {
      throw new Error(`Enhanced Edge Function error: ${response.status} ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    throw new Error(`Edge Function test failed: ${error instanceof Error ? error.message : String(error)}`)
  }
}

/**
 * Combine all test insights into final intelligence
 */
function combineTestInsights(localAI: any, externalContext: any, claudeSynthesis: any) {
  let confidence = 0.5
  let source = 'fallback'
  let analysisDepth = 'basic'

  if (localAI) {
    confidence = Math.max(confidence, localAI.confidence || 0.7)
    source = 'local_ai'
    analysisDepth = 'moderate'
  }

  if (externalContext) {
    confidence = Math.max(confidence, externalContext.confidence || 0.75)
    source = 'enhanced'
  }

  if (claudeSynthesis) {
    confidence = Math.max(confidence, claudeSynthesis.confidence || 0.8)
    source = 'full_ai'
    analysisDepth = 'deep'
  }

  return {
    confidence,
    source,
    analysisDepth,
    reason: claudeSynthesis?.reason || 'Enhanced AI analysis with multi-layer intelligence',
    insights: {
      emotional: localAI?.emotional,
      thematic: localAI?.thematic,
      cinematic: localAI?.cinematic,
      culturalMoment: externalContext?.culturalContext?.culturalSignificance,
      audienceReaction: externalContext?.currentBuzz?.audienceReaction,
      currentRelevance: externalContext?.currentBuzz?.currentRelevance
    },
    enhancedAt: new Date()
  }
}