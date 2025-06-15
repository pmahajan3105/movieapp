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
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    console.log('🔧 Saving preferences for user:', {
      userId: user.id,
      email: user.email,
      userMetadata: user.user_metadata,
    })

    const body = await request.json()
    const { preferred_genres, disliked_genres, preferred_rating_min, preferred_year_min } = body

    // Validate input
    if (!preferred_genres || !Array.isArray(preferred_genres) || preferred_genres.length === 0) {
      return NextResponse.json(
        { error: 'At least one preferred genre is required' },
        { status: 400 }
      )
    }

    const preferences = {
      preferred_genres,
      disliked_genres: disliked_genres || [],
      preferred_rating_min: preferred_rating_min || 6.0,
      preferred_year_min: preferred_year_min || 2000,
    }

    console.log('📝 Preferences to save:', preferences)

    // First, check if user profile exists
    const { data: existingProfile, error: profileCheckError } = await supabase
      .from('user_profiles')
      .select('id, email, full_name')
      .eq('id', user.id)
      .single()

    console.log('👤 Profile check result:', {
      exists: !!existingProfile,
      profile: existingProfile,
      error: profileCheckError?.message,
    })

    let result
    if (existingProfile) {
      // Update existing profile - only update preferences and updated_at
      console.log('🔄 Updating existing profile preferences only...')
      result = await supabase
        .from('user_profiles')
        .update({
          preferences,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)
        .select()

      console.log('📊 Update result:', {
        success: !result.error,
        error: result.error,
        data: result.data,
      })
    } else {
      // Create new profile with required email field
      console.log('➕ Creating new profile...')
      const profileData = {
        id: user.id,
        email: user.email || `user-${user.id}@temp.com`, // Better fallback email
        full_name:
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          user.email?.split('@')[0] ||
          'User',
        preferences,
        onboarding_completed: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      console.log('📋 Profile data to insert:', profileData)

      result = await supabase.from('user_profiles').insert(profileData)
    }

    if (result.error) {
      console.error('❌ Error saving preferences:', {
        error: result.error,
        code: result.error.code,
        message: result.error.message,
        details: result.error.details,
        hint: result.error.hint,
      })

      // If it's a constraint violation, try to provide more helpful error
      if (result.error.code === '23502') {
        return NextResponse.json(
          {
            error: 'User profile setup incomplete. Please contact support.',
            details: result.error.message,
          },
          { status: 500 }
        )
      }

      return NextResponse.json({ error: 'Failed to save preferences' }, { status: 500 })
    }

    console.log('✅ Successfully saved user preferences:', {
      userId: user.id,
      email: user.email,
      preferences,
      profileExists: !!existingProfile,
      operation: existingProfile ? 'update' : 'create',
    })

    return NextResponse.json({
      success: true,
      preferences,
      message: 'Preferences saved successfully',
    })
  } catch (error) {
    console.error('❌ Error saving user preferences:', error)
    return NextResponse.json(
      {
        error: 'Failed to save preferences',
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
