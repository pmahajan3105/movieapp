import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function GET() {
  try {
    const supabase = createRouteHandlerClient({ cookies })

    // Test 1: Check if we can connect to Supabase
    console.log('Testing Supabase connection...')
    
    // Test 2: Check if chat_sessions table exists
    const { data: tableTest, error: tableError } = await supabase
      .from('chat_sessions')
      .select('*')
      .limit(1)

    if (tableError) {
      console.error('Table error:', tableError)
      return NextResponse.json({
        success: false,
        error: 'Table access failed',
        details: {
          message: tableError.message,
          hint: tableError.hint,
          code: tableError.code
        }
      })
    }

    // Test 3: Check user authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    return NextResponse.json({
      success: true,
      message: 'Database tests completed',
      results: {
        tableExists: !tableError,
        userAuthenticated: !!user && !authError,
        recordCount: tableTest?.length || 0
      }
    })

  } catch (error) {
    console.error('Test error:', error)
    return NextResponse.json({
      success: false,
      error: 'Test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
} 