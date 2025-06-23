import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'

const analyticsSchema = z.object({
  sessionId: z.string(),
  event: z.enum(['conversation_started', 'message_sent', 'preferences_extracted', 'conversation_completed']),
  metadata: z.object({
    messageCount: z.number().optional(),
    responseTime: z.number().optional(),
    userSatisfaction: z.number().min(1).max(5).optional(),
    extractionAccuracy: z.number().min(0).max(100).optional(),
    preferenceCategories: z.number().optional(),
    conversationLength: z.number().optional(),
  }).optional(),
})

interface AnalyticsRecord {
  id?: string
  session_id: string
  event_type: string
  metadata?: {
    messageCount?: number
    responseTime?: number
    userSatisfaction?: number
    extractionAccuracy?: number
    preferenceCategories?: number
    conversationLength?: number
  }
  timestamp: string
}

// POST - Track conversation events
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sessionId, event, metadata } = analyticsSchema.parse(body)

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // Store analytics event
    const { error: analyticsError } = await supabase
      .from('conversation_analytics')
      .insert({
        session_id: sessionId,
        event_type: event,
        metadata: metadata || {},
        timestamp: new Date().toISOString(),
      })

    if (analyticsError) {
      console.error('Analytics storage error:', analyticsError)
      // Don't fail the request for analytics errors
    }

    return NextResponse.json({
      success: true,
      message: 'Analytics event recorded',
    })

  } catch (error) {
    console.error('❌ Analytics error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid analytics data',
          details: error.errors,
          success: false,
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { 
        error: 'Failed to record analytics',
        success: false 
      },
      { status: 500 }
    )
  }
}

// GET - Retrieve conversation analytics
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')
    const timeframe = searchParams.get('timeframe') || '7d'

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    let query = supabase
      .from('conversation_analytics')
      .select('*')
      .order('timestamp', { ascending: false })

    if (sessionId) {
      query = query.eq('session_id', sessionId)
    } else {
      // Apply timeframe filter
      const now = new Date()
      const startDate = new Date()
      
      switch (timeframe) {
        case '1d':
          startDate.setDate(now.getDate() - 1)
          break
        case '7d':
          startDate.setDate(now.getDate() - 7)
          break
        case '30d':
          startDate.setDate(now.getDate() - 30)
          break
        default:
          startDate.setDate(now.getDate() - 7)
      }

      query = query.gte('timestamp', startDate.toISOString())
    }

    const { data: analytics, error } = await query.limit(1000)

    if (error) {
      throw error
    }

    // Calculate summary metrics
    const summary = calculateAnalyticsSummary(analytics || [])

    return NextResponse.json({
      success: true,
      analytics: analytics || [],
      summary,
      timeframe,
    })

  } catch (error) {
    console.error('❌ Error fetching analytics:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch analytics',
        success: false 
      },
      { status: 500 }
    )
  }
}

function calculateAnalyticsSummary(analytics: AnalyticsRecord[]) {
  const conversationStarts = analytics.filter(a => a.event_type === 'conversation_started').length
  const conversationCompletions = analytics.filter(a => a.event_type === 'conversation_completed').length
  const preferencesExtracted = analytics.filter(a => a.event_type === 'preferences_extracted').length
  
  const totalMessages = analytics
    .filter(a => a.event_type === 'message_sent')
    .reduce((sum, a) => sum + (a.metadata?.messageCount || 1), 0)

  const avgResponseTimes = analytics
    .filter(a => a.metadata?.responseTime)
    .map(a => a.metadata?.responseTime)
    .filter((time): time is number => time !== undefined)

  const avgResponseTime = avgResponseTimes.length > 0 
    ? avgResponseTimes.reduce((sum, time) => sum + time, 0) / avgResponseTimes.length 
    : 0

  const satisfactionScores = analytics
    .filter(a => a.metadata?.userSatisfaction)
    .map(a => a.metadata?.userSatisfaction)
    .filter((score): score is number => score !== undefined)

  const avgSatisfaction = satisfactionScores.length > 0 
    ? satisfactionScores.reduce((sum, score) => sum + score, 0) / satisfactionScores.length 
    : 0

  const completionRate = conversationStarts > 0 ? (conversationCompletions / conversationStarts) * 100 : 0
  const extractionRate = conversationStarts > 0 ? (preferencesExtracted / conversationStarts) * 100 : 0

  return {
    totalConversations: conversationStarts,
    completedConversations: conversationCompletions,
    completionRate: Math.round(completionRate * 100) / 100,
    extractionRate: Math.round(extractionRate * 100) / 100,
    totalMessages,
    avgResponseTime: Math.round(avgResponseTime * 100) / 100,
    avgSatisfaction: Math.round(avgSatisfaction * 100) / 100,
    preferencesExtracted,
  }
} 