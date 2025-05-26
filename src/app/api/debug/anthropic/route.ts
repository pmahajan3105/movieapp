import { NextResponse } from 'next/server'
import { anthropic } from '@/lib/anthropic/config'

export async function GET() {
  // Only allow in development
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 })
  }

  try {
    console.log('🧪 Testing Anthropic API...')
    
    const response = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 20,
      messages: [{ role: 'user', content: 'Say "API test successful"' }],
    })

    console.log('✅ Anthropic API test successful')
    
    return NextResponse.json({
      success: true,
      response: response.content[0]?.type === 'text' ? response.content[0].text : 'No text response',
      usage: response.usage,
    })
  } catch (error: unknown) {
    console.error('❌ Anthropic API test failed:', error)
    
    const errorObj = error as any
    return NextResponse.json({
      success: false,
      error: errorObj.message || 'Unknown error',
      status: errorObj.status || 'Unknown',
      type: errorObj.error?.type || 'Unknown',
      details: errorObj.error?.message || 'No details',
    }, { status: 400 })
  }
} 