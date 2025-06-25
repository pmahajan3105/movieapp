import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/client'

export async function GET(request: NextRequest) {
  try {
    // Debug: Log all cookies received
    const cookieCount = request.cookies.getAll().length
    const cookieNames = request.cookies.getAll().map(c => c.name)
    console.log('🍪 Cookies received:', { cookieCount, cookieNames })

    const supabase = await createServerClient()

    // Get the current user first
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    // Get session separately to debug
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession()

    const response = {
      hasUser: !!user,
      userId: user?.id,
      userEmail: user?.email,
      userError: userError?.message || (user ? undefined : 'Auth session missing!'),
      userErrorCode: userError?.code,
      hasSession: !!session,
      sessionError: sessionError?.message,
      sessionErrorCode: sessionError?.code,
      sessionExpiresAt: session?.expires_at,
      sessionRefreshToken: !!session?.refresh_token,
      sessionAccessToken: !!session?.access_token,
      cookieCount,
      cookieNames,
    }

    console.log('🔐 Auth Status Check:', response)

    return NextResponse.json(response)
  } catch (error) {
    console.error('❌ Auth status error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
