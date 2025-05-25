#!/usr/bin/env node

/**
 * TMDB API Test Script
 * Verifies that TMDB integration is working properly
 */

/* eslint-disable @typescript-eslint/no-require-imports */
require('dotenv').config({ path: '.env.local' })

// Fetch polyfill for Node.js versions that don't have it built-in
let fetch
if (typeof globalThis.fetch === 'undefined') {
  try {
    fetch = require('node-fetch')
  } catch (_error) {
    console.error('❌ This script requires either Node.js 18+ or the node-fetch package.')
    console.error('   Please run: npm install node-fetch')
    console.error('   Or upgrade to Node.js 18+')
    process.exit(1)
  }
} else {
  fetch = globalThis.fetch
}

const API_BASE = process.env.API_BASE || 'http://localhost:3000'

async function makeRequest(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`
  
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`API request failed: ${response.status} ${response.statusText}\n${errorText}`)
    }
    
    return response.json()
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      throw new Error('❌ Cannot connect to development server. Make sure it\'s running on ' + API_BASE)
    }
    throw error
  }
}

async function testTMDBDirectly() {
  console.log('🎬 Testing TMDB API directly...\n')
  
  const apiKey = process.env.TMDB_API_KEY
  if (!apiKey) {
    console.error('❌ TMDB_API_KEY not found in environment variables')
    console.error('   Please add TMDB_API_KEY to your .env.local file')
    return false
  }
  
  console.log(`🔑 Found TMDB API key: ${apiKey.substring(0, 8)}...`)
  
  try {
    // Test configuration endpoint
    console.log('   Testing configuration endpoint...')
    const configResponse = await fetch(`https://api.themoviedb.org/3/configuration?api_key=${apiKey}`)
    if (!configResponse.ok) {
      const errorData = await configResponse.text()
      console.error('❌ TMDB configuration test failed:', configResponse.status, errorData)
      return false
    }
    console.log('   ✅ TMDB configuration endpoint working')
    
    // Test search endpoint
    console.log('   Testing search endpoint...')
    const searchResponse = await fetch(`https://api.themoviedb.org/3/search/movie?api_key=${apiKey}&query=inception`)
    const searchData = await searchResponse.json()
    if (!searchResponse.ok || !searchData.results) {
      console.error('❌ TMDB search test failed:', searchData)
      return false
    }
    console.log(`   ✅ TMDB search working - found ${searchData.results.length} results for "inception"`)
    
    // Test trending endpoint
    console.log('   Testing trending endpoint...')
    const trendingResponse = await fetch(`https://api.themoviedb.org/3/trending/movie/week?api_key=${apiKey}`)
    const trendingData = await trendingResponse.json()
    if (!trendingResponse.ok || !trendingData.results) {
      console.error('❌ TMDB trending test failed:', trendingData)
      return false
    }
    console.log(`   ✅ TMDB trending working - found ${trendingData.results.length} trending movies`)
    
    return true
  } catch (error) {
    console.error('❌ TMDB direct test error:', error.message)
    return false
  }
}

async function testDatabaseManager() {
  console.log('\n🎬 Testing Database Manager API...\n')
  
  try {
    console.log('   Testing database listing...')
    // Test database listing
    const databases = await makeRequest('/api/movie-databases')
    console.log('   ✅ Database listing working')
    console.log(`   Available databases: ${databases.availableDatabases.map(db => db.name).join(', ')}`)
    console.log(`   Current default: ${databases.currentAssignments.default.name}`)
    
    console.log('   Testing TMDB database...')
    // Test TMDB database specifically
    const tmdbTest = await makeRequest('/api/movie-databases', {
      method: 'POST',
      body: JSON.stringify({
        databaseId: 'tmdb',
        testType: 'extended'
      })
    })
    
    if (tmdbTest.test.connected) {
      console.log('   ✅ TMDB database test passed')
      console.log(`   Response time: ${tmdbTest.test.responseTime}ms`)
      console.log(`   Search support: ${tmdbTest.test.supportsSearch ? '✅' : '❌'}`)
      console.log(`   Trending support: ${tmdbTest.test.supportsTrending ? '✅' : '❌'}`)
    } else {
      console.error('   ❌ TMDB database test failed')
      console.error(`   Error: ${tmdbTest.test.error || 'Unknown error'}`)
    }
    
    return tmdbTest.test.connected
  } catch (error) {
    console.error('❌ Database manager test error:', error.message)
    return false
  }
}

