import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/client'

// Get user's ratings (like/dislike only)
export async function GET() {
  try {
    const supabase = await createServerClient()

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { data: ratings, error } = await supabase
      .from('ratings')
      .select(
        `
        id,
        movie_id,
        interested,
        interaction_type,
        rated_at,
        movies:movie_id (
          id,
          title,
          year,
          genre,
          poster_url,
          rating
        )
      `
      )
      .eq('user_id', user.id)
      .order('rated_at', { ascending: false })

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch ratings' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: ratings || [],
    })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

// Add or update a like/dislike rating
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { movie_id, interested } = await request.json()

    if (!movie_id || interested === undefined) {
      return NextResponse.json(
        { success: false, error: 'Movie ID and interested status are required' },
        { status: 400 }
      )
    }

    const ratingData = {
      user_id: user.id,
      movie_id,
      interested,
      interaction_type: interested ? 'like' : 'dislike',
      source: 'api',
    }

    const { data, error } = await supabase
      .from('ratings')
      .upsert(ratingData, {
        onConflict: 'user_id,movie_id',
        ignoreDuplicates: false,
      })
      .select()

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ success: false, error: 'Failed to save rating' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: data?.[0],
      message: 'Rating saved successfully',
    })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

// Delete a rating
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createServerClient()

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { movie_id } = await request.json()

    if (!movie_id) {
      return NextResponse.json({ success: false, error: 'Movie ID is required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('ratings')
      .delete()
      .eq('user_id', user.id)
      .eq('movie_id', movie_id)

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to delete rating' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Rating deleted successfully',
    })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
