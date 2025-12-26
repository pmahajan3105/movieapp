import { NextResponse } from 'next/server'

/**
 * POST /api/auth/verify-otp
 * OTP not needed in local mode - redirect to setup
 */
export async function POST() {
  return NextResponse.json({
    success: false,
    error: 'Authentication is not required in local mode',
    message: 'CineAI is running in local mode. Visit /setup to configure your account.',
    mode: 'local',
    redirect: '/setup',
  }, { status: 400 })
}
