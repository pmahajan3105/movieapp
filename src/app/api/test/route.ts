import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  try {
    // Test 1: Basic connection and environment
    const envCheck = {
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      hasGroqKey: !!process.env.GROQ_API_KEY,
    }

    // Test 2: Movies table (simplified schema)
    const { data: movies, error: moviesError } = await supabase
      .from('movies')
      .select('id, title, genre, rating')
      .limit(3)

    if (moviesError) {
      return NextResponse.json(
        {
          error: 'Movies table error',
          details: moviesError,
        },
        { status: 500 }
      )
    }

    // Test 3: Ratings table
    const { data: ratings, error: ratingsError } = await supabase
      .from('ratings')
      .select('count')
      .limit(1)

    if (ratingsError) {
      return NextResponse.json(
        {
          error: 'Ratings table error',
          details: ratingsError,
        },
        { status: 500 }
      )
    }

    // Test 4: User profiles table
    const { data: profiles, error: profilesError } = await supabase
      .from('user_profiles')
      .select('count')
      .limit(1)

    if (profilesError) {
      return NextResponse.json(
        {
          error: 'User profiles table error',
          details: profilesError,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      status: 'success',
      message: 'Simple movie recommendation system ready!',
      environment: envCheck,
      database: {
        movies: {
          accessible: true,
          count: movies?.length || 0,
          sample: movies?.map(m => ({ id: m.id, title: m.title, rating: m.rating })),
        },
        ratings: {
          accessible: true,
          note: 'Ready for user ratings',
        },
        user_profiles: {
          accessible: true,
          note: 'Ready for user management',
        },
      },
      simplified_features: {
        removed: [
          'daily_spotlights table',
          'browse_categories table',
          'recommendation_queue table',
          'cast column from movies',
          'backdrop_url column from movies',
          'complex AI reasoning functions',
        ],
        simplified_to: [
          'Basic movies API with search/filter',
          'Simple recommendations by rating',
          'User ratings system',
          'Clean movie schema',
        ],
      },
      next_steps: [
        'Set up authentication',
        'Create user interface',
        'Implement user ratings',
        'Test recommendation algorithm',
      ],
    })
  } catch (error) {
    console.error('Test API error:', error)
    return NextResponse.json(
      {
        error: 'Test failed',
        details: error,
      },
      { status: 500 }
    )
  }
}
