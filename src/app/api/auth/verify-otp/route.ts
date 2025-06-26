import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling, createApiResponse, withValidation } from '@/lib/api/factory'
import { z } from 'zod'

const verifyOtpSchema = z.object({
  email: z.string().email('Invalid email address'),
  token: z
    .string()
    .min(6, 'OTP must be at least 6 characters')
    .max(6, 'OTP must be exactly 6 characters'),
})

export const POST = withErrorHandling(async (request: NextRequest, { supabase }) => {
  const { email, token } = await withValidation(request, verifyOtpSchema)

  // Verify OTP
  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: 'email',
  })

  if (error) {
    // Handle specific error cases
    if (error.message.includes('invalid') || error.message.includes('expired')) {
      return NextResponse.json(
        createApiResponse(false, undefined, {
          message: 'Invalid or expired verification code. Please try again.',
          code: 'INVALID_OTP',
        }),
        { status: 400 }
      )
    }

    if (error.message.includes('attempts')) {
      return NextResponse.json(
        createApiResponse(false, undefined, {
          message: 'Too many failed attempts. Please request a new code.',
          code: 'TOO_MANY_ATTEMPTS',
        }),
        { status: 429 }
      )
    }

    return NextResponse.json(
      createApiResponse(false, undefined, {
        message: 'Verification failed. Please try again.',
        code: 'VERIFICATION_FAILED',
      }),
      { status: 400 }
    )
  }

  if (!data.user || !data.session) {
    return NextResponse.json(
      createApiResponse(false, undefined, {
        message: 'Authentication failed. Please try again.',
        code: 'AUTH_FAILED',
      }),
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
      // Don't fail auth if profile creation fails - just log it
      console.warn('Profile creation failed:', profileError)
    }
  }

  return NextResponse.json(
    createApiResponse(true, {
      message: 'Authentication successful',
      user: {
        id: data.user.id,
        email: data.user.email,
        onboarding_completed: profile?.onboarding_completed || false,
      },
    }),
    { status: 200 }
  )
})
