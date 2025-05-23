import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { movie_id, interested, rating, interaction_type, source, user_id } = await request.json();

    if (!movie_id || typeof interested !== 'boolean' || !user_id) {
      return NextResponse.json(
        { error: 'Missing required fields: movie_id, interested, user_id' },
        { status: 400 }
      );
    }

    // Insert or update rating
    const { data, error } = await supabase
      .from('ratings')
      .upsert({
        user_id,
        movie_id,
        interested,
        rating: rating || null,
        interaction_type: interaction_type || 'browse',
        source: source || 'browse',
        rated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,movie_id'
      })
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to save rating' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data, success: true });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const user_id = searchParams.get('user_id');
    const movie_id = searchParams.get('movie_id');

    if (!user_id) {
      return NextResponse.json(
        { error: 'Missing user_id parameter' },
        { status: 400 }
      );
    }

    let query = supabase
      .from('ratings')
      .select(`
        *,
        movies:movie_id (
          id,
          title,
          year,
          genre,
          director,
          cast,
          plot,
          poster_url,
          rating,
          runtime
        )
      `)
      .eq('user_id', user_id);

    if (movie_id) {
      query = query.eq('movie_id', movie_id);
    }

    const { data, error } = await query.order('rated_at', { ascending: false });

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch ratings' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data, success: true });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 