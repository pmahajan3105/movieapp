import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'

export async function POST(request: NextRequest) {
  const { email } = await request.json()
  logger.info('Login request for email', { email })

  try {
    // Supabase auth logic will be implemented here
    console.log('Login request for email:', email)

    return NextResponse.json({
      success: true,
      message: 'OTP sent successfully',
    })
  } catch (error) {
    logger.error('Login error', {
      email,
      error: error instanceof Error ? error.message : String(error),
    })
    return NextResponse.json({ error: 'Login failed' }, { status: 500 })
  }
}
