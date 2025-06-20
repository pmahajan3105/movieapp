import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/client'

export async function GET() {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    return NextResponse.json({
      success: true,
      preferences: userProfile?.preferences || null,
      hasPreferences: !!userProfile?.preferences?.preferred_genres,
    })
  } catch (error) {
    console.error('❌ Error fetching user preferences:', error)
    return NextResponse.json({ error: 'Failed to fetch preferences' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { preferences } = body

    if (!preferences) {
      return NextResponse.json({ error: 'Preferences data is required' }, { status: 400 })
    }

    const supabase = await createServerClient()

    // Get the authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      console.error('❌ Authentication error:', authError?.message)
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    console.log('💾 Saving preferences for user:', user.id)
    console.log('📝 Preferences data:', preferences)

    // Prepare the profile data
    const profileData = {
      id: user.id,
      email: user.email || '',
      preferences: {
        preferred_genres: preferences.preferred_genres || [],
        avoid_genres: preferences.avoid_genres || [],
        favorite_movies: preferences.favorite_movies || [],
        favorite_actors: preferences.favorite_actors || [],
        favorite_directors: preferences.favorite_directors || [],
        themes: preferences.themes || [],
        preferred_eras: preferences.preferred_eras || [],
        additional_notes: preferences.additional_notes || '',
        updated_at: new Date().toISOString(),
      },
      onboarding_completed: true,
      updated_at: new Date().toISOString(),
    }

    // Try to upsert the user profile
    const { data, error } = await supabase
      .from('user_profiles')
      .upsert(profileData, {
        onConflict: 'id',
      })
      .select()

    if (error) {
      console.error('❌ Database error saving preferences:', error)
      return NextResponse.json(
        {
          error: 'Failed to save preferences',
          details: error.message,
          code: error.code,
        },
        { status: 500 }
      )
    }

    console.log('✅ Preferences saved successfully:', data)

    return NextResponse.json({
      success: true,
      data: data[0],
    })
  } catch (error) {
    console.error('❌ Unexpected error saving preferences:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

export async function DELETE() {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    console.log('🗑️ Clearing manual preferences for user:', user.id)

    // Clear preferences by setting to null
    const { error } = await supabase
      .from('user_profiles')
      .update({
        preferences: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)

    if (error) {
      console.error('❌ Error clearing preferences:', error)
      return NextResponse.json({ error: 'Failed to clear preferences' }, { status: 500 })
    }

    console.log('✅ Successfully cleared manual preferences for user:', user.id)

    return NextResponse.json({
      success: true,
      message: 'Manual preferences cleared successfully',
    })
  } catch (error) {
    console.error('❌ Error clearing user preferences:', error)
    return NextResponse.json(
      {
        error: 'Failed to clear preferences',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
