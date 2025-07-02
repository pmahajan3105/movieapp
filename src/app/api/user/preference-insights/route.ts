import { createAuthenticatedApiHandler } from '@/lib/api/factory'
import { NextResponse } from 'next/server'
import { logger } from '@/lib/logger'

// GET /api/user/preference-insights?window=30d (default 30d)
export const GET = createAuthenticatedApiHandler(async (req, { supabase, user }) => {
  const searchParams = req.nextUrl.searchParams
  const timeWindow = searchParams.get('window') || '30d'

  // Fetch latest genre_preference row for window
  const { data, error } = await supabase
    .from('user_preference_insights')
    .select('insights, confidence_score, data_points, updated_at')
    .eq('user_id', user.id)
    .eq('insight_type', 'genre_preference')
    .eq('time_window', timeWindow)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    logger.dbError('fetch preference insights', error as Error)
    throw new Error('Could not retrieve preference insights')
  }

  return NextResponse.json({ success: true, insights: data?.insights ?? null })
}) 