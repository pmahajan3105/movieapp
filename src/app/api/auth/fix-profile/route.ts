import { NextResponse } from 'next/server'
import { withErrorHandling } from '@/lib/api/factory'
import { createClient } from '@supabase/supabase-js'

export const POST = withErrorHandling(async () => {
  // Use service role to access auth admin functions
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  if (!supabaseServiceKey) {
    throw new Error('Service role key not configured')
  }

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
    throw new Error(`Failed to list users: ${usersError.message}`)
  }

  const user = users?.[0]
  if (!user) {
    throw new Error('No user found')
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
    throw new Error(`Failed to create profile: ${profileError.message}`)
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
})
