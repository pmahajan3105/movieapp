import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { ExplanationService } from '@/lib/ai/explanation-service'
import { logger } from '@/lib/logger'

interface ExplanationRequestBody {
  movieId: string
  movieMeta?: any // optional metadata to help explanation generation (title, genre_ids, etc.)
}

/**
 * POST /api/movies/explanations
 * Returns (and caches) a personalised explanation for why a movie was recommended to the current user.
 * Expects JSON body: { movieId: string, movieMeta?: any }
 */
export async function POST(request: NextRequest) {
  try {
    const body: ExplanationRequestBody = await request.json()
    const { movieId, movieMeta } = body

    if (!movieId) {
      return NextResponse.json({ error: 'movieId is required' }, { status: 400 })
    }

    // Create Supabase server client bound to cookies for auth
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value
          },
          set() {},
          remove() {},
        },
      },
    )

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Generate or fetch cached explanation
    const service = new ExplanationService()
    const explanation = await service.getExplanation(user.id, movieId, movieMeta || {})

    return NextResponse.json({ explanation })
  } catch (error) {
    logger.error('Explanation endpoint error', {
      error: error instanceof Error ? error.message : String(error),
    })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 