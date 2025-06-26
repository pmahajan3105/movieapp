import { NextRequest, NextResponse } from 'next/server'
import { createAuthenticatedApiHandler, withValidation } from '@/lib/api/factory'
import { z } from 'zod'

const preferenceSchema = z.object({
  genres: z.array(z.string()).optional(),
  actors: z.array(z.string()).optional(),
  directors: z.array(z.string()).optional(),
  moods: z.array(z.string()).optional(),
  themes: z.array(z.string()).optional(),
  yearRange: z
    .object({
      min: z.number(),
      max: z.number(),
    })
    .optional(),
  ratingRange: z
    .object({
      min: z.number(),
      max: z.number(),
    })
    .optional(),
  languages: z.array(z.string()).optional(),
  viewingContexts: z.array(z.string()).optional(),
  dislikedGenres: z.array(z.string()).optional(),
})

const patchSchema = z.object({
  field: z.string().min(1, 'Field name is required').max(50, 'Field name too long'),
  value: z.union(
    [
      z.string(),
      z.number(),
      z.boolean(),
      z.array(z.string()),
      z.object({
        min: z.number(),
        max: z.number(),
      }),
    ],
    {
      errorMap: () => ({
        message: 'Value must be string, number, boolean, array of strings, or min/max object',
      }),
    }
  ),
  operation: z.enum(['set', 'add', 'remove']).optional().default('set'),
})

// ---------------------------------------------------------------------------
// GET – Retrieve preferences
// ---------------------------------------------------------------------------
export const GET = createAuthenticatedApiHandler(
  async (_request: NextRequest, { supabase, user }) => {
    const { data: userProfile, error } = await supabase
      .from('user_profiles')
      .select('preferences, onboarding_completed, updated_at')
      .eq('id', user.id)
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
  }
)

// ---------------------------------------------------------------------------
// PUT – Update preferences
// ---------------------------------------------------------------------------
export const PUT = createAuthenticatedApiHandler(
  async (request: NextRequest, { supabase, user }) => {
    const preferences = await withValidation(request, preferenceSchema)

    const { data, error } = await supabase
      .from('user_profiles')
      .upsert({
        id: user.id,
        preferences,
        onboarding_completed: true,
        updated_at: new Date().toISOString(),
      } as any)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({
      success: true,
      preferences: data.preferences,
      message: 'Preferences updated successfully',
    })
  }
)

// ---------------------------------------------------------------------------
// PATCH – Partially update preferences
// ---------------------------------------------------------------------------
export const PATCH = createAuthenticatedApiHandler(
  async (request: NextRequest, { supabase, user }) => {
    const { field, value, operation = 'set' } = await withValidation(request, patchSchema)

    if (!field) {
      throw new Error('Field is required')
    }

    // Get current preferences
    const { data: currentProfile, error: fetchError } = await supabase
      .from('user_profiles')
      .select('preferences')
      .eq('id', user.id)
      .single()

    if (fetchError && fetchError.code !== 'PGRST116') {
      throw fetchError
    }

    const currentPreferences: any = (currentProfile?.preferences as any) || {}

    // Apply the update based on operation
    const updatedPreferences: any = { ...(currentPreferences as any) }

    switch (operation) {
      case 'set':
        ;(updatedPreferences as Record<string, unknown>)[field] = value
        break
      case 'add':
        if (Array.isArray((updatedPreferences as Record<string, unknown>)[field])) {
          const arrayValue = Array.isArray(value) ? value : [value]
          ;(updatedPreferences as Record<string, unknown>)[field] = [
            ...((updatedPreferences as Record<string, unknown>)[field] as string[]),
            ...arrayValue,
          ]
        } else {
          ;(updatedPreferences as Record<string, unknown>)[field] = value
        }
        break
      case 'remove':
        if (Array.isArray((updatedPreferences as Record<string, unknown>)[field])) {
          const removeValues = Array.isArray(value) ? value : [value]
          ;(updatedPreferences as Record<string, unknown>)[field] = (
            (updatedPreferences as Record<string, unknown>)[field] as string[]
          ).filter((item: string) => !removeValues.includes(item))
        }
        break
      default:
        throw new Error('Invalid operation')
    }

    // Validate the updated preferences
    const validatedPreferences = preferenceSchema.parse(updatedPreferences)

    // Update in database
    const { data, error: updateError } = await supabase
      .from('user_profiles')
      .upsert({
        id: user.id,
        preferences: validatedPreferences,
        onboarding_completed: true,
        updated_at: new Date().toISOString(),
      } as any)
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
  }
)

// ---------------------------------------------------------------------------
// DELETE – Reset preferences
// ---------------------------------------------------------------------------
export const DELETE = createAuthenticatedApiHandler(
  async (_request: NextRequest, { supabase, user }) => {
    const { error } = await supabase
      .from('user_profiles')
      .update({
        preferences: null,
        onboarding_completed: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)

    if (error) throw error

    return NextResponse.json({
      success: true,
      message: 'Preferences reset successfully',
    })
  }
)
