/**
 * Background Job Test Endpoint
 * Phase 1: Test the personal movie scout background job locally
 * 
 * This endpoint allows manual testing of the background job logic
 * before deploying to Supabase Edge Functions
 */

import { withSupabase, withError, ok, fail } from '@/lib/api/factory'
import { logger } from '@/lib/logger'

export const POST = withError(
  withSupabase(async ({ request, supabase }) => {
    try {
      const { userId, forceRefresh = true, testMode = true } = await request.json()
      
      // Get current user
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        return fail('Unauthorized', 401)
      }

      // Use provided userId or current user
      const targetUserId = userId || user.id

      logger.info('Testing background job locally', {
        targetUserId,
        forceRefresh,
        testMode
      })

      // Test the background job logic
      const result = await testPersonalMovieScout(targetUserId, forceRefresh, testMode)

      return ok({
        success: true,
        testResults: result,
        timestamp: new Date().toISOString()
      })

    } catch (error) {
      logger.error('Error in background job test endpoint', { 
        error: error instanceof Error ? error.message : String(error) 
      })
      return fail('Test failed: ' + (error instanceof Error ? error.message : String(error)), 500)
    }
  })
)

/**
 * Test version of the personal movie scout logic
 */
async function testPersonalMovieScout(userId: string, forceRefresh: boolean, testMode: boolean) {
  const results = {
    userProfile: null as any,
    trendingMovies: [] as any[],
    analyzedMovies: [] as any[],
    recommendations: [] as any[],
    errors: [] as string[],
    performance: {
      startTime: Date.now(),
      endTime: 0,
      duration: 0,
      steps: [] as Array<{ step: string, duration: number }>
    }
  }

  let stepStartTime = Date.now()

  try {
    // Step 1: Check if user needs recommendations refresh
    if (!forceRefresh && !(await needsRecommendationRefresh(userId))) {
      results.errors.push('User has recent recommendations, skipping (use forceRefresh=true to override)')
      return results
    }

    results.performance.steps.push({
      step: 'check_refresh_needed',
      duration: Date.now() - stepStartTime
    })
    stepStartTime = Date.now()

    // Step 2: Get user's taste profile
    results.userProfile = await getUserTasteProfile(userId)
    if (!results.userProfile) {
      results.errors.push('No taste profile found, will use defaults')
    }

    results.performance.steps.push({
      step: 'get_user_profile',
      duration: Date.now() - stepStartTime
    })
    stepStartTime = Date.now()

    // Step 3: Get trending movies from TMDB
    if (!process.env.TMDB_API_KEY) {
      throw new Error('TMDB_API_KEY not configured')
    }

    results.trendingMovies = await fetchTrendingMovies()
    logger.info(`Fetched ${results.trendingMovies.length} trending movies`)

    results.performance.steps.push({
      step: 'fetch_trending_movies',
      duration: Date.now() - stepStartTime
    })
    stepStartTime = Date.now()

    // Step 4: Analyze movies (limit to 3 for testing)
    const moviesToAnalyze = results.trendingMovies.slice(0, testMode ? 3 : 10)
    
    for (const movie of moviesToAnalyze) {
      try {
        stepStartTime = Date.now()

        // Get detailed movie info
        const movieDetails = await fetchMovieDetails(movie.id)
        if (!movieDetails) {
          results.errors.push(`Failed to fetch details for movie ${movie.title}`)
          continue
        }

        // Analyze with local AI (simplified for testing)
        const analysis = await analyzeMovieWithLocalAI(movieDetails)
        
        // Evaluate personal match
        const match = await evaluatePersonalMatch(movieDetails, analysis, results.userProfile)

        const analyzedMovie = {
          movie: {
            id: movieDetails.id,
            title: movieDetails.title,
            year: new Date(movieDetails.release_date).getFullYear(),
            rating: movieDetails.vote_average,
            genres: movieDetails.genres?.map((g: any) => g.name) || []
          },
          analysis,
          match,
          analysisDuration: Date.now() - stepStartTime
        }

        results.analyzedMovies.push(analyzedMovie)

        // If good match, add to recommendations
        if (match.confidence >= 0.6) {
          results.recommendations.push({
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

        // Small delay to be respectful to APIs
        await new Promise(resolve => setTimeout(resolve, 200))

      } catch (error) {
        results.errors.push(`Failed to analyze movie ${movie.title}: ${error instanceof Error ? error.message : String(error)}`)
      }
    }

    results.performance.steps.push({
      step: 'analyze_movies',
      duration: Date.now() - stepStartTime
    })
    stepStartTime = Date.now()

    // Step 5: Store recommendations (only if not in test mode)
    if (!testMode && results.recommendations.length > 0) {
      await storeRecommendations(results.recommendations)
      await cleanupOldRecommendations(userId)
      logger.info(`Stored ${results.recommendations.length} recommendations`)
    } else if (testMode) {
      logger.info(`Test mode: Would store ${results.recommendations.length} recommendations`)
    }

    results.performance.steps.push({
      step: 'store_recommendations',
      duration: Date.now() - stepStartTime
    })

  } catch (error) {
    results.errors.push(`Fatal error: ${error instanceof Error ? error.message : String(error)}`)
  }

  results.performance.endTime = Date.now()
  results.performance.duration = results.performance.endTime - results.performance.startTime

  return results
}

// Helper functions (simplified versions of the Edge Function logic)

async function needsRecommendationRefresh(userId: string): Promise<boolean> {
  const { createClient } = await import('@supabase/supabase-js')
  const { getSupabaseUrl, getSupabaseServiceRoleKey } = await import('@/lib/env')
  
  const serviceRoleKey = getSupabaseServiceRoleKey()
  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for this endpoint')
  }
  
  const supabase = createClient(getSupabaseUrl(), serviceRoleKey)
  
  const { data: recentRecs } = await supabase
    .from('recommendations')
    .select('generated_at')
    .eq('user_id', userId)
    .order('generated_at', { ascending: false })
    .limit(1)
  
  if (!recentRecs || recentRecs.length === 0) return true
  
  const firstRec = recentRecs[0]
  if (!firstRec) return true
  
  const lastGenerated = new Date(firstRec.generated_at)
  const hoursAgo = (Date.now() - lastGenerated.getTime()) / (1000 * 60 * 60)
  
  return hoursAgo >= 6
}

async function getUserTasteProfile(userId: string) {
  const { createClient } = await import('@supabase/supabase-js')
  const { getSupabaseUrl, getSupabaseServiceRoleKey } = await import('@/lib/env')
  
  const serviceRoleKey = getSupabaseServiceRoleKey()
  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for this endpoint')
  }
  
  const supabase = createClient(getSupabaseUrl(), serviceRoleKey)
  
  const { data: profile } = await supabase
    .from('taste_profile')
    .select('*')
    .eq('user_id', userId)
    .single()
  
  if (profile) return profile
  
  // Fallback: Basic preferences from ratings
  const { data: ratings } = await supabase
    .from('ratings')
    .select('movie_id, rating, movies(genre)')
    .eq('user_id', userId)
    .gte('rating', 4)
    .limit(20)
  
  if (!ratings || ratings.length === 0) return null
  
  // Extract favorite genres
  const genreCounts: Record<string, number> = {}
  ratings.forEach(r => {
    if (r.movies && Array.isArray((r.movies as any).genre)) {
      (r.movies as any).genre.forEach((g: string) => {
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

async function fetchTrendingMovies() {
  const response = await fetch(
    `https://api.themoviedb.org/3/trending/movie/week?api_key=${process.env.TMDB_API_KEY}`
  )
  
  if (!response.ok) {
    throw new Error(`TMDB API error: ${response.status}`)
  }
  
  const data = await response.json()
  return data.results || []
}

async function fetchMovieDetails(movieId: string) {
  const response = await fetch(
    `https://api.themoviedb.org/3/movie/${movieId}?api_key=${process.env.TMDB_API_KEY}&append_to_response=credits`
  )
  
  if (!response.ok) {
    return null
  }
  
  return await response.json()
}

async function analyzeMovieWithLocalAI(movie: any) {
  // Simplified analysis (in real implementation, this would call your AI engines)
  return {
    emotional: {
      dominantTone: inferEmotionalTone(movie),
      emotionalArc: 'gradual_ascent',
      primaryEmotions: inferPrimaryEmotions(movie),
      intensity: movie.vote_average / 10
    },
    thematic: {
      coreTheme: inferCoreTheme(movie),
      majorThemes: inferThemes(movie),
      narrativeComplexity: movie.overview?.length > 200 ? 'complex' : 'straightforward'
    },
    cinematic: {
      visualSignature: inferVisualStyle(movie),
      cinematographyStyle: 'contemporary',
      productionValue: movie.vote_average > 7 ? 'high' : 'moderate'
    }
  }
}

async function evaluatePersonalMatch(movie: any, analysis: any, userProfile: any) {
  let confidence = 0.5
  let reasons = []
  
  // Genre matching
  if (userProfile?.favorite_genres) {
    const movieGenres = movie.genres?.map((g: any) => g.name.toLowerCase()) || []
    const matchedGenres = userProfile.favorite_genres.filter((ug: string) => 
      movieGenres.some((mg: string) => mg.includes(ug.toLowerCase()) || ug.toLowerCase().includes(mg))
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

async function storeRecommendations(recommendations: any[]) {
  const { createClient } = await import('@supabase/supabase-js')
  const { getSupabaseUrl, getSupabaseServiceRoleKey } = await import('@/lib/env')
  
  const serviceRoleKey = getSupabaseServiceRoleKey()
  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for this endpoint')
  }
  
  const supabase = createClient(getSupabaseUrl(), serviceRoleKey)
  
  const { error } = await supabase
    .from('recommendations')
    .upsert(recommendations, {
      onConflict: 'user_id,movie_id'
    })
  
  if (error) {
    throw new Error(`Failed to store recommendations: ${error.message}`)
  }
}

async function cleanupOldRecommendations(userId: string) {
  const { createClient } = await import('@supabase/supabase-js')
  const { getSupabaseUrl, getSupabaseServiceRoleKey } = await import('@/lib/env')
  
  const serviceRoleKey = getSupabaseServiceRoleKey()
  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for this endpoint')
  }
  
  const supabase = createClient(getSupabaseUrl(), serviceRoleKey)
  
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

// Inference helper functions
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