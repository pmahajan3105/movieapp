import { anthropic, claudeConfig } from '@/lib/anthropic/config'
import { logger } from '@/lib/logger'
import type { AdvancedQuery } from '@/types/advanced-intelligence'

// Interface for advanced analysis response
interface AdvancedAnalysisResponse {
  themes?: string[]
  visual_style?: string[]
  narrative_structure?: string[]
  emotional_pattern?: string
  cultural_context?: string[]
  cinematic_techniques?: string[]
  negations?: string[]
  comparative_context?: {
    better_than?: string[]
    different_from?: string[]
    similar_but?: string[]
  }
}

// Type guard for string arrays
function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(item => typeof item === 'string')
}

// Type guard for valid intents
function isValidIntent(value: unknown): value is ConversationalQuery['intent'] {
  const validIntents = [
    'search',
    'recommendation',
    'filter',
    'mood_based',
    'thematic_explore',
    'style_match',
    'educational',
    'compare',
  ]
  return typeof value === 'string' && validIntents.includes(value)
}

// Type guard for valid strategies
function isValidStrategy(value: unknown): value is ConversationalQuery['search_strategy'] {
  const validStrategies = ['semantic', 'filter', 'hybrid', 'thematic', 'advanced']
  return typeof value === 'string' && validStrategies.includes(value)
}

// Type guard for valid complexity levels
function isValidComplexityLevel(value: unknown): value is 'light' | 'medium' | 'complex' {
  return typeof value === 'string' && ['light', 'medium', 'complex'].includes(value)
}

export interface ConversationalQuery {
  original_text: string
  intent:
    | 'search'
    | 'recommendation'
    | 'filter'
    | 'mood_based'
    | 'thematic_explore'
    | 'style_match'
    | 'educational'
    | 'compare'
  extracted_criteria: {
    genres?: string[]
    moods?: string[]
    similar_to?: string[]
    time_context?: string
    emotional_tone?: string
    complexity_level?: 'light' | 'medium' | 'complex'
    year_range?: [number, number]
    actors?: string[]
    directors?: string[]
    keywords?: string[]
    // Enhanced criteria for advanced intelligence
    themes?: string[]
    visual_style?: string[]
    narrative_structure?: string[]
    emotional_pattern?: string
    cultural_context?: string[]
    cinematic_techniques?: string[]
    negations?: string[]
    comparative_context?: {
      better_than?: string[]
      different_from?: string[]
      similar_but?: string[]
    }
  }
  confidence: number
  search_strategy: 'semantic' | 'filter' | 'hybrid' | 'thematic' | 'advanced'
  // New advanced query properties
  multi_intent?: boolean
  complexity_score?: number
  requires_explanation?: boolean
}

export class ConversationalParser {
  private static instance: ConversationalParser

  static getInstance(): ConversationalParser {
    if (!ConversationalParser.instance) {
      ConversationalParser.instance = new ConversationalParser()
    }
    return ConversationalParser.instance
  }

  /**
   * Parse complex conversational query with advanced multi-intent understanding
   */
  async parseQuery(query: string, userId: string): Promise<ConversationalQuery> {
    try {
      logger.info('Parsing advanced conversational query', { query, userId })

      // First pass: Basic structure analysis
      const basicAnalysis = await this.performBasicAnalysis(query)

      // Second pass: Advanced thematic and cinematic analysis
      const advancedAnalysis = await this.performAdvancedAnalysis(query, basicAnalysis)

      // Merge analyses
      const result = this.mergeAnalyses(query, basicAnalysis, advancedAnalysis)

      logger.info('Successfully parsed advanced query', {
        originalQuery: query,
        intent: result.intent,
        confidence: result.confidence,
        multiIntent: result.multi_intent,
        complexityScore: result.complexity_score,
      })

      return result
    } catch (error) {
      logger.error('Failed to parse conversational query', {
        error: error instanceof Error ? error.message : 'Unknown error',
        query,
      })
      return this.createFallbackQuery(query)
    }
  }

