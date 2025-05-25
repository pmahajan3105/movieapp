import MemoryClient, { Message, SearchOptions, MemoryOptions } from 'mem0ai'

// Type definitions for better type safety
interface MovieMemory {
  id: string
  text: string
  categories: string[]
  score?: number
  metadata?: Record<string, unknown>
  created_at?: string
  updated_at?: string
}

interface PreferenceMatch {
  keyword: string
  memory: string
  confidence: number
}

interface OrganizedPreferences {
  genres: MovieMemory[]
  directors: MovieMemory[]
  movies: MovieMemory[]
  themes: MovieMemory[]
  avoid: MovieMemory[]
  viewing_context: MovieMemory[]
  other: MovieMemory[]
}

interface RecommendationContext {
  memories: MovieMemory[]
  preferences: {
    favorite_genres: PreferenceMatch[]
    favorite_directors: PreferenceMatch[]
    favorite_movies: PreferenceMatch[]
    themes: PreferenceMatch[]
    avoid_preferences: PreferenceMatch[]
    viewing_context: PreferenceMatch[]
  }
  context: string
}

// Initialize Mem0 client with error handling
const apiKey = process.env.MEM0_API_KEY
if (!apiKey) {
  console.warn('⚠️ MEM0_API_KEY not found - Mem0 integration will be disabled')
}

export const mem0Client = apiKey ? new MemoryClient({ apiKey }) : null

// Memory operations for movie preferences
export class MovieMemoryService {
  // Add conversation messages and extract memories
  async addConversation(
    messages: Message[],
    userId: string,
    metadata: Record<string, unknown> = {}
  ) {
    try {
      if (!mem0Client) {
        throw new Error('Mem0 client not initialized - API key missing')
      }

      const memoryOptions: MemoryOptions = {
        user_id: userId,
        metadata: {
          category: 'movie_preferences',
          timestamp: new Date().toISOString(),
          ...metadata,
        },
      }

      const result = await mem0Client.add(messages, memoryOptions)
      console.log('✅ Mem0: Added conversation memories', { userId, resultCount: result.length })
      return result
    } catch (error) {
      console.error('❌ Mem0: Error adding conversation:', error)
      throw error
    }
  }

  // Search for relevant memories based on query
  async searchPreferences(
    query: string,
    userId: string,
    categories: string[] = ['movie_preferences', 'genres', 'directors', 'themes']
  ): Promise<MovieMemory[]> {
    try {
      if (!mem0Client) {
        throw new Error('Mem0 client not initialized - API key missing')
      }

      const searchOptions: SearchOptions = {
        user_id: userId,
        categories,
        threshold: 0.1,
        api_version: 'v2',
      }

      const results = await mem0Client.search(query, searchOptions)
      console.log('🔍 Mem0: Search results', { query, userId, resultCount: results.length })
      return results as MovieMemory[]
    } catch (error) {
      console.error('❌ Mem0: Error searching memories:', error)
      throw error
    }
  }

  // Get all user preferences organized by categories
  async getUserPreferences(userId: string): Promise<OrganizedPreferences> {
    try {
      if (!mem0Client) {
        throw new Error('Mem0 client not initialized - API key missing')
      }

      const filters = {
        AND: [
          { user_id: userId },
          {
            categories: {
              contains: 'movie_preferences',
            },
          },
        ],
      }

      const memories = await mem0Client.getAll({
        version: 'v2',
        filters,
        page: 1,
        page_size: 100,
      })

      console.log('👤 Mem0: Retrieved user preferences', { userId, memoryCount: memories.length })
      return this.organizePreferences(memories as MovieMemory[])
    } catch (error) {
      console.error('❌ Mem0: Error getting user preferences:', error)
      throw error
    }
  }

  // Add specific movie preference
  async addMoviePreference(
    userId: string,
    preferenceType:
      | 'liked_movie'
      | 'disliked_movie'
      | 'genre_preference'
      | 'director_preference'
      | 'theme_preference',
    content: string,
    metadata: Record<string, unknown> = {}
  ) {
    try {
      if (!mem0Client) {
        throw new Error('Mem0 client not initialized - API key missing')
      }

      const messages: Message[] = [
        {
          role: 'user',
          content: `I ${preferenceType.replace('_', ' ')}: ${content}`,
        },
      ]

      const memoryOptions: MemoryOptions = {
        user_id: userId,
        metadata: {
          category: preferenceType,
          preference_type: preferenceType,
          timestamp: new Date().toISOString(),
          ...metadata,
        },
      }

      return await mem0Client.add(messages, memoryOptions)
    } catch (error) {
      console.error('❌ Mem0: Error adding movie preference:', error)
      throw error
    }
  }

