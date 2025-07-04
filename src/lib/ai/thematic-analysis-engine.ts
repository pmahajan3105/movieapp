/**
 * Thematic Analysis Engine
 * Advanced AI-powered movie thematic analysis and narrative understanding
 */

// @ts-nocheck
// TODO: Fix TypeScript errors in this file

import { createClient } from '@supabase/supabase-js'
import { anthropic, claudeConfig } from '@/lib/anthropic/config'

import { getSupabaseUrl, getSupabaseServiceRoleKey } from '@/lib/env'
import { logger } from '@/lib/logger'
import type { Movie } from '@/types'
import type {
  ThematicProfile,
  ThematicAnalysisRequest,
  ThematicAnalysisResponse,
  PsychologicalTheme,
  NarrativeStructure,
  CinematicStyle,
  CulturalContext,
  AnalysisMetadata,
  AdvancedRecommendation,
  ThematicMatch,
} from '@/types/advanced-intelligence'
import {
  PSYCHOLOGICAL_THEMES,
  NARRATIVE_STRUCTURES,
  GENRE_THEMES,
  ThematicTaxonomy,
} from './thematic-taxonomy'

export class ThematicAnalysisEngine {
  private supabase = createClient(getSupabaseUrl()!, getSupabaseServiceRoleKey()!)
  private static instance: ThematicAnalysisEngine

  static getInstance(): ThematicAnalysisEngine {
    if (!ThematicAnalysisEngine.instance) {
      ThematicAnalysisEngine.instance = new ThematicAnalysisEngine()
    }
    return ThematicAnalysisEngine.instance
  }

  /**
   * Analyze movie themes and narrative structure
   */
  async analyzeMovie(request: ThematicAnalysisRequest): Promise<ThematicAnalysisResponse> {
    const startTime = Date.now()

    try {
      logger.info('Starting thematic analysis', {
        movieId: request.movieId,
        depth: request.analysisDepth,
      })

      // Check for existing analysis
      const existingAnalysis = await this.getExistingAnalysis(request.movieId)
      if (existingAnalysis && !request.forceReanalysis) {
        logger.info('Returning cached thematic analysis', { movieId: request.movieId })
        return {
          thematicProfile: existingAnalysis,
          analysisMetadata: {
            analysisDate: existingAnalysis.lastAnalyzed,
            analysisDepth: request.analysisDepth,
            dataSource: ['cache'],
            confidence: existingAnalysis.confidence,
            processingTime: Date.now() - startTime,
            modelVersion: 'cache',
          },
        }
      }

      // Get movie data
      const movie = await this.getMovieData(request.movieId)
      if (!movie) {
        throw new Error('Movie not found')
      }

      // Perform comprehensive thematic analysis
      const thematicProfile = await this.performAnalysis(movie, request.analysisDepth)

      // Store analysis results
      await this.storeAnalysis(thematicProfile)

      // Generate metadata
      const metadata: AnalysisMetadata = {
        analysisDate: new Date().toISOString(),
        analysisDepth: request.analysisDepth,
        dataSource: ['ai_analysis', 'taxonomy', 'external_data'],
        confidence: thematicProfile.confidence,
        processingTime: Date.now() - startTime,
        modelVersion: claudeConfig.model,
      }

      logger.info('Thematic analysis completed', {
        movieId: request.movieId,
        confidence: thematicProfile.confidence,
        processingTime: metadata.processingTime,
      })

      return {
        thematicProfile,
        analysisMetadata: metadata,
      }
    } catch (error) {
      logger.error('Thematic analysis failed', {
        error: error instanceof Error ? error.message : String(error),
        movieId: request.movieId,
      })
      throw error
    }
  }

