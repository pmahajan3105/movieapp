/**
 * Query Intelligence Engine
 * Advanced natural language processing for sophisticated movie queries
 */

import { anthropic, claudeConfig } from '@/lib/anthropic/config'
import { logger } from '@/lib/logger'
import type {
  AdvancedQuery,
  QueryEntity,
  QueryIntent,
  AdvancedSearchFilters,
} from '@/types/advanced-intelligence'
import type { ConversationalQuery } from './conversational-parser'
import {
  ThematicTaxonomy,
} from './thematic-taxonomy'
import { ConversationalParser } from './conversational-parser'

export interface QueryProcessingResult {
  advancedQuery: AdvancedQuery
  searchFilters: AdvancedSearchFilters
  recommendationStrategy: 'thematic' | 'stylistic' | 'emotional' | 'hybrid' | 'educational'
  prioritizedIntents: QueryIntent[]
  queryComplexity: 'simple' | 'moderate' | 'complex' | 'expert'
  requiresExplanation: boolean
}

export interface EntityExtractionResult {
  movies: string[]
  directors: string[]
  actors: string[]
  themes: string[]
  genres: string[]
  moods: string[]
  styles: string[]
  periods: string[]
  techniques: string[]
}

export interface IntentAnalysisResult {
  primaryIntent: QueryIntent
  secondaryIntents: QueryIntent[]
  intentHierarchy: string[]
  conflictingIntents: string[]
  intentConfidence: number
}

export class QueryIntelligenceEngine {
  private static instance: QueryIntelligenceEngine

  static getInstance(): QueryIntelligenceEngine {
    if (!QueryIntelligenceEngine.instance) {
      QueryIntelligenceEngine.instance = new QueryIntelligenceEngine()
    }
    return QueryIntelligenceEngine.instance
  }

  /**
   * Process complex query with full intelligence analysis
   */
  async processAdvancedQuery(query: string, userId: string): Promise<QueryProcessingResult> {
    const startTime = Date.now()

    try {
      logger.info('Starting advanced query processing', { query, userId })

      // Step 1: Parse query with conversational parser
      const conversationalQuery = await ConversationalParser.getInstance().parseAdvancedQuery(query)

      // Step 2: Enhance with entity extraction
      const entities = await this.extractEntities(query, conversationalQuery)

      // Step 3: Analyze intent hierarchy
      const intentAnalysis = this.analyzeIntentHierarchy([
        {
          type: 'discover', // Map conversational intent to QueryIntent type
          confidence: conversationalQuery.confidence,
          parameters: {},
          priority: 1,
        },
      ])

      // Step 4: Generate search filters
      const searchFilters = this.generateAdvancedFilters(conversationalQuery, entities)

      // Step 5: Determine recommendation strategy
      const strategy = this.determineStrategy(intentAnalysis, conversationalQuery)

      // Step 6: Assess complexity and explanation needs
      const complexity = this.assessQueryComplexity(conversationalQuery, intentAnalysis)
      const requiresExplanation = this.shouldProvideExplanation(conversationalQuery, intentAnalysis)

      const processingTime = Date.now() - startTime

      logger.info('Advanced query processing completed', {
        query,
        strategy,
        complexity,
        processingTime,
        primaryIntent: intentAnalysis.primaryIntent.type,
      })

      // Convert ConversationalQuery to AdvancedQuery
      const advancedQuery: AdvancedQuery = {
        originalQuery: query,
        processedQuery: {
          cleanedText: conversationalQuery.original_text,
          expandedTerms: [],
          synonyms: {},
          relatedConcepts: [],
          negativeFilters: conversationalQuery.extracted_criteria.negations || [],
        },
        extractedEntities: entities.themes.map(theme => ({
          type: 'theme' as const,
          value: theme,
          confidence: 0.8,
        })),
        detectedIntents: [
          {
            type: 'discover',
            confidence: conversationalQuery.confidence,
            parameters: {},
            priority: 1,
          },
        ],
        implicitPreferences: [],
        contextualFactors: [],
        complexityLevel: complexity,
        confidence: conversationalQuery.confidence,
      }

      return {
        advancedQuery,
        searchFilters,
        recommendationStrategy: strategy,
        prioritizedIntents: [intentAnalysis.primaryIntent, ...intentAnalysis.secondaryIntents],
        queryComplexity: complexity,
        requiresExplanation,
      }
    } catch (error) {
      logger.error('Advanced query processing failed', {
        error: error instanceof Error ? error.message : String(error),
        query,
      })

      // Fallback to basic processing
      return this.createFallbackProcessing(query, userId)
    }
  }

