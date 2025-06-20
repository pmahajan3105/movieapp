import { createAuthenticatedApiHandler, parseJsonBody } from '@/lib/api/factory'

// GET /api/user/preferences - Get user preferences
export const GET = createAuthenticatedApiHandler(async ({ supabase, user }) => {
  const { data: userProfile } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const preferences = userProfile?.preferences as any

  return {
    success: true,
    preferences: preferences || null,
    hasPreferences: !!preferences?.preferred_genres,
  }
})

// POST /api/user/preferences - Save user preferences
export const POST = createAuthenticatedApiHandler(async ({ request, supabase, user }) => {
  const body = await parseJsonBody<{ preferences: any }>(request)
  const { preferences } = body

  if (!preferences) {
    throw new Error('Preferences data is required')
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
    throw new Error(`Failed to save preferences: ${error.message}`)
  }

  console.log('✅ Preferences saved successfully:', data)

  return {
    success: true,
    data: data[0],
  }
})

// DELETE /api/user/preferences - Clear user preferences
export const DELETE = createAuthenticatedApiHandler(async ({ supabase, user }) => {
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
    throw new Error(`Failed to clear preferences: ${error.message}`)
  }

  console.log('✅ Successfully cleared manual preferences for user:', user.id)

  return {
    success: true,
    message: 'Manual preferences cleared successfully',
  }
})
