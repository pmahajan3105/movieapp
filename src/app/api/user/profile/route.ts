import { NextRequest, NextResponse } from 'next/server'
import { createRouteSupabaseClient } from '@/lib/supabase/route-client'
import { z } from 'zod'
import { logger } from '@/lib/logger'

const profileUpdateSchema = z.object({
  fullName: z.string().optional(),
})

// GET - Get user profile information
export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteSupabaseClient(request)
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    logger.info('Checking profile for user', {
      userId: user.id,
      email: user.email,
      userMetadata: user.user_metadata,
    })

    const { data: userProfile, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    logger.info('Profile query result', {
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
    logger.apiError('/api/user/profile', error as Error)
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 })
  }
}

// PUT - Update user profile information
export async function PUT(request: NextRequest) {
  try {
    const supabase = createRouteSupabaseClient(request)
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
      logger.dbError('profile update', error as Error)
      throw error
    }

    logger.info('Profile updated successfully', { userId: user.id, fullName: body.fullName })

    return NextResponse.json({
      success: true,
      profile: data,
      message: 'Profile updated successfully',
    })
  } catch (error) {
    logger.apiError('/api/user/profile', error as Error)

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

// PATCH - Update user profile information (alternative to PUT)
export async function PATCH(request: NextRequest) {
  try {
    const supabase = createRouteSupabaseClient(request)
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const body = await request.json()

    logger.info('PATCH request to update profile', {
      userId: user.id,
      updates: body,
    })

    // Build update object dynamically
    const updateData: any = {
      updated_at: new Date().toISOString(),
    }

    if (body.full_name !== undefined) {
      updateData.full_name = body.full_name
    }

    // Update user profile
    const { data, error } = await supabase
      .from('user_profiles')
      .update(updateData)
      .eq('id', user.id)
      .select()
      .single()

    if (error) {
      logger.dbError('profile update via PATCH', error as Error)
      return NextResponse.json(
        {
          success: false,
          error: error.message || 'Failed to update profile',
        },
        { status: 500 }
      )
    }

    logger.info('Profile updated successfully via PATCH', {
      userId: user.id,
      updates: updateData,
    })

    return NextResponse.json({
      success: true,
      profile: data,
      message: 'Profile updated successfully',
    })
  } catch (error) {
    logger.apiError('/api/user/profile', error as Error)

    return NextResponse.json(
      {
        error: 'Failed to update profile',
        success: false,
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteSupabaseClient(request)
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    logger.info('Creating/fixing profile for user', {
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

    logger.debug('Profile data to upsert', { profileData })

    const { data: profile, error } = await supabase
      .from('user_profiles')
      .upsert(profileData, {
        onConflict: 'id',
      })
      .select()
      .single()

    if (error) {
      logger.dbError('profile creation/update', error as Error, {
        code: error.code,
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

    logger.info('Successfully created/updated profile', { profile })

    return NextResponse.json({
      success: true,
      message: 'Profile created/updated successfully',
      profile,
    })
  } catch (error) {
    logger.apiError('/api/user/profile', error as Error)
    return NextResponse.json(
      {
        error: 'Failed to create profile',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
