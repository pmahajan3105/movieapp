import { logger } from '@/lib/logger'
import type { ChatMessage, PreferenceData } from '@/types/chat'
import { AnthropicAPIError, PreferenceExtractionError } from '@/lib/errors'

interface MovieQuery {
  isMovieQuery: boolean
  movieTitle?: string
}

export class PreferenceExtractionService {
  
  /**
   * Detects if a message is asking about a specific movie
   */
  static detectMovieQuery(message: string): MovieQuery {
    const moviePatterns = [
      /what about (.+?)(?:\?|$)/i,
      /tell me about (.+?)(?:\?|$)/i,
      /have you seen (.+?)(?:\?|$)/i,
      /watched (.+?)(?:\?|$)/i,
      /(?:movie|film) (.+?)(?:\?|$)/i,
    ]

    for (const pattern of moviePatterns) {
      const match = message.match(pattern)
      if (match) {
        const movieTitle = match[1]?.trim()
        if (movieTitle && movieTitle.length > 1) {
          return {
            isMovieQuery: true,
            movieTitle,
          }
        }
      }
    }

    return { isMovieQuery: false }
  }

  /**
   * Extract preferences from chat conversation history
   */
  static async extractPreferencesFromConversation(
    chatHistory: ChatMessage[],
    anthropicApiKey: string
  ): Promise<PreferenceData | null> {
    try {
      logger.info('🔍 Starting preference extraction from conversation', {
        messageCount: chatHistory.length,
      })

      // Create conversation context for preference extraction
      const conversationText = chatHistory
        .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
        .join('\n\n')

      const preferenceExtractionPrompt = `
Based on this conversation about movies, extract the user's preferences in the following JSON format:

{
  "genres": ["genre1", "genre2"],
  "yearRange": { "min": 1990, "max": 2024 },
  "ratingRange": { "min": 6.0, "max": 10.0 },
  "actors": ["actor1", "actor2"],
  "directors": ["director1", "director2"],
  "moods": ["action-packed", "emotional", "funny"],
  "themes": ["family", "adventure", "mystery"],
  "avoidGenres": ["horror", "documentary"],
  "preferredLanguages": ["English", "French"]
}

Only include fields where you can confidently extract preferences from the conversation.
If no clear preferences are mentioned, return an empty object {}.

Conversation:
${conversationText}

Extract preferences in JSON format:`

      const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': anthropicApiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 1000,
          temperature: 0.1,
          messages: [
            {
              role: 'user',
              content: preferenceExtractionPrompt,
            },
          ],
        }),
      })

      if (!anthropicResponse.ok) {
        throw new AnthropicAPIError(
          `Preference extraction failed`,
          anthropicResponse.status,
          { conversationLength: chatHistory.length }
        )
      }

      const anthropicData = await anthropicResponse.json()
      const extractionResult = anthropicData.content?.[0]?.text?.trim()

      if (!extractionResult) {
        logger.warn('⚠️ No preference extraction result from Anthropic')
        throw new PreferenceExtractionError(
          'No extraction result from AI service',
          { conversationLength: chatHistory.length }
        )
      }

      logger.info('📝 Raw preference extraction result:', { extractionResult })

      // Parse JSON response
      let extractedPreferenceData: PreferenceData
      try {
        // Extract JSON from the response (in case there's extra text)
        const jsonMatch = extractionResult.match(/\{[\s\S]*\}/)
        const jsonString = jsonMatch ? jsonMatch[0] : extractionResult

        extractedPreferenceData = JSON.parse(jsonString)
        logger.info('✅ Successfully parsed preferences:', { extractedPreferenceData })
      } catch (parseError) {
        logger.error('❌ Failed to parse preference extraction JSON:', {
          error: parseError instanceof Error ? parseError.message : String(parseError),
          rawResult: extractionResult,
        })
        throw new PreferenceExtractionError(
          'Failed to parse AI response as JSON',
          { rawResult: extractionResult.substring(0, 200) }
        )
      }

      // Validate and sanitize the extracted preferences
      const sanitizedPreferences = this.sanitizePreferences(extractedPreferenceData)
      
      logger.info('🎯 Final extracted preferences:', { sanitizedPreferences })
      return sanitizedPreferences

    } catch (error) {
      logger.error('❌ Preference extraction error:', { 
        error: error instanceof Error ? error.message : String(error) 
      })
      return null
    }
  }

  /**
   * Sanitize and validate extracted preferences
   */
  private static sanitizePreferences(preferences: any): PreferenceData {
    const sanitized: PreferenceData = {}

    // Sanitize genres
    if (Array.isArray(preferences.genres)) {
      sanitized.genres = preferences.genres
        .filter((g: any) => typeof g === 'string' && g.trim().length > 0)
        .map((g: string) => g.trim())
        .slice(0, 10) // Limit to 10 genres
    }

    // Sanitize year range
    if (preferences.yearRange && typeof preferences.yearRange === 'object') {
      const currentYear = new Date().getFullYear()
      const minYear = parseInt(preferences.yearRange.min) || 1900
      const maxYear = parseInt(preferences.yearRange.max) || currentYear
      
      if (minYear >= 1900 && maxYear <= currentYear + 5 && minYear <= maxYear) {
        sanitized.yearRange = { min: minYear, max: maxYear }
      }
    }

    // Sanitize rating range
    if (preferences.ratingRange && typeof preferences.ratingRange === 'object') {
      const minRating = parseFloat(preferences.ratingRange.min) || 0
      const maxRating = parseFloat(preferences.ratingRange.max) || 10
      
      if (minRating >= 0 && maxRating <= 10 && minRating <= maxRating) {
        sanitized.ratingRange = { min: minRating, max: maxRating }
      }
    }

    // Sanitize actors
    if (Array.isArray(preferences.actors)) {
      sanitized.actors = preferences.actors
        .filter((a: any) => typeof a === 'string' && a.trim().length > 0)
        .map((a: string) => a.trim())
        .slice(0, 20)
    }

    // Sanitize directors
    if (Array.isArray(preferences.directors)) {
      sanitized.directors = preferences.directors
        .filter((d: any) => typeof d === 'string' && d.trim().length > 0)
        .map((d: string) => d.trim())
        .slice(0, 10)
    }

    // Sanitize moods
    if (Array.isArray(preferences.moods)) {
      sanitized.moods = preferences.moods
        .filter((m: any) => typeof m === 'string' && m.trim().length > 0)
        .map((m: string) => m.trim())
        .slice(0, 10)
    }

    // Sanitize themes
    if (Array.isArray(preferences.themes)) {
      sanitized.themes = preferences.themes
        .filter((t: any) => typeof t === 'string' && t.trim().length > 0)
        .map((t: string) => t.trim())
        .slice(0, 10)
    }

    // Sanitize avoid genres
    if (Array.isArray(preferences.avoidGenres)) {
      sanitized.avoidGenres = preferences.avoidGenres
        .filter((g: any) => typeof g === 'string' && g.trim().length > 0)
        .map((g: string) => g.trim())
        .slice(0, 10)
    }

    // Sanitize preferred languages
    if (Array.isArray(preferences.preferredLanguages)) {
      sanitized.preferredLanguages = preferences.preferredLanguages
        .filter((l: any) => typeof l === 'string' && l.trim().length > 0)
        .map((l: string) => l.trim())
        .slice(0, 5)
    }

    return sanitized
  }
}