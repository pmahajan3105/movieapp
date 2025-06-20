/**
 * Semantic Recommendations API - Using simplified factory pattern
 */

import {
  createSimplePublicHandler,
  createApiResponse,
  parseJsonBody,
} from '@/lib/api/simplified-factory'
import { SemanticRecommendationService } from '@/lib/services/semantic-recommendations'
import type { NextRequest } from 'next/server'
import { z } from 'zod'

// Request validation schema
const semanticRequestSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  query: z.string().optional(),
  preferredGenres: z.array(z.string()).optional(),
  mood: z.string().optional(),
  limit: z.number().min(1).max(50).optional().default(10),
  semanticThreshold: z.number().min(0).max(1).optional().default(0.7),
})

// POST /api/recommendations/semantic - Generate semantic recommendations
export const POST = createSimplePublicHandler(async (request: NextRequest, supabase) => {
  // Parse and validate request body
  const body = await parseJsonBody(request, semanticRequestSchema)

  console.log('🔍 Semantic search request:', {
    userId: body.userId,
    query: body.query,
    preferredGenres: body.preferredGenres,
    mood: body.mood,
  })

  // Use the extracted semantic recommendation service
  const service = new SemanticRecommendationService(supabase)
  const result = await service.generateRecommendations({
    userId: body.userId,
    query: body.query,
    preferredGenres: body.preferredGenres,
    mood: body.mood,
    limit: body.limit,
    semanticThreshold: body.semanticThreshold,
  })

  return createApiResponse(
    result,
    undefined,
    200,
    'Semantic recommendations generated successfully'
  )
})
