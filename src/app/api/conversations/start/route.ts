import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, handleSupabaseError } from '@/lib/supabase/server-client'
import { logger } from '@/lib/logger'

interface StartConversationRequest {
  movieId?: string
  contextType: 'movie_page' | 'dashboard' | 'search'
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as StartConversationRequest

    if (!body || !body.contextType) {
      return NextResponse.json(
        { error: 'contextType is required' },
        { status: 400 }
      )
    }

    const supabase = await createServerClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const sessionType = body.movieId ? 'movie_discussion' : 'general_discovery'

    const { data, error } = await supabase
      .from('conversation_sessions')
      .insert({
        user_id: user.id,
        movie_id: body.movieId,
        context_type: body.contextType,
        session_type: sessionType,
      })
      .select('id')
      .single()

    if (error) {
      logger.error('Failed to create conversation session', { error })
      return NextResponse.json(
        { error: 'Failed to create session', details: handleSupabaseError(error) },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, sessionId: data.id })
  } catch (err) {
    logger.error('Conversation start route failed', { error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 