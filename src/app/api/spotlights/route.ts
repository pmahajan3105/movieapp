import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const user_id = searchParams.get('user_id');
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];

    if (!user_id) {
      return NextResponse.json(
        { error: 'Missing user_id parameter' },
        { status: 400 }
      );
    }

    // Fetch daily spotlights with movie details
    const { data, error } = await supabase
      .from('daily_spotlights')
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
          backdrop_url,
          rating,
          runtime,
          tmdb_id,
          imdb_id
        )
      `)
      .eq('user_id', user_id)
      .eq('generated_date', date)
      .order('position', { ascending: true });

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch spotlights' },
        { status: 500 }
      );
    }

    // If no spotlights exist for today, generate them
    if (!data || data.length === 0) {
      const generated = await generateDailySpotlights(user_id, date);
      return NextResponse.json({ 
        data: generated, 
        success: true,
        generated: true 
      });
    }

    return NextResponse.json({ 
      data, 
      success: true,
      generated_date: date 
    });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user_id, force_regenerate } = await request.json();

    if (!user_id) {
      return NextResponse.json(
        { error: 'Missing user_id' },
        { status: 400 }
      );
    }

    const date = new Date().toISOString().split('T')[0];

    // Delete existing spotlights if force regenerating
    if (force_regenerate) {
      await supabase
        .from('daily_spotlights')
        .delete()
        .eq('user_id', user_id)
        .eq('generated_date', date);
    }

    // Generate new spotlights
    const spotlights = await generateDailySpotlights(user_id, date);

    return NextResponse.json({ 
      data: spotlights, 
      success: true,
      regenerated: true 
    });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function generateDailySpotlights(user_id: string, date: string) {
  try {
    // Get user preferences
    const { data: preferences } = await supabase
      .rpc('get_user_preferences_summary', { p_user_id: user_id });

    // Get unrated movies (simplified for now - in production, use AI to select)
    const { data: movies, error: moviesError } = await supabase
      .from('movies')
      .select('*')
      .not('id', 'in', 
        `(SELECT movie_id FROM ratings WHERE user_id = '${user_id}')`
      )
      .limit(5);

    if (moviesError) {
      throw moviesError;
    }

    if (!movies || movies.length === 0) {
      return [];
    }

    // Create spotlight entries with AI reasoning (simplified)
    const spotlightData = movies.map((movie, index) => ({
      user_id,
      movie_id: movie.id,
      position: index + 1,
      ai_reason: generateAIReason(movie, preferences),
      confidence_score: Math.random() * 0.3 + 0.7, // 0.7-1.0 range
      generated_date: date,
      viewed: false
    }));

    // Insert spotlights
    const { data: insertedSpotlights, error: insertError } = await supabase
      .from('daily_spotlights')
      .insert(spotlightData)
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
          backdrop_url,
          rating,
          runtime
        )
      `);

    if (insertError) {
      throw insertError;
    }

    return insertedSpotlights || [];
  } catch (error) {
    console.error('Error generating spotlights:', error);
    return [];
  }
}

function generateAIReason(movie: any, preferences: any): string {
  const reasons = [
    `Based on your viewing history, this ${movie.genre?.[0]?.toLowerCase()} film aligns perfectly with your taste for quality storytelling.`,
    `The cinematography and direction in this film showcase the artistic elements you appreciate in cinema.`,
    `This critically acclaimed movie features the type of compelling narrative structure you've enjoyed in similar films.`,
    `Given your interest in character-driven stories, this film's depth and emotional resonance make it an excellent match.`,
    `The innovative storytelling and technical excellence in this movie align with your preference for groundbreaking cinema.`
  ];
  
  return reasons[Math.floor(Math.random() * reasons.length)];
} 