/**
 * Semantic Recommendations API – migrated to new api/factory wrappers
 */

import { withSupabase, withError, ok, fail } from '@/lib/api/factory'
import { SemanticRecommendationService } from '@/lib/services/semantic-recommendations'
import { z } from 'zod'
import { logger } from '@/lib/logger'

// Validation schema
const semanticRequestSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  query: z.string().optional(),
  preferredGenres: z.array(z.string()).optional(),
  mood: z.string().optional(),
  limit: z.number().min(1).max(50).optional().default(10),
  semanticThreshold: z.number().min(0).max(1).optional().default(0.7),
})

// POST /api/recommendations/semantic – Generate semantic recommendations
export const POST = withError(
  withSupabase(async ({ request, supabase }) => {
    // Attempt to parse & validate the request body
    const bodyJson = await request.json().catch(() => null)

    const parsed = semanticRequestSchema.safeParse(bodyJson)
    if (!parsed.success) {
      const errorMsg = parsed.error.errors.map(e => e.message).join(', ')
      return fail(`Validation error: ${errorMsg}`, 400)
    }

    const body = parsed.data

    // Debug log (dev only)
    if (process.env.NODE_ENV === 'development') {
      logger.info('Semantic search request', {
        userId: body.userId,
        query: body.query,
        preferredGenres: body.preferredGenres,
        mood: body.mood,
      })
    }

    const service = new SemanticRecommendationService(supabase)
    const result = await service.generateRecommendations({
      userId: body.userId,
      query: body.query,
      preferredGenres: body.preferredGenres,
      mood: body.mood,
      limit: body.limit,
      semanticThreshold: body.semanticThreshold,
    })

    return ok(result)
  })
)
