import { withSupabase, withError, ok, fail } from '@/lib/api/factory'
import { anthropic, claudeConfig } from '@/lib/anthropic/config'
import {
  buildEnhancedRecommendationContext,
  buildComprehensivePrompt,
} from '@/lib/ai/enhanced-context'
import { logger } from '@/lib/logger'
// import { addMemories } from '@mem0/vercel-ai-provider' // Package removed

// Types for memory function parameters
type MemoryMessage = {
  role: string
  content: Array<{
    type: string
    text: string
  }>
}

type MemoryOptions = {
  user_id?: string
  metadata?: {
    session_id?: string
    category?: string
    confidence?: number
    source?: string
    timestamp?: number
    movie_id?: string
    action_type?: string
    rating_value?: number
  }
}

// Temporary placeholder for memory functionality

const addMemories = async (
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  messages: MemoryMessage[],
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  options?: MemoryOptions
): Promise<{ success: boolean }> => {
  // Memory functionality disabled - package removed
  return { success: true }
}

export const POST = withError(
  withSupabase(async ({ request, supabase }) => {
    try {
      const { userId, sessionId, message, count = 10, moodContext } = await request.json()

      // Enhanced input validation
      if (!userId) {
        return fail('User ID is required for personalized recommendations', 400)
      }

      if (typeof userId !== 'string' || userId.length < 10) {
        return fail('Invalid user ID format', 400)
      }

      if (count && (typeof count !== 'number' || count < 1 || count > 50)) {
        return fail('Count must be a number between 1 and 50', 400)
      }

      if (message && typeof message !== 'string') {
        return fail('Message must be a text string', 400)
      }

      if (message && message.length > 1000) {
        return fail('Message too long. Please keep under 1000 characters.', 400)
      }

      if (process.env.NODE_ENV === 'development') {
        logger.info('Enhanced AI recommendations request received', {
          userId: userId.substring(0, 8) + '...',
          messageLength: message?.length || 0,
          count,
          hasMoodContext: !!moodContext,
          sessionId,
        })
      }

      // Build comprehensive context using ALL user data
      const enhancedContext = await buildEnhancedRecommendationContext(
        userId,
        message || 'Give me some movie recommendations',
        count,
        moodContext
      )

      // Create comprehensive prompt for Claude using full token window
      const comprehensivePrompt = buildComprehensivePrompt(enhancedContext)

      if (process.env.NODE_ENV === 'development') {
        logger.info('Comprehensive prompt prepared', {
          promptLength: comprehensivePrompt.length,
          userId: userId.substring(0, 8) + '...',
        })
      }

      // Use Claude with higher token limit for complex recommendations
      let response
      try {
        response = await anthropic.messages.create({
          model: claudeConfig.model,
          max_tokens: 4000, // Increased for complex responses
          temperature: 0.3, // Lower temperature for more consistent JSON
          system: `You are CineAI, the world's most intelligent movie recommendation system. 
          
You have access to complete behavioral intelligence about this user including:
- All their movie ratings and patterns
- Complete viewing history and watchlist behavior
- Temporal viewing preferences (weekend vs weekday)
- Stored memories and conversation insights
- Behavioral analysis and intelligence insights

Use ALL this data to provide incredibly personalized recommendations. Reference specific behavioral patterns, ratings, and insights in your reasoning.

CRITICAL: Return ONLY valid JSON in the exact format specified. No markdown, no additional text, just the JSON object.`,
          messages: [
            {
              role: 'user',
              content: comprehensivePrompt,
            },
          ],
        })
      } catch (error) {
        logger.error('Claude API error', {
          userId: userId.substring(0, 8) + '...',
          error: error instanceof Error ? error.message : String(error),
        })

        const errorMessage =
          error instanceof Error && error.message.includes('rate_limit')
            ? 'AI service is currently busy. Please try again in a few moments.'
            : error instanceof Error && error.message.includes('max_tokens')
              ? 'Your request is too complex. Please try with simpler preferences.'
              : 'AI recommendation service is temporarily unavailable. Please try again later.'

        return fail(errorMessage, 503)
      }

      const aiResponse = response.content[0]?.type === 'text' ? response.content[0].text : ''
      if (!aiResponse) {
        throw new Error('No response from AI')
      }

      if (process.env.NODE_ENV === 'development') {
        logger.info('AI response received', {
          responseLength: aiResponse.length,
          userId: userId.substring(0, 8) + '...',
        })
      }

      // Enhanced JSON parsing with multiple strategies
      let recommendations
      try {
        // First, try direct parsing
        recommendations = JSON.parse(aiResponse)
      } catch {
        if (process.env.NODE_ENV === 'development') {
          logger.info('Direct JSON parsing failed, attempting extraction', {
            userId: userId.substring(0, 8) + '...',
          })
        }

        // Extract JSON from markdown blocks or text
        const jsonMatch =
          aiResponse.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/) ||
          aiResponse.match(/(\{[\s\S]*\})/)

        if (jsonMatch) {
          try {
            recommendations = JSON.parse(jsonMatch[1] || '')
          } catch (extractError) {
            logger.error('JSON extraction failed', {
              userId: userId.substring(0, 8) + '...',
              error: extractError instanceof Error ? extractError.message : String(extractError),
            })
            throw new Error('Failed to parse AI response as JSON')
          }
        } else {
          logger.error('No JSON found in AI response', {
            userId: userId.substring(0, 8) + '...',
            responsePreview: aiResponse.substring(0, 500),
          })
          throw new Error('No valid JSON found in AI response')
        }
      }

      // Validate response structure
      if (!recommendations?.recommendations || !Array.isArray(recommendations.recommendations)) {
        logger.error('Invalid response structure from AI', {
          userId: userId.substring(0, 8) + '...',
          hasRecommendations: !!recommendations?.recommendations,
          isArray: Array.isArray(recommendations?.recommendations),
        })
        throw new Error('Invalid response structure from AI')
      }

      // Convert AI recommendations to EnhancedRecommendation format
      const enhancedRecommendations = await convertToEnhancedRecommendations(
        recommendations.recommendations,
        supabase
      )

      if (process.env.NODE_ENV === 'development') {
        logger.info('AI recommendations converted to enhanced format', {
          originalCount: recommendations.recommendations.length,
          enhancedCount: enhancedRecommendations.length,
          userId: userId.substring(0, 8) + '...',
        })
      }

      // Store recommendations and learning notes in Mem0 for future intelligence
      if (recommendations.learning_notes && Array.isArray(recommendations.learning_notes)) {
        for (const note of recommendations.learning_notes) {
          await addMemories(
            [{ role: 'user', content: [{ type: 'text', text: `Learning insight: ${note}` }] }],
            {
              user_id: userId,
              metadata: {
                session_id: sessionId || 'unknown_session',
                category: 'real_time_learning',
                confidence: 0.8,
                source: 'recommendation_response',
                timestamp: Math.floor(Date.now() / 1000),
              },
            }
          )
        }
      }

      // Store the user's query context for future learning
      await addMemories(
        [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `User requested: "${message}" ${
                  moodContext ? `with mood: ${moodContext}` : ''
                }`,
              },
            ],
          },
        ],
        {
          user_id: userId,
          metadata: {
            session_id: sessionId || 'unknown_session',
            category: 'conversation_context',
            confidence: 1.0,
            source: 'user_query',
            timestamp: Math.floor(Date.now() / 1000),
          },
        }
      )

      // Enhanced response with intelligence metadata
      const enhancedResponse = {
        recommendations: enhancedRecommendations,
        context_summary:
          recommendations.context_summary || 'Comprehensive behavioral analysis used',
        learning_notes: recommendations.learning_notes || [],
        intelligence_used: {
          behavioral_patterns: Object.keys(enhancedContext.behavioral_intelligence),
          memory_insights:
            enhancedContext.mem0_memories.preferences.length +
            enhancedContext.mem0_memories.behavioral_patterns.length,
          viewing_history_size: enhancedContext.viewing_history.all_watched_movies.length,
          context_complexity: comprehensivePrompt.length,
        },
        timestamp: new Date().toISOString(),
      }

      if (process.env.NODE_ENV === 'development') {
        logger.info('Enhanced recommendations generated successfully', {
          recommendationCount: recommendations.recommendations.length,
          hasContextSummary: !!recommendations.context_summary,
          hasLearningNotes: !!recommendations.learning_notes,
          intelligenceFactors: Object.keys(enhancedResponse.intelligence_used).length,
          userId: userId.substring(0, 8) + '...',
        })
      }

      return ok(enhancedResponse)
    } catch (error) {
      logger.error('Enhanced recommendation generation failed', {
        error: error instanceof Error ? error.message : String(error),
      })

      // Return detailed error information for debugging
      return fail('Failed to generate enhanced recommendations', 500)
    }
  })
)

