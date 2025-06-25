import { NextRequest, NextResponse } from 'next/server'
import { createAuthenticatedApiHandler, parseJsonBody } from '@/lib/api/factory'

export const POST = createAuthenticatedApiHandler(
  async (request: NextRequest, { supabase, user }) => {
    const { movieId, action, rating } = await parseJsonBody<{
      movieId: string
      action: string
      rating?: number
    }>(request)

    if (!movieId || !action) {
      throw new Error('Movie ID and action are required')
    }

    // Record the interaction
    const { data, error } = await supabase.from('ratings').insert({
      user_id: user.id,
      movie_id: movieId,
      interested: action === 'like',
      rating: rating || null,
      interaction_type: action,
      source: 'web',
    })

    if (error) {
      throw new Error(`Failed to record interaction: ${error.message}`)
    }

    return NextResponse.json({ success: true, data })
  }
)

export const GET = createAuthenticatedApiHandler(
  async (request: NextRequest, { supabase, user }) => {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')

    // Get user's interaction history
    const { data, error } = await supabase
      .from('ratings')
      .select(
        `
      *,
      movies (*)
    `
      )
      .eq('user_id', user.id)
      .order('rated_at', { ascending: false })
      .limit(limit)

    if (error) {
      throw new Error(`Failed to fetch interactions: ${error.message}`)
    }

    return NextResponse.json({ success: true, interactions: data || [] })
  }
)
