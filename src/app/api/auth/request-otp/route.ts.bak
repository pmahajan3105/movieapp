import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getAuthCallbackURL } from '@/lib/utils/url-helper'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    // Validate email
    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Valid email is required' }, { status: 400 })
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Please enter a valid email address' }, { status: 400 })
    }

    // Create Supabase client with proper PKCE support
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
            } catch {
              // Cookie setting errors are expected in server context
            }
          },
        },
        auth: {
          // Ensure PKCE flow is used
          flowType: 'pkce',
        },
      }
    )

    // Get the proper callback URL for the current environment
    const callbackURL = getAuthCallbackURL()

    // Send magic link via Supabase
    const { error } = await supabase.auth.signInWithOtp({
      email: email,
      options: {
        emailRedirectTo: callbackURL,
        shouldCreateUser: true,
      },
    })

    if (error) {
      // Handle specific Supabase errors
      if (error.message.includes('rate limit') || error.code === 'over_email_send_rate_limit') {
        return NextResponse.json(
          { error: 'Too many requests. Please wait a moment before trying again.' },
          { status: 429 }
        )
      }

      if (
        error.message.includes('invalid email') ||
        error.message.includes('Email address') ||
        error.code === 'email_address_invalid'
      ) {
        return NextResponse.json(
          {
            error:
              'Please enter a valid email address. Test emails like "test@example.com" are not supported.',
          },
          { status: 400 }
        )
      }

      return NextResponse.json(
        { error: 'Failed to send magic link. Please try again.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Magic link sent successfully! Check your email.',
    })
  } catch {
    return NextResponse.json(
      { error: 'Failed to send magic link. Please try again.' },
      { status: 500 }
    )
  }
}
