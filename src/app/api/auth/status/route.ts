import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function GET(request: NextRequest) {
  try {
    // Debug: Log all cookies received
    const cookieCount = request.cookies.getAll().length
    const cookieNames = request.cookies.getAll().map(c => c.name)
    console.log('🍪 Cookies received:', { cookieCount, cookieNames })

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            const cookie = request.cookies.get(name)
            if (name.includes('supabase')) {
              console.log(`🍪 Reading cookie ${name}:`, cookie ? 'EXISTS' : 'MISSING')
            }
            return cookie?.value
          },
          set() {
            // Auth status endpoint should not set cookies
          },
          remove() {
            // Auth status endpoint should not remove cookies
          },
        },
      }
    )

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

    // Only log debug info in development
    if (process.env.NODE_ENV === 'development') {
      console.log('🔐 Auth Status Check:', {
        hasUser: response.hasUser,
        userId: response.userId ? '[REDACTED]' : undefined,
        userEmail: response.userEmail ? '[REDACTED]' : undefined,
        hasSession: response.hasSession,
        sessionExpiresAt: response.sessionExpiresAt,
        cookieCount: response.cookieCount,
      })
    }

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