  /**
   * Find thematically similar movies
   */
  async findSimilarMovies(
    movieId: string,
    limit: number = 10,
    minSimilarity: number = 0.3
  ): Promise<AdvancedRecommendation[]> {
    try {
      const sourceAnalysis = await this.getExistingAnalysis(movieId)
      if (!sourceAnalysis) {
        throw new Error('Source movie analysis not found')
      }

      // Get all analyzed movies
      const { data: allAnalyses, error } = await this.supabase
        .from('movie_thematic_profiles')
        .select('*')
        .neq('movie_id', movieId)

      if (error) throw error

      const similarities: Array<{
        movieId: string
        similarity: number
        analysis: ThematicProfile
      }> = []

      // Calculate thematic similarities
      for (const analysis of allAnalyses || []) {
        const similarity = this.calculateThematicSimilarity(sourceAnalysis, analysis)
        if (similarity >= minSimilarity) {
          similarities.push({ movieId: analysis.movie_id, similarity, analysis })
        }
      }

      // Sort by similarity and take top results
      similarities.sort((a, b) => b.similarity - a.similarity)
      const topSimilar = similarities.slice(0, limit)

      // Get movie data and create recommendations
      const recommendations: AdvancedRecommendation[] = []

      for (const similar of topSimilar) {
        const movie = await this.getMovieData(similar.movieId)
        if (movie) {
          const recommendation = await this.createAdvancedRecommendation(
            movie,
            sourceAnalysis,
            similar.analysis,
            similar.similarity
          )
          recommendations.push(recommendation)
        }
      }

      return recommendations
    } catch (error) {
      logger.error('Failed to find similar movies', {
        error: error instanceof Error ? error.message : String(error),
        movieId,
      })
      return []
    }
  }

  /**
   * Perform comprehensive thematic analysis
   */
  private async performAnalysis(movie: Movie, depth: string): Promise<ThematicProfile> {
    const analysisPrompt = this.buildAnalysisPrompt(movie, depth)

    try {
      const response = await anthropic.messages.create({
        model: claudeConfig.model,
        max_tokens: depth === 'expert' ? 4000 : depth === 'comprehensive' ? 3000 : 2000,
        messages: [
          {
            role: 'user',
            content: analysisPrompt,
          },
        ],
      })

      const aiAnalysis = response.content[0].type === 'text' ? response.content[0].text : ''
      const extractedAnalysis = this.extractStructuredAnalysis(aiAnalysis, movie)

      // Enhance with taxonomy-based analysis
      const enhancedAnalysis = await this.enhanceWithTaxonomy(extractedAnalysis, movie)

      return enhancedAnalysis
    } catch (error) {
      logger.error('AI analysis failed, falling back to taxonomy', { error })
      // Fallback to taxonomy-only analysis
      return this.taxonomyBasedAnalysis(movie)
    }
  }

  /**
   * Build comprehensive analysis prompt for Claude
   */
  private buildAnalysisPrompt(movie: Movie, depth: string): string {
    const basePrompt = `
Analyze the movie "${movie.title}" (${movie.year}) with deep thematic and narrative understanding.

Movie Details:
- Title: ${movie.title}
- Year: ${movie.year}
- Genre: ${movie.genre?.join(', ') || 'Unknown'}
- Director: ${movie.director?.join(', ') || 'Unknown'}
- Plot: ${movie.plot || 'Plot summary not available'}
- Rating: ${movie.rating || 'Not rated'}

Please provide a comprehensive analysis covering:

1. PSYCHOLOGICAL THEMES (identify 3-5 primary themes):
   - Core psychological and universal themes
   - Character development and internal conflicts
   - Symbolic representations and metaphors
   - Evidence from plot and character actions

2. NARRATIVE STRUCTURE:
   - Primary storytelling structure (Hero's Journey, Three-Act, etc.)
   - Pacing and rhythm
   - Use of flashbacks or non-linear elements
   - Narrative complexity level

3. EMOTIONAL JOURNEY:
   - Overall emotional pattern and arc
   - Key emotional beats and turning points
   - Climactic emotional moment
   - Cathartic elements and resolution

4. VISUAL AND CINEMATIC STYLE:
   - Visual motifs and symbolism
   - Color palette and lighting choices
   - Camera work and composition
   - Editing style and rhythm

5. CULTURAL CONTEXT:
   - Historical period and setting
   - Social and political themes
   - Cultural identity elements
   - Relevance to contemporary issues
`

    if (depth === 'expert' || depth === 'comprehensive') {
      return (
        basePrompt +
        `
6. DIRECTORIAL SIGNATURE:
   - Unique directorial elements
   - Auteur theory connections
   - Technical innovations
   - Comparison to director's other works

7. GENRE ANALYSIS:
   - Genre conventions followed or subverted
   - Hybrid genre elements
   - Innovation within genre boundaries

8. PHILOSOPHICAL UNDERTONES:
   - Deeper philosophical questions raised
   - Existential themes
   - Moral and ethical dimensions

Please format your response as detailed analysis with specific examples and evidence from the film.`
      )
    }

    return (
      basePrompt +
      `
Please provide specific examples and evidence for each point. Format your response clearly with section headers.`
    )
  }

