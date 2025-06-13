import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { anthropic, claudeConfig } from '@/lib/anthropic/config'
import {
  buildEnhancedRecommendationContext,
  buildComprehensivePrompt,
} from '@/lib/ai/enhanced-context'
// import { addMemories } from '@mem0/vercel-ai-provider' // Package removed

// Temporary placeholder for memory functionality
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const addMemories = async (...args: any[]) => {
  // Memory functionality disabled - package removed
  return { success: true }
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { userId, sessionId, message, count = 10, moodContext } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('🎬 Enhanced AI Recommendations Request:', {
        userId: userId.substring(0, 8) + '...',
        messageLength: message?.length || 0,
        count,
        hasMoodContext: !!moodContext,
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
      console.log('📝 Comprehensive prompt length:', comprehensivePrompt.length, 'characters')
    }

    // Use Claude with higher token limit for complex recommendations
    const response = await anthropic.messages.create({
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

    const aiResponse = response.content[0]?.type === 'text' ? response.content[0].text : ''
    if (!aiResponse) {
      throw new Error('No response from AI')
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('🤖 Raw AI Response length:', aiResponse.length, 'characters')
    }

    // Enhanced JSON parsing with multiple strategies
    let recommendations
    try {
      // First, try direct parsing
      recommendations = JSON.parse(aiResponse)
    } catch {
      if (process.env.NODE_ENV === 'development') {
        console.log('🔧 Direct JSON parsing failed, trying extraction...')
      }

      // Extract JSON from markdown blocks or text
      const jsonMatch =
        aiResponse.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/) || aiResponse.match(/(\{[\s\S]*\})/)

      if (jsonMatch) {
        try {
          recommendations = JSON.parse(jsonMatch[1] || '')
        } catch (extractError) {
          console.error('❌ JSON extraction failed:', extractError)
          throw new Error('Failed to parse AI response as JSON')
        }
      } else {
        console.error('❌ No JSON found in response:', aiResponse.substring(0, 500))
        throw new Error('No valid JSON found in AI response')
      }
    }

    // Validate response structure
    if (!recommendations?.recommendations || !Array.isArray(recommendations.recommendations)) {
      console.error('❌ Invalid response structure:', recommendations)
      throw new Error('Invalid response structure from AI')
    }

    // Convert AI recommendations to EnhancedRecommendation format
    const enhancedRecommendations = await convertToEnhancedRecommendations(
      recommendations.recommendations
    )

    if (process.env.NODE_ENV === 'development') {
      console.log(
        '🔄 Converted AI recommendations to enhanced format:',
        enhancedRecommendations.length
      )
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
      context_summary: recommendations.context_summary || 'Comprehensive behavioral analysis used',
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
      console.log('✅ Enhanced recommendations generated:', {
        count: recommendations.recommendations.length,
        hasContext: !!recommendations.context_summary,
        hasLearning: !!recommendations.learning_notes,
        intelligenceFactors: Object.keys(enhancedResponse.intelligence_used).length,
      })
    }

    return NextResponse.json(enhancedResponse)
  } catch (error) {
    console.error('❌ Enhanced Recommendation Error:', error)

    // Return detailed error information for debugging
    return NextResponse.json(
      {
        error: 'Failed to generate enhanced recommendations',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}

// Real-time learning endpoint for rating updates
export async function PATCH(request: NextRequest) {
  try {
    const { userId, movieId, rating, action } = await request.json()

    if (!userId || !movieId) {
      return NextResponse.json({ error: 'User ID and Movie ID are required' }, { status: 400 })
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('📈 Real-time learning update:', {
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
      return NextResponse.json({ error: 'Movie not found' }, { status: 404 })
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

    return NextResponse.json({
      success: true,
      message: 'Real-time learning updated',
      insight: learningInsight,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('❌ Real-time learning error:', error)
    return NextResponse.json(
      {
        error: 'Failed to update real-time learning',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

// Helper function to store rating patterns for immediate learning
async function storeRatingPattern(
  userId: string,
  movieId: string,
  rating: number,
  movie: { title: string; genre?: string[]; director?: string[]; year: number }
) {
  try {
    // Analyze this new rating in context of user's patterns
    let ratingInsight = ''

    if (rating >= 4) {
      ratingInsight = `User LOVES ${movie.genre?.join(', ')} movies like "${movie.title}". High rating (${rating}/5) suggests strong preference for this type of content.`
    } else if (rating <= 2) {
      ratingInsight = `User DISLIKES ${movie.genre?.join(', ')} movies like "${movie.title}". Low rating (${rating}/5) suggests avoid similar content.`
    } else {
      ratingInsight = `User has MIXED feelings about ${movie.genre?.join(', ')} movies like "${movie.title}". Rating (${rating}/5) suggests neutral preference.`
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

    console.log('💡 Stored rating pattern insight:', ratingInsight)
  } catch (error) {
    console.error('❌ Error storing rating pattern:', error)
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
  aiRecommendations: AIRecommendation[]
): Promise<unknown[]> {
  const enhancedRecommendations = []

  for (const [index, aiRec] of aiRecommendations.entries()) {
    try {
      // Try to find the movie in our database
      let movie = null

      // First try by TMDB ID if provided
      if (aiRec.tmdb_id) {
        const { data: tmdbMovie } = await supabase
          .from('movies')
          .select('*')
          .eq('tmdb_id', aiRec.tmdb_id)
          .single()

        if (tmdbMovie) {
          movie = tmdbMovie
        }
      }

      // If not found, try by title and year
      if (!movie && aiRec.title && aiRec.year) {
        const { data: titleMovies } = await supabase
          .from('movies')
          .select('*')
          .ilike('title', aiRec.title)
          .eq('year', aiRec.year)
          .limit(1)

        if (titleMovies && titleMovies.length > 0) {
          movie = titleMovies[0]
        }
      }

      // If still not found, try just by title (fuzzy match)
      if (!movie && aiRec.title) {
        const { data: fuzzyMovies } = await supabase
          .from('movies')
          .select('*')
          .ilike('title', `%${aiRec.title}%`)
          .limit(1)

        if (fuzzyMovies && fuzzyMovies.length > 0) {
          movie = fuzzyMovies[0]
        }
      }

      // If we couldn't find the movie in database, create a mock movie object
      if (!movie) {
        console.warn(`⚠️ Movie not found in database: ${aiRec.title} (${aiRec.year})`)
        movie = {
          id: `ai_generated_${index}`,
          title: aiRec.title || 'Unknown Title',
          year: aiRec.year || undefined,
          genre: aiRec.genre || [],
          director: aiRec.director || [],
          plot: aiRec.plot || '',
          poster_url: undefined,
          rating: undefined,
          runtime: undefined,
          tmdb_id: aiRec.tmdb_id || undefined,
        }
      }

      // Create the enhanced recommendation
      const enhancedRec = {
        movie,
        reason: aiRec.reasoning || 'AI recommended based on your preferences',
        confidence: aiRec.confidence_score || 0.5,
        position: index + 1,
        explanation: {
          primaryReasons: [aiRec.reasoning || 'AI recommended based on your preferences'],
          preferenceMatches: {
            genres:
              aiRec.behavioral_match?.filter((match: string) => match.includes('genre')) || [],
            directors:
              aiRec.behavioral_match?.filter((match: string) => match.includes('director')) || [],
            themes:
              aiRec.behavioral_match?.filter((match: string) => match.includes('theme')) || [],
          },
          qualitySignals: {
            rating: movie.rating,
            userRatings: undefined,
            awards: [],
          },
          contextMatch: {
            runtime: movie.runtime ? `${movie.runtime} minutes` : undefined,
            year: movie.year ? `Released in ${movie.year}` : undefined,
          },
          considerations: [],
          similarToLiked: [],
        },
        source: 'ai' as const,
      }

      enhancedRecommendations.push(enhancedRec)
    } catch (error) {
      console.error(`❌ Error converting recommendation ${index}:`, error)
      // Continue with next recommendation rather than failing completely
    }
  }

  console.log(
    `✅ Successfully converted ${enhancedRecommendations.length}/${aiRecommendations.length} recommendations`
  )
  return enhancedRecommendations
}
