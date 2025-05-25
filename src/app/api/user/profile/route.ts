import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { getAuthenticatedUserId, requireAuth } from '@/lib/auth-server'

const profileUpdateSchema = z.object({
  fullName: z.string().optional(),
})

// GET - Get user profile information
export async function GET() {
  try {
    // Get authenticated user
    const userId = await getAuthenticatedUserId()
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required', success: false },
        { status: 401 }
      )
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const { data: userProfile, error } = await supabase
      .from('user_profiles')
      .select('id, email, preferences, onboarding_completed, created_at, updated_at')
      .eq('id', userId)
      .single()

    if (error && error.code !== 'PGRST116') {
      throw error
    }

    if (!userProfile) {
      return NextResponse.json(
        { error: 'User profile not found', success: false },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      profile: {
        id: userProfile.id,
        email: userProfile.email,
        onboardingCompleted: userProfile.onboarding_completed,
        createdAt: userProfile.created_at,
        updatedAt: userProfile.updated_at,
      },
    })

  } catch (error) {
    console.error('❌ Error fetching user profile:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch user profile',
        success: false 
      },
      { status: 500 }
    )
  }
}

// PUT - Update user profile information
export async function PUT(request: NextRequest) {
  try {
    // Get authenticated user
    const user = await requireAuth()
    const userId = user.id

    const body = await request.json()
    profileUpdateSchema.parse(body) // Validate input format

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // Update user profile
    const { data, error } = await supabase
      .from('user_profiles')
      .update({
        updated_at: new Date().toISOString(),
        // Note: We can't update fullName directly as it's not in the current schema
        // This would require a database migration to add a full_name column
      })
      .eq('id', userId)
      .select()
      .single()

    if (error) {
      throw error
    }

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
        success: false 
      },
      { status: 500 }
    )
  }
} 