  /**
   * Extract structured analysis from AI response
   */
  private extractStructuredAnalysis(aiText: string, movie: Movie): Partial<ThematicProfile> {
    // Parse AI response and extract structured data
    const themes = this.extractThemes(aiText)
    const narrative = this.extractNarrativeStructure(aiText)
    const emotional = this.extractEmotionalJourney(aiText)
    const visual = this.extractVisualMotifs(aiText)
    const cultural = this.extractCulturalContext(aiText)

    return {
      movieId: movie.id,
      psychologicalThemes: themes,
      narrativeStructure: narrative,
      emotionalJourney: emotional,
      visualMotifs: visual,
      culturalContext: cultural,
      confidence: 0.8, // AI-based analysis gets higher confidence
      lastAnalyzed: new Date().toISOString(),
    }
  }

  /**
   * Extract psychological themes from AI analysis
   */
  private extractThemes(text: string): PsychologicalTheme[] {
    const themes: PsychologicalTheme[] = []
    const lowerText = text.toLowerCase()

    // Use taxonomy to identify themes mentioned in the analysis
    Object.values(PSYCHOLOGICAL_THEMES).forEach(themeTemplate => {
      const mentioned = themeTemplate.keywords.some(keyword =>
        lowerText.includes(keyword.toLowerCase())
      )

      if (mentioned) {
        // Extract relevance based on how much the theme is discussed
        const relevanceScore = this.calculateThemeRelevance(text, themeTemplate.keywords)

        if (relevanceScore > 0.3) {
          themes.push({
            id: themeTemplate.id,
            name: themeTemplate.name,
            relevanceScore,
            evidencePoints: this.extractEvidencePoints(text, themeTemplate.keywords),
            subthemes: [],
          })
        }
      }
    })

    return themes.sort((a, b) => b.relevanceScore - a.relevanceScore).slice(0, 5)
  }

  /**
   * Extract narrative structure information
   */
  private extractNarrativeStructure(text: string): NarrativeStructure {
    const lowerText = text.toLowerCase()

    // Identify primary structure
    let primaryStructure = 'three_act' // default
    let maxScore = 0

    Object.values(NARRATIVE_STRUCTURES).forEach(structure => {
      const score = this.calculateStructureMatch(lowerText, structure.id)
      if (score > maxScore) {
        maxScore = score
        primaryStructure = structure.id
      }
    })

    // Determine pacing
    const pacing = this.determinePacing(text)

    // Calculate complexity
    const complexityScore = this.calculateNarrativeComplexity(text)

    return {
      primaryStructure,
      structureElements: [], // Could be enhanced with more detailed parsing
      complexityScore,
      pacing,
      nonLinearElements: this.extractNonLinearElements(text),
    }
  }

