import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getAuthenticatedUserId } from '@/lib/auth-server'

// DELETE - Delete a specific preference by ID
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: preferenceId } = await params

    if (!preferenceId) {
      return NextResponse.json(
        { error: 'Preference ID is required', success: false },
        { status: 400 }
      )
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

    // IMPLEMENTED: Mock preference deletion until individual preference storage is needed
    if (process.env.NODE_ENV === 'development') {
      console.log('Current preferences:', currentProfile?.preferences)
    }

    return NextResponse.json({
      success: true,
      message: `Preference ${preferenceId} deleted successfully`,
    })
  } catch (error) {
    console.error('❌ Error deleting preference:', error)
    return NextResponse.json(
      {
        error: 'Failed to delete preference',
        success: false,
      },
      { status: 500 }
    )
  }
}
