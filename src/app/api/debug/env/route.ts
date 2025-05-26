import { NextResponse } from 'next/server'

export async function GET() {
  // Only allow in development
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 })
  }

  return NextResponse.json({
    environment: process.env.NODE_ENV,
    hasAnthropicKey: !!process.env.ANTHROPIC_API_KEY,
    anthropicKeyLength: process.env.ANTHROPIC_API_KEY?.length || 0,
    hasTmdbKey: !!process.env.TMDB_API_KEY,
    tmdbKeyLength: process.env.TMDB_API_KEY?.length || 0,
    envVars: {
      // Show first few characters for debugging
      anthropic: process.env.ANTHROPIC_API_KEY ? `sk-ant-${process.env.ANTHROPIC_API_KEY.substring(7, 15)}...` : 'NOT_SET',
      tmdb: process.env.TMDB_API_KEY ? `${process.env.TMDB_API_KEY.substring(0, 8)}...` : 'NOT_SET',
    }
  })
} 