import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { logger } from '@/lib/logger'

// Create Supabase client for server-side use
function createSupabaseServerClient(request: NextRequest) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set() {
          // API routes don't set cookies
        },
        remove() {
          // API routes don't remove cookies
        },
      },
    }
  )
}
import { smartRecommenderV2 } from '@/lib/ai/smart-recommender-v2'

export async function POST(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient(request)
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { movieId, interactionType, context } = body

    if (!movieId || !interactionType) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: movieId, interactionType' },
        { status: 400 }
      )
    }

    // Validate interaction type
    const validInteractionTypes = ['view', 'like', 'dislike', 'rate', 'search', 'search-query']
    if (!validInteractionTypes.includes(interactionType)) {
      return NextResponse.json(
        { success: false, error: 'Invalid interaction type' },
        { status: 400 }
      )
    }

    // Save the interaction using SmartRecommenderV2
    await smartRecommenderV2.saveUserInteraction(user.id, movieId, interactionType, context)

    return NextResponse.json({
      success: true,
      message: 'Interaction saved successfully',
    })
  } catch (error) {
    logger.error('User interaction API error', {
      error: error instanceof Error ? error.message : String(error),
    })
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient(request)
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const interactionType = searchParams.get('type')

    // Build query
    let query = supabase
      .from('user_memories')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (interactionType) {
      query = query.eq('interaction_type', interactionType)
    }

    const { data: interactions, error } = await query

    if (error) {
      logger.dbError('fetch-user-interactions', new Error(error.message), {
        userId: user.id,
        errorCode: error.code,
      })
      return NextResponse.json(
        { success: false, error: 'Failed to fetch interactions' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: interactions || [],
      total: interactions?.length || 0,
    })
  } catch (error) {
    logger.error('User interactions GET API error', {
      error: error instanceof Error ? error.message : String(error),
    })
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
