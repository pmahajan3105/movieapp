import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()
    
    // Supabase auth logic will be implemented here
    console.log('Login request for email:', email)
    
    return NextResponse.json({ 
      success: true, 
      message: 'OTP sent successfully' 
    })
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
} 