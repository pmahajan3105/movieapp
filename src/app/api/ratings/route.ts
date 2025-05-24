import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Get user's ratings
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const user_id = searchParams.get('user_id')

    if (!user_id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    const { data: ratings, error } = await supabase
      .from('ratings')
      .select(
        `
        id,
        movie_id,
        rating,
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
      .eq('user_id', user_id)
      .order('rated_at', { ascending: false })

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: 'Failed to fetch ratings' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: ratings || [],
    })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Add or update a rating
export async function POST(request: NextRequest) {
  try {
    const { user_id, movie_id, rating, interested } = await request.json()

    if (!user_id || !movie_id || interested === undefined) {
      return NextResponse.json(
        { error: 'User ID, Movie ID, and interested status are required' },
        { status: 400 }
      )
    }

    const ratingData = {
      user_id,
      movie_id,
      rating: rating || null,
      interested,
      interaction_type: rating ? 'quick_rate' : interested ? 'like' : 'dislike',
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
      return NextResponse.json({ error: 'Failed to save rating' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: data?.[0],
      message: 'Rating saved successfully',
    })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Delete a rating
export async function DELETE(request: NextRequest) {
  try {
    const { user_id, movie_id } = await request.json()

    if (!user_id || !movie_id) {
      return NextResponse.json({ error: 'User ID and Movie ID are required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('ratings')
      .delete()
      .eq('user_id', user_id)
      .eq('movie_id', movie_id)

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: 'Failed to delete rating' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Rating deleted successfully',
    })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
