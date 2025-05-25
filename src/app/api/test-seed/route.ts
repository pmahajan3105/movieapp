import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Check environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const tmdbKey = process.env.TMDB_API_KEY
    const anthropicKey = process.env.ANTHROPIC_API_KEY

    console.log('🔍 Environment Check:')
    console.log('- Supabase URL:', supabaseUrl ? 'Set' : 'Missing')
    console.log('- Supabase Key:', supabaseKey ? 'Set' : 'Missing')
    console.log('- TMDB Key:', tmdbKey ? 'Set' : 'Missing')
    console.log('- Anthropic Key:', anthropicKey ? 'Set' : 'Missing')

    const environmentStatus = {
      supabaseUrl: !!supabaseUrl,
      supabaseKey: !!supabaseKey,
      tmdbKey: !!tmdbKey,
      anthropicKey: !!anthropicKey,
    }

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { 
          error: 'Missing Supabase configuration', 
          environment: environmentStatus 
        },
        { status: 500 }
      )
    }

    // Test Supabase connection
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    try {
      const { data: movies, error: moviesError } = await supabase
        .from('movies')
        .select('*')
        .limit(5)

      console.log('📺 Sample movies from database:', movies?.length || 0)

      if (moviesError) {
        console.error('❌ Supabase movies error:', moviesError)
      }
    } catch (dbError) {
      console.error('❌ Database connection error:', dbError)
    }

    // Test TMDB API
    let tmdbTest = null
    if (tmdbKey) {
      try {
        const tmdbResponse = await fetch(`https://api.themoviedb.org/3/configuration?api_key=${tmdbKey}`)
        const tmdbData = await tmdbResponse.json()
        tmdbTest = {
          status: tmdbResponse.ok ? 'success' : 'error',
          message: tmdbResponse.ok ? 'TMDB API accessible' : tmdbData.status_message || 'Unknown error'
        }
        console.log('🎬 TMDB API test:', tmdbTest.status)
      } catch (error) {
        console.error('❌ TMDB API error:', error)
        tmdbTest = {
          status: 'error',
          message: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    } else {
      tmdbTest = {
        status: 'missing',
        message: 'TMDB API key not configured'
      }
    }

    return NextResponse.json({
      message: 'Test completed successfully',
      environment: environmentStatus,
      tmdb: tmdbTest,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Test seed error:', error)
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}
