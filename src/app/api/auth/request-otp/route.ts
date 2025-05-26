import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    // Debug logging
    console.log('🔍 OTP Request Debug:')
    console.log('- Email:', email)
    console.log('- Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'SET' : 'NOT SET')
    console.log('- Supabase Anon Key:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'SET' : 'NOT SET')

    // Validate email
    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Valid email is required' }, 
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Please enter a valid email address' }, 
        { status: 400 }
      )
    }

    // Create Supabase client using SSR package for compatibility with callback page
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: { [key: string]: any }) {
            try {
              cookieStore.set({ name, value, ...options })
            } catch (error) {
              // Cookie setting errors are expected in server context
              console.warn('Cookie setting warning (expected):', error)
            }
          },
          remove(name: string, options: { [key: string]: any }) {
            try {
              cookieStore.set({ name, value: '', ...options })
            } catch (error) {
              // Cookie removal errors are expected in server context
              console.warn('Cookie removal warning (expected):', error)
            }
          },
        },
      }
    )

    console.log('📧 Attempting to send magic link to:', email)

    // Send magic link via Supabase
    const { error } = await supabase.auth.signInWithOtp({
      email: email,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/callback`,
        shouldCreateUser: true,
      },
    })

    if (error) {
      console.error('❌ Supabase OTP error:', error)
      
      // Handle specific Supabase errors
      if (error.message.includes('rate limit') || error.code === 'over_email_send_rate_limit') {
        return NextResponse.json(
          { error: 'Too many requests. Please wait a moment before trying again.' }, 
          { status: 429 }
        )
      }
      
      if (error.message.includes('invalid email') || error.message.includes('Email address') || error.code === 'email_address_invalid') {
        return NextResponse.json(
          { error: 'Please enter a valid email address. Test emails like "test@example.com" are not supported.' }, 
          { status: 400 }
        )
      }

      return NextResponse.json(
        { error: 'Failed to send magic link. Please try again.' }, 
        { status: 500 }
      )
    }

    console.log('✅ Magic link sent successfully to:', email)

    return NextResponse.json({
      success: true,
      message: 'Magic link sent successfully! Check your email.',
      email: email
    })

  } catch (error) {
    console.error('💥 OTP request error:', error)
    return NextResponse.json(
      { error: 'Failed to send magic link. Please try again.' }, 
      { status: 500 }
    )
  }
} 