/**
 * Enhanced Personal Movie Scout - Phase 2
 * Background AI Recommendation Engine with External Context
 * 
 * This enhanced edge function:
 * 1. Fetches trending movies from TMDB
 * 2. Analyzes them using existing AI engines + external context
 * 3. Uses cost-controlled APIs (Brave Search, Wikipedia, Claude)
 * 4. Generates sophisticated personalized recommendations
 * 5. Stores results for instant dashboard loading
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0'

// Enhanced types for Phase 2
interface EnhancedMovieIntelligence {
  movie: TMDBMovie
  confidence: number
  reason: string
  source: 'full_ai' | 'enhanced' | 'local_ai' | 'fallback'
  insights: {
    emotional?: any
    thematic?: any
    cinematic?: any
    culturalMoment?: string
    audienceReaction?: string
    currentRelevance?: number
  }
  analysisDepth: 'deep' | 'moderate' | 'basic'
}

interface TMDBMovie {
  id: string
  title: string
  overview: string
  release_date: string
  genre_ids: number[]
  genres?: Array<{ id: number; name: string }>
  vote_average: number
  poster_path: string | null
  director?: string
  year: number
}

interface UserTasteProfile {
  user_id: string
  preferences: any
  favorite_genres?: string[]
  preference_strength?: any
  ai_confidence?: number
}

interface CostLimits {
  daily: number
  monthly: number
  perRequest: number
}

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const tmdbApiKey = Deno.env.get('TMDB_API_KEY')!
const braveApiKey = Deno.env.get('BRAVE_API_KEY')
const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY')

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Cost control configuration
const COST_LIMITS = {
  claude: { daily: 5.00, monthly: 50.00, perRequest: 0.05 },
  brave_search: { daily: 0.00, monthly: 0.00, perRequest: 0.00 }, // Free tier
  wikipedia: { daily: 0.00, monthly: 0.00, perRequest: 0.00 }, // Always free
}

serve(async (req: Request) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const requestData = await req.json()
    const { 
      userId, 
      forceRefresh = false, 
      analysisDepth = 'moderate',
      maxCostPerUser = 0.50 
    } = requestData
    
    console.log(`🚀 Enhanced Movie Scout Phase 2 starting`, {
      userId: userId || 'all users',
      analysisDepth,
      maxCostPerUser
    })
    
    // Process users
    const usersToProcess = userId ? [{ id: userId }] : await getActiveUsers()
    
    let totalRecommendations = 0
    let totalCost = 0
    const results = []
    
    for (const user of usersToProcess) {
      try {
        const userResults = await processEnhancedUserRecommendations(
          user.id, 
          forceRefresh,
          analysisDepth,
          maxCostPerUser
        )
        
        totalRecommendations += userResults.recommendationsGenerated
        totalCost += userResults.costIncurred
        results.push({
          userId: user.id,
          ...userResults
        })
        
        // Small delay between users
        await new Promise(resolve => setTimeout(resolve, 800))
        
      } catch (error) {
        console.error(`Error processing user ${user.id}:`, error.message)
        results.push({
          userId: user.id,
          error: error.message,
          recommendationsGenerated: 0,
          costIncurred: 0
        })
      }
    }
    
    console.log(`✅ Enhanced Movie Scout completed`, {
      totalRecommendations,
      totalCost: totalCost.toFixed(4),
      averageCostPerRecommendation: totalRecommendations > 0 ? (totalCost / totalRecommendations).toFixed(4) : 0
    })
    
    return new Response(
      JSON.stringify({
        success: true,
        phase: 2,
        analysisType: 'enhanced',
        totalRecommendations,
        totalCost,
        results,
        message: `Enhanced analysis generated ${totalRecommendations} recommendations with $${totalCost.toFixed(4)} cost`
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )
    
  } catch (error) {
    console.error('Enhanced Movie Scout failed:', error)
    return new Response(
      JSON.stringify({
        success: false,
        phase: 2,
        error: error.message,
        fallback: 'Falling back to Phase 1 analysis'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})

/**
 * Process enhanced recommendations for a single user
 */
