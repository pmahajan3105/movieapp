import { openaiProvider } from '@/lib/ai/providers/openai-provider'
import type { Movie } from '@/types'
import type { UserBehaviorProfile } from '@/lib/ai/behavioral-analysis'
import type { HyperPersonalizedRecommendation } from '@/lib/ai/hyper-personalized-engine'
import { logger } from '@/lib/logger'

interface LLMRerankResult {
  movieId: string
  reasoning: string
  adjustedScore?: number
}

/**
 * Reranks and explains movie candidates using an LLM
 */
export class LLMReranker {
  /**
   * Rerank candidates using GPT-4o-mini (or configured model)
   */
  async rerankCandidates(
    candidates: HyperPersonalizedRecommendation[],
    profile: UserBehaviorProfile,
    targetCount: number = 5
  ): Promise<HyperPersonalizedRecommendation[]> {
    try {
      logger.info('🧠 Starting LLM reranking', {
        candidateCount: candidates.length,
        targetCount,
      })

      // 1. Prepare User Context
      const userContext = this.buildUserContext(profile)

      // 2. Prepare Candidate List
      const candidateList = candidates.map(c => ({
        id: c.movie.id,
        title: c.movie.title,
        year: c.movie.year,
        director: c.movie.director,
        genre: c.movie.genre,
        plot: c.movie.plot,
        currentScore: c.confidence_score,
      }))

      // 3. Construct Prompt
      const prompt = `
You are a highly personalized movie recommender. 
Your goal is to pick the best ${targetCount} movies for this user from the provided candidates.

USER PROFILE:
${userContext}

CANDIDATES:
${JSON.stringify(candidateList, null, 2)}

INSTRUCTIONS:
1. Select the top ${targetCount} movies that best match the user's profile and current context.
2. Write a custom, 1-sentence "pitch" for each movie. It should sound like a friend recommending it. 
   - Connect it to their known likes (e.g., "Since you liked Inception...")
   - Mention why it fits their specific taste (director, genre, vibe).
3. You may adjust the score (0-100) if you think a movie is a hidden gem for this user.

OUTPUT FORMAT (JSON only):
{
  "recommendations": [
    {
      "movieId": "string",
      "reasoning": "string",
      "adjustedScore": number (optional)
    }
  ]
}
`

      // 4. Call LLM
      const response = await openaiProvider.chat([
        { role: 'system', content: 'You are a JSON-only API. Output strict JSON.' },
        { role: 'user', content: prompt }
      ], {
        temperature: 0.7,
        model: 'gpt-4o-mini' // Use fast model for reranking
      })

      // 5. Parse & Merge Results
      const content = response.content.replace(/```json\n?|\n?```/g, '') // Clean markdown
      const result = JSON.parse(content) as { recommendations: LLMRerankResult[] }

      // Map back to full objects
      const reranked: HyperPersonalizedRecommendation[] = []
      
      for (const rec of result.recommendations) {
        const original = candidates.find(c => c.movie.id === rec.movieId)
        if (original) {
          reranked.push({
            ...original,
            explanation: rec.reasoning, // Replace algorithmic explanation with LLM pitch
            confidence_score: rec.adjustedScore || original.confidence_score
          })
        }
      }

      logger.info('✅ LLM Reranking complete', {
        originalCount: candidates.length,
        rerankedCount: reranked.length
      })

      return reranked

    } catch (error) {
      logger.error('❌ LLM Reranking failed, falling back to algorithmic ranking', {
        error: error instanceof Error ? error.message : String(error)
      })
      // Fallback: Just return the top N from the original algorithmic sort
      return candidates.slice(0, targetCount)
    }
  }

  private buildUserContext(profile: UserBehaviorProfile): string {
    const genres = Array.from(profile.rating_patterns.genre_rating_averages.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([g]) => g)
      .join(', ')

    const directors = Array.from(profile.rating_patterns.director_rating_averages.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([d]) => d)
      .join(', ')

    const recentFavorites = profile.rating_patterns.five_star_movies
      .slice(0, 3)
      .map(p => p.movie.title)
      .join(', ')

    return `
- Top Genres: ${genres}
- Favorite Directors: ${directors}
- Recently Loved: ${recentFavorites}
- Taste Complexity: ${profile.intelligence_insights.exploration_vs_comfort_ratio > 0.6 ? 'High (Likes obscure/complex films)' : 'Standard'}
- Mood/Context: The user is looking for something to watch right now.
`
  }
}

export const llmReranker = new LLMReranker()

