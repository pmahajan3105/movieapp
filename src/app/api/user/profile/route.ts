import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/client'
import { z } from 'zod'

const profileUpdateSchema = z.object({
  fullName: z.string().optional(),
})

// GET - Get user profile information
export async function GET() {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    console.log('🔍 Checking profile for user:', {
      userId: user.id,
      email: user.email,
      userMetadata: user.user_metadata,
    })

    const { data: userProfile, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    console.log('👤 Profile query result:', {
      found: !!userProfile,
      profile: userProfile,
      error: error?.message,
    })

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        metadata: user.user_metadata,
      },
      profile: userProfile,
      hasProfile: !!userProfile,
      error: error?.message,
    })
  } catch (error) {
    console.error('❌ Error fetching user profile:', error)
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 })
  }
}

// PUT - Update user profile information
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const body = await request.json()
    profileUpdateSchema.parse(body) // Validate input format

    // Update user profile
    const { data, error } = await supabase
      .from('user_profiles')
      .update({
        full_name: body.fullName,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)
      .select()
      .single()

    if (error) {
      console.error('❌ Supabase error updating profile:', error)
      throw error
    }

    console.log('✅ Profile updated successfully:', { userId: user.id, fullName: body.fullName })

    return NextResponse.json({
      success: true,
      profile: data,
      message: 'Profile updated successfully',
    })
  } catch (error) {
    console.error('❌ Error updating user profile:', error)

    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json(
        { error: 'Authentication required', success: false },
        { status: 401 }
      )
    }

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid profile data',
          details: error.errors,
          success: false,
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        error: 'Failed to update profile',
        success: false,
      },
      { status: 500 }
    )
  }
}

export async function POST() {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    console.log('🔧 Creating/fixing profile for user:', {
      userId: user.id,
      email: user.email,
      userMetadata: user.user_metadata,
    })

    // Try to create or update the profile
    const profileData = {
      id: user.id,
      email: user.email || `user-${user.id}@temp.com`,
      full_name:
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        user.email?.split('@')[0] ||
        'User',
      onboarding_completed: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    console.log('📋 Profile data to upsert:', profileData)

    const { data: profile, error } = await supabase
      .from('user_profiles')
      .upsert(profileData, {
        onConflict: 'id',
      })
      .select()
      .single()

    if (error) {
      console.error('❌ Error creating/updating profile:', {
        error,
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      })
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          details: error,
        },
        { status: 500 }
      )
    }

    console.log('✅ Successfully created/updated profile:', profile)

    return NextResponse.json({
      success: true,
      message: 'Profile created/updated successfully',
      profile,
    })
  } catch (error) {
    console.error('❌ Error in profile creation:', error)
    return NextResponse.json(
      {
        error: 'Failed to create profile',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