// Real-time learning endpoint for rating updates
export const PATCH = withError(
  withSupabase(async ({ request, supabase }) => {
    try {
      const { userId, movieId, rating, action } = await request.json()

      if (!userId || !movieId || !action) {
        return fail('Missing parameters', 400)
      }

      if (process.env.NODE_ENV === 'development') {
        logger.info('Real-time learning update received', {
          userId: userId.substring(0, 8) + '...',
          movieId: movieId.substring(0, 8) + '...',
          rating,
          action,
        })
      }

      // Get movie details for context
      const { data: movie } = await supabase
        .from('movies')
        .select('title, genre, director, year')
        .eq('id', movieId)
        .single()

      if (!movie) {
        return fail('Movie not found', 404)
      }

      // Store real-time learning insights
      let learningInsight = ''

      switch (action) {
        case 'rating':
          learningInsight = `User rated "${movie.title}" (${movie.year}) ${rating}/5 stars. Genres: ${movie.genre?.join(', ')}. Director: ${movie.director?.join(', ')}.`
          break
        case 'watchlist_add':
          learningInsight = `User added "${movie.title}" (${movie.year}) to watchlist. Interested in: ${movie.genre?.join(', ')}.`
          break
        case 'watched':
          learningInsight = `User marked "${movie.title}" (${movie.year}) as watched. Completed viewing of: ${movie.genre?.join(', ')}.`
          break
        default:
          learningInsight = `User interacted with "${movie.title}" (${movie.year}). Action: ${action}.`
      }

      // Store the learning insight in Mem0
      await addMemories([{ role: 'user', content: [{ type: 'text', text: learningInsight }] }], {
        user_id: userId,
        metadata: {
          category: 'real_time_learning',
          confidence: 0.9,
          source: 'user_action',
          timestamp: Math.floor(Date.now() / 1000),
          movie_id: movieId,
          action_type: action,
        },
      })

      // If it's a rating, also update our behavioral analysis cache
      if (action === 'rating' && rating) {
        await storeRatingPattern(userId, movieId, rating, movie)
      }

      return ok({
        message: 'Real-time learning updated',
        insight: learningInsight,
      })
    } catch (error) {
      logger.error('Real-time learning update failed', {
        error: error instanceof Error ? error.message : String(error),
      })
      return fail('Failed to update real-time learning', 500)
    }
  })
)

