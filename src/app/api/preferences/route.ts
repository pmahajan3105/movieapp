import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getAuthenticatedUserId } from '@/lib/auth-server'
import { z } from 'zod'

const preferenceSchema = z.object({
  genres: z.array(z.string()).optional(),
  actors: z.array(z.string()).optional(),
  directors: z.array(z.string()).optional(),
  moods: z.array(z.string()).optional(),
  themes: z.array(z.string()).optional(),
  yearRange: z.object({
    min: z.number(),
    max: z.number()
  }).optional(),
  ratingRange: z.object({
    min: z.number(),
    max: z.number()
  }).optional(),
  languages: z.array(z.string()).optional(),
  viewingContexts: z.array(z.string()).optional(),
  dislikedGenres: z.array(z.string()).optional(),
})

type PreferenceUpdate = z.infer<typeof preferenceSchema>

// GET - Retrieve user preferences
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
      .select('preferences, onboarding_completed, updated_at')
      .eq('id', userId)
      .single()

    if (error && error.code !== 'PGRST116') {
      throw error
    }

    return NextResponse.json({
      success: true,
      preferences: userProfile?.preferences || null,
      onboardingCompleted: userProfile?.onboarding_completed || false,
      lastUpdated: userProfile?.updated_at || null,
    })

  } catch (error) {
    console.error('❌ Error fetching preferences:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch preferences',
        success: false 
      },
      { status: 500 }
    )
  }
}

// PUT - Update user preferences
export async function PUT(request: NextRequest) {
  try {
    // Get authenticated user
    const userId = await getAuthenticatedUserId()
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required', success: false },
        { status: 401 }
      )
    }

    const body = await request.json()
    const preferences = preferenceSchema.parse(body)

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // Upsert user preferences
    const { data, error } = await supabase
      .from('user_profiles')
      .upsert({
        id: userId,
        preferences,
        onboarding_completed: true,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json({
      success: true,
      preferences: data.preferences,
      message: 'Preferences updated successfully',
    })

  } catch (error) {
    console.error('❌ Error updating preferences:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid preference data',
          details: error.errors,
          success: false,
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { 
        error: 'Failed to update preferences',
        success: false 
      },
      { status: 500 }
    )
  }
}

// PATCH - Partially update preferences
export async function PATCH(request: NextRequest) {
  try {
    // Get authenticated user
    const userId = await getAuthenticatedUserId()
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required', success: false },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { field, value, operation = 'set' } = body

    if (!field) {
      return NextResponse.json(
        { error: 'Field is required', success: false },
        { status: 400 }
      )
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // Get current preferences
    const { data: currentProfile, error: fetchError } = await supabase
      .from('user_profiles')
      .select('preferences')
      .eq('id', userId)
      .single()

    if (fetchError && fetchError.code !== 'PGRST116') {
      throw fetchError
    }

    const currentPreferences = currentProfile?.preferences || {}

    // Apply the update based on operation
    const updatedPreferences: PreferenceUpdate = { ...currentPreferences }

    switch (operation) {
      case 'set':
        (updatedPreferences as Record<string, unknown>)[field] = value
        break
      case 'add':
        if (Array.isArray((updatedPreferences as Record<string, unknown>)[field])) {
          (updatedPreferences as Record<string, unknown>)[field] = [...((updatedPreferences as Record<string, unknown>)[field] as string[]), ...value]
        } else {
          (updatedPreferences as Record<string, unknown>)[field] = value
        }
        break
      case 'remove':
        if (Array.isArray((updatedPreferences as Record<string, unknown>)[field])) {
          (updatedPreferences as Record<string, unknown>)[field] = ((updatedPreferences as Record<string, unknown>)[field] as string[]).filter((item: string) => !value.includes(item))
        }
        break
      default:
        return NextResponse.json(
          { error: 'Invalid operation', success: false },
          { status: 400 }
        )
    }

    // Validate the updated preferences
    const validatedPreferences = preferenceSchema.parse(updatedPreferences)

    // Update in database
    const { data, error: updateError } = await supabase
      .from('user_profiles')
      .upsert({
        id: userId,
        preferences: validatedPreferences,
        onboarding_completed: true,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (updateError) {
      throw updateError
    }

    return NextResponse.json({
      success: true,
      preferences: data.preferences,
      message: `Preference ${field} ${operation}ed successfully`,
    })

  } catch (error) {
    console.error('❌ Error partially updating preferences:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid preference data after update',
          details: error.errors,
          success: false,
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { 
        error: 'Failed to update preferences',
        success: false 
      },
      { status: 500 }
    )
  }
}

// DELETE - Reset preferences
export async function DELETE() {
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

    const { error } = await supabase
      .from('user_profiles')
      .update({
        preferences: null,
        onboarding_completed: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)

    if (error) {
      throw error
    }

    return NextResponse.json({
      success: true,
      message: 'Preferences reset successfully',
    })

  } catch (error) {
    console.error('❌ Error resetting preferences:', error)
    return NextResponse.json(
      { 
        error: 'Failed to reset preferences',
        success: false 
      },
      { status: 500 }
    )
  }
} 