  /**
   * Enhanced query parsing with full advanced intelligence
   */
  async parseAdvancedQuery(query: string, userId: string): Promise<ConversationalQuery> {
    try {
      logger.info('Parsing advanced conversational query', { query, userId })

      // First, get the basic query structure
      const basicQuery = await this.parseQuery(query, userId)

      // Enhance with advanced analysis
      const enhancedCriteria = await this.enhanceWithAdvancedAnalysis(query, basicQuery, userId)

      // Combine basic and advanced insights
      const advancedQuery: ConversationalQuery = {
        ...basicQuery,
        extracted_criteria: {
          ...basicQuery.extracted_criteria,
          ...enhancedCriteria,
        },
        multi_intent: this.detectMultipleIntents(query),
        complexity_score: this.calculateComplexityScore(query, basicQuery),
        requires_explanation: this.requiresExplanation(query),
      }

      logger.info('Advanced query parsing completed', {
        originalQuery: query,
        intent: advancedQuery.intent,
        confidence: advancedQuery.confidence,
        complexity: advancedQuery.complexity_score,
        multiIntent: advancedQuery.multi_intent,
      })

      return advancedQuery
    } catch (error) {
      logger.error('Advanced query parsing failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        query,
        userId,
      })
      // Fallback to basic parsing
      return this.parseQuery(query, userId)
    }
  }

  /**
   * Perform basic analysis for quick parsing
   */
  private async performBasicAnalysis(query: string): Promise<Partial<ConversationalQuery>> {
    const response = await anthropic.messages.create({
      model: claudeConfig.model,
      messages: [
        {
          role: 'user',
          content: this.buildBasicParserPrompt(query),
        },
      ],
      max_tokens: 800,
    })

    const firstContent = response.content[0]
    if (firstContent?.type !== 'text') {
      throw new Error('Unexpected response format from Claude')
    }

    return this.parseResponse(firstContent.text, query)
  }

  /**
   * Perform advanced thematic and cinematic analysis
   */
  private async performAdvancedAnalysis(
    query: string,
    basicAnalysis: Partial<ConversationalQuery>
  ): Promise<AdvancedAnalysisResponse> {
    const response = await anthropic.messages.create({
      model: claudeConfig.model,
      messages: [
        {
          role: 'user',
          content: this.buildAdvancedAnalysisPrompt(query, basicAnalysis),
        },
      ],
      max_tokens: 1500,
    })

    const firstContent = response.content[0]
    if (firstContent?.type !== 'text') {
      return {}
    }

    try {
      const parsed = JSON.parse(firstContent.text)
      return parsed
    } catch {
      return {}
    }
  }

  /**
   * Merge basic and advanced analyses into final result
   */
  private mergeAnalyses(
    query: string,
    basicAnalysis: Partial<ConversationalQuery>,
    advancedAnalysis: AdvancedAnalysisResponse
  ): ConversationalQuery {
    // Start with basic analysis and enhance with advanced insights
    const merged: ConversationalQuery = {
      original_text: query,
      intent: basicAnalysis.intent || 'search',
      extracted_criteria: {
        ...basicAnalysis.extracted_criteria,
        // Add advanced analysis data
        themes: advancedAnalysis.themes,
        visual_style: advancedAnalysis.visual_style,
        narrative_structure: advancedAnalysis.narrative_structure,
        emotional_pattern: advancedAnalysis.emotional_pattern,
        cultural_context: advancedAnalysis.cultural_context,
        cinematic_techniques: advancedAnalysis.cinematic_techniques,
        negations: advancedAnalysis.negations,
        comparative_context: advancedAnalysis.comparative_context,
      },
      confidence: basicAnalysis.confidence || 0.7,
      search_strategy: basicAnalysis.search_strategy || 'hybrid',
      multi_intent: basicAnalysis.multi_intent || false,
      complexity_score: basicAnalysis.complexity_score || 0.5,
      requires_explanation: basicAnalysis.requires_explanation || false,
    }

    return merged
  }

  private buildBasicParserPrompt(query: string): string {
    return `
Parse this movie search query and extract structured criteria:

Query: "${query}"

Extract and return JSON with:
{
  "intent": "search|recommendation|filter|mood_based|thematic_explore|style_match|educational|compare",
  "extracted_criteria": {
    "genres": ["action", "drama"],
    "moods": ["uplifting", "dark", "nostalgic"],
    "similar_to": ["movie titles mentioned"],
    "time_context": "weekend evening|rainy day|late night|etc",
    "emotional_tone": "light|serious|emotional|funny",
    "complexity_level": "light|medium|complex",
    "year_range": [start_year, end_year],
    "actors": ["actor names"],
    "directors": ["director names"],
    "keywords": ["specific themes or elements"],
    "negations": ["NOT this", "avoid that"]
  },
  "confidence": 0.0-1.0,
  "search_strategy": "semantic|filter|hybrid|thematic|advanced",
  "multi_intent": true|false,
  "complexity_score": 0.0-1.0,
  "requires_explanation": true|false
}

Enhanced Examples:
- "Movies like Inception but more emotional" → intent: "search", similar_to: ["Inception"], emotional_tone: "emotional", search_strategy: "semantic"
- "What should I watch on a rainy Sunday?" → intent: "mood_based", time_context: "rainy day", search_strategy: "hybrid"
- "Something that explores identity crisis like Fight Club but not as violent" → intent: "thematic_explore", themes: ["identity_crisis"], similar_to: ["Fight Club"], negations: ["violent"], search_strategy: "thematic"
- "Explain why Blade Runner is considered a masterpiece of cinematography" → intent: "educational", keywords: ["Blade Runner", "cinematography"], requires_explanation: true
- "Compare the directorial styles of Kubrick and Anderson" → intent: "compare", directors: ["Kubrick", "Anderson"], search_strategy: "advanced"
- "Movies with the same emotional journey as Her but in a different genre" → intent: "search", similar_to: ["Her"], emotional_pattern: "bittersweet", multi_intent: true

Be specific and capture complex intents. Return only valid JSON.
`
  }

  private buildAdvancedAnalysisPrompt(
    query: string,
    basicAnalysis: Partial<ConversationalQuery>
  ): string {
    return `
Perform deep thematic and cinematic analysis of this movie query:

Query: "${query}"
Basic Analysis: ${JSON.stringify(basicAnalysis, null, 2)}

Provide advanced analysis in JSON format:
{
  "thematic_elements": {
    "psychological_themes": ["identity_crisis", "redemption", "mortality"],
    "narrative_patterns": ["heros_journey", "circular_narrative"],
    "emotional_journey": "tragic_fall|redemption_arc|bittersweet|etc",
    "cultural_context": ["historical_periods", "social_movements"]
  },
  "cinematic_elements": {
    "visual_style": ["color_symbolism", "symmetry", "lighting_patterns"],
    "directorial_signatures": ["kubrick_style", "anderson_style"],
    "cinematic_techniques": ["long_takes", "close_ups", "montage"]
  },
  "implicit_preferences": [
    {
      "category": "theme|style|mood|complexity",
      "preference": "specific preference",
      "strength": 0.0-1.0,
      "evidence": ["what suggests this"]
    }
  ],
  "contextual_factors": [
    {
      "type": "temporal|emotional|situational",
      "value": "specific context",
      "influence": 0.0-1.0
    }
  ],
  "comparative_analysis": {
    "reference_movies": ["mentioned movies"],
    "comparison_aspects": ["themes", "style", "mood"],
    "desired_similarities": ["what to keep"],
    "desired_differences": ["what to change"]
  }
}

Focus on extracting sophisticated cinematic and thematic understanding. Return only valid JSON.
`
  }

  private parseResponse(response: string, originalQuery: string): ConversationalQuery {
    try {
      // Clean the response to extract JSON
      const jsonMatch = response.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('No JSON found in response')
      }

      const parsed = JSON.parse(jsonMatch[0])

      return {
        original_text: originalQuery,
        intent: this.validateIntent(parsed.intent),
        extracted_criteria: this.validateCriteria(parsed.extracted_criteria || {}),
        confidence: this.validateConfidence(parsed.confidence),
        search_strategy: this.validateStrategy(parsed.search_strategy),
      }
    } catch (error) {
      logger.warn('Failed to parse Claude response, using fallback', {
        error: error instanceof Error ? error.message : 'Unknown error',
        response,
      })
      return this.createFallbackQuery(originalQuery)
    }
  }

  private createFallbackQuery(originalQuery: string): ConversationalQuery {
    // Simple keyword-based fallback parsing
    const lowerQuery = originalQuery.toLowerCase()

    let intent: ConversationalQuery['intent'] = 'search'
    let search_strategy: ConversationalQuery['search_strategy'] = 'semantic'

    // Detect intent patterns
    if (lowerQuery.includes('like ') || lowerQuery.includes('similar to')) {
      intent = 'search'
      search_strategy = 'semantic'
    } else if (lowerQuery.includes('what should i watch') || lowerQuery.includes('recommend')) {
      intent = 'recommendation'
      search_strategy = 'hybrid'
    } else if (this.containsFilterTerms(lowerQuery)) {
      intent = 'filter'
      search_strategy = 'filter'
    } else if (this.containsMoodTerms(lowerQuery)) {
      intent = 'mood_based'
      search_strategy = 'hybrid'
    }

    return {
      original_text: originalQuery,
      intent,
      extracted_criteria: {
        keywords: [originalQuery],
      },
      confidence: 0.5,
      search_strategy,
    }
  }

  private containsFilterTerms(query: string): boolean {
    const filterTerms = [
      'genre',
      'year',
      'from',
      'before',
      'after',
      'actor',
      'director',
      'starring',
    ]
    return filterTerms.some(term => query.includes(term))
  }

  private containsMoodTerms(query: string): boolean {
    const moodTerms = [
      'feel',
      'mood',
      'uplifting',
      'sad',
      'happy',
      'dark',
      'light',
      'funny',
      'serious',
    ]
    return moodTerms.some(term => query.includes(term))
  }

  private validateIntent(intent: unknown): ConversationalQuery['intent'] {
    return isValidIntent(intent) ? intent : 'search'
  }

  private validateStrategy(strategy: unknown): ConversationalQuery['search_strategy'] {
    return isValidStrategy(strategy) ? strategy : 'hybrid'
  }

  private validateConfidence(confidence: unknown): number {
    if (typeof confidence === 'number') {
      return Math.max(0, Math.min(1, confidence))
    }
    if (typeof confidence === 'string') {
      const num = parseFloat(confidence)
      if (!isNaN(num)) {
        return Math.max(0, Math.min(1, num))
      }
    }
    return 0.7
  }

  private validateCriteria(criteria: unknown): ConversationalQuery['extracted_criteria'] {
    const validated: ConversationalQuery['extracted_criteria'] = {}

    if (typeof criteria !== 'object' || criteria === null) {
      return validated
    }

    const criteriaObj = criteria as Record<string, unknown>

    if (isStringArray(criteriaObj.genres)) {
      validated.genres = criteriaObj.genres
    }

    if (isStringArray(criteriaObj.moods)) {
      validated.moods = criteriaObj.moods
    }

    if (isStringArray(criteriaObj.similar_to)) {
      validated.similar_to = criteriaObj.similar_to
    }

    if (typeof criteriaObj.time_context === 'string') {
      validated.time_context = criteriaObj.time_context
    }

    if (typeof criteriaObj.emotional_tone === 'string') {
      validated.emotional_tone = criteriaObj.emotional_tone
    }

    if (isValidComplexityLevel(criteriaObj.complexity_level)) {
      validated.complexity_level = criteriaObj.complexity_level
    }

    if (Array.isArray(criteriaObj.year_range) && criteriaObj.year_range.length === 2) {
      const [start, end] = criteriaObj.year_range
      if (typeof start === 'number' && typeof end === 'number') {
        validated.year_range = [start, end]
      }
    }

    if (isStringArray(criteriaObj.actors)) {
      validated.actors = criteriaObj.actors
    }

    if (isStringArray(criteriaObj.directors)) {
      validated.directors = criteriaObj.directors
    }

    if (isStringArray(criteriaObj.keywords)) {
      validated.keywords = criteriaObj.keywords
    }

    return validated
  }

  /**
   * Enhanced analysis for advanced query parsing
   */
  private async enhanceWithAdvancedAnalysis(
    query: string,
    basicQuery: ConversationalQuery,
    userId: string
  ): Promise<Partial<ConversationalQuery['extracted_criteria']>> {
    const enhancement: Partial<ConversationalQuery['extracted_criteria']> = {}

    // Detect thematic elements
    const themes = this.extractThematicElements(query)
    if (themes.length > 0) {
      enhancement.themes = themes
    }

    // Detect visual style preferences
    const visualStyle = this.extractVisualStylePreferences(query)
    if (visualStyle.length > 0) {
      enhancement.visual_style = visualStyle
    }

    // Detect narrative structure preferences
    const narrative = this.extractNarrativePreferences(query)
    if (narrative.length > 0) {
      enhancement.narrative_structure = narrative
    }

    // Extract comparative context
    const comparativeContext = this.extractComparativeContext(query)
    if (comparativeContext && Object.keys(comparativeContext).length > 0) {
      enhancement.comparative_context = comparativeContext
    }

    return enhancement
  }

  private extractThematicElements(query: string): string[] {
    const themes: string[] = []
    const lowerQuery = query.toLowerCase()

    const thematicKeywords = {
      identity: ['identity', 'self-discovery', 'who am i', 'finding myself'],
      love: ['love', 'romance', 'relationship', 'heartbreak'],
      redemption: ['redemption', 'second chance', 'forgiveness', 'atonement'],
      justice: ['justice', 'revenge', 'right and wrong', 'moral'],
      family: ['family', 'parents', 'siblings', 'home'],
      friendship: ['friendship', 'loyalty', 'betrayal', 'trust'],
      survival: ['survival', 'struggle', 'fighting', 'overcome'],
      power: ['power', 'control', 'authority', 'corruption'],
      sacrifice: ['sacrifice', 'selfless', 'giving up', 'martyr'],
      growth: ['coming of age', 'growing up', 'maturity', 'learning'],
    }

    for (const [theme, keywords] of Object.entries(thematicKeywords)) {
      if (keywords.some(keyword => lowerQuery.includes(keyword))) {
        themes.push(theme)
      }
    }

    return themes
  }

  private extractVisualStylePreferences(query: string): string[] {
    const styles: string[] = []
    const lowerQuery = query.toLowerCase()

    const styleKeywords = {
      dark: ['dark', 'noir', 'shadows', 'moody'],
      colorful: ['colorful', 'vibrant', 'bright', 'vivid'],
      minimalist: ['minimalist', 'simple', 'clean', 'stark'],
      epic: ['epic', 'grand', 'sweeping', 'spectacular'],
      intimate: ['intimate', 'close', 'personal', 'small-scale'],
      stylized: ['stylized', 'artistic', 'unique style', 'distinctive'],
    }

    for (const [style, keywords] of Object.entries(styleKeywords)) {
      if (keywords.some(keyword => lowerQuery.includes(keyword))) {
        styles.push(style)
      }
    }

    return styles
  }

  private extractNarrativePreferences(query: string): string[] {
    const narratives: string[] = []
    const lowerQuery = query.toLowerCase()

    const narrativeKeywords = {
      'non-linear': ['non-linear', 'flashbacks', 'time jumps', 'complex timeline'],
      simple: ['simple', 'straightforward', 'easy to follow'],
      mystery: ['mystery', 'puzzle', 'reveals', 'twists'],
      journey: ['journey', 'adventure', 'quest', 'travel'],
      ensemble: ['ensemble', 'multiple characters', 'group'],
    }

    for (const [narrative, keywords] of Object.entries(narrativeKeywords)) {
      if (keywords.some(keyword => lowerQuery.includes(keyword))) {
        narratives.push(narrative)
      }
    }

    return narratives
  }

  private extractComparativeContext(
    query: string
  ): ConversationalQuery['extracted_criteria']['comparative_context'] {
    const context: ConversationalQuery['extracted_criteria']['comparative_context'] = {}
    const lowerQuery = query.toLowerCase()

    // Better than patterns
    const betterThanMatch = lowerQuery.match(/better than (.+?)(?:\s|$|,|\.)/i)
    if (betterThanMatch) {
      context.better_than = [betterThanMatch[1] ?? '']
    }

    // Different from patterns
    const differentFromMatch = lowerQuery.match(
      /(?:different from|not like|unlike) (.+?)(?:\s|$|,|\.)/i
    )
    if (differentFromMatch) {
      context.different_from = [differentFromMatch[1] ?? '']
    }

    // Similar but patterns
    const similarButMatch = lowerQuery.match(
      /(?:like .+ but|similar to .+ but) (.+?)(?:\s|$|,|\.)/i
    )
    if (similarButMatch) {
      context.similar_but = [similarButMatch[1] ?? '']
    }

    return context
  }

  private detectMultipleIntents(query: string): boolean {
    const intentIndicators = [
      'and',
      'but',
      'also',
      'or',
      'however',
      'additionally',
      'plus',
      'recommend',
      'find',
      'search',
      'explain',
      'compare',
    ]

    const matches = intentIndicators.filter(indicator =>
      query.toLowerCase().includes(indicator)
    ).length

    return matches >= 2
  }

  private calculateComplexityScore(query: string, basicQuery: ConversationalQuery): number {
    let complexity = 0

    // Length factor
    complexity += Math.min(query.length / 200, 0.3)

    // Number of criteria
    const criteriaCount = Object.keys(basicQuery.extracted_criteria).length
    complexity += Math.min(criteriaCount / 10, 0.3)

    // Complex language patterns
    const complexPatterns = [
      'however',
      'nevertheless',
      'furthermore',
      'specifically',
      'particularly',
      'emotionally',
      'psychologically',
      'thematically',
      'cinematically',
    ]
    const complexMatches = complexPatterns.filter(pattern =>
      query.toLowerCase().includes(pattern)
    ).length
    complexity += Math.min(complexMatches / 5, 0.4)

    return Math.min(complexity, 1.0)
  }

  private requiresExplanation(query: string): boolean {
    const explanationKeywords = [
      'why',
      'how',
      'explain',
      'because',
      'reason',
      'what makes',
      'analyze',
      'understand',
      'meaning',
      'significance',
    ]

    return explanationKeywords.some(keyword => query.toLowerCase().includes(keyword))
  }
}
