import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getAuthenticatedUserId } from '@/lib/auth-server'

// DELETE - Clear all preferences in a specific category
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ category: string }> }
) {
  try {
    const { category } = await params

    if (!category) {
      return NextResponse.json({ error: 'Category is required', success: false }, { status: 400 })
    }

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

    // Remove the specified category
    // This is a simplified implementation - in a real app we'd need proper category structure
    const updatedPreferences = { ...currentPreferences }
    delete (updatedPreferences as Record<string, unknown>)[category]

    // Update in database
    const { data, error: updateError } = await supabase
      .from('user_profiles')
      .update({
        preferences: updatedPreferences,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
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
  } catch (error) {
    console.error('❌ Error clearing category preferences:', error)
    return NextResponse.json(
      {
        error: 'Failed to clear category preferences',
        success: false,
      },
      { status: 500 }
    )
  }
}
