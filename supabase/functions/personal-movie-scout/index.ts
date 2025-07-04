/**
 * Personal Movie Scout - Background AI Recommendation Engine
 * Phase 1: Core Performance - Uses existing AI engines only
 * 
 * This edge function runs hourly to:
 * 1. Fetch trending movies from TMDB
 * 2. Analyze them using existing AI engines (Emotional, Thematic, Cinematic)
 * 3. Generate personalized recommendations
 * 4. Store results for instant dashboard loading
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0'

// Types for our AI analysis
interface MovieAnalysis {
  emotional: any
  thematic: any
  cinematic: any
}

interface RecommendationMatch {
  confidence: number
  reason: string
  analysis_source: 'local_ai' | 'fallback'
  ai_insights: MovieAnalysis
}

interface TMDBMovie {
  id: string
  title: string
  overview: string
  release_date: string
  genre_ids: number[]
  vote_average: number
  poster_path: string | null
}

interface UserTasteProfile {
  user_id: string
  preferences: any
  favorite_genres?: string[]
  preference_strength?: any
}

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const tmdbApiKey = Deno.env.get('TMDB_API_KEY')!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

serve(async (req: Request) => {
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { userId, forceRefresh = false } = await req.json()
    
    console.log(`🎬 Personal Movie Scout starting for user: ${userId || 'all users'}`)
    
    // If userId provided, process single user; otherwise process all active users
    const usersToProcess = userId ? [{ id: userId }] : await getActiveUsers()
    
    let totalRecommendations = 0
    const results = []
    
    for (const user of usersToProcess) {
      try {
        const userResults = await processUserRecommendations(user.id, forceRefresh)
        totalRecommendations += userResults.recommendationsGenerated
        results.push({
          userId: user.id,
          ...userResults
        })
        
        // Small delay between users to avoid overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 500))
        
      } catch (error) {
        console.error(`Error processing user ${user.id}:`, error.message)
        results.push({
          userId: user.id,
          error: error.message,
          recommendationsGenerated: 0
        })
      }
    }
    
    console.log(`✅ Movie Scout completed. Generated ${totalRecommendations} total recommendations`)
    
    return new Response(
      JSON.stringify({
        success: true,
        usersProcessed: usersToProcess.length,
        totalRecommendations,
        results,
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
    
  } catch (error) {
    console.error('❌ Movie Scout failed:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

/**
 * Process recommendations for a single user
 */
async function processUserRecommendations(userId: string, forceRefresh: boolean = false) {
  console.log(`🔍 Processing recommendations for user: ${userId}`)
  
  // Check if user needs recommendations refresh
  if (!forceRefresh && !(await needsRecommendationRefresh(userId))) {
    console.log(`⏭️ User ${userId} has recent recommendations, skipping`)
    return { recommendationsGenerated: 0, status: 'skipped', reason: 'recent_recommendations' }
  }
  
  // Get user's taste profile
  const userProfile = await getUserTasteProfile(userId)
  if (!userProfile) {
    console.log(`⚠️ No taste profile found for user ${userId}, using defaults`)
  }
  
  // Get trending movies from TMDB
  const trendingMovies = await fetchTrendingMovies()
  console.log(`📈 Found ${trendingMovies.length} trending movies`)
  
  // Analyze movies and generate recommendations
  const recommendations = []
  let analysisCount = 0
  
  for (const movie of trendingMovies.slice(0, 10)) { // Limit to top 10 for Phase 1
    try {
      // Log API usage for TMDB
      // Cost monitoring removed
      
      // Get detailed movie info from TMDB
      const movieDetails = await fetchMovieDetails(movie.id)
      if (!movieDetails) continue
      
      // Analyze movie using existing AI engines (Phase 1: local only)
      const analysis = await analyzeMovieWithLocalAI(movieDetails)
      analysisCount++
      
      // Check if it matches user's taste
      const match = await evaluatePersonalMatch(movieDetails, analysis, userProfile)
      
      if (match.confidence >= 0.6) { // Lower threshold for Phase 1
        recommendations.push({
          user_id: userId,
          movie_id: movie.id,
          score: match.confidence,
          reason: match.reason,
          discovery_source: 'trending',
          analysis_source: match.analysis_source,
          confidence: match.confidence,
          ai_insights: match.ai_insights,
          generated_at: new Date().toISOString()
        })
      }
      
      // Rate limiting to be respectful
      await new Promise(resolve => setTimeout(resolve, 200))
      
    } catch (error) {
      console.warn(`Failed to analyze movie ${movie.title}:`, error.message)
      // Cost monitoring removed
    }
  }
  
  // Store recommendations
  if (recommendations.length > 0) {
    await storeRecommendations(recommendations)
    console.log(`💾 Stored ${recommendations.length} recommendations for user ${userId}`)
    
    // Clean up old recommendations (keep last 50)
    await cleanupOldRecommendations(userId)
  }
  
  return {
    recommendationsGenerated: recommendations.length,
    moviesAnalyzed: analysisCount,
    status: 'completed',
    analysisSource: 'local_ai'
  }
}

