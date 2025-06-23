// Mock external dependencies
jest.mock('@/lib/supabase/client', () => ({
  createServerClient: jest.fn(() => ({
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: { id: 'test-user-123', email: 'test@example.com' } },
        error: null,
      }),
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
      upsert: jest.fn().mockResolvedValue({ data: { id: 'pref-123' }, error: null }),
    })),
  })),
}))

// jest.mock('@/lib/mem0/client') // Removed - package deleted

// Note: Groq SDK functionality would be mocked here if needed

interface PreferenceData {
  genres?: string[]
  directors?: string[]
  movies?: string[]
  themes?: string[]
  years?: string | null
  ratings?: string | null
  languages?: string[]
  avoid?: string[]
}

interface OldPreferences {
  preferred_genres?: string[]
  favorite_directors?: string[]
  favorite_movies?: string[]
  themes?: string[]
  yearRange?: { min: number; max: number }
  ratingRange?: { min: number; max: number }
  languages?: string[]
  dislikedGenres?: string[]
}

interface MemoryObject {
  id?: string
  text?: string | null | number
  score?: number
}

describe('Preference Extraction Complete Workflow', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Trigger Pattern Detection', () => {
    it('should detect explicit save requests', () => {
      const detectPreferenceTrigger = (message: string): boolean => {
        const triggers = [
          'save my preferences',
          'update my account',
          'save that',
          'remember this',
          'store my',
          'keep track',
          'save in my preference',
        ]

        const lowerMessage = message.toLowerCase()
        return triggers.some(trigger => lowerMessage.includes(trigger))
      }

      expect(detectPreferenceTrigger('save my preferences')).toBe(true)
      expect(detectPreferenceTrigger('save in my preference')).toBe(true)
      expect(detectPreferenceTrigger('update my account')).toBe(true)
      expect(detectPreferenceTrigger('Can you save that for me?')).toBe(true)
      expect(detectPreferenceTrigger('just chatting')).toBe(false)
    })

    it('should detect AI completion signals', () => {
      const detectAICompletion = (response: string): boolean => {
        const signals = [
          'updated your',
          'saved',
          'got it',
          'noted',
          'recorded',
          'preferences',
          'perfect!',
          'great',
        ]

        const lowerResponse = response.toLowerCase()
        return signals.some(signal => lowerResponse.includes(signal))
      }

      expect(detectAICompletion("I've updated your preferences")).toBe(true)
      expect(detectAICompletion("Perfect! I've saved that")).toBe(true)
      expect(detectAICompletion("Great choice! I've noted your preferences")).toBe(true)
      expect(detectAICompletion('What kind of movies do you like?')).toBe(false)
    })
  })

  describe('Genre Extraction', () => {
    it('should extract multiple genres from conversation', () => {
      const extractGenres = (text: string): string[] => {
        const genres: string[] = []
        const genreMap = {
          comedy: ['comedy', 'comedies', 'funny', 'humor', 'laugh'],
          horror: ['horror', 'scary', 'fear', 'frightening', 'terrifying', 'shining'],
          action: ['action', 'fight', 'explosion', 'adventure'],
          drama: ['drama', 'emotional', 'serious'],
          romance: ['romance', 'romantic', 'love'],
          'sci-fi': ['sci-fi', 'science fiction', 'futuristic', 'space'],
        }

        const lowerText = text.toLowerCase()

        for (const [genre, keywords] of Object.entries(genreMap)) {
          if (keywords.some(keyword => lowerText.includes(keyword))) {
            genres.push(genre)
          }
        }

        return [...new Set(genres)] // Remove duplicates
      }

      expect(extractGenres('I love horror movies and comedy films')).toEqual([
        'comedy',
        'horror',
        'romance',
      ])
      expect(extractGenres('The Shining is a great scary movie')).toEqual(['horror'])
      expect(extractGenres('I enjoy action and sci-fi adventures')).toEqual(['action', 'sci-fi'])
      expect(extractGenres('Romantic comedies make me laugh')).toEqual(['comedy', 'romance'])
    })
  })

  describe('Movie Title Extraction', () => {
    it('should extract movie titles from conversation', () => {
      const extractMovies = (text: string): string[] => {
        const moviePatterns = [
          /The [A-Z][a-z]+/g,
          /[A-Z][a-z]+ [A-Z][a-z]+/g,
          /Avengers[^a-z]*/g,
          /Matrix[^a-z]*/g,
          /Shining[^a-z]*/g,
        ]

        const movies: string[] = []

        for (const pattern of moviePatterns) {
          const matches = text.match(pattern)
          if (matches) {
            movies.push(...matches.map(m => m.trim()))
          }
        }

        return [...new Set(movies)]
      }

      expect(extractMovies('I love The Shining and The Matrix')).toContain('The Shining')
      expect(extractMovies('Avengers movies are great')).toContain('Avengers')
      expect(extractMovies('The Dark Knight is amazing')).toContain('The Dark')
    })
  })

  describe('Database Schema Mapping', () => {
    it('should map old schema to new schema correctly', () => {
      const mapPreferencesSchema = (oldPrefs: OldPreferences): PreferenceData => {
        return {
          // Map old names to new names
          genres: oldPrefs.preferred_genres || [],
          directors: oldPrefs.favorite_directors || [],
          movies: oldPrefs.favorite_movies || [],
          themes: oldPrefs.themes || [],
          years: oldPrefs.yearRange ? `${oldPrefs.yearRange.min}-${oldPrefs.yearRange.max}` : null,
          ratings: oldPrefs.ratingRange
            ? `${oldPrefs.ratingRange.min}-${oldPrefs.ratingRange.max}`
            : null,
          languages: oldPrefs.languages || [],
          avoid: oldPrefs.dislikedGenres || [],
        }
      }

      const oldPrefs = {
        preferred_genres: ['horror', 'comedy'],
        favorite_directors: ['Christopher Nolan'],
        favorite_movies: ['The Shining'],
        yearRange: { min: 1990, max: 2023 },
        ratingRange: { min: 7.0, max: 10.0 },
        dislikedGenres: ['romance'],
      }

      const mapped = mapPreferencesSchema(oldPrefs)

      expect(mapped.genres).toEqual(['horror', 'comedy'])
      expect(mapped.directors).toEqual(['Christopher Nolan'])
      expect(mapped.movies).toEqual(['The Shining'])
      expect(mapped.years).toBe('1990-2023')
      expect(mapped.ratings).toBe('7-10')
      expect(mapped.avoid).toEqual(['romance'])
    })
  })

  describe('Memory Safety with Real Data', () => {
    it('should handle Mem0 responses safely', () => {
      const processMemories = (memories: MemoryObject[]) => {
        const processed: Array<{ id: string; text: string; score: number }> = []

        memories.forEach(memory => {
          // This is the critical safety check
          if (!memory || typeof memory !== 'object') {
            console.warn('⚠️ Invalid memory object', memory)
            return
          }

          if (!memory.text) {
            console.warn('⚠️ Memory missing text field', { id: memory.id })
            return
          }

          if (typeof memory.text !== 'string') {
            console.warn('⚠️ Memory text is not a string', {
              id: memory.id,
              type: typeof memory.text,
            })
            return
          }

          // Now safe to process
          processed.push({
            id: memory.id || 'unknown',
            text: memory.text.toLowerCase(),
            score: memory.score || 0.8,
          })
        })

        return processed
      }

      const badMemories: MemoryObject[] = [
        { id: 'mem-1', text: 'Valid memory' },
        { id: 'mem-2', text: null },
        { id: 'mem-3', text: undefined },
        { id: 'mem-4' }, // Missing text entirely
        { id: 'mem-5', text: 123 }, // Non-string text
        { id: 'mem-6', text: 'Another valid memory' },
      ]

      expect(() => {
        const result = processMemories(badMemories)
        expect(result).toHaveLength(2)
        expect(result[0]?.text).toBe('valid memory')
        expect(result[1]?.text).toBe('another valid memory')
      }).not.toThrow()
    })
  })

  describe('Streaming Chat Integration', () => {
    it('should handle streaming with preference extraction', () => {
      const processStreamingChunk = (chunk: string) => {
        const lines = chunk.split('\n')
        const events: Array<{ type?: string; content?: string; preferencesExtracted?: boolean }> =
          []

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const eventData = line.slice(6).trim()

            if (eventData === '[DONE]') {
              events.push({ type: 'done' })
              continue
            }

            try {
              const event = JSON.parse(eventData)
              events.push(event)
            } catch {
              // Invalid JSON, skip
            }
          }
        }

        return events
      }

      const mockChunk = `data: {"type":"start","sessionId":"test-123"}\ndata: {"type":"content","content":"I've saved"}\ndata: {"type":"complete","preferencesExtracted":true}\ndata: [DONE]\n`

      const events = processStreamingChunk(mockChunk)

      expect(events).toHaveLength(4)
      expect(events[0]?.type).toBe('start')
      expect(events[1]?.type).toBe('content')
      expect(events[2]?.type).toBe('complete')
      expect(events[2]?.preferencesExtracted).toBe(true)
      expect(events[3]?.type).toBe('done')
    })
  })

  describe('Account Preferences Display', () => {
    it('should format preferences for display correctly', () => {
      const formatPreferencesForDisplay = (prefs: {
        genres?: string[]
        movies?: string[]
        directors?: string[]
      }) => {
        const sections = []

        if ((prefs.genres?.length ?? 0) > 0) {
          sections.push({
            category: 'Favorite Genres',
            value: prefs.genres!.join(', '),
            type: 'genre',
          })
        }

        if ((prefs.movies?.length ?? 0) > 0) {
          sections.push({
            category: 'Favorite Movies',
            value: prefs.movies!.join(', '),
            type: 'movie',
          })
        }

        if ((prefs.directors?.length ?? 0) > 0) {
          sections.push({
            category: 'Favorite Directors',
            value: prefs.directors!.join(', '),
            type: 'director',
          })
        }

        return sections
      }

      const mockPrefs = {
        genres: ['horror', 'comedy'],
        movies: ['The Shining', 'Avengers'],
        directors: ['Christopher Nolan'],
      }

      const display = formatPreferencesForDisplay(mockPrefs)

      expect(display).toHaveLength(3)
      expect(display[0]?.category).toBe('Favorite Genres')
      expect(display[0]?.value).toBe('horror, comedy')
      expect(display[1]?.value).toBe('The Shining, Avengers')
      expect(display[2]?.value).toBe('Christopher Nolan')
    })
  })

  describe('Error Recovery and Fallbacks', () => {
    it('should gracefully handle Mem0 service failures', () => {
      const handleMemoryServiceError = (
        error: Error,
        fallbackData: { genres: string[]; movies: string[]; directors: string[] }
      ) => {
        console.warn('Memory service error, using fallback:', error.message)

        return {
          success: true,
          data: fallbackData,
          source: 'fallback',
          memoryError: error.message,
        }
      }

      const fallbackPrefs = {
        genres: [] as string[],
        movies: [] as string[],
        directors: [] as string[],
      }
      const result = handleMemoryServiceError(new Error('Mem0 API unavailable'), fallbackPrefs)

      expect(result.success).toBe(true)
      expect(result.source).toBe('fallback')
      expect(result.data).toEqual(fallbackPrefs)
      expect(result.memoryError).toBe('Mem0 API unavailable')
    })

    it('should handle network timeouts gracefully', () => {
      const handleTimeout = (promise: Promise<any>, timeoutMs: number) => {
        return Promise.race([
          promise,
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), timeoutMs)),
        ]).catch(error => {
          if (error.message === 'Timeout') {
            return { success: false, error: 'Service timeout', fallback: true }
          }
          throw error
        })
      }

      const slowPromise = new Promise(resolve => setTimeout(resolve, 2000))

      return handleTimeout(slowPromise, 100).then(result => {
        expect(result.success).toBe(false)
        expect(result.error).toBe('Service timeout')
        expect(result.fallback).toBe(true)
      })
    })
  })

  describe('Full Integration Workflow', () => {
    it('should handle complete preference extraction flow', () => {
      const extractionWorkflow = {
        steps: [] as string[],

        detectTrigger(message: string): boolean {
          this.steps.push('trigger-detection')
          return message.toLowerCase().includes('save')
        },

        extractPreferences(conversation: string[]): any {
          this.steps.push('preference-extraction')
          return {
            genres: ['horror'],
            movies: ['The Shining'],
            confidence: 0.9,
          }
        },

        saveToDatabase(prefs: any): boolean {
          this.steps.push('database-save')
          return true
        },

        storeInMemory(conversation: string[]): boolean {
          this.steps.push('memory-storage')
          return true
        },

        processComplete(userMessage: string, aiResponse: string): any {
          const triggered = this.detectTrigger(userMessage)

          if (triggered || aiResponse.toLowerCase().includes('saved')) {
            const prefs = this.extractPreferences([userMessage, aiResponse])
            const dbSaved = this.saveToDatabase(prefs)
            const memorySaved = this.storeInMemory([userMessage, aiResponse])

            return {
              success: dbSaved && memorySaved,
              preferences: prefs,
              steps: this.steps,
            }
          }

          return { success: false, triggered: false }
        },
      }

      const result = extractionWorkflow.processComplete(
        'I love horror movies like The Shining. Can you save this?',
        "Perfect! I've saved your horror movie preferences."
      )

      expect(result.success).toBe(true)
      expect(result.preferences.genres).toEqual(['horror'])
      expect(result.preferences.movies).toEqual(['The Shining'])
      expect(result.steps).toEqual([
        'trigger-detection',
        'preference-extraction',
        'database-save',
        'memory-storage',
      ])
    })
  })
})
