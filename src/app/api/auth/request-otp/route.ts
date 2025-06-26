import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling, createApiResponse, withValidation } from '@/lib/api/factory'
import { getAuthCallbackURL } from '@/lib/utils/url-helper'
import { withRateLimit } from '@/lib/api/middleware/rate-limiter'
import { z } from 'zod'

const requestOtpSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
})

// Apply rate limiting: 3 requests per minute to prevent abuse
export const POST = withRateLimit({
  maxRequests: 3,
  windowMs: 60000, // 1 minute
  keyGenerator: request => {
    // Rate limit by IP address for better security
    const ip = request.headers.get('x-forwarded-for') || 'unknown'
    return `otp-request:${ip}`
  },
})(
  withErrorHandling(async (request: NextRequest, { supabase }) => {
    const { email } = await withValidation(request, requestOtpSchema)

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
          createApiResponse(false, undefined, {
            message: 'Too many requests. Please wait a moment before trying again.',
            code: 'RATE_LIMIT_EXCEEDED',
          }),
          { status: 429 }
        )
      }

      if (
        error.message.includes('invalid email') ||
        error.message.includes('Email address') ||
        error.code === 'email_address_invalid'
      ) {
        return NextResponse.json(
          createApiResponse(false, undefined, {
            message:
              'Please enter a valid email address. Test emails like "test@example.com" are not supported.',
            code: 'INVALID_EMAIL',
          }),
          { status: 400 }
        )
      }

      throw new Error(`Failed to send magic link: ${error.message}`)
    }

    return NextResponse.json(
      createApiResponse(true, {
        message: 'Magic link sent successfully! Check your email.',
      }),
      { status: 200 }
    )
  })
)