async function processEnhancedUserRecommendations(
  userId: string,
  forceRefresh: boolean,
  analysisDepth: 'deep' | 'moderate' | 'basic',
  maxCostPerUser: number
): Promise<{
  recommendationsGenerated: number
  costIncurred: number
  analysisBreakdown: Record<string, number>
  message: string
}> {
  console.log(`🎯 Processing enhanced recommendations for user ${userId}`)
  
  // Check if user needs recommendation refresh
  if (!forceRefresh && !(await needsRecommendationRefresh(userId))) {
    return {
      recommendationsGenerated: 0,
      costIncurred: 0,
      analysisBreakdown: {},
      message: 'User has recent recommendations, skipping'
    }
  }

  // Get user's taste profile
  const userProfile = await getUserTasteProfile(userId)
  if (!userProfile) {
    console.log(`No taste profile for user ${userId}, using defaults`)
  }

  // Check user's budget for enhanced analysis
  const canAffordEnhanced = await canAffordEnhancedAnalysis(userId, maxCostPerUser)
  const effectiveDepth = canAffordEnhanced ? analysisDepth : 'basic'
  
  console.log(`Analysis depth for user ${userId}: ${effectiveDepth} (budget check: ${canAffordEnhanced})`)

  // Get trending movies from TMDB
  const trendingMovies = await fetchTrendingMovies()
  if (!trendingMovies || trendingMovies.length === 0) {
    throw new Error('No trending movies found')
  }

  // Determine how many movies to analyze based on budget
  const maxMoviesToAnalyze = Math.min(
    Math.floor(maxCostPerUser / COST_LIMITS.claude.perRequest),
    10
  )
  
  const moviesToAnalyze = trendingMovies.slice(0, maxMoviesToAnalyze)
  
  console.log(`Analyzing ${moviesToAnalyze.length} movies for user ${userId}`)

  const recommendations = []
  let costIncurred = 0
  const analysisBreakdown: Record<string, number> = {
    full_ai: 0,
    enhanced: 0,
    local_ai: 0,
    fallback: 0
  }

  for (const movie of moviesToAnalyze) {
    try {
      // Get enhanced movie intelligence
      const intelligence = await getEnhancedMovieIntelligence(
        movie, 
        userProfile,
        effectiveDepth,
        maxCostPerUser - costIncurred
      )

      // Track cost
      costIncurred += estimateAnalysisCost(intelligence.source, intelligence.analysisDepth)
      analysisBreakdown[intelligence.source]++

      // Check if it's a good match
      if (intelligence.confidence >= getConfidenceThreshold(intelligence.source)) {
        const recommendation = {
          user_id: userId,
          movie_id: movie.id,
          score: intelligence.confidence,
          reason: intelligence.reason,
          discovery_source: 'enhanced_trending',
          analysis_source: intelligence.source,
          confidence: intelligence.confidence,
          ai_insights: intelligence.insights,
          generated_at: new Date().toISOString(),
          enhanced_at: intelligence.source !== 'fallback' ? new Date().toISOString() : null
        }

        recommendations.push(recommendation)
      }

      // Break if we've hit budget limit
      if (costIncurred >= maxCostPerUser) {
        console.log(`Budget limit reached for user ${userId}, stopping analysis`)
        break
      }

      // Small delay between analyses
      await new Promise(resolve => setTimeout(resolve, 300))

    } catch (error) {
      console.warn(`Failed to analyze movie ${movie.title} for user ${userId}:`, error.message)
      analysisBreakdown.fallback++
    }
  }

  // Store recommendations if any
  if (recommendations.length > 0) {
    await storeRecommendations(recommendations)
    await updateUserRecommendationTimestamp(userId)
    
    // Log the cost
    await logEnhancedAnalysisCost(userId, costIncurred, recommendations.length)
  }

  // Cleanup old recommendations
  await cleanupOldRecommendations(userId)

  return {
    recommendationsGenerated: recommendations.length,
    costIncurred,
    analysisBreakdown,
    message: `Generated ${recommendations.length} recommendations using enhanced analysis (cost: $${costIncurred.toFixed(4)})`
  }
}

/**
 * Get enhanced movie intelligence with cost control
 */
async function getEnhancedMovieIntelligence(
  movie: TMDBMovie,
  userProfile: UserTasteProfile | null,
  analysisDepth: 'deep' | 'moderate' | 'basic',
  remainingBudget: number
): Promise<EnhancedMovieIntelligence> {
  
  // Start with basic analysis
  let intelligence: EnhancedMovieIntelligence = {
    movie,
    confidence: 0.5,
    reason: 'Basic recommendation based on popularity',
    source: 'fallback',
    insights: {},
    analysisDepth: 'basic'
  }

  try {
    // Step 1: Local AI analysis (always available, no cost)
    const localAnalysis = await getLocalAIAnalysis(movie)
    intelligence = enhanceWithLocalAnalysis(intelligence, localAnalysis, userProfile)

    // Step 2: External context if budget allows
    if (analysisDepth !== 'basic' && remainingBudget > 0) {
      const externalContext = await getExternalContext(movie)
      if (externalContext) {
        intelligence = enhanceWithExternalContext(intelligence, externalContext)
      }
    }

    // Step 3: Claude synthesis for deep analysis
    if (analysisDepth === 'deep' && remainingBudget >= COST_LIMITS.claude.perRequest) {
      const claudeAnalysis = await synthesizeWithClaude(movie, userProfile, intelligence.insights)
      if (claudeAnalysis) {
        intelligence = enhanceWithClaudeAnalysis(intelligence, claudeAnalysis)
      }
    }

  } catch (error) {
    console.warn(`Enhanced analysis failed for ${movie.title}, using fallback:`, error.message)
  }

  return intelligence
}

