import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { z } from 'zod'

const requestOtpSchema = z.object({
  email: z.string().email('Invalid email address'),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = requestOtpSchema.parse(body)

    const supabase = createRouteHandlerClient({ 
      cookies: () => cookies()
    })

    // Send OTP to email
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/callback`,
      }
    })

    if (error) {
      console.error('OTP request error:', error)
      
      // Handle specific error cases
      if (error.message.includes('rate limit')) {
        return NextResponse.json(
          { 
            error: 'Too many requests. Please wait a moment before trying again.',
            code: 'RATE_LIMIT'
          }, 
          { status: 429 }
        )
      }

      return NextResponse.json(
        { 
          error: 'Failed to send verification code. Please try again.',
          code: 'OTP_SEND_FAILED'
        }, 
        { status: 400 }
      )
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Verification code sent successfully',
      email 
    })

  } catch (error) {
    console.error('Request OTP error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Invalid email address',
          code: 'VALIDATION_ERROR'
        }, 
        { status: 400 }
      )
    }

    return NextResponse.json(
      { 
        error: 'Internal server error',
        code: 'INTERNAL_ERROR'
      }, 
      { status: 500 }
    )
  }
} 