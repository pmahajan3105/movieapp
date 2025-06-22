import { requireAuth, withError, ok, fail } from '@/lib/api/factory'
import { z } from 'zod'

const ratingSchema = z.object({
  movie_id: z.string().uuid(),
  interested: z.boolean().optional(), // like/dislike toggle
  rating: z.number().min(1).max(5).optional(), // 1-5 stars (future)
})

// POST /api/ratings – insert/update rating by movie/user
export const POST = withError(
  requireAuth(async ({ request, supabase, user }) => {
    const json = await request.json().catch(() => null)
    const parsed = ratingSchema.safeParse(json)

    if (!parsed.success) {
      return fail(parsed.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', '), 400)
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
      return fail(error.message, 500)
    }

    return ok(data)
  })
)
