import { NextRequest, NextResponse } from 'next/server'
import { createAuthenticatedApiHandler, withValidation } from '@/lib/api/factory'
import { z } from 'zod'

const interactionSchema = z.object({
  movieId: z.string().min(1, 'Movie ID is required').max(100, 'Movie ID too long'),
  action: z.enum(
    ['like', 'dislike', 'watch', 'rate', 'favorite', 'watchlist_add', 'watchlist_remove'],
    {
      errorMap: () => ({
        message:
          'Action must be one of: like, dislike, watch, rate, favorite, watchlist_add, watchlist_remove',
      }),
    }
  ),
  rating: z
    .number()
    .min(1, 'Rating must be between 1-5')
    .max(5, 'Rating must be between 1-5')
    .optional(),
})

export const POST = createAuthenticatedApiHandler(
  async (request: NextRequest, { supabase, user }) => {
    const { movieId, action, rating } = await withValidation(request, interactionSchema)

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