// Helper function to store rating patterns for immediate learning
async function storeRatingPattern(
  userId: string,
  movieId: string,
  rating: number,
  movie: {
    title: string
    genre?: string[] | null
    director?: string[] | null
    year?: number | null
  }
) {
  try {
    // Analyze this new rating in context of user's patterns
    let ratingInsight = ''

    if (rating >= 4) {
      ratingInsight = `User LOVES ${movie.genre?.join(', ') || 'unknown genre'} movies like "${movie.title}". High rating (${rating}/5) suggests strong preference for this type of content.`
    } else if (rating <= 2) {
      ratingInsight = `User DISLIKES ${movie.genre?.join(', ') || 'unknown genre'} movies like "${movie.title}". Low rating (${rating}/5) suggests avoid similar content.`
    } else {
      ratingInsight = `User has MIXED feelings about ${movie.genre?.join(', ') || 'unknown genre'} movies like "${movie.title}". Rating (${rating}/5) suggests neutral preference.`
    }

    // Store pattern insight
    await addMemories([{ role: 'user', content: [{ type: 'text', text: ratingInsight }] }], {
      user_id: userId,
      metadata: {
        category: 'rating_intelligence',
        confidence: 0.85,
        source: 'rating_analysis',
        timestamp: Math.floor(Date.now() / 1000),
        movie_id: movieId,
        rating_value: rating,
      },
    })

    logger.info('Rating pattern insight stored', {
      userId: userId.substring(0, 8) + '...',
      movieId: movieId.substring(0, 8) + '...',
      rating,
      insightType: rating >= 4 ? 'LOVES' : rating <= 2 ? 'DISLIKES' : 'MIXED',
    })
  } catch (error) {
    logger.error('Error storing rating pattern', {
      userId: userId.substring(0, 8) + '...',
      movieId: movieId.substring(0, 8) + '...',
      rating,
      error: error instanceof Error ? error.message : String(error),
    })
  }
}

