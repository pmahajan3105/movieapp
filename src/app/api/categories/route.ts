/* eslint-disable */
// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { withSupabase, withError } from '@/lib/api/factory'
import { createClient } from '@supabase/supabase-js'

// Untyped global client for browse_categories helper tables
const supabase: any = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export const GET = withError(
  withSupabase(async ({ request, supabase }) => {
    try {
      const { searchParams } = new URL(request.url)
      const user_id = searchParams.get('user_id')
      const date = (searchParams.get('date') || new Date().toISOString().split('T')[0]) as string
      const limit = parseInt(searchParams.get('limit') || '6')

      if (!user_id) {
        return NextResponse.json({ error: 'Missing user_id' }, { status: 400 })
      }

      // Type-safe user_id after validation - we know it's not null here
      const validUserId = user_id!

      // Check if categories exist for today
      const { data, error } = await supabase
        .from('browse_categories')
        .select('*')
        .eq('user_id', validUserId)
        .eq('generated_date', date)
        .order('position')
        .limit(limit)

      if (error) {
        console.error('Database error:', error)
        return NextResponse.json({ error: 'Database error' }, { status: 500 })
      }

      // If no categories exist, generate them
      if (!data || data.length === 0) {
        const generated = await generateBrowseCategories(validUserId, date, limit)
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
  })
)

export const POST = withError(
  withSupabase(async ({ request, supabase }) => {
    try {
      const { user_id, force_regenerate, limit = 6 } = await request.json()

      if (!user_id) {
        return NextResponse.json({ error: 'Missing user_id' }, { status: 400 })
      }

      // Type-safe user_id after validation - we know it's not null here
      const validUserId = user_id!
      const date = new Date().toISOString().split('T')[0] as string

      // Delete existing categories if force regenerating
      if (force_regenerate) {
        await supabase
          .from('browse_categories')
          .delete()
          .eq('user_id', validUserId)
          .eq('generated_date', date)
      }

      // Generate new categories
      const categories = await generateBrowseCategories(validUserId, date, limit)

      return NextResponse.json({
        data: categories,
        success: true,
        regenerated: true,
      })
    } catch (error) {
      console.error('API error:', error)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  })
)

async function generateBrowseCategories(user_id: string, date: string, limit: number) {
  try {
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
        // Get movies for this category (simple genre-based filtering)
        const { data: movies, error: moviesError } = await supabase
          .from('movies')
          .select('id')
          .overlaps('genre', template.genres)
          .limit(20)

        if (moviesError || !movies || movies.length === 0) {
          // Fallback to any movies if no matches
          const { data: fallbackMovies } = await supabase.from('movies').select('id').limit(20)

          const movieIds = fallbackMovies?.map((m: any) => m.id) || []

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
