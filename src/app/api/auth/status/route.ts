import { NextRequest, NextResponse } from 'next/server'
import { createAuthenticatedApiHandler } from '@/lib/api/factory'

export const GET = createAuthenticatedApiHandler(
  async (request: NextRequest, { user, supabase }) => {
    // Get session separately to validate auth state
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession()

    const response = {
      hasUser: !!user,
      hasSession: !!session,
      userId: user?.id,
      email: user?.email,
      sessionError: sessionError?.message,
    }

    return NextResponse.json({
      success: true,
      ...response,
    })
  }
)
