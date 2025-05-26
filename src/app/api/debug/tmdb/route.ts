import { NextResponse } from 'next/server'

const TMDB_API_KEY = process.env.TMDB_API_KEY
const TMDB_BASE_URL = 'https://api.themoviedb.org/3'

export async function GET() {
  // Only allow in development
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 })
  }

  if (!TMDB_API_KEY) {
    return NextResponse.json({ 
      success: false, 
      error: 'TMDB API key not configured' 
    }, { status: 400 })
  }

  try {
    console.log('🧪 Testing TMDB API...')
    
    // Test with a simple search
    const searchUrl = `${TMDB_BASE_URL}/search/movie?api_key=${TMDB_API_KEY}&query=Inception&include_adult=false`
    const response = await fetch(searchUrl)
    const data = await response.json()

    if (!response.ok) {
      throw new Error(`TMDB API error: ${response.status} ${data.status_message || 'Unknown error'}`)
    }

    console.log('✅ TMDB API test successful')
    
    return NextResponse.json({
      success: true,
      totalResults: data.total_results,
      firstResult: data.results?.[0]?.title || 'No results',
      apiStatus: 'working',
    })
  } catch (error: unknown) {
    console.error('❌ TMDB API test failed:', error)
    
    const errorObj = error as any
    return NextResponse.json({
      success: false,
      error: errorObj.message || 'Unknown error',
    }, { status: 400 })
  }
} 