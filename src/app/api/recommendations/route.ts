import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');

    // For now, just return top-rated movies (since we don't have auth setup yet)
    // In production, this would use the user_id and the generate_simple_recommendations function
    const { data: movies, error } = await supabase
      .from('movies')
      .select(`
        id,
        title,
        year,
        genre,
        director,
        plot,
        poster_url,
        rating,
        runtime,
        omdb_id,
        imdb_id,
        tmdb_id
      `)
      .order('rating', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch recommendations' },
        { status: 500 }
      );
    }

    // Transform to recommendation format
    const recommendations = movies?.map((movie, index) => ({
      ...movie,
      recommendation_score: (movie.rating || 0) / 10,
      reason: generateSimpleReason(movie, index)
    })) || [];

    return NextResponse.json({
      success: true,
      data: recommendations,
      total: recommendations.length
    });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function generateSimpleReason(movie: any, index: number): string {
  const reasons = [
    `Highly rated ${movie.genre?.[0]?.toLowerCase()} movie`,
    `Critics' choice with ${movie.rating}/10 rating`,
    `Popular ${movie.year} release`,
    `Acclaimed work by ${movie.director?.[0]}`,
    `Must-watch ${movie.genre?.[0]?.toLowerCase()} film`
  ];
  
  return reasons[index % reasons.length] || reasons[0];
} 