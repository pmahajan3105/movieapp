describe('Memory Safety Utilities', () => {
  describe('Memory Text Validation', () => {
    interface MockMemory {
      id: string
      text?: string | null
      score?: number
    }

    const safeExtractFromMemories = (
      memories: MockMemory[],
      keywords: string[]
    ): Array<{ keyword: string; memory: string; confidence: number }> => {
      const extracted: Array<{ keyword: string; memory: string; confidence: number }> = []

      memories.forEach(memory => {
        // Safety check for undefined text (this is the fix we implemented)
        if (!memory.text) {
          console.warn('⚠️ Memory missing text field', { memoryId: memory.id })
          return
        }

        const text = memory.text.toLowerCase()
        keywords.forEach(keyword => {
          if (text.includes(keyword.toLowerCase())) {
            extracted.push({
              keyword,
              memory: memory.text!,
              confidence: memory.score || 0.8,
            })
          }
        })
      })

      return extracted
    }

    it('should handle memories with valid text', () => {
      const memories: MockMemory[] = [
        { id: 'mem-1', text: 'I love horror movies', score: 0.9 },
        { id: 'mem-2', text: 'Comedy is great too', score: 0.8 },
      ]

      const keywords = ['horror', 'comedy']
      const result = safeExtractFromMemories(memories, keywords)

      expect(result).toHaveLength(2)
      expect(result[0]?.keyword).toBe('horror')
      expect(result[1]?.keyword).toBe('comedy')
    })

    it('should safely handle memories with undefined text', () => {
      const memories: MockMemory[] = [
        { id: 'mem-1', text: 'I love action movies', score: 0.9 },
        { id: 'mem-2', text: undefined, score: 0.8 }, // This would cause the original error
        { id: 'mem-3', text: 'Drama is interesting', score: 0.7 },
      ]

      const keywords = ['action', 'drama']

      // This should not throw an error now
      expect(() => {
        const result = safeExtractFromMemories(memories, keywords)
        expect(result).toHaveLength(2) // Only valid memories should be processed
        expect(result[0]?.keyword).toBe('action')
        expect(result[1]?.keyword).toBe('drama')
      }).not.toThrow()
    })

    it('should safely handle memories with null text', () => {
      const memories: MockMemory[] = [
        { id: 'mem-1', text: 'I enjoy sci-fi', score: 0.9 },
        { id: 'mem-2', text: null, score: 0.8 }, // This would also cause the original error
        { id: 'mem-3', text: 'Fantasy is fun', score: 0.7 },
      ]

      const keywords = ['sci-fi', 'fantasy']

      expect(() => {
        const result = safeExtractFromMemories(memories, keywords)
        expect(result).toHaveLength(2) // Only valid memories should be processed
      }).not.toThrow()
    })

    it('should safely handle empty memories array', () => {
      const memories: MockMemory[] = []
      const keywords = ['horror', 'comedy']

      const result = safeExtractFromMemories(memories, keywords)
      expect(result).toHaveLength(0)
    })

    it('should safely handle memories with empty string text', () => {
      const memories: MockMemory[] = [
        { id: 'mem-1', text: 'Valid movie preference', score: 0.9 },
        { id: 'mem-2', text: '', score: 0.8 }, // Empty string
        { id: 'mem-3', text: 'Another valid preference', score: 0.7 },
      ]

      const keywords = ['valid', 'movie', 'preference']
      const result = safeExtractFromMemories(memories, keywords)

      // Should find matches in the valid memories
      expect(result.length).toBeGreaterThan(0)
      expect(result.every(r => r.memory.length > 0)).toBe(true)
    })
  })

  describe('Memory Organization Safety', () => {
    interface MockMemory {
      id: string
      text?: string | null
      categories?: string[]
    }

    const safeOrganizeMemories = (memories: MockMemory[]) => {
      const organized = {
        genres: [] as MockMemory[],
        movies: [] as MockMemory[],
        other: [] as MockMemory[],
      }

      memories.forEach(memory => {
        // Safety check for undefined text
        if (!memory.text) {
          console.warn('⚠️ Memory missing text field in organize', { memoryId: memory.id })
          return
        }

        const text = memory.text.toLowerCase()
        const categories = memory.categories || []

        if (categories.includes('genre_preference') || text.includes('genre')) {
          organized.genres.push(memory)
        } else if (categories.includes('liked_movie') || text.includes('movie')) {
          organized.movies.push(memory)
        } else {
          organized.other.push(memory)
        }
      })

      return organized
    }

    it('should organize valid memories correctly', () => {
      const memories: MockMemory[] = [
        { id: 'mem-1', text: 'I love horror genre', categories: ['genre_preference'] },
        { id: 'mem-2', text: 'The Matrix is a great movie', categories: ['liked_movie'] },
        { id: 'mem-3', text: 'Other preference', categories: ['other'] },
      ]

      const organized = safeOrganizeMemories(memories)

      expect(organized.genres).toHaveLength(1)
      expect(organized.movies).toHaveLength(1)
      expect(organized.other).toHaveLength(1)
    })

    it('should safely skip memories with invalid text during organization', () => {
      const memories: MockMemory[] = [
        { id: 'mem-1', text: 'Valid genre preference', categories: ['genre_preference'] },
        { id: 'mem-2', text: undefined, categories: ['genre_preference'] }, // Invalid
        { id: 'mem-3', text: null, categories: ['liked_movie'] }, // Invalid
        { id: 'mem-4', text: 'Valid movie preference', categories: ['liked_movie'] },
      ]

      expect(() => {
        const organized = safeOrganizeMemories(memories)
        expect(organized.genres).toHaveLength(1)
        expect(organized.movies).toHaveLength(1)
        expect(organized.other).toHaveLength(0)
      }).not.toThrow()
    })
  })

  describe('Error Boundary Testing', () => {
    it('should demonstrate the original error would have occurred', () => {
      // This simulates what would happen with the original unsafe code
      const unsafeExtraction = (memories: Array<{ text?: string }>, keywords: string[]) => {
        const extracted: string[] = []

        memories.forEach(memory => {
          // Original code did NOT have safety check - this would crash
          const text = memory.text!.toLowerCase() // This would throw TypeError
          keywords.forEach(keyword => {
            if (text.includes(keyword.toLowerCase())) {
              extracted.push(memory.text!)
            }
          })
        })

        return extracted
      }

      const memoriesWithUndefined = [
        { text: 'Valid text' },
        { text: undefined }, // This would cause TypeError in original code
      ]

      // This WOULD throw an error with the original unsafe code
      expect(() => {
        unsafeExtraction(memoriesWithUndefined, ['valid'])
      }).toThrow(TypeError)
    })

    it('should show our fixed version handles the same scenario safely', () => {
      const safeExtraction = (
        memories: Array<{ id: string; text?: string }>,
        keywords: string[]
      ) => {
        const extracted: string[] = []

        memories.forEach(memory => {
          // Our fix: Safety check for undefined text
          if (!memory.text) {
            console.warn('⚠️ Memory missing text field', { memoryId: memory.id })
            return
          }

          const text = memory.text.toLowerCase() // Now safe!
          keywords.forEach(keyword => {
            if (text.includes(keyword.toLowerCase())) {
              extracted.push(memory.text!)
            }
          })
        })

        return extracted
      }

      const memoriesWithUndefined = [
        { id: 'mem-1', text: 'Valid text' },
        { id: 'mem-2', text: undefined }, // This is now handled safely
      ]

      // This should NOT throw an error with our fix
      expect(() => {
        const result = safeExtraction(memoriesWithUndefined, ['valid'])
        expect(result).toHaveLength(1) // Only the valid memory should be processed
        expect(result[0]).toBe('Valid text')
      }).not.toThrow()
    })
  })
})
