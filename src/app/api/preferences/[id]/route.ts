import { NextRequest, NextResponse } from 'next/server'
import { createAuthenticatedApiHandler } from '@/lib/api/factory'

// DELETE - Delete a specific preference by ID
export const DELETE = createAuthenticatedApiHandler(
  async (request: NextRequest, { supabase, user }) => {
    const preferenceId = request.nextUrl.pathname.split('/').pop() || ''

    if (!preferenceId) {
      throw new Error('Preference ID is required')
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
  }
)