// Interface for AI recommendation structure
interface AIRecommendation {
  tmdb_id?: number
  title?: string
  year?: number
  genre?: string[]
  director?: string[]
  plot?: string
  reasoning?: string
  confidence_score?: number
  behavioral_match?: string[]
}

// Convert AI recommendations to EnhancedRecommendation format
async function convertToEnhancedRecommendations(
  aiRecommendations: AIRecommendation[],
  supabase: any
): Promise<unknown[]> {
  const enhancedRecommendations = []

  if (process.env.NODE_ENV === 'development') {
    logger.info('Converting AI recommendations to enhanced format', {
      aiRecommendationCount: aiRecommendations.length,
    })
  }

  // First, try to find AI-recommended movies in our database
  for (const aiRec of aiRecommendations) {
    try {
      // Try multiple search strategies to find the movie
      let movie = null

      // Strategy 1: Search by title and year
      if (aiRec.title && aiRec.year) {
        const { data } = await supabase
          .from('movies')
          .select('*')
          .ilike('title', `%${aiRec.title}%`)
          .eq('year', aiRec.year)
          .limit(1)
          .single()
        movie = data
      }

      // Strategy 2: Search by title only if year search failed
      if (!movie && aiRec.title) {
        const { data } = await supabase
          .from('movies')
          .select('*')
          .ilike('title', `%${aiRec.title}%`)
          .limit(1)
          .single()
        movie = data
      }

      if (movie) {
        enhancedRecommendations.push({
          id: movie.id,
          title: movie.title,
          year: movie.year,
          genre: movie.genre,
          director: movie.director,
          plot: movie.plot,
          poster_url: movie.poster_url,
          rating: movie.rating,
          runtime: movie.runtime,
          reasoning: aiRec.reasoning || 'AI recommended based on your preferences',
          confidence_score: aiRec.confidence_score || 0.8,
          source: 'ai_matched_local',
        })
      } else {
        if (process.env.NODE_ENV === 'development') {
          logger.warn('Movie not found in database', {
            title: aiRec.title,
            year: aiRec.year,
          })
        }
      }
    } catch (error) {
      logger.error('Error finding movie in database', {
        title: aiRec.title,
        year: aiRec.year,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  // If we don't have enough recommendations, fill with popular local movies
  if (enhancedRecommendations.length < 6) {
    const needed = 12 - enhancedRecommendations.length

    try {
      const { data: popularMovies } = await supabase
        .from('movies')
        .select('*')
        .not('id', 'in', `(${enhancedRecommendations.map(r => `'${r.id}'`).join(',') || "''"})`)
        .order('rating', { ascending: false })
        .limit(needed)

      if (popularMovies) {
        for (const movie of popularMovies) {
          enhancedRecommendations.push({
            id: movie.id,
            title: movie.title,
            year: movie.year,
            genre: movie.genre,
            director: movie.director,
            plot: movie.plot,
            poster_url: movie.poster_url,
            rating: movie.rating,
            runtime: movie.runtime,
            reasoning: 'Popular choice based on ratings',
            confidence_score: 0.6,
            source: 'local_popular_fallback',
          })
        }
      }
    } catch (error) {
      logger.error('Error fetching popular movies fallback', {
        needed,
        currentCount: enhancedRecommendations.length,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  if (process.env.NODE_ENV === 'development') {
    logger.info('AI recommendations conversion completed', {
      successfullyConverted: enhancedRecommendations.length,
      originalCount: aiRecommendations.length,
      conversionRate: `${Math.round((enhancedRecommendations.length / aiRecommendations.length) * 100)}%`,
    })
  }

  return enhancedRecommendations
}