  /**
   * Extract and classify entities from query
   */
  async extractEntities(
    query: string,
    conversationalQuery: ConversationalQuery
  ): Promise<EntityExtractionResult> {
    try {
      const prompt = this.buildEntityExtractionPrompt(query)

      const response = await anthropic.messages.create({
        model: claudeConfig.model,
        max_tokens: 1000,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      })

      const firstContent = response.content[0]
      const aiAnalysis = firstContent?.type === 'text' ? firstContent.text : ''
      const extracted = this.parseEntityExtractionResponse(aiAnalysis)

      // Return extracted entities (no existing entities to merge in this method)
      return extracted
    } catch (error) {
      logger.warn('Entity extraction failed, using fallback', { error })
      return this.fallbackEntityExtraction(query, [])
    }
  }

  /**
   * Analyze intent hierarchy and conflicts
   */
  analyzeIntentHierarchy(intents: QueryIntent[]): IntentAnalysisResult {
    if (intents.length === 0) {
      return {
        primaryIntent: { type: 'discover', confidence: 0.5, parameters: {}, priority: 5 },
        secondaryIntents: [],
        intentHierarchy: ['discover'],
        conflictingIntents: [],
        intentConfidence: 0.5,
      }
    }

    // Sort by priority and confidence
    const sortedIntents = [...intents].sort((a, b) => {
      const priorityDiff = b.priority - a.priority
      return priorityDiff !== 0 ? priorityDiff : b.confidence - a.confidence
    })

    const primaryIntent = sortedIntents[0] || {
      type: 'discover',
      confidence: 0.5,
      parameters: {},
      priority: 1,
    }
    const secondaryIntents = sortedIntents.slice(1, 3) // Take top 2 secondary intents

    // Detect conflicting intents
    const conflictingIntents = this.detectIntentConflicts(sortedIntents)

    // Build intent hierarchy
    const intentHierarchy = sortedIntents.map(intent => intent.type)

    // Calculate overall confidence
    const intentConfidence =
      sortedIntents.reduce((sum, intent) => sum + intent.confidence * intent.priority, 0) /
      sortedIntents.reduce((sum, intent) => sum + intent.priority, 0)

    return {
      primaryIntent,
      secondaryIntents,
      intentHierarchy,
      conflictingIntents,
      intentConfidence,
    }
  }

