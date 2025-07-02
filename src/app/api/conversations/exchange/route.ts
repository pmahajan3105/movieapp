import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server-client'
import { logger } from '@/lib/logger'
import { ConversationMemoryService } from '@/lib/ai/conversation-memory-service'

interface ExchangeRequest {
  sessionId: string
  transcript: string
}

export async function POST(request: NextRequest) {
  try {
    let body: ExchangeRequest | null = null
    const ctype = request.headers.get('content-type') || ''
    if (ctype.includes('application/json')) {
      body = (await request.json()) as ExchangeRequest
    } else if (ctype.includes('multipart')) {
      const formData = await request.formData()
      const sessionId = formData.get('sessionId') as string
      const transcriptField = formData.get('transcript') as string
      // Handle audio blob if provided
      const audioFile = formData.get('audioBlob') as File | null
      let transcript = transcriptField || ''

      if (!transcript && audioFile && audioFile.size > 0) {
        // Audio processing is now handled by Web Speech API in the browser
        logger.warn('Audio file received but STT is now handled client-side by Web Speech API')
      }

      body = { sessionId, transcript }
    }

    if (!body || !body.sessionId || !body.transcript) {
      return NextResponse.json({ error: 'sessionId and transcript required' }, { status: 400 })
    }

    const supabase = await createServerClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // ensure session belongs to user
    const { data: sessionRow, error: sessionErr } = await supabase
      .from('conversation_sessions')
      .select('id, total_exchanges')
      .eq('id', body.sessionId)
      .eq('user_id', user.id)
      .single()

    if (sessionErr || !sessionRow) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    const convoService = new ConversationMemoryService()
    const aiText = await convoService.generateAIResponse(body.transcript)
    const audioUrl = await convoService.maybeTextToSpeech(aiText)

    const exchangeOrder = (sessionRow.total_exchanges || 0) + 1

    const { error: insertErr } = await supabase.from('conversation_exchanges').insert({
      session_id: body.sessionId,
      user_id: user.id,
      exchange_order: exchangeOrder,
      user_transcript: body.transcript,
      ai_response_text: aiText,
      ai_voice_audio_url: audioUrl,
    })

    if (insertErr) {
      logger.error('Insert exchange failed', { error: insertErr })
      return NextResponse.json({ error: 'Failed to save exchange' }, { status: 500 })
    }

    // Update session exchange count
    await supabase
      .from('conversation_sessions')
      .update({ total_exchanges: exchangeOrder })
      .eq('id', body.sessionId)

    // Extract memories and store
    const extracted = await convoService.extractAndStoreMemories(
      user.id,
      body.sessionId,
      body.transcript,
      aiText
    )

    return NextResponse.json({ success: true, aiResponse: aiText, aiAudioUrl: audioUrl, extractedMemories: extracted })
  } catch (err) {
    logger.error('Conversation exchange error', { error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 