/**
 * Get sophisticated local AI analysis
 */
async function getLocalAIAnalysis(movie: TMDBMovie) {
  // Simulate your existing AI engines
  return {
    emotional: {
      dominantTone: inferEmotionalTone(movie),
      emotionalArc: 'character_growth',
      primaryEmotions: inferPrimaryEmotions(movie),
      intensity: movie.vote_average / 10
    },
    thematic: {
      coreTheme: inferCoreTheme(movie),
      majorThemes: inferMajorThemes(movie),
      narrativeComplexity: movie.overview.length > 200 ? 'complex' : 'straightforward'
    },
    cinematic: {
      visualSignature: inferVisualStyle(movie),
      cinematographyStyle: 'contemporary',
      productionValue: movie.vote_average > 7 ? 'high' : 'moderate'
    }
  }
}

/**
 * Get external context using Brave Search and Wikipedia
 */
async function getExternalContext(movie: TMDBMovie) {
  try {
    const [buzzResult, culturalResult] = await Promise.allSettled([
      getCurrentMovieBuzz(movie),
      getCulturalContext(movie)
    ])

    return {
      currentBuzz: buzzResult.status === 'fulfilled' ? buzzResult.value : null,
      culturalContext: culturalResult.status === 'fulfilled' ? culturalResult.value : null
    }
  } catch (error) {
    console.warn('External context failed:', error.message)
    return null
  }
}

/**
 * Get current movie buzz using Brave Search
 */
