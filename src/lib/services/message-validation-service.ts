import { logger } from '@/lib/logger'

export interface ValidationResult {
  valid: boolean
  sanitized: string
  errors?: string[]
}

export class MessageValidationService {
  
  /**
   * Sanitize and validate user message for security and content policy compliance
   */
  static sanitizeAndValidateMessage(message: string): ValidationResult {
    const errors: string[] = []
    
    // Basic length validation
    if (message.length > 1000) {
      errors.push('Message too long (max 1000 characters)')
    }
    
    if (message.trim().length === 0) {
      errors.push('Message cannot be empty')
    }
    
    // Check for potential prompt injection patterns
    const dangerousPatterns = [
      /ignore\s+previous\s+instructions/i,
      /system\s*:/i,
      /assistant\s*:/i,
      /human\s*:/i,
      /<\s*script\s*>/i,
      /javascript\s*:/i,
      /vbscript\s*:/i,
      /on\w+\s*=/i,
      /data\s*:\s*text\/html/i,
    ]
    
    for (const pattern of dangerousPatterns) {
      if (pattern.test(message)) {
        errors.push('Message contains potentially unsafe content')
        break
      }
    }
    
    // Basic HTML/XSS sanitization - remove HTML tags
    let sanitized = message.replace(/<[^>]*>/g, '')
    
    // Remove potentially dangerous characters
    sanitized = sanitized.replace(/[<>\"'&]/g, (char) => {
      const charMap: { [key: string]: string } = {
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;',
        '&': '&amp;'
      }
      return charMap[char] || char
    })
    
    // Normalize whitespace
    sanitized = sanitized.replace(/\s+/g, ' ').trim()
    
    const result: ValidationResult = {
      valid: errors.length === 0,
      sanitized,
    }
    
    if (errors.length > 0) {
      result.errors = errors
      logger.warn('❌ Message validation failed:', { errors, originalLength: message.length })
    }
    
    return result
  }

  /**
   * Check if message is appropriate for movie recommendation context
   */
  static isMovieRelatedMessage(message: string): boolean {
    const movieKeywords = [
      'movie', 'film', 'cinema', 'watch', 'actor', 'actress', 'director',
      'genre', 'horror', 'comedy', 'drama', 'action', 'thriller', 'romance',
      'sci-fi', 'fantasy', 'documentary', 'animation', 'musical',
      'recommend', 'suggestion', 'like', 'prefer', 'favorite', 'best',
      'hollywood', 'netflix', 'streaming', 'theater', 'Oscar', 'award'
    ]

    const lowerMessage = message.toLowerCase()
    return movieKeywords.some(keyword => lowerMessage.includes(keyword))
  }

  /**
   * Extract potential movie titles from message
   */
  static extractMovieTitles(message: string): string[] {
    const patterns = [
      // "I liked [Movie Title]"
      /(?:liked?|enjoyed?|loved?|watched?)\s+(?:the\s+)?([A-Z][^,.!?]*)/gi,
      // "Have you seen [Movie Title]?"
      /(?:seen|heard of|know)\s+(?:the\s+)?([A-Z][^,.!?]*)/gi,
      // Quoted titles
      /"([^"]+)"/g,
      // Title in parentheses
      /\(([^)]+)\)/g,
    ]

    const titles: string[] = []
    
    for (const pattern of patterns) {
      const matches = Array.from(message.matchAll(pattern))
      for (const match of matches) {
        const title = match[1]?.trim()
        if (title && title.length > 2 && title.length < 100) {
          // Filter out common non-movie phrases
          const nonMoviePhrases = [
            'the time', 'the way', 'the end', 'the beginning', 'the best',
            'a lot', 'a while', 'the movie', 'the film', 'the actor'
          ]
          
          if (!nonMoviePhrases.includes(title.toLowerCase())) {
            titles.push(title)
          }
        }
      }
    }

    // Remove duplicates and return
    return Array.from(new Set(titles))
  }

  /**
   * Detect conversation stage based on message content
   */
  static detectConversationStage(message: string, chatHistory: any[]): 'greeting' | 'preference_gathering' | 'movie_discussion' | 'recommendation_request' {
    const lowerMessage = message.toLowerCase()

    // Greeting patterns
    if (chatHistory.length === 0 || lowerMessage.match(/^(hi|hello|hey|good morning|good afternoon|good evening)/)) {
      return 'greeting'
    }

    // Direct recommendation request
    if (lowerMessage.match(/recommend|suggest|what should i watch|what to watch/)) {
      return 'recommendation_request'
    }

    // Movie discussion
    if (this.extractMovieTitles(message).length > 0) {
      return 'movie_discussion'
    }

    // Default to preference gathering
    return 'preference_gathering'
  }
}