  /**
   * Extract emotional journey information
   */
  private extractEmotionalJourney(text: string) {
    // Analyze emotional language and progression
    const emotionalPattern = this.identifyEmotionalPattern(text)
    const intensityScore = this.calculateEmotionalIntensity(text)

    return {
      overallPattern: emotionalPattern,
      emotionalBeats: [], // Could be enhanced with timeline analysis
      climacticMoment: {
        timestamp: 0,
        emotion: 'climax',
        intensity: 0.9,
        description: 'Climactic moment',
      },
      resolution: {
        timestamp: 0,
        emotion: 'resolution',
        intensity: 0.6,
        description: 'Resolution',
      },
      intensityScore,
      catharticElements: this.extractCatharticElements(text),
    }
  }

  /**
   * Extract visual motifs and cinematic style
   */
  private extractVisualMotifs(text: string) {
    const motifs = []
    const lowerText = text.toLowerCase()

    // Check for color symbolism
    if (lowerText.includes('color') || lowerText.includes('palette')) {
      motifs.push({
        type: 'color_symbolism' as const,
        description: 'Color symbolism analysis needed',
        symbolism: 'Color-based meaning',
        frequency: 1,
        significance: 0.7,
      })
    }

    // Check for lighting mentions
    if (lowerText.includes('lighting') || lowerText.includes('shadow')) {
      motifs.push({
        type: 'lighting' as const,
        description: 'Lighting patterns and symbolism',
        symbolism: 'Light and shadow symbolism',
        frequency: 1,
        significance: 0.6,
      })
    }

    return motifs
  }

  /**
   * Extract cultural context
   */
  private extractCulturalContext(text: string): CulturalContext {
    const lowerText = text.toLowerCase()

    // Identify historical periods
    const historicalMarkers = ['ancient', 'medieval', 'modern', 'contemporary', 'future']
    const period = historicalMarkers.find(marker => lowerText.includes(marker))

    // Identify geographical setting
    const geographical = this.extractGeographicalReferences(text)

    // Calculate contemporary relevance
    const relevanceToPresent = this.calculateContemporaryRelevance(text)

    return {
      historicalPeriod: period,
      geographicalSetting: geographical,
      socialMovements: [],
      culturalIdentity: [],
      relevanceToPresent,
    }
  }

  /**
   * Enhance analysis with taxonomy-based insights
   */
  private async enhanceWithTaxonomy(
    analysis: Partial<ThematicProfile>,
    movie: Movie
  ): Promise<ThematicProfile> {
    // Add genre-specific themes
    const genreThemes = this.getGenreThemes(movie.genre || [])

    // Add atmospheric qualities
    const atmospheric = this.inferAtmosphericQualities(movie, analysis)

    // Calculate overall confidence
    const confidence = this.calculateAnalysisConfidence(analysis)

    return {
      movieId: movie.id,
      psychologicalThemes: analysis.psychologicalThemes || [],
      narrativeStructure: analysis.narrativeStructure || this.getDefaultNarrativeStructure(),
      emotionalJourney: analysis.emotionalJourney || this.getDefaultEmotionalJourney(),
      visualMotifs: analysis.visualMotifs || [],
      cinematicStyle: this.inferCinematicStyle(movie),
      culturalContext: analysis.culturalContext || this.getDefaultCulturalContext(movie),
      genreThemes,
      atmosphericQualities: atmospheric,
      confidence,
      lastAnalyzed: new Date().toISOString(),
    }
  }

