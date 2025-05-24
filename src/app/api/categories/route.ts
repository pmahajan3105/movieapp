import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const user_id = searchParams.get('user_id')
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0]
    const limit = parseInt(searchParams.get('limit') || '6')

    if (!user_id) {
      return NextResponse.json({ error: 'Missing user_id parameter' }, { status: 400 })
    }

    // Fetch browse categories
    const { data, error } = await supabase
      .from('browse_categories')
      .select('*')
      .eq('user_id', user_id)
      .eq('generated_date', date)
      .order('position', { ascending: true })
      .limit(limit)

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 })
    }

    // If no categories exist for today, generate them
    if (!data || data.length === 0) {
      const generated = await generateBrowseCategories(user_id, date, limit)
      return NextResponse.json({
        data: generated,
        success: true,
        generated: true,
      })
    }

    // Fetch movies for each category
    const categoriesWithMovies = await Promise.all(
      data.map(async category => {
        const { data: movies, error: moviesError } = await supabase
          .from('movies')
          .select('*')
          .in('id', category.movie_ids)
          .limit(20)

        if (moviesError) {
          console.error('Error fetching movies for category:', moviesError)
          return { ...category, movies: [] }
        }

        return { ...category, movies: movies || [] }
      })
    )

    return NextResponse.json({
      data: categoriesWithMovies,
      success: true,
      generated_date: date,
    })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user_id, force_regenerate, limit = 6 } = await request.json()

    if (!user_id) {
      return NextResponse.json({ error: 'Missing user_id' }, { status: 400 })
    }

    const date = new Date().toISOString().split('T')[0]

    // Delete existing categories if force regenerating
    if (force_regenerate) {
      await supabase
        .from('browse_categories')
        .delete()
        .eq('user_id', user_id)
        .eq('generated_date', date)
    }

    // Generate new categories
    const categories = await generateBrowseCategories(user_id, date, limit)

    return NextResponse.json({
      data: categories,
      success: true,
      regenerated: true,
    })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function generateBrowseCategories(user_id: string, date: string, limit: number) {
  try {
    // Get user preferences
    const { data: preferences } = await supabase.rpc('get_user_preferences_summary', {
      p_user_id: user_id,
    })

    // Define category templates
    const categoryTemplates = [
      {
        name: 'Mind-Bending Sci-Fi',
        description: 'Films that challenge perception and explore the nature of reality',
        genres: ['Sci-Fi', 'Thriller'],
        keywords: ['mind', 'reality', 'future', 'space'],
      },
      {
        name: 'Visually Stunning Epics',
        description: 'Cinematographically magnificent films that showcase visual storytelling',
        genres: ['Adventure', 'Drama', 'Fantasy'],
        keywords: ['visual', 'epic', 'grand', 'beautiful'],
      },
      {
        name: 'Character-Driven Dramas',
        description: 'Deep, emotional stories focusing on complex character development',
        genres: ['Drama'],
        keywords: ['character', 'emotional', 'deep', 'personal'],
      },
      {
        name: 'Modern Classics',
        description: 'Contemporary films that have achieved critical acclaim and cultural impact',
        genres: ['Drama', 'Thriller', 'Comedy'],
        keywords: ['modern', 'acclaimed', 'award', 'classic'],
      },
      {
        name: 'Hidden Gems',
        description: 'Lesser-known films that deserve more attention and recognition',
        genres: ['Drama', 'Comedy', 'Thriller'],
        keywords: ['indie', 'unknown', 'discover', 'gem'],
      },
      {
        name: 'International Cinema',
        description: 'Outstanding films from directors around the world',
        genres: ['Drama', 'Romance', 'Thriller'],
        keywords: ['international', 'foreign', 'world', 'culture'],
      },
    ]

    // Select random categories
    const selectedTemplates = categoryTemplates.sort(() => Math.random() - 0.5).slice(0, limit)

    // Generate categories with movies
    const categories = await Promise.all(
      selectedTemplates.map(async (template, index) => {
        // Get movies for this category (simplified - in production, use AI/ML)
        const { data: movies, error: moviesError } = await supabase
          .from('movies')
          .select('id')
          .overlaps('genre', template.genres)
          .not('id', 'in', `(SELECT movie_id FROM ratings WHERE user_id = '${user_id}')`)
          .limit(20)

        if (moviesError || !movies || movies.length === 0) {
          // Fallback to any movies if no matches
          const { data: fallbackMovies } = await supabase.from('movies').select('id').limit(20)

          const movieIds = fallbackMovies?.map(m => m.id) || []

          return {
            user_id,
            category_name: template.name,
            ai_description: template.description,
            movie_ids: movieIds,
            generated_date: date,
            position: index,
            created_at: new Date().toISOString(),
          }
        }

        const movieIds = movies.map(m => m.id)

        return {
          user_id,
          category_name: template.name,
          ai_description: template.description,
          movie_ids: movieIds,
          generated_date: date,
          position: index,
          created_at: new Date().toISOString(),
        }
      })
    )

    // Insert categories
    const { data: insertedCategories, error: insertError } = await supabase
      .from('browse_categories')
      .insert(categories)
      .select('*')

    if (insertError) {
      console.error('Error inserting categories:', insertError)
      return []
    }

    // Fetch movies for each category
    const categoriesWithMovies = await Promise.all(
      (insertedCategories || []).map(async category => {
        const { data: movies, error: moviesError } = await supabase
          .from('movies')
          .select('*')
          .in('id', category.movie_ids)
          .limit(20)

        if (moviesError) {
          console.error('Error fetching movies for category:', moviesError)
          return { ...category, movies: [] }
        }

        return { ...category, movies: movies || [] }
      })
    )

    return categoriesWithMovies
  } catch (error) {
    console.error('Error generating categories:', error)
    return []
  }
}
