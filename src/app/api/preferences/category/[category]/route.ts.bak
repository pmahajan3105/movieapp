import { NextResponse } from 'next/server'
import { requireAuth, withError } from '@/lib/api/factory'

// DELETE - Clear all preferences in a specific category
export const DELETE = withError(
  requireAuth(async ({ request, supabase, user }) => {
    const category = request.nextUrl.pathname.split('/').pop() || ''

    if (!category) {
      return NextResponse.json({ error: 'Category is required', success: false }, { status: 400 })
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

    // Remove the specified category
    // This is a simplified implementation - in a real app we'd need proper category structure
    const updatedPreferences: any = { ...(currentPreferences as any) }
    delete (updatedPreferences as Record<string, unknown>)[category]

    // Update in database
    const { data, error: updateError } = await supabase
      .from('user_profiles')
      .update({
        preferences: updatedPreferences,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)
      .select()
      .single()

    if (updateError) {
      throw updateError
    }

    return NextResponse.json({
      success: true,
      message: `All preferences in category "${category}" have been cleared`,
      preferences: data.preferences,
    })
  })
)
