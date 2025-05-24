import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    return NextResponse.json({
      url: {
        exists: !!supabaseUrl,
        format: supabaseUrl ? 'https://xxx.supabase.co' : 'missing',
      },
      anonKey: {
        exists: !!anonKey,
        length: anonKey?.length || 0,
        starts: anonKey?.substring(0, 20) || 'missing',
        format: anonKey?.startsWith('eyJ') ? 'JWT format ✓' : 'Invalid format ✗',
      },
      serviceRoleKey: {
        exists: !!serviceRoleKey,
        length: serviceRoleKey?.length || 0,
        starts: serviceRoleKey?.substring(0, 20) || 'missing',
        format: serviceRoleKey?.startsWith('eyJ') ? 'JWT format ✓' : 'Invalid format ✗',
      },
      comparison: {
        sameKey: anonKey === serviceRoleKey ? 'ERROR: Same key used!' : 'Different keys ✓',
        anonVsService:
          anonKey && serviceRoleKey
            ? `Anon: ${anonKey.length}chars vs Service: ${serviceRoleKey.length}chars`
            : 'Cannot compare',
      },
    })
  } catch (error) {
    return NextResponse.json({
      error: 'Debug failed',
      details: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}