  // Get movie recommendations based on user memories
  async getRecommendationContext(
    userId: string,
    movieQuery?: string
  ): Promise<RecommendationContext> {
    try {
      const query = movieQuery || 'What movies would I like based on my preferences?'

      const memories = await this.searchPreferences(query, userId)

      // Extract key preferences for recommendation
      const preferences = {
        favorite_genres: this.extractFromMemories(memories, [
          'genre',
          'sci-fi',
          'drama',
          'action',
          'comedy',
          'horror',
          'thriller',
        ]),
        favorite_directors: this.extractFromMemories(memories, [
          'director',
          'Christopher Nolan',
          'Denis Villeneuve',
          'Quentin Tarantino',
        ]),
        favorite_movies: this.extractFromMemories(memories, ['movie', 'film']),
        themes: this.extractFromMemories(memories, [
          'philosophical',
          'emotional',
          'complex',
          'thoughtful',
        ]),
        avoid_preferences: this.extractFromMemories(memories, [
          'avoid',
          'dislike',
          'hate',
          "don't like",
        ]),
        viewing_context: this.extractFromMemories(memories, [
          'weekend',
          'evening',
          'alone',
          'with friends',
        ]),
      }

      console.log('🎯 Mem0: Generated recommendation context', { userId, preferences })
      return {
        memories,
        preferences,
        context: memories
          .map(m => m?.text || '')
          .filter(Boolean)
          .join('\n'),
      }
    } catch (error) {
      console.error('❌ Mem0: Error getting recommendation context:', error)
      throw error
    }
  }

  // Update user preference
  async updatePreference(memoryId: string, newContent: string) {
    try {
      if (!mem0Client) {
        throw new Error('Mem0 client not initialized - API key missing')
      }
      return await mem0Client.update(memoryId, newContent)
    } catch (error) {
      console.error('❌ Mem0: Error updating preference:', error)
      throw error
    }
  }

  // Delete specific preference
  async deletePreference(memoryId: string) {
    try {
      if (!mem0Client) {
        throw new Error('Mem0 client not initialized - API key missing')
      }
      return await mem0Client.delete(memoryId)
    } catch (error) {
      console.error('❌ Mem0: Error deleting preference:', error)
      throw error
    }
  }

  // Get memory history for a specific preference
  async getPreferenceHistory(memoryId: string) {
    try {
      if (!mem0Client) {
        throw new Error('Mem0 client not initialized - API key missing')
      }
      return await mem0Client.history(memoryId)
    } catch (error) {
      console.error('❌ Mem0: Error getting preference history:', error)
      throw error
    }
  }

  // Private helper methods
  private organizePreferences(memories: MovieMemory[]): OrganizedPreferences {
    const organized: OrganizedPreferences = {
      genres: [],
      directors: [],
      movies: [],
      themes: [],
      avoid: [],
      viewing_context: [],
      other: [],
    }

    memories.forEach(memory => {
      // Safety check for undefined text
      if (!memory.text) {
        console.warn('⚠️ Mem0: Memory missing text field in organize', { memoryId: memory.id })
        return
      }

      const text = memory.text.toLowerCase()
      const categories = memory.categories || []

      if (categories.includes('genre_preference') || this.containsGenre(text)) {
        organized.genres.push(memory)
      } else if (categories.includes('director_preference') || this.containsDirector(text)) {
        organized.directors.push(memory)
      } else if (categories.includes('liked_movie') || this.containsMovie(text)) {
        organized.movies.push(memory)
      } else if (this.containsTheme(text)) {
        organized.themes.push(memory)
      } else if (this.containsAvoidance(text)) {
        organized.avoid.push(memory)
      } else if (this.containsViewingContext(text)) {
        organized.viewing_context.push(memory)
      } else {
        organized.other.push(memory)
      }
    })

    return organized
  }

  private extractFromMemories(memories: MovieMemory[], keywords: string[]): PreferenceMatch[] {
    const extracted: PreferenceMatch[] = []

    memories.forEach(memory => {
      // Safety check for undefined text
      if (!memory.text) {
        console.warn('⚠️ Mem0: Memory missing text field', { memoryId: memory.id })
        return
      }

      const text = memory.text.toLowerCase()
      keywords.forEach(keyword => {
        if (text.includes(keyword.toLowerCase())) {
          extracted.push({
            keyword,
            memory: memory.text,
            confidence: memory.score || 0.8,
          })
        }
      })
    })

    return extracted
  }

  private containsGenre(text: string): boolean {
    const genres = [
      'sci-fi',
      'drama',
      'action',
      'comedy',
      'horror',
      'thriller',
      'romance',
      'fantasy',
      'documentary',
    ]
    return genres.some(genre => text.includes(genre))
  }

  private containsDirector(text: string): boolean {
    const directors = ['nolan', 'villeneuve', 'tarantino', 'scorsese', 'spielberg', 'kubrick']
    return directors.some(director => text.includes(director))
  }

  private containsMovie(text: string): boolean {
    return (
      text.includes('movie') ||
      text.includes('film') ||
      text.includes('love') ||
      text.includes('like')
    )
  }

  private containsTheme(text: string): boolean {
    const themes = ['philosophical', 'emotional', 'complex', 'thoughtful', 'intellectual', 'deep']
    return themes.some(theme => text.includes(theme))
  }

  private containsAvoidance(text: string): boolean {
    const avoidWords = ['avoid', 'dislike', 'hate', "don't like", 'not interested', 'boring']
    return avoidWords.some(word => text.includes(word))
  }

  private containsViewingContext(text: string): boolean {
    const contexts = ['weekend', 'evening', 'alone', 'with friends', 'date night', 'family']
    return contexts.some(context => text.includes(context))
  }
}

export const movieMemoryService = new MovieMemoryService()
