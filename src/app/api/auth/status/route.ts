import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  try {
    // Use the service role for server-side auth checking
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({
        connected: false,
        error: 'Missing Supabase configuration',
      })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Test if we can connect to Supabase
    const { error } = await supabase.from('movies').select('count').limit(1)

    if (error) {
      console.error('Supabase connection error:', error)
      return NextResponse.json({
        connected: false,
        error: error.message,
      })
    }

    return NextResponse.json({
      connected: true,
      authenticated: false, // This endpoint just tests connection
      message: 'Supabase connection successful',
    })
  } catch (error) {
    console.error('Auth status error:', error)
    return NextResponse.json(
      {
        connected: false,
        error: 'Failed to connect to Supabase',
      },
      { status: 500 }
    )
  }
}