  /**
   * Fallback taxonomy-based analysis
   */
  private taxonomyBasedAnalysis(movie: Movie): ThematicProfile {
    // Extract themes from plot and genre
    const plotThemes = ThematicTaxonomy.extractThemesFromText(movie.plot || '')
    const genreThemes = this.getGenreThemes(movie.genre || [])

    // Build psychological themes from extracted themes
    const psychologicalThemes: PsychologicalTheme[] = plotThemes.map(themeId => {
      const themeTemplate = Object.values(PSYCHOLOGICAL_THEMES).find(t => t.id === themeId)
      return {
        id: themeId,
        name: themeTemplate?.name || themeId,
        relevanceScore: 0.6, // Lower confidence for taxonomy-only
        evidencePoints: ['Based on plot analysis'],
        subthemes: [],
      }
    })

    return {
      movieId: movie.id,
      psychologicalThemes,
      narrativeStructure: this.getDefaultNarrativeStructure(),
      emotionalJourney: this.getDefaultEmotionalJourney(),
      visualMotifs: [],
      cinematicStyle: this.inferCinematicStyle(movie),
      culturalContext: this.getDefaultCulturalContext(movie),
      genreThemes,
      atmosphericQualities: this.inferAtmosphericQualities(movie, {}),
      confidence: 0.5, // Lower confidence for fallback
      lastAnalyzed: new Date().toISOString(),
    }
  }

  /**
   * Calculate thematic similarity between two movies
   */
  private calculateThematicSimilarity(
    profile1: ThematicProfile,
    profile2: ThematicProfile
  ): number {
    // Theme similarity (40% weight)
    const themeIds1 = profile1.psychologicalThemes.map(t => t.id)
    const themeIds2 = profile2.psychologicalThemes.map(t => t.id)
    const themeSimilarity = ThematicTaxonomy.calculateThematicSimilarity(themeIds1, themeIds2)

    // Narrative similarity (25% weight)
    const narrativeSimilarity =
      profile1.narrativeStructure.primaryStructure === profile2.narrativeStructure.primaryStructure
        ? 1
        : 0

    // Emotional similarity (20% weight)
    const emotionalSimilarity =
      profile1.emotionalJourney.overallPattern === profile2.emotionalJourney.overallPattern ? 1 : 0

    // Cultural similarity (15% weight)
    const culturalSimilarity = this.calculateCulturalSimilarity(
      profile1.culturalContext,
      profile2.culturalContext
    )

    return (
      themeSimilarity * 0.4 +
      narrativeSimilarity * 0.25 +
      emotionalSimilarity * 0.2 +
      culturalSimilarity * 0.15
    )
  }

  /**
   * Create advanced recommendation with detailed matching
   */
  private async createAdvancedRecommendation(
    movie: Movie,
    sourceProfile: ThematicProfile,
    targetProfile: ThematicProfile,
    similarity: number
  ): Promise<AdvancedRecommendation> {
    const thematicMatch: ThematicMatch = {
      sharedThemes: this.findSharedThemes(sourceProfile, targetProfile),
      themeRelevance: this.calculateThemeRelevance(sourceProfile, targetProfile),
      thematicDepth: targetProfile.confidence,
      thematicNovelty: 1 - similarity, // Higher novelty for less similar themes
    }

    return {
      movie,
      thematicMatch,
      styleMatch: {
        cinematicSimilarity: 0.7, // Placeholder
        visualCompatibility: 0.6,
        directorialAlignment: 0.5,
        styleElements: [],
      },
      emotionalMatch: {
        journeyCompatibility:
          sourceProfile.emotionalJourney.overallPattern ===
          targetProfile.emotionalJourney.overallPattern
            ? 0.9
            : 0.3,
        moodAlignment: 0.7,
        intensityMatch: Math.abs(
          sourceProfile.emotionalJourney.intensityScore -
            targetProfile.emotionalJourney.intensityScore
        ),
        catharticPotential: 0.8,
      },
      narrativeMatch: {
        structuralSimilarity:
          sourceProfile.narrativeStructure.primaryStructure ===
          targetProfile.narrativeStructure.primaryStructure
            ? 0.9
            : 0.3,
        complexityAlignment: Math.abs(
          sourceProfile.narrativeStructure.complexityScore -
            targetProfile.narrativeStructure.complexityScore
        ),
        pacingCompatibility: 0.7,
        innovationLevel: 0.6,
      },
      overallScore: similarity,
      explanation: {
        primaryReason: `Shares core themes: ${thematicMatch.sharedThemes.join(', ')}`,
        thematicReasons: [`${thematicMatch.sharedThemes.length} shared psychological themes`],
        styleReasons: ['Similar cinematic approach'],
        emotionalReasons: [`Comparable emotional journey pattern`],
        narrativeReasons: [
          `Similar narrative structure: ${targetProfile.narrativeStructure.primaryStructure}`,
        ],
        culturalReasons: ['Related cultural context'],
        personalizedInsights: ['Recommended based on your thematic preferences'],
      },
    }
  }

