import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({
        success: false,
        error: 'Missing environment variables',
      })
    }

    console.log('Testing service role key...')
    console.log('URL:', supabaseUrl)
    console.log('Key length:', serviceRoleKey.length)
    console.log('Key starts with:', serviceRoleKey.substring(0, 20))

    // Test with service role
    const supabase = createClient(supabaseUrl, serviceRoleKey)

    // Try a simple query that should work with service role
    const { data, error } = await supabase.from('movies').select('count(*)').limit(1)

    if (error) {
      console.error('Service role error:', error)
      return NextResponse.json({
        success: false,
        error: 'Service role failed',
        details: error,
      })
    }

    // Try inserting a test record (will rollback)
    const testMovie = {
      title: 'Test Movie',
      year: 2023,
      genre: ['Test'],
      director: ['Test Director'],
      plot: 'Test plot',
      rating: 5.0,
      runtime: 90,
      omdb_id: 'test123',
      imdb_id: 'test123',
    }

    const { data: insertData, error: insertError } = await supabase
      .from('movies')
      .insert([testMovie])
      .select()

    // Delete the test record immediately
    if (insertData && insertData.length > 0) {
      await supabase.from('movies').delete().eq('id', insertData[0].id)
    }

    if (insertError) {
      return NextResponse.json({
        success: false,
        error: 'Service role cannot insert',
        details: insertError,
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Service role key is working correctly',
      canRead: true,
      canInsert: true,
      movieCount: data?.length || 0,
    })
  } catch (error) {
    console.error('Test error:', error)
    return NextResponse.json({
      success: false,
      error: 'Test failed',
      details: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}