  /**
   * Generate advanced search filters from query analysis
   */
  generateAdvancedFilters(
    conversationalQuery: ConversationalQuery,
    entities: EntityExtractionResult
  ): AdvancedSearchFilters {
    const filters: AdvancedSearchFilters = {}

    // Thematic filters
    if (entities.themes.length > 0) {
      filters.thematicFilters = [
        {
          themes: entities.themes,
          operator: 'OR',
          minRelevance: 0.6,
        },
      ]
    }

    // Style filters
    if (entities.directors.length > 0 || entities.styles.length > 0) {
      filters.styleFilters = [
        {
          directors: entities.directors.length > 0 ? entities.directors : undefined,
          visualStyles: entities.styles.length > 0 ? entities.styles : undefined,
        },
      ]
    }

    // Emotional filters
    const emotionalPrefs = conversationalQuery.extracted_criteria.moods || []
    if (emotionalPrefs.length > 0) {
      filters.emotionalFilters = [
        {
          moodRange: entities.moods,
          intensityRange: this.inferIntensityRange(conversationalQuery),
        },
      ]
    }

    // Narrative filters - simplified for ConversationalQuery
    const narrativePrefs = conversationalQuery.extracted_criteria.narrative_structure || []
    if (narrativePrefs.length > 0) {
      filters.narrativeFilters = [
        {
          complexityRange: this.inferComplexityRange(conversationalQuery),
          linearityPreference: this.inferLinearityPreference(conversationalQuery),
        },
      ]
    }

    // Cultural filters
    if (entities.periods.length > 0) {
      filters.culturalFilters = [
        {
          periods: entities.periods,
          relevanceToPresent: this.inferContemporaryRelevance(conversationalQuery),
        },
      ]
    }

    // Exclusion filters
    if (
      conversationalQuery.extracted_criteria.negations &&
      conversationalQuery.extracted_criteria.negations.length > 0
    ) {
      filters.excludeThemes = conversationalQuery.extracted_criteria.negations
    }

    // Confidence threshold
    filters.minConfidence = conversationalQuery.confidence > 0.8 ? 0.7 : 0.5

    return filters
  }

  /**
   * Determine optimal recommendation strategy
   */
  determineStrategy(
    intentAnalysis: IntentAnalysisResult,
    conversationalQuery: ConversationalQuery
  ): 'thematic' | 'stylistic' | 'emotional' | 'hybrid' | 'educational' {
    const primaryIntent = intentAnalysis.primaryIntent.type

    // Educational queries
    if (primaryIntent === 'educational' || primaryIntent === 'compare') {
      return 'educational'
    }

    // Count preference categories based on conversational query
    const thematicPrefs =
      (conversationalQuery.extracted_criteria.themes || []).length +
      (conversationalQuery.extracted_criteria.genres || []).length

    const stylisticPrefs =
      (conversationalQuery.extracted_criteria.visual_style || []).length +
      (conversationalQuery.extracted_criteria.directors || []).length

    const emotionalPrefs =
      (conversationalQuery.extracted_criteria.moods || []).length +
      (conversationalQuery.extracted_criteria.emotional_tone ? 1 : 0)

    // Determine primary strategy
    if (primaryIntent === 'thematic_explore' || thematicPrefs > stylisticPrefs + emotionalPrefs) {
      return 'thematic'
    }

    if (primaryIntent === 'style_match' || stylisticPrefs > thematicPrefs + emotionalPrefs) {
      return 'stylistic'
    }

    if (primaryIntent === 'mood_match' || emotionalPrefs > thematicPrefs + stylisticPrefs) {
      return 'emotional'
    }

    // Default to hybrid for complex queries
    return 'hybrid'
  }

  // Private helper methods

  private buildEntityExtractionPrompt(query: string): string {
    return `
Extract and classify entities from this movie query:

Query: "${query}"

Identify and return JSON with:
{
  "movies": ["specific movie titles mentioned"],
  "directors": ["director names"],
  "actors": ["actor names"],
  "themes": ["psychological themes, narrative themes"],
  "genres": ["movie genres"],
  "moods": ["emotional moods, atmospheric qualities"],
  "styles": ["visual styles, cinematic techniques"],
  "periods": ["time periods, eras"],
  "techniques": ["specific film techniques"]
}

Focus on accurate entity recognition and classification. Include variations and synonyms.
Return only valid JSON.
`
  }

  private parseEntityExtractionResponse(response: string): EntityExtractionResult {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('No JSON found in entity extraction response')
      }

      const parsed = JSON.parse(jsonMatch[0])

