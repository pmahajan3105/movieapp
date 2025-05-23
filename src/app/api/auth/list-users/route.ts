import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  try {
    // Use service role to access auth admin functions
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // List users
    const { data: { users }, error } = await supabase.auth.admin.listUsers()
    
    if (error) {
      console.error('List users error:', error)
      return NextResponse.json({ 
        success: false,
        error: error.message 
      })
    }

    // Also check user_profiles table
    const { data: profiles, error: profilesError } = await supabase
      .from('user_profiles')
      .select('*')
    
    return NextResponse.json({ 
      success: true,
      users: users?.map(user => ({
        id: user.id,
        email: user.email,
        created_at: user.created_at,
        email_confirmed_at: user.email_confirmed_at
      })) || [],
      profiles: profiles || [],
      profilesError: profilesError?.message || null
    })

  } catch (error) {
    console.error('List users error:', error)
    return NextResponse.json({ 
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 