import { NextRequest, NextResponse } from 'next/server'
import { createAuthenticatedApiHandler, parseJsonBody } from '@/lib/api/factory'
import { z } from 'zod'

const ratingSchema = z.object({
  movie_id: z.string().uuid(),
  interested: z.boolean().optional(), // like/dislike toggle
  rating: z.number().min(1).max(5).optional(), // 1-5 stars (future)
})

// POST /api/ratings – insert/update rating by movie/user
export const POST = createAuthenticatedApiHandler(
  async (request: NextRequest, { supabase, user }) => {
    const json = await parseJsonBody<unknown>(request)
    const parsed = ratingSchema.safeParse(json)

    if (!parsed.success) {
      throw new Error(parsed.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', '))
    }

    const { movie_id, interested, rating } = parsed.data

    // Upsert rating
    const { data, error } = await supabase
      .from('ratings')
      .upsert(
        {
          user_id: user.id,
          movie_id,
          interested: interested ?? true,
          rating,
          rated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,movie_id' }
      )
      .select('*')
      .single()

    if (error) {
      throw new Error(error.message)
    }

    return NextResponse.json({
      success: true,
      data,
    })
  }
)