      return {
        movies: Array.isArray(parsed.movies) ? parsed.movies : [],
        directors: Array.isArray(parsed.directors) ? parsed.directors : [],
        actors: Array.isArray(parsed.actors) ? parsed.actors : [],
        themes: Array.isArray(parsed.themes) ? parsed.themes : [],
        genres: Array.isArray(parsed.genres) ? parsed.genres : [],
        moods: Array.isArray(parsed.moods) ? parsed.moods : [],
        styles: Array.isArray(parsed.styles) ? parsed.styles : [],
        periods: Array.isArray(parsed.periods) ? parsed.periods : [],
        techniques: Array.isArray(parsed.techniques) ? parsed.techniques : [],
      }
    } catch (error) {
      logger.warn('Failed to parse entity extraction response', { error })
      return this.createEmptyEntityResult()
    }
  }

  private mergeEntityResults(
    extracted: EntityExtractionResult,
    queryEntities: QueryEntity[]
  ): EntityExtractionResult {
    const merged = { ...extracted }

    queryEntities.forEach(entity => {
      switch (entity.type) {
        case 'movie':
          if (!merged.movies.includes(entity.value)) {
            merged.movies.push(entity.value)
          }
          break
        case 'director':
          if (!merged.directors.includes(entity.value)) {
            merged.directors.push(entity.value)
          }
          break
        case 'actor':
          if (!merged.actors.includes(entity.value)) {
            merged.actors.push(entity.value)
          }
          break
        case 'theme':
          if (!merged.themes.includes(entity.value)) {
            merged.themes.push(entity.value)
          }
          break
        case 'genre':
          if (!merged.genres.includes(entity.value)) {
            merged.genres.push(entity.value)
          }
          break
        case 'mood':
          if (!merged.moods.includes(entity.value)) {
            merged.moods.push(entity.value)
          }
          break
        case 'style':
          if (!merged.styles.includes(entity.value)) {
            merged.styles.push(entity.value)
          }
          break
        case 'period':
          if (!merged.periods.includes(entity.value)) {
            merged.periods.push(entity.value)
          }
          break
      }
    })

    return merged
  }

  private fallbackEntityExtraction(
    query: string,
    queryEntities: QueryEntity[]
  ): EntityExtractionResult {
    const result = this.createEmptyEntityResult()

    // Simple keyword-based extraction
    const lowerQuery = query.toLowerCase()

    // Extract themes using taxonomy
    const extractedThemes = ThematicTaxonomy.extractThemesFromText(query)
    result.themes = extractedThemes

    // Extract from query entities
    queryEntities.forEach(entity => {
      switch (entity.type) {
        case 'movie':
          result.movies.push(entity.value)
          break
        case 'director':
          result.directors.push(entity.value)
          break
        case 'actor':
          result.actors.push(entity.value)
          break
        case 'theme':
          result.themes.push(entity.value)
          break
        case 'genre':
          result.genres.push(entity.value)
          break
        case 'mood':
          result.moods.push(entity.value)
          break
        case 'style':
          result.styles.push(entity.value)
          break
        case 'period':
          result.periods.push(entity.value)
          break
      }
    })

    return result
  }

  private createEmptyEntityResult(): EntityExtractionResult {
    return {
      movies: [],
      directors: [],
      actors: [],
      themes: [],
      genres: [],
      moods: [],
      styles: [],
      periods: [],
      techniques: [],
    }
  }

  private detectIntentConflicts(intents: QueryIntent[]): string[] {
    const conflicts: string[] = []

    // Define conflicting intent pairs
    const conflictPairs = [
      ['discover', 'similar_to'],
      ['educational', 'mood_match'],
      ['compare', 'discover'],
    ]

    for (const [intent1, intent2] of conflictPairs) {
      const hasIntent1 = intents.some(i => i.type === intent1)
      const hasIntent2 = intents.some(i => i.type === intent2)

      if (hasIntent1 && hasIntent2) {
        conflicts.push(`${intent1} vs ${intent2}`)
      }
    }

    return conflicts
  }

  private assessQueryComplexity(
    conversationalQuery: ConversationalQuery,
    intentAnalysis: IntentAnalysisResult
  ): 'simple' | 'moderate' | 'complex' | 'expert' {
    let complexityScore = 0

    // Intent complexity
    complexityScore += intentAnalysis.secondaryIntents.length * 0.2
    complexityScore += intentAnalysis.conflictingIntents.length * 0.3

    // Entity complexity based on conversational query criteria
    const totalCriteria = Object.keys(conversationalQuery.extracted_criteria).length
    complexityScore += Math.min(totalCriteria * 0.1, 0.5)

    // Complexity based on query length and structure
    const queryLength = conversationalQuery.original_text.length
    complexityScore += Math.min(queryLength / 500, 0.3)

    // Negative filters complexity
    const negativeFilters = conversationalQuery.extracted_criteria.negations || []
    complexityScore += negativeFilters.length * 0.1

    // Multi-intent complexity
    if (conversationalQuery.multi_intent) {
      complexityScore += 0.2
    }

    // Use existing complexity score if available
    if (conversationalQuery.complexity_score) {
      complexityScore = Math.max(complexityScore, conversationalQuery.complexity_score)
    }

    if (complexityScore < 0.3) return 'simple'
    if (complexityScore < 0.6) return 'moderate'
    if (complexityScore < 0.9) return 'complex'
    return 'expert'
  }

  private shouldProvideExplanation(
    conversationalQuery: ConversationalQuery,
    intentAnalysis: IntentAnalysisResult
  ): boolean {
    // Always explain for educational queries
    if (
      intentAnalysis.primaryIntent.type === 'educational' ||
      intentAnalysis.primaryIntent.type === 'compare'
    ) {
      return true
    }

    // Use existing requires_explanation if available
    if (conversationalQuery.requires_explanation) {
      return true
    }

    // Explain for complex queries
    const complexity = this.assessQueryComplexity(conversationalQuery, intentAnalysis)
    if (complexity === 'complex' || complexity === 'expert') {
      return true
    }

    // Explain when there are conflicting intents
    if (intentAnalysis.conflictingIntents.length > 0) {
      return true
    }

    // Explain for thematic exploration
    if (intentAnalysis.primaryIntent.type === 'thematic_explore') {
      return true
    }

    return false
  }

  private inferIntensityRange(conversationalQuery: ConversationalQuery): [number, number] {
    const moodPrefs = conversationalQuery.extracted_criteria.moods || []

    if (moodPrefs.length === 0) return [0.3, 0.8]

    // Simple intensity mapping based on mood keywords
    const intensityMap: Record<string, number> = {
      intense: 0.9,
      strong: 0.8,
      powerful: 0.8,
      light: 0.3,
      mild: 0.4,
      subtle: 0.3,
      overwhelming: 1.0,
    }

    const avgStrength =
      moodPrefs.reduce((sum, mood) => {
        const strength = intensityMap[mood.toLowerCase()] || 0.6
        return sum + strength
      }, 0) / moodPrefs.length

    if (avgStrength > 0.8) return [0.7, 1.0] // High intensity
    if (avgStrength > 0.6) return [0.5, 0.9] // Medium-high intensity
    if (avgStrength > 0.4) return [0.3, 0.7] // Medium intensity
    return [0.1, 0.5] // Low intensity
  }

  private inferComplexityRange(conversationalQuery: ConversationalQuery): [number, number] {
    const complexityLevel = conversationalQuery.extracted_criteria.complexity_level

    if (complexityLevel === 'complex') {
      return [0.7, 1.0]
    } else if (complexityLevel === 'medium') {
      return [0.4, 0.7]
    } else if (complexityLevel === 'light') {
      return [0.1, 0.4]
    }

    // Default based on narrative structure complexity
    const narrativeStructure = conversationalQuery.extracted_criteria.narrative_structure || []
    const hasComplexNarrative = narrativeStructure.some(
      structure => structure.includes('non-linear') || structure.includes('complex')
    )

    return hasComplexNarrative ? [0.5, 0.8] : [0.3, 0.6]
  }

  private inferLinearityPreference(
    conversationalQuery: ConversationalQuery
  ): 'linear' | 'non_linear' | 'either' {
    const narrativeStructure = conversationalQuery.extracted_criteria.narrative_structure || []
    const visualStyle = conversationalQuery.extracted_criteria.visual_style || []

    // Check for non-linear indicators
    const hasNonLinear =
      narrativeStructure.some(
        structure => structure.includes('non-linear') || structure.includes('complex')
      ) || visualStyle.some(style => style.includes('complex') || style.includes('artistic'))

    // Check for linear indicators
    const hasLinear =
      narrativeStructure.some(
        structure => structure.includes('simple') || structure.includes('straightforward')
      ) || visualStyle.some(style => style.includes('minimalist') || style.includes('clean'))

    if (hasNonLinear && !hasLinear) return 'non_linear'
    if (hasLinear && !hasNonLinear) return 'linear'
    return 'either'
  }

  private inferContemporaryRelevance(conversationalQuery: ConversationalQuery): number {
    const culturalContext = conversationalQuery.extracted_criteria.cultural_context || []
    const yearRange = conversationalQuery.extracted_criteria.year_range

    if (culturalContext.length === 0 && !yearRange) return 0.5

    // Check for contemporary relevance indicators
    const hasContemporaryContext = culturalContext.some(
      context =>
        context.includes('modern') ||
        context.includes('contemporary') ||
        context.includes('current')
    )

    const hasHistoricalContext = culturalContext.some(
      context =>
        context.includes('classic') || context.includes('vintage') || context.includes('period')
    )

    // Check year range
    const currentYear = new Date().getFullYear()
    let yearRelevance = 0.5

    if (yearRange) {
      const [start, end] = yearRange
      const avgYear = (start + end) / 2
      const yearDistance = Math.abs(currentYear - avgYear)
      yearRelevance = Math.max(0, 1 - yearDistance / 50) // Closer to current year = higher relevance
    }

    if (hasContemporaryContext) return Math.max(0.7, yearRelevance)
    if (hasHistoricalContext) return Math.min(0.3, yearRelevance)
    return yearRelevance
  }

  private async createFallbackProcessing(
    query: string,
    userId: string
  ): Promise<QueryProcessingResult> {
    try {
      const parser = ConversationalParser.getInstance()
      const basicQuery = await parser.parseQuery(query)

      return {
        advancedQuery: this.createBasicAdvancedQuery(query, basicQuery),
        searchFilters: { minConfidence: 0.5 },
        recommendationStrategy: 'hybrid',
        prioritizedIntents: [
          {
            type: 'discover',
            confidence: 0.5,
            parameters: {},
            priority: 5,
          },
        ],
        queryComplexity: 'simple',
        requiresExplanation: false,
      }
    } catch (error) {
      logger.error('Fallback processing also failed', { error, query })
      throw new Error('Query processing completely failed')
    }
  }

  private createBasicAdvancedQuery(query: string, basicQuery: any): AdvancedQuery {
    return {
      originalQuery: query,
      processedQuery: {
        cleanedText: query,
        expandedTerms: [],
        synonyms: {},
        relatedConcepts: [],
        negativeFilters: [],
      },
      extractedEntities: [],
      detectedIntents: [
        {
          type: 'discover',
          confidence: 0.5,
          parameters: {},
          priority: 5,
        },
      ],
      implicitPreferences: [],
      contextualFactors: [],
      complexityLevel: 'simple',
      confidence: 0.5,
    }
  }
}

// Export singleton instance
export const queryIntelligenceEngine = QueryIntelligenceEngine.getInstance()
