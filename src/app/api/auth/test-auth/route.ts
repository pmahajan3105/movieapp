import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function GET() {
  try {
    const supabase = createRouteHandlerClient({ 
      cookies
    })

    // Test basic auth connection
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError) {
      console.error('Session error:', sessionError)
    }

    // Test if we can access auth admin functions
    const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers()
    
    return NextResponse.json({ 
      success: true,
      session: !!session,
      sessionError: sessionError?.message || null,
      usersError: usersError?.message || null,
      userCount: users?.length || 0
    })

  } catch (error) {
    console.error('Test auth error:', error)
    return NextResponse.json({ 
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 