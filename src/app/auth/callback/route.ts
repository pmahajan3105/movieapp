import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const error = requestUrl.searchParams.get('error')
  const error_description = requestUrl.searchParams.get('error_description')

  console.log('🔗 Server callback - code:', code ? 'PRESENT' : 'MISSING', 'error:', error)

  // Handle URL-level errors
  if (error) {
    console.error('❌ Auth callback error from URL:', error, error_description)
    const errorUrl = new URL('/auth/login', requestUrl.origin)
    errorUrl.searchParams.set('error', `Authentication failed: ${error_description || error}`)
    return NextResponse.redirect(errorUrl)
  }

  if (!code) {
    console.error('❌ No code provided in callback')
    const errorUrl = new URL('/auth/login', requestUrl.origin)
    errorUrl.searchParams.set('error', 'No authentication code provided')
    return NextResponse.redirect(errorUrl)
  }

  try {
    console.log('🔄 Creating server client for code exchange...')
    
    // Create Supabase server client with same configuration as API route
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch (error) {
              console.warn('Cookie setting warning (expected):', error)
            }
          },
        },
      }
    )

    console.log('🔄 Exchanging code for session...')
    
    // Exchange the code for a session
    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

    console.log('🔐 Exchange result:')
    console.log('- Data:', data ? { user: data.user?.email, session: !!data.session } : 'NULL')
    console.log('- Error:', exchangeError ? { message: exchangeError.message, name: exchangeError.name } : 'NONE')

    if (exchangeError) {
      console.error('❌ Code exchange failed:', exchangeError)
      const errorUrl = new URL('/auth/login', requestUrl.origin)
      errorUrl.searchParams.set('error', `Authentication failed: ${exchangeError.message}`)
      return NextResponse.redirect(errorUrl)
    }

    if (!data?.user || !data?.session) {
      console.error('❌ No user session created')
      const errorUrl = new URL('/auth/login', requestUrl.origin)
      errorUrl.searchParams.set('error', 'No user session created. Please try again.')
      return NextResponse.redirect(errorUrl)
    }

    console.log('✅ User authenticated:', data.user.email)

    // Try to create user profile (non-blocking)
    try {
      const { error: profileError } = await supabase.from('user_profiles').upsert(
        {
          id: data.user.id,
          email: data.user.email!,
          full_name: data.user.user_metadata?.full_name || data.user.email!.split('@')[0],
          onboarding_completed: true,
        },
        {
          onConflict: 'id',
        }
      )

      if (profileError) {
        console.error('Profile creation error:', profileError)
      } else {
        console.log('✅ User profile created/updated')
      }
    } catch (profileError) {
      console.error('Profile creation failed:', profileError)
    }

    // Successful authentication - redirect to dashboard
    console.log('🎉 Redirecting to dashboard')
    return NextResponse.redirect(new URL('/dashboard', requestUrl.origin))

  } catch (error) {
    console.error('💥 Server callback exception:', error)
    const errorUrl = new URL('/auth/login', requestUrl.origin)
    errorUrl.searchParams.set('error', 'An unexpected error occurred. Please try again.')
    return NextResponse.redirect(errorUrl)
  }
} 