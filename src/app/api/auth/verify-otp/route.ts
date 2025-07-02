import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { z } from 'zod'
import { logger } from '@/lib/logger'

const verifyOtpSchema = z.object({
  email: z.string().email('Invalid email address'),
  token: z
    .string()
    .min(6, 'OTP must be at least 6 characters')
    .max(6, 'OTP must be exactly 6 characters'),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, token } = verifyOtpSchema.parse(body)

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
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          },
        },
      }
    )

    // Verify OTP
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'email',
    })

    if (error) {
      logger.authError('OTP verification', error as Error)

      // Handle specific error cases
      if (error.message.includes('invalid') || error.message.includes('expired')) {
        return NextResponse.json(
          {
            error: 'Invalid or expired verification code. Please try again.',
            code: 'INVALID_OTP',
          },
          { status: 400 }
        )
      }

      if (error.message.includes('attempts')) {
        return NextResponse.json(
          {
            error: 'Too many failed attempts. Please request a new code.',
            code: 'TOO_MANY_ATTEMPTS',
          },
          { status: 429 }
        )
      }

      return NextResponse.json(
        {
          error: 'Verification failed. Please try again.',
          code: 'VERIFICATION_FAILED',
        },
        { status: 400 }
      )
    }

    if (!data.user || !data.session) {
      return NextResponse.json(
        {
          error: 'Authentication failed. Please try again.',
          code: 'AUTH_FAILED',
        },
        { status: 400 }
      )
    }

    // Check if user profile exists, if not create one
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', data.user.id)
      .single()

    if (!profile) {
      // Create user profile
      const { error: profileError } = await supabase.from('user_profiles').insert({
        id: data.user.id,
        email: data.user.email!,
        onboarding_completed: false,
      })

      if (profileError) {
        logger.dbError('profile creation during auth', profileError as Error)
        // Don't fail auth if profile creation fails
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Authentication successful',
      user: {
        id: data.user.id,
        email: data.user.email,
        onboarding_completed: profile?.onboarding_completed || false,
      },
    })
  } catch (error) {
    logger.apiError('/api/auth/verify-otp', error as Error)

    if (error instanceof z.ZodError) {
      const fieldErrors = error.errors.map(err => err.message).join(', ')
      return NextResponse.json(
        {
          error: fieldErrors,
          code: 'VALIDATION_ERROR',
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
      },
      { status: 500 }
    )
  }
}
