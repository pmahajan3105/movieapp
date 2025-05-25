import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/client'

export async function GET() {
  try {
    const supabase = await createServerClient()

    // Get a few movie IDs for testing
    const { data, error } = await supabase
      .from('movies')
      .select('id, title, year')
      .limit(10)

    if (error) {
      console.error('Error fetching test movies:', error)
      return NextResponse.json({ 
        success: false, 
        error: error.message 
      }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      data: data || [],
      count: data?.length || 0
    })
  } catch (error) {
    console.error('Test movies error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 })
  }
} 