async function testMoviesAPI() {
  console.log('\n🎬 Testing Movies API with TMDB...\n')
  
  try {
    console.log('   Testing smart mode with TMDB...')
    // Test smart mode with realtime (should use TMDB)
    const smartResponse = await makeRequest('/api/movies?smart=true&realtime=true&database=tmdb&limit=5')
    
    if (smartResponse.success) {
      console.log('   ✅ Smart mode with TMDB working')
      console.log(`   Movies fetched: ${smartResponse.data.length}`)
      console.log(`   Database used: ${smartResponse.database || 'Not specified'}`)
      console.log(`   Real-time mode: ${smartResponse.realTime ? '✅' : '❌'}`)
      
      if (smartResponse.data.length > 0) {
        const firstMovie = smartResponse.data[0]
        console.log(`   Sample movie: "${firstMovie.title}" (${firstMovie.year})`)
      }
    } else {
      console.error('   ❌ Smart mode test failed:', smartResponse.error)
      return false
    }
    
    console.log('   Testing real-time trending...')
    // Test trending endpoint
    const trendingResponse = await makeRequest('/api/movies?realtime=true&database=tmdb&limit=3')
    
    if (trendingResponse.success) {
      console.log('   ✅ Real-time trending with TMDB working')
      console.log(`   Trending movies: ${trendingResponse.data.length}`)
      console.log(`   Source: ${trendingResponse.source}`)
    } else {
      console.error('   ❌ Real-time trending test failed:', trendingResponse.error)
      return false
    }
    
    return true
  } catch (error) {
    console.error('❌ Movies API test error:', error.message)
    return false
  }
}

async function main() {
  console.log('🚀 TMDB Integration Test Suite\n')
  console.log('=' .repeat(50))
  
  // Check if development server is running
  try {
    await makeRequest('/api/test-seed')
  } catch (error) {
    if (error.message.includes('ECONNREFUSED') || error.message.includes('Cannot connect')) {
      console.error('❌ Development server is not running!')
      console.error('   Please start it with: npm run dev')
      console.error('   Then run this test again.')
      process.exit(1)
    }
  }
  
  const tmdbDirect = await testTMDBDirectly()
  const dbManager = await testDatabaseManager()
  const moviesAPI = await testMoviesAPI()
  
  console.log('\n' + '=' .repeat(50))
  console.log('📊 TEST RESULTS')
  console.log('=' .repeat(50))
  console.log(`TMDB Direct API:    ${tmdbDirect ? '✅ PASS' : '❌ FAIL'}`)
  console.log(`Database Manager:   ${dbManager ? '✅ PASS' : '❌ FAIL'}`)
  console.log(`Movies API:         ${moviesAPI ? '✅ PASS' : '❌ FAIL'}`)
  
  const allPassed = tmdbDirect && dbManager && moviesAPI
  console.log(`\nOverall Status:     ${allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`)
  
  if (!allPassed) {
    console.log('\n💡 Troubleshooting tips:')
    console.log('   1. Make sure TMDB_API_KEY is set in .env.local')
    console.log('   2. Ensure your development server is running (npm run dev)')
    console.log('   3. Check that the API routes are properly deployed')
    console.log('   4. Verify network connectivity to TMDB API')
    console.log('   5. Make sure you\'re using Node.js 18+ or have node-fetch installed')
  }
  
  process.exit(allPassed ? 0 : 1)
}

if (require.main === module) {
  main().catch(error => {
    console.error('💥 Test suite crashed:', error)
    process.exit(1)
  })
} 