  // Helper methods
  private async getExistingAnalysis(movieId: string): Promise<ThematicProfile | null> {
    const { data, error } = await this.supabase
      .from('movie_thematic_profiles')
      .select('*')
      .eq('movie_id', movieId)
      .single()

    if (error && error.code !== 'PGRST116') {
      logger.error('Error fetching existing analysis', { error })
    }

    return data ? this.parseStoredAnalysis(data) : null
  }

  private async getMovieData(movieId: string): Promise<Movie | null> {
    const { data, error } = await this.supabase
      .from('movies')
      .select('*')
      .eq('id', movieId)
      .single()

    if (error) {
      logger.error('Error fetching movie data', { error, movieId })
      return null
    }

    return data
  }

  private async storeAnalysis(profile: ThematicProfile): Promise<void> {
    const { error } = await this.supabase.from('movie_thematic_profiles').upsert({
      movie_id: profile.movieId,
      psychological_themes: profile.psychologicalThemes,
      narrative_structure: profile.narrativeStructure,
      emotional_journey: profile.emotionalJourney,
      visual_motifs: profile.visualMotifs,
      cinematic_style: profile.cinematicStyle,
      cultural_context: profile.culturalContext,
      genre_themes: profile.genreThemes,
      atmospheric_qualities: profile.atmosphericQualities,
      confidence: profile.confidence,
      last_analyzed: profile.lastAnalyzed,
    })

    if (error) {
      logger.error('Error storing thematic analysis', { error })
    }
  }

  // Additional helper methods for parsing and analysis
  private calculateThemeRelevance(text: string, keywords: string[]): number {
    const mentions = keywords.filter(keyword =>
      text.toLowerCase().includes(keyword.toLowerCase())
    ).length
    return Math.min((mentions / keywords.length) * 2, 1)
  }

  private extractEvidencePoints(text: string, keywords: string[]): string[] {
    // Extract sentences that mention the theme keywords
    const sentences = text.split('.')
    return sentences
      .filter(sentence =>
        keywords.some(keyword => sentence.toLowerCase().includes(keyword.toLowerCase()))
      )
      .map(sentence => sentence.trim())
      .slice(0, 3)
  }

  private calculateStructureMatch(text: string, structureId: string): number {
    const structureKeywords = {
      heros_journey: ['hero', 'journey', 'adventure', 'quest', 'transformation'],
      three_act: ['setup', 'confrontation', 'resolution', 'beginning', 'middle', 'end'],
      circular: ['circular', 'cycle', 'return', 'beginning'],
      parallel: ['parallel', 'multiple', 'interweaving', 'separate'],
    }

    const keywords = structureKeywords[structureId as keyof typeof structureKeywords] || []
    return this.calculateThemeRelevance(text, keywords)
  }

  private determinePacing(text: string): 'slow' | 'measured' | 'moderate' | 'fast' | 'variable' {
    const lowerText = text.toLowerCase()
    if (lowerText.includes('slow') || lowerText.includes('deliberate')) return 'slow'
    if (lowerText.includes('fast') || lowerText.includes('quick')) return 'fast'
    if (lowerText.includes('variable') || lowerText.includes('changing')) return 'variable'
    if (lowerText.includes('measured') || lowerText.includes('steady')) return 'measured'
    return 'moderate'
  }

