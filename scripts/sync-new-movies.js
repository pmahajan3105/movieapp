#!/usr/bin/env node

/**
 * TMDB New Movies Sync Script
 * 
 * Fetches recent and popular movies from TMDB and stores them in the database.
 * Includes rate limiting to respect TMDB API limits (40 requests per 10 seconds).
 */

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms))

async function syncNewMovies() {
  console.log('🎬 Starting movie sync...')
  
  try {
    // Import required modules
    const { createServerClient } = await import('../src/lib/supabase/server-client.js')
    const { getTrendingMovies, searchTmdbMovies } = await import('../src/lib/utils/tmdb-helpers.js')
    
    // Initialize Supabase client
    const supabase = await createServerClient()
    
    // Check if we're connected
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError) {
      console.log('⚠️  No authentication - using service role (if available)')
    }
    
    const allMovies = []
    
    // TMDB allows 40 requests per 10 seconds
    // We'll do 5 requests, then wait 10 seconds
    const BATCH_SIZE = 5
    const BATCH_DELAY = 10000 // 10 seconds
    
    console.log('📡 Fetching trending movies...')
    
    // Fetch trending movies (last 3 months, paginated)
    for (let page = 1; page <= 10; page++) {
      try {
        console.log(`📄 Fetching page ${page}...`)
        const trending = await getTrendingMovies({ page, timeWindow: 'week' })
        allMovies.push(...trending.movies)
        
        console.log(`✅ Fetched ${trending.movies.length} movies from page ${page}`)
        
        // Rate limiting: wait after every 5 requests
        if (page % BATCH_SIZE === 0) {
          console.log(`⏳ Rate limit: waiting 10s after page ${page}...`)
          await delay(BATCH_DELAY)
        }
      } catch (error) {
        console.error(`❌ Failed to fetch page ${page}:`, error.message)
        // Continue with next page
      }
    }
    
    // Fetch popular movies
    console.log('📡 Fetching popular movies...')
    try {
      const popular = await getTrendingMovies({ timeWindow: 'day' })
      allMovies.push(...popular.movies)
      console.log(`✅ Fetched ${popular.movies.length} popular movies`)
    } catch (error) {
      console.error('❌ Failed to fetch popular movies:', error.message)
    }
    
    // Remove duplicates based on TMDB ID
    const uniqueMovies = new Map()
    for (const movie of allMovies) {
      if (movie.tmdb_id) {
        uniqueMovies.set(movie.tmdb_id, movie)
      }
    }
    
    const deduplicatedMovies = Array.from(uniqueMovies.values())
    console.log(`🔄 Deduplicated: ${allMovies.length} → ${deduplicatedMovies.length} movies`)
    
    // Insert into database with upsert (prevents duplicates)
    console.log('💾 Storing movies in database...')
    
    const moviesToInsert = deduplicatedMovies.map(movie => ({
      tmdb_id: movie.tmdb_id,
      title: movie.title,
      overview: movie.overview || movie.description,
      release_date: movie.release_date,
      poster_path: movie.poster_url,
      backdrop_path: movie.backdrop_url,
      genre_ids: movie.genre || [],
      vote_average: movie.rating || 0,
      popularity: movie.popularity || 0,
      runtime: movie.runtime || 0,
      adult: movie.adult || false,
      original_language: movie.original_language || 'en',
      original_title: movie.original_title || movie.title,
      vote_count: movie.vote_count || 0,
      video: movie.video || false,
      metadata: {
        tmdb_data: movie,
        synced_at: new Date().toISOString()
      }
    }))
    
    // Use upsert to prevent duplicates
    const { data, error } = await supabase
      .from('movies')
      .upsert(
        moviesToInsert,
        { 
          onConflict: 'tmdb_id',
          ignoreDuplicates: false // Update existing
        }
      )
      .select('id, title, tmdb_id')
    
    if (error) {
      throw new Error(`Database error: ${error.message}`)
    }
    
    console.log(`✅ Successfully synced ${moviesToInsert.length} movies to database`)
    console.log(`📊 Database returned ${data?.length || 0} affected rows`)
    
    // Log some sample movies
    if (data && data.length > 0) {
      console.log('🎬 Sample synced movies:')
      data.slice(0, 5).forEach(movie => {
        console.log(`  - ${movie.title} (TMDB: ${movie.tmdb_id})`)
      })
    }
    
    console.log('🎉 Movie sync completed successfully!')
    
  } catch (error) {
    console.error('❌ Sync failed:', error.message)
    console.error('Stack trace:', error.stack)
    process.exit(1)
  }
}

// Run the sync
if (require.main === module) {
  syncNewMovies()
    .then(() => {
      console.log('✅ Script completed')
      process.exit(0)
    })
    .catch((error) => {
      console.error('❌ Script failed:', error)
      process.exit(1)
    })
}

module.exports = { syncNewMovies }
