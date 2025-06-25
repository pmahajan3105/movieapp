import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/client'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()

    // Get the authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { movieId, action, rating } = await request.json()

    if (!movieId || !action) {
      return NextResponse.json({ error: 'Movie ID and action are required' }, { status: 400 })
    }

    // Record the interaction
    const { data, error } = await supabase.from('ratings').insert({
      user_id: user.id,
      movie_id: movieId,
      interested: action === 'like',
      rating: rating || null,
      interaction_type: action,
      source: 'web',
    })

    if (error) {
      console.error('Failed to record interaction:', error)
      return NextResponse.json({ error: 'Failed to record interaction' }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('POST /api/user/interactions error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()

    // Get the authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')

    // Get user's interaction history
    const { data, error } = await supabase
      .from('ratings')
      .select(
        `
        *,
        movies (*)
      `
      )
      .eq('user_id', user.id)
      .order('rated_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Failed to fetch interactions:', error)
      return NextResponse.json({ error: 'Failed to fetch interactions' }, { status: 500 })
    }

    return NextResponse.json({ success: true, interactions: data || [] })
  } catch (error) {
    console.error('GET /api/user/interactions error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
