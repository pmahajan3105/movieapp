import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'
import { getSiteURL } from '@/lib/utils/url-helper'

export async function GET(request: NextRequest) {
  console.log('🔗 Auth callback initiated')

  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')

  console.log('- Code present:', code ? 'YES' : 'NO')
  console.log('- Error from URL:', error || 'NONE')
  console.log('- Request URL:', request.url)

  // Log URL configuration for debugging
  const baseUrl = getSiteURL()
  console.log('🔍 URL Configuration Debug:')
  console.log('- NEXT_PUBLIC_SITE_URL:', process.env.NEXT_PUBLIC_SITE_URL || 'NOT SET')
  console.log('- NEXT_PUBLIC_VERCEL_URL:', process.env.NEXT_PUBLIC_VERCEL_URL || 'NOT SET')
  console.log('- VERCEL_URL:', process.env.VERCEL_URL || 'NOT SET')
  console.log('- PORT:', process.env.PORT || 'NOT SET')
  console.log('- NODE_ENV:', process.env.NODE_ENV)
  console.log('- Computed Site URL:', baseUrl)
  console.log('- Auth Callback URL:', `${baseUrl}/auth/callback`)
  console.log('- Default Redirect URL:', `${baseUrl}/dashboard`)

  if (error) {
    console.error('❌ OAuth error:', { error, errorDescription })
    return NextResponse.redirect(`${baseUrl}/auth/login?error=${encodeURIComponent(error)}`)
  }

  if (!code) {
    console.error('❌ No authorization code provided')
    return NextResponse.redirect(`${baseUrl}/auth/login?error=no_code`)
  }

  try {
    console.log('🔄 Creating Supabase server client with cookie management...')

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
            console.log('🍪 Setting cookie:', { name, hasValue: !!value, options })

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
            console.log('🍪 Removing cookie:', { name, options })
            response.cookies.set(name, '', {
              path: '/',
              maxAge: 0,
              ...options,
            })
          },
        },
      }
    )

    console.log('🔄 Exchanging authorization code for session...')
    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

    console.log('🔐 Code exchange result:')
    console.log('- Success:', !exchangeError)
    console.log('- User email:', data?.user?.email)
    console.log('- Session exists:', !!data?.session)
    console.log('- Session access token exists:', !!data?.session?.access_token)
    console.log('- Session refresh token exists:', !!data?.session?.refresh_token)
    console.log('- Error:', exchangeError?.message || 'NONE')

    if (exchangeError) {
      console.error('❌ Failed to exchange code for session:', exchangeError)
      return NextResponse.redirect(
        `${baseUrl}/auth/login?error=${encodeURIComponent(exchangeError.message)}`
      )
    }

    if (!data?.user) {
      console.error('❌ No user data returned after code exchange')
      return NextResponse.redirect(`${baseUrl}/auth/login?error=no_user_data`)
    }

    if (!data?.session) {
      console.error('❌ No session data returned after code exchange')
      return NextResponse.redirect(`${baseUrl}/auth/login?error=no_session_data`)
    }

    console.log('✅ User authenticated successfully:', data.user.email)
    console.log('✅ Session created successfully with tokens')

    // Create or update user profile (using only columns that exist in schema)
    console.log('🔄 Creating/updating user profile...')
    try {
      const { error: profileError } = await supabase.from('user_profiles').upsert(
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

      if (profileError) {
        console.warn('⚠️ Profile creation/update failed:', profileError.message)
        // Don't fail the auth flow for profile errors
      } else {
        console.log('✅ User profile created/updated successfully')
      }
    } catch (profileError) {
      console.warn('⚠️ Unexpected error with profile:', profileError)
      // Continue with auth flow
    }

    console.log('🎉 Authentication successful! Redirecting to:', redirectUrl)
    console.log(
      '🍪 Response cookies set:',
      response.cookies.getAll().map(c => c.name)
    )

    return response
  } catch (error) {
    console.error('❌ Unexpected error in auth callback:', error)
    const errorMessage = error instanceof Error ? error.message : 'Authentication failed'
    return NextResponse.redirect(`${baseUrl}/auth/login?error=${encodeURIComponent(errorMessage)}`)
  }
}
