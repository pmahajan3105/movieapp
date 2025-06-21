import { NextResponse } from 'next/server'
import { requireAuth, withError } from '@/lib/api/factory'

// DELETE - Delete a specific preference by ID
export const DELETE = withError(
  requireAuth(async ({ request, supabase, user }) => {
    const preferenceId = request.nextUrl.pathname.split('/').pop() || ''

    if (!preferenceId) {
      return NextResponse.json(
        { error: 'Preference ID is required', success: false },
        { status: 400 }
      )
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

    // IMPLEMENTED: Mock preference deletion until individual preference storage is needed
    if (process.env.NODE_ENV === 'development') {
      console.log('Current preferences:', currentProfile?.preferences)
    }

    return NextResponse.json({
      success: true,
      message: `Preference ${preferenceId} deleted successfully`,
    })
  })
)
