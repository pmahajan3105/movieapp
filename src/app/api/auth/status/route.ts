import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/client'

export async function GET() {
  try {
    const supabase = await createServerClient()

    // Get current user and session
    const [
      {
        data: { user },
        error: userError,
      },
      {
        data: { session },
        error: sessionError,
      },
    ] = await Promise.all([supabase.auth.getUser(), supabase.auth.getSession()])

    console.log('🔐 Auth Status Check:', {
      hasUser: !!user,
      userId: user?.id,
      userEmail: user?.email,
      userError: userError?.message,
      userErrorCode: userError?.code,
      hasSession: !!session,
      sessionError: sessionError?.message,
      sessionErrorCode: sessionError?.code,
      sessionExpiresAt: session?.expires_at,
      sessionRefreshToken: !!session?.refresh_token,
      sessionAccessToken: !!session?.access_token,
    })

    return NextResponse.json({
      success: true,
      data: {
        authenticated: !!user && !!session,
        user: user
          ? {
              id: user.id,
              email: user.email,
              created_at: user.created_at,
            }
          : null,
        session: session
          ? {
              expires_at: session.expires_at,
              has_refresh_token: !!session.refresh_token,
              has_access_token: !!session.access_token,
            }
          : null,
        errors: {
          user_error: userError?.message,
          session_error: sessionError?.message,
        },
      },
    })
  } catch (error) {
    console.error('❌ Auth status check error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to check auth status',
        data: {
          authenticated: false,
          user: null,
          session: null,
          errors: {
            system_error: error instanceof Error ? error.message : 'Unknown error',
          },
        },
      },
      { status: 500 }
    )
  }
}