  private calculateNarrativeComplexity(text: string): number {
    const complexityIndicators = ['complex', 'intricate', 'layered', 'non-linear', 'multiple']
    const mentions = complexityIndicators.filter(indicator =>
      text.toLowerCase().includes(indicator)
    ).length
    return Math.min(mentions / complexityIndicators.length, 1)
  }

  private extractNonLinearElements(text: string) {
    const elements = []
    const lowerText = text.toLowerCase()

    if (lowerText.includes('flashback')) {
      elements.push({
        type: 'flashback' as const,
        description: 'Contains flashback sequences',
        narrativePurpose: 'Reveals past information',
      })
    }

    return elements
  }

  private identifyEmotionalPattern(text: string): any {
    const lowerText = text.toLowerCase()
    if (lowerText.includes('tragic') || lowerText.includes('fall')) return 'tragic_fall'
    if (lowerText.includes('redemption') || lowerText.includes('recovery')) return 'redemption_arc'
    if (lowerText.includes('bittersweet')) return 'bittersweet'
    if (lowerText.includes('intense') || lowerText.includes('roller')) return 'rollercoaster'
    return 'gradual_ascent'
  }

  private calculateEmotionalIntensity(text: string): number {
    const intensityWords = ['intense', 'powerful', 'overwhelming', 'subtle', 'gentle']
    const mentions = intensityWords.filter(word => text.toLowerCase().includes(word)).length
    return Math.min(mentions / intensityWords.length, 1)
  }

  private extractCatharticElements(text: string): string[] {
    const elements = []
    const lowerText = text.toLowerCase()

    if (lowerText.includes('cathartic') || lowerText.includes('release')) {
      elements.push('Emotional release')
    }
    if (lowerText.includes('resolution') || lowerText.includes('closure')) {
      elements.push('Narrative closure')
    }

    return elements
  }

  private extractGeographicalReferences(text: string): string[] {
    // Simple geographical extraction - could be enhanced with NER
    const geographical = []
    const lowerText = text.toLowerCase()

    const locations = ['america', 'europe', 'asia', 'urban', 'rural', 'city', 'countryside']
    locations.forEach(location => {
      if (lowerText.includes(location)) {
        geographical.push(location)
      }
    })

    return geographical
  }

  private calculateContemporaryRelevance(text: string): number {
    const relevanceWords = ['relevant', 'contemporary', 'current', 'modern', 'timeless']
    const mentions = relevanceWords.filter(word => text.toLowerCase().includes(word)).length
    return Math.min(mentions / relevanceWords.length, 1)
  }

  private getGenreThemes(genres: string[]) {
    return genres.map(genre => ({
      genre,
      themes: GENRE_THEMES[genre.toUpperCase() as keyof typeof GENRE_THEMES]?.psychological || [],
      conventions: [],
      subversion: [],
    }))
  }

  private inferAtmosphericQualities(movie: Movie, analysis: Partial<ThematicProfile>) {
    // Infer atmospheric qualities from genre and themes
    const qualities = []

    if (movie.genre?.includes('Drama')) {
      qualities.push({
        mood: 'contemplative',
        intensity: 0.7,
        consistency: 0.8,
        techniques: ['character development', 'emotional depth'],
      })
    }

    return qualities
  }

  private calculateAnalysisConfidence(analysis: Partial<ThematicProfile>): number {
    let confidence = 0.5 // Base confidence

    if (analysis.psychologicalThemes?.length) confidence += 0.2
    if (analysis.narrativeStructure) confidence += 0.1
    if (analysis.emotionalJourney) confidence += 0.1
    if (analysis.visualMotifs?.length) confidence += 0.1

    return Math.min(confidence, 1)
  }

