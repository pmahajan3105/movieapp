import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/client'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    // Parse parameters with fallbacks for invalid values
    const limitParam = searchParams.get('limit') || '20'
    const pageParam = searchParams.get('page') || '1'
    
    const limit = Math.max(1, parseInt(limitParam) || 20)
    const page = Math.max(1, parseInt(pageParam) || 1)
    const offset = (page - 1) * limit
    const usePreferences = searchParams.get('preferences') === 'true'

    console.log('🎬 Fetching movies from local database', { limit, page, offset, usePreferences })

    const supabase = await createServerClient()

    let data, error, totalCount = 0

    if (usePreferences) {
      // Get current user for preference-based recommendations
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        // Get user preferences
        const { data: userProfile } = await supabase
          .from('user_profiles')
          .select('preferences')
          .eq('id', user.id)
          .single()

        if (userProfile?.preferences) {
          console.log('🎯 Loading preference-based recommendations', userProfile.preferences)
          
          const preferences = userProfile.preferences as {
            preferred_genres?: string[]
            avoid_genres?: string[]
            yearRange?: { min?: number; max?: number }
            ratingRange?: { min?: number; max?: number }
          }
          let query = supabase.from('movies').select('*', { count: 'exact' })

          // Build query based on preferences
          if (preferences.preferred_genres && preferences.preferred_genres.length > 0) {
            // Use overlap operator to match any genre
            query = query.overlaps('genre', preferences.preferred_genres)
          }

          if (preferences.avoid_genres && preferences.avoid_genres.length > 0) {
            // Exclude movies with avoided genres
            query = query.not('genre', 'ov', preferences.avoid_genres)
          }

          if (preferences.yearRange) {
            if (preferences.yearRange.min) {
              query = query.gte('year', preferences.yearRange.min)
            }
            if (preferences.yearRange.max) {
              query = query.lte('year', preferences.yearRange.max)
            }
          }

          if (preferences.ratingRange?.min) {
            query = query.gte('rating', preferences.ratingRange.min)
          }

          // Order by rating and year for best recommendations
          const { data: prefData, error: prefError, count } = await query
            .order('rating', { ascending: false, nullsFirst: false })
            .order('year', { ascending: false, nullsFirst: false })
            .range(offset, offset + limit - 1)

          if (prefError) {
            console.error('❌ Error with preference-based query, falling back to general results')
            // Fall back to general query
          } else {
            data = prefData
            error = prefError
            totalCount = count || 0
            console.log('✅ Loaded preference-based recommendations', { 
              count: data?.length || 0,
              total: totalCount,
              preferences: {
                genres: preferences.preferred_genres,
                avoidGenres: preferences.avoid_genres,
                yearRange: preferences.yearRange,
                ratingMin: preferences.ratingRange?.min
              }
            })
          }
        }
      }
    }

    // Fall back to general movies if preferences didn't work or weren't requested
    if (!data) {
      console.log('🎬 Loading general movie recommendations')
      const { data: generalData, error: generalError, count } = await supabase
        .from('movies')
        .select('*', { count: 'exact' })
        .order('rating', { ascending: false, nullsFirst: false })
        .order('year', { ascending: false, nullsFirst: false })
        .range(offset, offset + limit - 1)

      data = generalData
      error = generalError
      totalCount = count || 0
    }

    if (error) {
      console.error('❌ Error fetching movies from database:', {
        error: error.message,
        code: error.code,
        details: error.details
      })
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to fetch movies from database' 
      }, { status: 500 })
    }

    console.log('✅ Successfully fetched movies from database', { 
      count: data?.length || 0,
      total: totalCount,
      hasMore: (data?.length || 0) === limit
    })

    return NextResponse.json({
      success: true,
      data: data || [],
      total: totalCount,
      pagination: {
        page,
        limit,
        hasMore: (data?.length || 0) === limit,
        totalPages: Math.ceil(totalCount / limit),
      },
    })
  } catch (error) {
    console.error('❌ Movies API error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}