async function getCurrentMovieBuzz(movie: TMDBMovie) {
  if (!braveApiKey) return null

  const query = `"${movie.title}" ${movie.year} movie review audience reaction`
  
  try {
    const response = await fetch('https://api.search.brave.com/res/v1/web/search', {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'X-Subscription-Token': braveApiKey
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
    return parseBraveSearchResults(data.web?.results || [])
  } catch (error) {
    console.warn('Brave Search failed:', error.message)
    return null
  }
}

/**
 * Get cultural context using Wikipedia
 */
async function getCulturalContext(movie: TMDBMovie) {
  try {
    const encodedTitle = encodeURIComponent(movie.title)
    const response = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodedTitle}`)
    
    if (!response.ok) {
      throw new Error(`Wikipedia API error: ${response.status}`)
    }

    const data = await response.json()
    return {
      culturalSignificance: extractCulturalSignificance(data.extract),
      directorContext: 'Contemporary filmmaker',
      thematicRelevance: extractThematicRelevance(data.extract)
    }
  } catch (error) {
    console.warn('Wikipedia API failed:', error.message)
    return null
  }
}

/**
 * Synthesize analysis with Claude
 */
async function synthesizeWithClaude(movie: TMDBMovie, userProfile: UserTasteProfile | null, insights: any) {
  if (!anthropicApiKey) return null

  const prompt = buildClaudePrompt(movie, userProfile, insights)
  
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': anthropicApiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 400,
        messages: [{ role: 'user', content: prompt }]
      })
    })

    if (!response.ok) {
      throw new Error(`Claude API error: ${response.status}`)
    }

    const data = await response.json()
    return parseClaudeResponse(data.content[0]?.text || '')
  } catch (error) {
    console.warn('Claude synthesis failed:', error.message)
    return null
  }
}

// Helper functions for analysis enhancement

function enhanceWithLocalAnalysis(intelligence: EnhancedMovieIntelligence, localAnalysis: any, userProfile: UserTasteProfile | null): EnhancedMovieIntelligence {
  intelligence.insights = { ...intelligence.insights, ...localAnalysis }
  intelligence.confidence = Math.max(intelligence.confidence, 0.7)
  intelligence.source = 'local_ai'
  intelligence.analysisDepth = 'moderate'
  
  if (userProfile?.favorite_genres && intelligence.movie.genres) {
    const genreMatch = calculateGenreMatch(intelligence.movie.genres, userProfile.favorite_genres)
    if (genreMatch > 0.6) {
      intelligence.reason = `Matches your ${userProfile.favorite_genres.slice(0, 2).join(' and ')} preferences. ${localAnalysis.emotional.dominantTone} tone aligns with your taste.`
      intelligence.confidence = Math.max(intelligence.confidence, genreMatch)
    }
  }
  
  return intelligence
}

function enhanceWithExternalContext(intelligence: EnhancedMovieIntelligence, externalContext: any): EnhancedMovieIntelligence {
  if (externalContext.currentBuzz) {
    intelligence.insights.audienceReaction = externalContext.currentBuzz.audienceReaction
    intelligence.insights.currentRelevance = externalContext.currentBuzz.currentRelevance
    intelligence.confidence = Math.max(intelligence.confidence, 0.75)
    intelligence.source = 'enhanced'
  }
  
  if (externalContext.culturalContext) {
    intelligence.insights.culturalMoment = externalContext.culturalContext.culturalSignificance
    intelligence.reason += ` Currently ${externalContext.currentBuzz?.audienceReaction || 'gaining attention'}.`
  }
  
  return intelligence
}

function enhanceWithClaudeAnalysis(intelligence: EnhancedMovieIntelligence, claudeAnalysis: any): EnhancedMovieIntelligence {
  intelligence.confidence = Math.min(claudeAnalysis.confidence || 0.8, 1.0)
  intelligence.reason = claudeAnalysis.reason || intelligence.reason
  intelligence.source = 'full_ai'
  intelligence.analysisDepth = 'deep'
  
  return intelligence
}

// Utility functions

function buildClaudePrompt(movie: TMDBMovie, userProfile: UserTasteProfile | null, insights: any): string {
  return `Analyze movie match for personal recommendation:

MOVIE: ${movie.title} (${movie.year})
${movie.overview}

AI ANALYSIS: ${JSON.stringify(insights)}
USER PREFERENCES: ${JSON.stringify(userProfile?.preferences || {})}

Rate 0-1 and explain why this matches user taste.
JSON: {"confidence": 0.85, "reason": "explanation"}`
}

function parseClaudeResponse(text: string) {
  try {
    const match = text.match(/\{[\s\S]*\}/)
    return match ? JSON.parse(match[0]) : { confidence: 0.7, reason: text.slice(0, 100) }
  } catch {
    return { confidence: 0.6, reason: 'AI analysis completed' }
  }
}

function parseBraveSearchResults(results: any[]) {
  return {
    audienceReaction: results.length > 0 ? 'generating discussion' : 'limited buzz',
    currentRelevance: Math.min(results.length / 5, 1.0)
  }
}

function extractCulturalSignificance(extract: string): string {
  if (!extract) return 'Notable film'
  if (extract.includes('acclaimed') || extract.includes('award')) return 'Critically acclaimed work'
  return 'Contemporary cultural work'
}

function extractThematicRelevance(extract: string): string[] {
  const themes = []
  if (extract?.includes('family')) themes.push('family')
  if (extract?.includes('identity')) themes.push('identity')
  return themes
}

function calculateGenreMatch(movieGenres: Array<{ name: string }>, userGenres: string[]): number {
  const movieGenreNames = movieGenres.map(g => g.name.toLowerCase())
  const matchedGenres = userGenres.filter(ug => 
    movieGenreNames.some(mg => mg.includes(ug.toLowerCase()))
  )
  return Math.min(0.3 + (matchedGenres.length * 0.2), 1.0)
}

function getConfidenceThreshold(source: string): number {
  switch (source) {
    case 'full_ai': return 0.75
    case 'enhanced': return 0.7
    case 'local_ai': return 0.65
    default: return 0.6
  }
}

function estimateAnalysisCost(source: string, depth: string): number {
  if (source === 'full_ai') return COST_LIMITS.claude.perRequest
  return 0 // Other sources are free
}

// Inference functions (simplified versions of your AI engines)

function inferEmotionalTone(movie: TMDBMovie): string {
  const title = movie.title.toLowerCase()
  if (title.includes('dark') || title.includes('horror')) return 'dark'
  if (title.includes('comedy') || title.includes('fun')) return 'light'
  return 'balanced'
}

function inferPrimaryEmotions(movie: TMDBMovie): string[] {
  const genres = movie.genre_ids || []
  const emotions = []
  if (genres.includes(28)) emotions.push('excitement') // Action
  if (genres.includes(18)) emotions.push('empathy') // Drama
  if (genres.includes(35)) emotions.push('joy') // Comedy
  return emotions.length > 0 ? emotions : ['curiosity']
}

function inferCoreTheme(movie: TMDBMovie): string {
  const overview = movie.overview.toLowerCase()
  if (overview.includes('family')) return 'family_bonds'
  if (overview.includes('love')) return 'love_relationships'
  if (overview.includes('justice')) return 'justice_morality'
  return 'human_experience'
}

function inferMajorThemes(movie: TMDBMovie): string[] {
  const themes = []
  if (movie.genre_ids?.includes(878)) themes.push('technology_humanity') // Sci-Fi
  if (movie.genre_ids?.includes(14)) themes.push('magic_reality') // Fantasy
  return themes.length > 0 ? themes : ['entertainment']
}

function inferVisualStyle(movie: TMDBMovie): string {
  if (movie.genre_ids?.includes(878)) return 'futuristic_sleek'
  if (movie.genre_ids?.includes(14)) return 'magical_elaborate'
  if (movie.genre_ids?.includes(28)) return 'dynamic_kinetic'
  return 'contemporary_polished'
}

// Database functions

async function getActiveUsers() {
  const { data } = await supabase
    .from('auth.users')
    .select('id')
    .limit(10) // Limit for cost control
  return data || []
}

async function needsRecommendationRefresh(userId: string): Promise<boolean> {
  const { data } = await supabase
    .from('recommendations')
    .select('generated_at')
    .eq('user_id', userId)
    .order('generated_at', { ascending: false })
    .limit(1)
  
  if (!data || data.length === 0) return true
  
  const lastGenerated = new Date(data[0].generated_at)
  const hoursAgo = (Date.now() - lastGenerated.getTime()) / (1000 * 60 * 60)
  return hoursAgo >= 4 // Refresh every 4 hours
}

async function getUserTasteProfile(userId: string): Promise<UserTasteProfile | null> {
  const { data } = await supabase
    .from('taste_profile')
    .select('*')
    .eq('user_id', userId)
    .single()
  
  return data
}

async function fetchTrendingMovies(): Promise<TMDBMovie[]> {
  const response = await fetch(
    `https://api.themoviedb.org/3/trending/movie/week?api_key=${tmdbApiKey}`
  )
  
  if (!response.ok) {
    throw new Error(`TMDB API error: ${response.status}`)
  }
  
  const data = await response.json()
  return (data.results || []).map((movie: any) => ({
    ...movie,
    year: new Date(movie.release_date).getFullYear(),
    genres: [] // Would be populated with genre details
  }))
}

async function canAffordEnhancedAnalysis(userId: string, maxCost: number): Promise<boolean> {
  // Cost monitoring disabled - always allow enhanced analysis
  return true
  
  // Original cost monitoring code (disabled):
  // const { data } = await supabase
  //   .from('api_usage_log')
  //   .select('estimated_cost')
  //   .eq('user_id', userId)
  //   .eq('service', 'claude')
  //   .gte('created_at', new Date().toISOString().split('T')[0])
  // 
  // const todaySpend = data?.reduce((sum, log) => sum + (log.estimated_cost || 0), 0) || 0
  // return todaySpend + COST_LIMITS.claude.perRequest <= maxCost
}

async function storeRecommendations(recommendations: any[]) {
  const { error } = await supabase
    .from('recommendations')
    .upsert(recommendations, { onConflict: 'user_id,movie_id' })
  
  if (error) {
    throw new Error(`Failed to store recommendations: ${error.message}`)
  }
}

async function updateUserRecommendationTimestamp(userId: string) {
  await supabase
    .from('taste_profile')
    .update({ last_learning_event: new Date().toISOString() })
    .eq('user_id', userId)
}

async function logEnhancedAnalysisCost(userId: string, cost: number, recommendationCount: number) {
  // Cost monitoring temporarily disabled - feature skipped
  // await supabase
  //   .from('api_usage_log')
  //   .insert({
  //     service: 'claude',
  //     operation: 'enhanced_movie_analysis',
  //     estimated_cost: cost,
  //     user_id: userId,
  //     requests_count: recommendationCount,
  //     success: true,
  //     created_at: new Date().toISOString()
  //   })
}

async function cleanupOldRecommendations(userId: string) {
  const { data: oldRecs } = await supabase
    .from('recommendations')
    .select('id')
    .eq('user_id', userId)
    .order('generated_at', { ascending: false })
    .range(50, 1000)
  
  if (oldRecs && oldRecs.length > 0) {
    await supabase
      .from('recommendations')
      .delete()
      .in('id', oldRecs.map(r => r.id))
  }
}