import { NextRequest, NextResponse } from 'next/server'
import { createAuthenticatedApiHandler } from '@/lib/api/factory'

export const GET = createAuthenticatedApiHandler(
  async (request: NextRequest, { user, supabase }) => {
    // Debug: Log all cookies received
    const cookieCount = request.cookies.getAll().length
    const cookieNames = request.cookies.getAll().map(c => c.name)
    console.log('🍪 Cookies received:', { cookieCount, cookieNames })

    // Get session separately to debug
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

    console.log('🔐 Auth status response:', response)

    return NextResponse.json({
      success: true,
      ...response,
    })
  }
)
