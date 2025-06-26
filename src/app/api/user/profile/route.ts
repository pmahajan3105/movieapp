import { NextRequest, NextResponse } from 'next/server'
import { withAuthAndErrorHandling, createApiResponse, withValidation } from '@/lib/api/factory'
import { z } from 'zod'

// Validation schemas
const profileUpdateSchema = z.object({
  full_name: z.string().optional(),
  preferences: z.unknown().optional(),
  onboarding_completed: z.boolean().optional(),
})

const anyUpdatesSchema = z.record(z.unknown())

export const GET = withAuthAndErrorHandling(async (_request: NextRequest, { user, supabase }) => {
  // Get user profile
  const { data: profile, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to fetch profile: ${error.message}`)
  }

  return NextResponse.json(createApiResponse(true, { profile: profile || null }), { status: 200 })
})

export const PUT = withAuthAndErrorHandling(async (request: NextRequest, { user, supabase }) => {
  const updates = await withValidation(request, anyUpdatesSchema)

  // Update user profile
  const { data: profile, error } = await supabase
    .from('user_profiles')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update profile: ${error.message}`)
  }

  return NextResponse.json(createApiResponse(true, { profile }), { status: 200 })
})

export const PATCH = withAuthAndErrorHandling(async (request: NextRequest, { user, supabase }) => {
  const body = await withValidation(request, profileUpdateSchema)

  // Build update object dynamically
  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }

  if (body.full_name !== undefined) {
    updateData.full_name = body.full_name
  }

  if (body.preferences !== undefined) {
    updateData.preferences = body.preferences
  }

  if (body.onboarding_completed !== undefined) {
    updateData.onboarding_completed = body.onboarding_completed
  }

  // Update user profile
  const { data: profile, error } = await supabase
    .from('user_profiles')
    .update(updateData)
    .eq('id', user.id)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update profile: ${error.message}`)
  }

  return NextResponse.json(
    createApiResponse(true, { profile, message: 'Profile updated successfully' }),
    { status: 200 }
  )
})

export const POST = withAuthAndErrorHandling(async (_request: NextRequest, { user, supabase }) => {
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

  const { data: profile, error } = await supabase
    .from('user_profiles')
    .upsert(profileData, {
      onConflict: 'id',
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create profile: ${error.message}`)
  }

  return NextResponse.json(
    createApiResponse(true, {
      message: 'Profile created/updated successfully',
      profile,
    }),
    { status: 200 }
  )
})