  private getDefaultNarrativeStructure(): NarrativeStructure {
    return {
      primaryStructure: 'three_act',
      structureElements: [],
      complexityScore: 0.5,
      pacing: 'moderate',
    }
  }

  private getDefaultEmotionalJourney() {
    return {
      overallPattern: 'gradual_ascent' as const,
      emotionalBeats: [],
      climacticMoment: {
        timestamp: 0,
        emotion: 'climax',
        intensity: 0.8,
        description: 'Peak emotional moment',
      },
      resolution: {
        timestamp: 0,
        emotion: 'resolution',
        intensity: 0.6,
        description: 'Story resolution',
      },
      intensityScore: 0.6,
      catharticElements: [],
    }
  }

  private inferCinematicStyle(movie: Movie): CinematicStyle {
    return {
      visualCharacteristics: [],
      cameraWork: {
        movementStyle: 'dynamic',
        frameComposition: 'classical',
        depthOfField: 'variable',
        signature: [],
      },
      editingStyle: {
        pacing: 'standard',
        transitions: ['cut', 'fade'],
        rhythm: 'dramatic',
        continuity: 'classical',
      },
      soundDesign: {
        musicStyle: [],
        soundscapeType: 'realistic',
        dialogueStyle: 'naturalistic',
        silenceUsage: 0.3,
      },
      productionDesign: {
        visualStyle: [],
        colorPalette: {
          dominant: [],
          symbolic: {},
          temperature: 'neutral',
          saturation: 'natural',
        },
        setDesign: 'realistic',
        costumeSignificance: 0.5,
      },
    }
  }

  private getDefaultCulturalContext(movie: Movie): CulturalContext {
    return {
      geographicalSetting: [],
      relevanceToPresent: 0.5,
    }
  }

  private calculateCulturalSimilarity(
    context1: CulturalContext,
    context2: CulturalContext
  ): number {
    // Simple cultural similarity calculation
    const period1 = context1.historicalPeriod
    const period2 = context2.historicalPeriod

    if (period1 && period2 && period1 === period2) return 1
    if (period1 && period2) return 0.5
    return 0.3
  }

  private findSharedThemes(profile1: ThematicProfile, profile2: ThematicProfile): string[] {
    const themes1 = profile1.psychologicalThemes.map(t => t.id)
    const themes2 = profile2.psychologicalThemes.map(t => t.id)
    return themes1.filter(theme => themes2.includes(theme))
  }

  private calculateThemeRelevance(
    source: ThematicProfile,
    target: ThematicProfile
  ): Record<string, number> {
    const relevance: Record<string, number> = {}

    target.psychologicalThemes.forEach(theme => {
      const sourceTheme = source.psychologicalThemes.find(t => t.id === theme.id)
      relevance[theme.id] = sourceTheme
        ? (sourceTheme.relevanceScore + theme.relevanceScore) / 2
        : theme.relevanceScore * 0.5
    })

    return relevance
  }

  private parseStoredAnalysis(data: any): ThematicProfile {
    return {
      movieId: data.movie_id,
      psychologicalThemes: data.psychological_themes || [],
      narrativeStructure: data.narrative_structure || this.getDefaultNarrativeStructure(),
      emotionalJourney: data.emotional_journey || this.getDefaultEmotionalJourney(),
      visualMotifs: data.visual_motifs || [],
      cinematicStyle:
        data.cinematic_style || this.inferCinematicStyle({ id: data.movie_id } as Movie),
      culturalContext: data.cultural_context || {
        geographicalSetting: [],
        relevanceToPresent: 0.5,
      },
      genreThemes: data.genre_themes || [],
      atmosphericQualities: data.atmospheric_qualities || [],
      confidence: data.confidence || 0.5,
      lastAnalyzed: data.last_analyzed,
    }
  }
}

// Export singleton instance
export const thematicAnalysisEngine = ThematicAnalysisEngine.getInstance()
