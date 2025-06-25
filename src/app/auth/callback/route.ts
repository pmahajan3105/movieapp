import { createServerClient } from '@/lib/supabase/client'
import { NextRequest, NextResponse } from 'next/server'
import { getSiteURL } from '@/lib/utils/url-helper'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')
  const next = searchParams.get('next') ?? '/dashboard'

  const baseUrl = getSiteURL()

  if (error) {
    return NextResponse.redirect(`${baseUrl}/auth/login?error=${encodeURIComponent(error)}`)
  }

  if (!code) {
    return NextResponse.redirect(`${baseUrl}/auth/login?error=no_code`)
  }

  try {
    // Create Supabase client with simplified cookie management
    const supabase = await createServerClient()

    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

    if (exchangeError) {
      return NextResponse.redirect(
        `${baseUrl}/auth/login?error=${encodeURIComponent(exchangeError.message)}`
      )
    }

    if (!data?.user || !data?.session) {
      return NextResponse.redirect(`${baseUrl}/auth/login?error=auth_failed`)
    }

    // Create or update user profile
    try {
      await supabase.from('user_profiles').upsert(
        {
          id: data.user.id,
          email: data.user.email!,
          full_name: data.user.user_metadata?.full_name || null,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'id',
        }
      )
    } catch {
      // Continue with auth flow even if profile fails
    }

    return NextResponse.redirect(`${origin}${next}`)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Authentication failed'
    return NextResponse.redirect(`${baseUrl}/auth/login?error=${encodeURIComponent(errorMessage)}`)
  }
}