/**
 * Check if user needs recommendation refresh
 */
async function needsRecommendationRefresh(userId: string): Promise<boolean> {
  const { data: recentRecs } = await supabase
    .from('recommendations')
    .select('generated_at')
    .eq('user_id', userId)
    .order('generated_at', { ascending: false })
    .limit(1)
  
  if (!recentRecs || recentRecs.length === 0) return true
  
  const lastGenerated = new Date(recentRecs[0].generated_at)
  const hoursAgo = (Date.now() - lastGenerated.getTime()) / (1000 * 60 * 60)
  
  return hoursAgo >= 6 // Refresh every 6 hours for Phase 1
}

/**
 * Get active users who have interacted recently
 */
async function getActiveUsers(): Promise<{ id: string }[]> {
  const { data: users } = await supabase
    .from('ratings')
    .select('user_id')
    .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()) // Last 7 days
    .order('created_at', { ascending: false })
  
  if (!users) return []
  
  // Get unique user IDs
  const uniqueUsers = Array.from(new Set(users.map(u => u.user_id)))
    .map(id => ({ id }))
  
  return uniqueUsers.slice(0, 20) // Limit to 20 users per run in Phase 1
}

/**
 * Get user's taste profile
 */
async function getUserTasteProfile(userId: string): Promise<UserTasteProfile | null> {
  const { data: profile } = await supabase
    .from('taste_profile')
    .select('*')
    .eq('user_id', userId)
    .single()
  
  if (profile) return profile
  
  // Fallback: Infer basic preferences from ratings
  const { data: ratings } = await supabase
    .from('ratings')
    .select('movie_id, rating, movies(genre)')
    .eq('user_id', userId)
    .gte('rating', 4) // Good ratings only
    .limit(20)
  
  if (!ratings || ratings.length === 0) return null
  
  // Extract favorite genres from highly rated movies
  const genreCounts: Record<string, number> = {}
  ratings.forEach(r => {
    if (r.movies?.genre) {
      r.movies.genre.forEach((g: string) => {
        genreCounts[g] = (genreCounts[g] || 0) + 1
      })
    }
  })
  
  const favoriteGenres = Object.entries(genreCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 3)
    .map(([genre]) => genre)
  
  return {
    user_id: userId,
    preferences: { favorite_genres: favoriteGenres },
    favorite_genres: favoriteGenres
  }
}

/**
 * Fetch trending movies from TMDB
 */
async function fetchTrendingMovies(): Promise<TMDBMovie[]> {
  const response = await fetch(
    `https://api.themoviedb.org/3/trending/movie/week?api_key=${tmdbApiKey}`
  )
  
  if (!response.ok) {
    throw new Error(`TMDB API error: ${response.status}`)
  }
  
  const data = await response.json()
  return data.results || []
}

/**
 * Fetch detailed movie information from TMDB
 */
async function fetchMovieDetails(movieId: string): Promise<any> {
  const response = await fetch(
    `https://api.themoviedb.org/3/movie/${movieId}?api_key=${tmdbApiKey}&append_to_response=credits`
  )
  
  if (!response.ok) {
    console.warn(`Failed to fetch details for movie ${movieId}`)
    return null
  }
  
  return await response.json()
}

/**
 * Analyze movie using existing AI engines (Phase 1: local analysis only)
 * Note: This is a simplified version that mimics the existing AI engine outputs
 */
async function analyzeMovieWithLocalAI(movie: any): Promise<MovieAnalysis> {
  // For Phase 1, we'll create basic analysis structures
  // In the full implementation, this would call the actual AI engines
  
  const emotional = {
    dominantTone: inferEmotionalTone(movie),
    emotionalArc: 'gradual_ascent', // Default pattern
    primaryEmotions: inferPrimaryEmotions(movie),
    intensity: movie.vote_average / 10 // Use TMDB rating as proxy
  }
  
  const thematic = {
    coreTheme: inferCoreTheme(movie),
    majorThemes: inferThemes(movie),
    narrativeComplexity: movie.overview?.length > 200 ? 'complex' : 'straightforward'
  }
  
  const cinematic = {
    visualSignature: inferVisualStyle(movie),
    cinematographyStyle: 'contemporary', // Default
    productionValue: movie.vote_average > 7 ? 'high' : 'moderate'
  }
  
  return { emotional, thematic, cinematic }
}

/**
 * Simple genre/mood inference helpers (Phase 1 placeholders)
 */
