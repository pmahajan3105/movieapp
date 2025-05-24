import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST() {
  try {
    // Use service role to access auth admin functions
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // Get the existing user
    const {
      data: { users },
      error: usersError,
    } = await supabase.auth.admin.listUsers()

    if (usersError) {
      return NextResponse.json({
        success: false,
        error: usersError.message,
      })
    }

    const user = users?.[0]
    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'No user found',
      })
    }

    // Create the missing profile
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .insert({
        id: user.id,
        email: user.email!,
        full_name: user.user_metadata?.full_name || user.email!.split('@')[0],
        onboarding_completed: false,
      })
      .select()
      .single()

    if (profileError) {
      console.error('Profile creation error:', profileError)
      return NextResponse.json({
        success: false,
        error: profileError.message,
        details: profileError,
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Profile created successfully',
      user: {
        id: user.id,
        email: user.email,
      },
      profile,
    })
  } catch (error) {
    console.error('Fix profile error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
