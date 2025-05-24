import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  try {
    // Test environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const omdbKey = process.env.OMDB_API_KEY

    console.log('Environment check:')
    console.log('- Supabase URL:', supabaseUrl ? 'Set' : 'Missing')
    console.log(
      '- Service Role Key:',
      serviceRoleKey ? 'Set (length: ' + serviceRoleKey.length + ')' : 'Missing'
    )
    console.log('- OMDB Key:', omdbKey ? 'Set' : 'Missing')

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({
        success: false,
        error: 'Missing environment variables',
        details: {
          supabaseUrl: !!supabaseUrl,
          serviceRoleKey: !!serviceRoleKey,
          omdbKey: !!omdbKey,
        },
      })
    }

    // Test Supabase connection with service role
    const supabase = createClient(supabaseUrl, serviceRoleKey)

    const { data, error } = await supabase
      .from('movies')
      .select('count(*)', { count: 'exact' })
      .limit(1)

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json({
        success: false,
        error: 'Supabase connection failed',
        details: error,
      })
    }

    // Test OMDB API
    let omdbTest = null
    if (omdbKey) {
      try {
        const omdbResponse = await fetch(`http://www.omdbapi.com/?t=Inception&apikey=${omdbKey}`)
        const omdbData = await omdbResponse.json()
        omdbTest = {
          success: omdbData.Response === 'True',
          response: omdbData.Response === 'True' ? 'Working' : omdbData.Error || 'Failed',
        }
      } catch (omdbError) {
        omdbTest = {
          success: false,
          response: `Network error: ${omdbError instanceof Error ? omdbError.message : 'Unknown error'}`,
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'All tests completed',
      results: {
        supabase: {
          connected: true,
          movieCount: Array.isArray(data) ? data.length : 0,
        },
        omdb: omdbTest,
      },
    })
  } catch (error) {
    console.error('Test error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Test failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