function inferEmotionalTone(movie: any): string {
  const genres = movie.genres?.map((g: any) => g.name.toLowerCase()) || []
  
  if (genres.includes('horror') || genres.includes('thriller')) return 'tense'
  if (genres.includes('comedy')) return 'light'
  if (genres.includes('drama')) return 'contemplative'
  if (genres.includes('action')) return 'energetic'
  if (genres.includes('romance')) return 'warm'
  
  return 'balanced'
}

function inferPrimaryEmotions(movie: any): string[] {
  const genres = movie.genres?.map((g: any) => g.name.toLowerCase()) || []
  const emotions = []
  
  if (genres.includes('action')) emotions.push('excitement')
  if (genres.includes('drama')) emotions.push('empathy')
  if (genres.includes('comedy')) emotions.push('joy')
  if (genres.includes('horror')) emotions.push('fear')
  if (genres.includes('romance')) emotions.push('love')
  
  return emotions.length > 0 ? emotions : ['curiosity']
}

function inferCoreTheme(movie: any): string {
  const overview = movie.overview?.toLowerCase() || ''
  
  if (overview.includes('family')) return 'family_bonds'
  if (overview.includes('love') || overview.includes('relationship')) return 'love_relationships'
  if (overview.includes('war') || overview.includes('conflict')) return 'conflict_resolution'
  if (overview.includes('justice') || overview.includes('crime')) return 'justice_morality'
  if (overview.includes('journey') || overview.includes('adventure')) return 'personal_growth'
  
  return 'human_experience'
}

function inferThemes(movie: any): string[] {
  const genres = movie.genres?.map((g: any) => g.name.toLowerCase()) || []
  const themes = []
  
  if (genres.includes('science fiction')) themes.push('technology_humanity')
  if (genres.includes('fantasy')) themes.push('magic_reality')
  if (genres.includes('historical')) themes.push('past_present')
  if (genres.includes('biographical')) themes.push('real_life_inspiration')
  
  return themes.length > 0 ? themes : ['entertainment']
}

function inferVisualStyle(movie: any): string {
  const genres = movie.genres?.map((g: any) => g.name.toLowerCase()) || []
  
  if (genres.includes('science fiction')) return 'futuristic_sleek'
  if (genres.includes('fantasy')) return 'magical_elaborate'
  if (genres.includes('horror')) return 'dark_atmospheric'
  if (genres.includes('action')) return 'dynamic_kinetic'
  if (genres.includes('drama')) return 'naturalistic_intimate'
  
  return 'contemporary_polished'
}

/**
 * Evaluate if movie matches user's taste
 */
async function evaluatePersonalMatch(
  movie: any, 
  analysis: MovieAnalysis, 
  userProfile: UserTasteProfile | null
): Promise<RecommendationMatch> {
  
  let confidence = 0.5 // Base confidence
  let reasons = []
  
  // Genre matching
  if (userProfile?.favorite_genres) {
    const movieGenres = movie.genres?.map((g: any) => g.name.toLowerCase()) || []
    const matchedGenres = userProfile.favorite_genres.filter(ug => 
      movieGenres.some(mg => mg.includes(ug.toLowerCase()) || ug.toLowerCase().includes(mg))
    )
    
    if (matchedGenres.length > 0) {
      confidence += 0.2 * matchedGenres.length
      reasons.push(`Matches your ${matchedGenres.join(' and ')} preferences`)
    }
  }
  
  // Quality boost
  if (movie.vote_average >= 7.5) {
    confidence += 0.15
    reasons.push('Highly rated by audiences')
  }
  
  // Recency boost for newer movies
  const releaseYear = new Date(movie.release_date).getFullYear()
  const currentYear = new Date().getFullYear()
  if (currentYear - releaseYear <= 2) {
    confidence += 0.1
    reasons.push('Recent release')
  }
  
  // Emotional tone matching (basic heuristic)
  if (analysis.emotional.dominantTone === 'light' || analysis.emotional.dominantTone === 'warm') {
    confidence += 0.05 // Slight boost for positive tones
  }
  
  // Cap confidence at 1.0
  confidence = Math.min(confidence, 1.0)
  
  const reason = reasons.length > 0 
    ? reasons.join('. ') + '.'
    : `Recommended based on current trends and quality (${movie.vote_average}/10 rating).`
  
  return {
    confidence,
    reason,
    analysis_source: 'local_ai',
    ai_insights: analysis
  }
}

/**
 * Store recommendations in database
 */
async function storeRecommendations(recommendations: any[]) {
  const { error } = await supabase
    .from('recommendations')
    .upsert(recommendations, {
      onConflict: 'user_id,movie_id'
    })
  
  if (error) {
    throw new Error(`Failed to store recommendations: ${error.message}`)
  }
}

/**
 * Clean up old recommendations to prevent bloat
 */
async function cleanupOldRecommendations(userId: string) {
  // Keep only the 50 most recent recommendations per user
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

// Cost monitoring removed - no longer tracking API usage