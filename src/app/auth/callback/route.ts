import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'
import { getSiteURL } from '@/lib/utils/url-helper'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  const baseUrl = getSiteURL()

  if (error) {
    return NextResponse.redirect(`${baseUrl}/auth/login?error=${encodeURIComponent(error)}`)
  }

  if (!code) {
    return NextResponse.redirect(`${baseUrl}/auth/login?error=no_code`)
  }

  try {
    // Determine redirect URL early
    const next = searchParams.get('next') || '/dashboard'
    const redirectUrl = `${baseUrl}${next}`

    // Create the final response object once
    const response = NextResponse.redirect(redirectUrl)

    // Create Supabase client with simplified cookie management
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value
          },
          set(name: string, value: string, options) {
            // Set cookie directly on the response with client-accessible options
            response.cookies.set(name, value, {
              httpOnly: false, // Allow client-side access for Supabase auth
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'lax',
              path: '/',
              maxAge: 60 * 60 * 24 * 7, // 7 days
              ...options,
            })
          },
          remove(name: string, options) {
            response.cookies.set(name, '', {
              path: '/',
              maxAge: 0,
              ...options,
            })
          },
        },
      }
    )

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

    return response
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Authentication failed'
    return NextResponse.redirect(`${baseUrl}/auth/login?error=${encodeURIComponent(errorMessage)}`)
  }
}
