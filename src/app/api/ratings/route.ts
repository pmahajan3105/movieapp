import { NextRequest, NextResponse } from 'next/server'
import { createAuthenticatedApiHandler, withValidation } from '@/lib/api/factory'
import { z } from 'zod'

const ratingSchema = z
  .object({
    movie_id: z.string().uuid('Movie ID must be a valid UUID'),
    interested: z.boolean().optional(), // like/dislike toggle
    rating: z
      .number()
      .min(1, 'Rating must be between 1-5')
      .max(5, 'Rating must be between 1-5')
      .optional(), // 1-5 stars (future)
  })
  .refine(data => data.interested !== undefined || data.rating !== undefined, {
    message: 'Either interested (boolean) or rating (1-5) must be provided',
    path: ['rating'], // Error will be shown on rating field
  })

// POST /api/ratings – insert/update rating by movie/user
export const POST = createAuthenticatedApiHandler(
  async (request: NextRequest, { supabase, user }) => {
    const { movie_id, interested, rating } = await withValidation(request, ratingSchema)

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
