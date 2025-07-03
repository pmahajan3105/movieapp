/**
 * Emotional Journey Mapper
 * Advanced analysis of emotional arcs, mood progression, and affective storytelling in films
 */

import { anthropic, claudeConfig } from '@/lib/anthropic/config'

import { logger } from '@/lib/logger'
import type { Movie } from '@/types'
import type {
  EmotionalJourney,
  EmotionalBeat,
  AtmosphericQuality,
  MoodHistoryEntry,
  EmotionalPreference,
} from '@/types/advanced-intelligence'
import type {
  ConfidenceScore,
  CompatibilityScore,
  AnalysisDepth,
  AnalysisRequest,
  AnalysisResponse,
} from '@/types/ai-primitives'
import { EMOTIONAL_PATTERNS, ATMOSPHERIC_QUALITIES } from './thematic-taxonomy'

export interface EmotionalAnalysisRequest extends AnalysisRequest {
  movieId: string
  plotSummary?: string
  reviewTexts?: string[]
  userMoodContext?: string
  depth: AnalysisDepth
}

export interface EmotionalCompatibilityRequest {
  userEmotionalProfile: EmotionalPreference[]
  currentMood?: string
  desiredEmotionalOutcome?: 'uplifting' | 'cathartic' | 'contemplative' | 'intense' | 'any'
  intensityTolerance?: ConfidenceScore
}

export interface EmotionalRecommendationScore {
  compatibilityScore: CompatibilityScore
  moodAlignment: ConfidenceScore
  intensityMatch: ConfidenceScore
  journeyFit: ConfidenceScore
  catharticPotential: ConfidenceScore
  explanation: string
}

export class EmotionalJourneyMapper {
  private static instance: EmotionalJourneyMapper

  static getInstance(): EmotionalJourneyMapper {
    if (!EmotionalJourneyMapper.instance) {
      EmotionalJourneyMapper.instance = new EmotionalJourneyMapper()
    }
    return EmotionalJourneyMapper.instance
  }

  /**
   * Analyze the emotional journey of a movie
   */
  async analyzeEmotionalJourney(request: EmotionalAnalysisRequest): Promise<EmotionalJourney> {
    try {
      logger.info('Starting emotional journey analysis', {
        movieId: request.movieId,
        depth: request.depth,
      })

      // Use AI to analyze emotional progression
      const aiAnalysis = await this.performAIEmotionalAnalysis(request)

      // Enhance with pattern recognition
      const enhancedAnalysis = this.enhanceWithPatternRecognition(aiAnalysis, request)

      // Add atmospheric analysis
      const finalAnalysis = await this.addAtmosphericAnalysis(enhancedAnalysis, request)

      logger.info('Emotional journey analysis completed', {
        movieId: request.movieId,
        pattern: finalAnalysis.overallPattern,
        intensity: finalAnalysis.intensityScore,
      })

      return finalAnalysis
    } catch (error) {
      logger.error('Emotional journey analysis failed', {
        error: error instanceof Error ? error.message : String(error),
        movieId: request.movieId,
      })

      // Return fallback analysis
      return this.createFallbackEmotionalJourney()
    }
  }

  /**
   * Calculate emotional compatibility between movie and user preferences
   */
  calculateEmotionalCompatibility(
    movieJourney: EmotionalJourney,
    userRequest: EmotionalCompatibilityRequest
  ): EmotionalRecommendationScore {
    try {
      // Calculate individual compatibility metrics
      const moodAlignment = this.calculateMoodAlignment(movieJourney, userRequest)
      const intensityMatch = this.calculateIntensityMatch(movieJourney, userRequest)
      const journeyFit = this.calculateJourneyFit(movieJourney, userRequest)
      const catharticPotential = this.calculateCatharticPotential(movieJourney, userRequest)

      // Weighted overall score
      const compatibilityScore =
        moodAlignment * 0.3 + intensityMatch * 0.25 + journeyFit * 0.25 + catharticPotential * 0.2

      const explanation = this.generateCompatibilityExplanation(movieJourney, userRequest, {
        moodAlignment,
        intensityMatch,
        journeyFit,
        catharticPotential,
      })

      return {
        compatibilityScore,
        moodAlignment,
        intensityMatch,
        journeyFit,
        catharticPotential,
        explanation,
      }
    } catch (error) {
      logger.error('Failed to calculate emotional compatibility', { error })
      return {
        compatibilityScore: 0.5,
        moodAlignment: 0.5,
        intensityMatch: 0.5,
        journeyFit: 0.5,
        catharticPotential: 0.5,
        explanation: 'Unable to analyze emotional compatibility',
      }
    }
  }

  /**
   * Map user's emotional history to movie preferences
   */
  analyzeUserEmotionalPatterns(moodHistory: MoodHistoryEntry[]): EmotionalPreference[] {
    try {
      if (moodHistory.length === 0) {
        return this.getDefaultEmotionalPreferences()
      }

      const patterns: Record<
        string,
        { count: number; satisfaction: number; preferences: Record<string, number> }
      > = {}

      // Analyze patterns in mood history
      moodHistory.forEach(entry => {
        const mood = entry.reportedMood || entry.inferredMood

        if (!patterns[mood]) {
          patterns[mood] = { count: 0, satisfaction: 0, preferences: {} }
        }

        patterns[mood].count++
        patterns[mood].satisfaction += entry.satisfaction

        // Accumulate preferences for this mood
        Object.entries(entry.preferences).forEach(([pref, value]) => {
          if (patterns[mood]) {
            patterns[mood].preferences[pref] = (patterns[mood].preferences[pref] || 0) + value
          }
        })
      })

      // Convert patterns to emotional preferences
      const preferences: EmotionalPreference[] = []

      Object.entries(patterns).forEach(([mood, data]) => {
        const avgSatisfaction = data.satisfaction / data.count
        const frequency = data.count / moodHistory.length

        // For each preference type, calculate the average preference strength
        Object.entries(data.preferences).forEach(([prefType, totalValue]) => {
          const avgPreference = totalValue / data.count

          preferences.push({
            emotionalPattern: prefType,
            preference: avgPreference,
            intensityTolerance: this.calculateIntensityTolerance(moodHistory, mood),
            moodDependency: { [mood]: avgSatisfaction * frequency },
          })
        })
      })

      return this.consolidatePreferences(preferences)
    } catch (error) {
      logger.error('Failed to analyze user emotional patterns', { error })
      return this.getDefaultEmotionalPreferences()
    }
  }

  /**
   * Find movies with similar emotional journeys
   */
  async findEmotionallySimilarMovies(
    referenceJourney: EmotionalJourney,
    candidateJourneys: Array<{ movieId: string; journey: EmotionalJourney }>,
    limit: number = 10
  ): Promise<Array<{ movieId: string; similarity: number; explanation: string }>> {
    try {
      const similarities = candidateJourneys.map(candidate => {
        const similarity = this.calculateEmotionalSimilarity(referenceJourney, candidate.journey)
        return {
          movieId: candidate.movieId,
          similarity,
          explanation: this.generateSimilarityExplanation(
            referenceJourney,
            candidate.journey,
            similarity
          ),
        }
      })

      return similarities.sort((a, b) => b.similarity - a.similarity).slice(0, limit)
    } catch (error) {
      logger.error('Failed to find emotionally similar movies', { error })
      return []
    }
  }

  /**
   * Perform AI-powered emotional analysis
   */
  private async performAIEmotionalAnalysis(
    request: EmotionalAnalysisRequest
  ): Promise<Partial<EmotionalJourney>> {
    const prompt = this.buildEmotionalAnalysisPrompt(request)

    try {
      const response = await anthropic.messages.create({
        model: claudeConfig.model, // Use faster model for emotional analysis
        max_tokens: 2000, // PATCH: analysisDepth not present on request
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      })

      const aiAnalysis =
        response.content?.[0]?.type === 'text' ? (response.content?.[0]?.text ?? '') : ''
      return this.parseEmotionalAnalysis(aiAnalysis)
    } catch (error) {
      logger.warn('AI emotional analysis failed, using pattern recognition', { error })
      return {}
    }
  }

  /**
   * Build emotional analysis prompt
   */
  private buildEmotionalAnalysisPrompt(request: EmotionalAnalysisRequest): string {
    let prompt = `
Analyze the emotional journey and affective storytelling of this movie:

Movie ID: ${request.movieId}
`

    if (request.plotSummary) {
      prompt += `Plot Summary: ${request.plotSummary}
`
    }

    if (request.reviewTexts && request.reviewTexts.length > 0) {
      prompt += `
Review excerpts:
${request.reviewTexts.slice(0, 3).join('\n\n')}
`
    }

    prompt += `
Please analyze the emotional journey with focus on:

1. OVERALL EMOTIONAL PATTERN:
   - What is the primary emotional arc? (gradual ascent, tragic fall, rollercoaster, redemption arc, bittersweet, complex)
   - How does the emotional intensity change throughout the film?
   - What is the emotional trajectory from beginning to end?

2. KEY EMOTIONAL BEATS:
   - Identify 5-7 major emotional turning points
   - For each beat, specify: approximate timestamp (in percentage of film), dominant emotion, intensity level (0-10), and brief description
   - Which moment represents the emotional climax?
   - How is the emotional resolution handled?

3. EMOTIONAL INTENSITY AND RHYTHM:
   - Overall emotional intensity level (0-10)
   - Does the film build tension gradually or have sudden emotional shifts?
   - Are there moments of emotional relief or breathing room?
   - How sustainable is the emotional experience for the viewer?

4. CATHARTIC ELEMENTS:
   - What emotional release does the film provide?
   - Are there moments of catharsis, and how are they achieved?
   - Does the ending provide emotional closure or leave emotions unresolved?

5. MOOD AND ATMOSPHERE:
   - What is the dominant mood throughout the film?
   - How consistent is the emotional tone?
   - What cinematic techniques create the emotional atmosphere?

6. AUDIENCE EMOTIONAL RESPONSE:
   - What emotions is the film designed to evoke?
   - How does it manipulate audience emotions?
   - What is the intended emotional takeaway?

Please provide specific examples and be detailed in your analysis.`

    if (request.userMoodContext) {
      prompt += `

CONTEXT: The user is currently in a ${request.userMoodContext} mood. Consider how this film's emotional journey would align with or complement this emotional state.`
    }

    return prompt
  }

  /**
   * Parse AI emotional analysis response
   */
  private parseEmotionalAnalysis(aiText: string): Partial<EmotionalJourney> {
    try {
      // Extract overall pattern
      const overallPattern = this.extractEmotionalPattern(aiText)

      // Extract emotional beats
      const emotionalBeats = this.extractEmotionalBeats(aiText)

      // Extract intensity score
      const intensityScore = this.extractIntensityScore(aiText)

      // Extract cathartic elements
      const catharticElements = this.extractCatharticElements(aiText)

      // Find climactic moment
      const climacticMoment = this.findClimacticMoment(emotionalBeats, aiText)

      // Find resolution
      const resolution = this.findResolution(emotionalBeats, aiText)

      return {
        overallPattern,
        emotionalBeats,
        climacticMoment,
        resolution,
        intensityScore,
        catharticElements,
      }
    } catch (error) {
      logger.error('Failed to parse emotional analysis', { error })
      return {}
    }
  }

  /**
   * Extract emotional pattern from analysis text
   */
  private extractEmotionalPattern(text: string): EmotionalJourney['overallPattern'] {
    const lowerText = text.toLowerCase()

    if (lowerText.includes('tragic') && lowerText.includes('fall')) return 'tragic_fall'
    if (lowerText.includes('redemption') && lowerText.includes('arc')) return 'redemption_arc'
    if (lowerText.includes('bittersweet')) return 'bittersweet'
    if (lowerText.includes('rollercoaster') || lowerText.includes('volatile'))
      return 'rollercoaster'
    if (lowerText.includes('complex') || lowerText.includes('multiple')) return 'complex'

    return 'gradual_ascent' // default
  }

  /**
   * Extract emotional beats from analysis
   */
  private extractEmotionalBeats(text: string): EmotionalBeat[] {
    const beats: EmotionalBeat[] = []

    // Look for numbered lists or structured emotional moments
    const patterns = [
      /(\d+)[\.\)]\s*([^:]+):\s*([^\.]+)/g, // "1. Opening: Establishes melancholy mood"
      /at\s+(\d+)%[^\w]*([^,]+),\s*intensity\s*(\d+)/gi, // "at 25% feeling hopeful, intensity 7"
    ]

    patterns.forEach(pattern => {
      let match
      while ((match = pattern.exec(text)) !== null) {
        const timestamp = parseInt(match[1] || '0') || 0
        const emotion = match[2]?.trim() || 'unknown'
        const intensity = parseInt(match[3] || '5') / 10 || 0.5
        const description = match[0]

        beats.push({
          timestamp,
          emotion,
          intensity,
          description: description.slice(0, 100),
        })
      }
    })

    // If no structured beats found, create default progression
    if (beats.length === 0) {
      beats.push(
        {
          timestamp: 0,
          emotion: 'opening',
          intensity: 0.4,
          description: 'Opening mood establishment',
        },
        {
          timestamp: 25,
          emotion: 'development',
          intensity: 0.6,
          description: 'Emotional development',
        },
        { timestamp: 75, emotion: 'climax', intensity: 0.9, description: 'Emotional climax' },
        {
          timestamp: 100,
          emotion: 'resolution',
          intensity: 0.5,
          description: 'Emotional resolution',
        }
      )
    }

    return beats.sort((a, b) => a.timestamp - b.timestamp).slice(0, 8)
  }

  /**
   * Extract intensity score from analysis
   */
  private extractIntensityScore(text: string): number {
    const intensityMatches = text.match(/intensity\s*:?\s*(\d+(?:\.\d+)?)/gi)
    if (intensityMatches && intensityMatches.length > 0) {
      const scores = intensityMatches.map(match => {
        const scoreMatch = match.match(/(\d+(?:\.\d+)?)/)
        return scoreMatch ? parseFloat(scoreMatch[1] || '5') : 5
      })

      const avgScore = scores.reduce((sum, score) => sum + score, 0) / scores.length
      return Math.min(avgScore / 10, 1) // Normalize to 0-1
    }

    // Fallback: analyze intensity keywords
    const intensityKeywords = {
      overwhelming: 0.95,
      intense: 0.85,
      powerful: 0.8,
      strong: 0.7,
      moderate: 0.5,
      subtle: 0.3,
      gentle: 0.2,
      minimal: 0.1,
    }

    const lowerText = text.toLowerCase()
    for (const [keyword, score] of Object.entries(intensityKeywords)) {
      if (lowerText.includes(keyword)) {
        return score
      }
    }

    return 0.6 // default moderate intensity
  }

  /**
   * Extract cathartic elements
   */
  private extractCatharticElements(text: string): string[] {
    const elements: string[] = []
    const lowerText = text.toLowerCase()

    const catharticPatterns = [
      'cathartic',
      'emotional release',
      'relief',
      'resolution',
      'closure',
      'catharsis',
      'purification',
      'emotional cleansing',
    ]

    catharticPatterns.forEach(pattern => {
      if (lowerText.includes(pattern)) {
        elements.push(pattern)
      }
    })

    return [...new Set(elements)] // Remove duplicates
  }

  /**
   * Find climactic moment from beats and analysis
   */
  private findClimacticMoment(beats: EmotionalBeat[], text: string): EmotionalBeat {
    // Find the beat with highest intensity
    let climacticBeat = beats.reduce(
      (max, beat) => (beat.intensity > max.intensity ? beat : max),
      beats[0] || {
        timestamp: 75,
        emotion: 'climax',
        intensity: 0.9,
        description: 'Emotional peak',
      }
    )

    // Enhance description based on analysis text
    const climaxKeywords = ['climax', 'peak', 'highest', 'maximum', 'intense moment']
    const climaxSentences = text
      .split('.')
      .filter(sentence => climaxKeywords.some(keyword => sentence.toLowerCase().includes(keyword)))

    if (climaxSentences.length > 0) {
      climacticBeat.description = climaxSentences[0].trim().slice(0, 150)
    }

    return climacticBeat
  }

  /**
   * Find resolution from beats and analysis
   */
  private findResolution(beats: EmotionalBeat[], text: string): EmotionalBeat {
    // Find the last beat or create resolution
    let resolutionBeat = beats[beats.length - 1] || {
      timestamp: 100,
      emotion: 'resolution',
      intensity: 0.5,
      description: 'Story resolution',
    }

    // Enhance with resolution analysis
    const resolutionKeywords = ['resolution', 'ending', 'conclusion', 'final', 'closure']
    const resolutionSentences = text
      .split('.')
      .filter(sentence =>
        resolutionKeywords.some(keyword => sentence.toLowerCase().includes(keyword))
      )

    if (resolutionSentences.length > 0) {
      resolutionBeat.description = resolutionSentences[0].trim().slice(0, 150)
    }

    return resolutionBeat
  }

  /**
   * Enhance analysis with pattern recognition
   */
  private enhanceWithPatternRecognition(
    aiAnalysis: Partial<EmotionalJourney>,
    request: EmotionalAnalysisRequest
  ): Partial<EmotionalJourney> {
    // Apply known emotional patterns
    const pattern = aiAnalysis.overallPattern || 'gradual_ascent'
    const patternTemplate =
      EMOTIONAL_PATTERNS[pattern.toUpperCase() as keyof typeof EMOTIONAL_PATTERNS]

    if (patternTemplate) {
      // Adjust beats based on pattern
      const enhancedBeats = this.adjustBeatsForPattern(aiAnalysis.emotionalBeats || [], pattern)

      return {
        ...aiAnalysis,
        emotionalBeats: enhancedBeats,
        intensityScore: aiAnalysis.intensityScore || 0.6,
      }
    }

    return aiAnalysis
  }

  /**
   * Add atmospheric analysis
   */
  private async addAtmosphericAnalysis(
    journey: Partial<EmotionalJourney>,
    request: EmotionalAnalysisRequest
  ): Promise<EmotionalJourney> {
    // Infer atmospheric qualities from emotional journey
    const atmospheric = this.inferAtmosphericQualities(journey)

    return {
      overallPattern: journey.overallPattern || 'gradual_ascent',
      emotionalBeats: journey.emotionalBeats || [],
      climacticMoment: journey.climacticMoment || {
        timestamp: 75,
        emotion: 'climax',
        intensity: 0.8,
        description: 'Peak emotional moment',
      },
      resolution: journey.resolution || {
        timestamp: 100,
        emotion: 'resolution',
        intensity: 0.5,
        description: 'Story resolution',
      },
      intensityScore: journey.intensityScore || 0.6,
      catharticElements: journey.catharticElements || [],
    }
  }

  // Helper methods for compatibility calculation
  private calculateMoodAlignment(
    journey: EmotionalJourney,
    request: EmotionalCompatibilityRequest
  ): number {
    if (!request.currentMood) return 0.5

    const moodMapping: Record<string, string[]> = {
      happy: ['uplifting', 'joyful', 'optimistic', 'cheerful'],
      sad: ['melancholic', 'somber', 'tragic', 'emotional'],
      excited: ['intense', 'thrilling', 'energetic', 'dynamic'],
      calm: ['peaceful', 'contemplative', 'gentle', 'serene'],
      anxious: ['tense', 'suspenseful', 'uncertain', 'worried'],
    }

    const currentMoodEmotions = moodMapping[request.currentMood?.toLowerCase() ?? ''] || []
    const journeyEmotions = journey.emotionalBeats.map(beat => beat.emotion?.toLowerCase() ?? '')

    const matches = currentMoodEmotions.filter(emotion =>
      journeyEmotions.some(journeyEmotion => journeyEmotion.includes(emotion))
    ).length

    return matches / Math.max(currentMoodEmotions.length, 1)
  }

  private calculateIntensityMatch(
    journey: EmotionalJourney,
    request: EmotionalCompatibilityRequest
  ): number {
    if (!request.intensityTolerance) return 0.7

    const intensityDiff = Math.abs(journey.intensityScore - request.intensityTolerance)
    return Math.max(0, 1 - intensityDiff)
  }

  private calculateJourneyFit(
    journey: EmotionalJourney,
    request: EmotionalCompatibilityRequest
  ): number {
    if (!request.desiredEmotionalOutcome || request.desiredEmotionalOutcome === 'any') {
      return 0.7
    }

    const outcomeMapping: Record<string, string[]> = {
      uplifting: ['gradual_ascent', 'redemption_arc'],
      cathartic: ['redemption_arc', 'tragic_fall'],
      contemplative: ['bittersweet', 'complex'],
      intense: ['rollercoaster', 'tragic_fall'],
    }

    const desiredPatterns = outcomeMapping[request.desiredEmotionalOutcome] || []
    return desiredPatterns.includes(journey.overallPattern) ? 0.9 : 0.3
  }

  private calculateCatharticPotential(
    journey: EmotionalJourney,
    request: EmotionalCompatibilityRequest
  ): number {
    const catharticScore = journey.catharticElements.length / 3 // Normalize by expected number
    const resolutionIntensity = journey.resolution.intensity
    const hasStrongResolution = resolutionIntensity > 0.6

    return Math.min(catharticScore + (hasStrongResolution ? 0.3 : 0), 1)
  }

  private generateCompatibilityExplanation(
    journey: EmotionalJourney,
    request: EmotionalCompatibilityRequest,
    scores: {
      moodAlignment: number
      intensityMatch: number
      journeyFit: number
      catharticPotential: number
    }
  ): string {
    const explanations: string[] = []

    if (scores.moodAlignment > 0.7) {
      explanations.push(`well-aligned with your ${request.currentMood} mood`)
    }

    if (scores.intensityMatch > 0.7) {
      explanations.push(`appropriate emotional intensity level`)
    }

    if (scores.journeyFit > 0.7) {
      explanations.push(`provides the ${request.desiredEmotionalOutcome} experience you're seeking`)
    }

    if (scores.catharticPotential > 0.7) {
      explanations.push(`offers strong emotional resolution`)
    }

    if (explanations.length === 0) {
      return `This film offers a ${journey.overallPattern.replace('_', ' ')} emotional journey with ${journey.intensityScore > 0.7 ? 'high' : 'moderate'} intensity`
    }

    return `This film is ${explanations.join(' and ')}`
  }

  // Additional helper methods
  private adjustBeatsForPattern(beats: EmotionalBeat[], pattern: string): EmotionalBeat[] {
    // Adjust emotional beats based on known patterns
    const patternAdjustments: Record<string, (beats: EmotionalBeat[]) => EmotionalBeat[]> = {
      tragic_fall: beats =>
        beats.map(beat => ({
          ...beat,
          intensity: beat.timestamp > 50 ? Math.max(beat.intensity - 0.3, 0.1) : beat.intensity,
        })),
      gradual_ascent: beats =>
        beats.map(beat => ({
          ...beat,
          intensity: Math.min(beat.intensity + (beat.timestamp / 100) * 0.3, 1),
        })),
      redemption_arc: beats =>
        beats.map(beat => {
          if (beat.timestamp < 30) return { ...beat, intensity: beat.intensity + 0.1 }
          if (beat.timestamp < 70)
            return { ...beat, intensity: Math.max(beat.intensity - 0.2, 0.2) }
          return { ...beat, intensity: beat.intensity + 0.2 }
        }),
    }

    const adjustment = patternAdjustments[pattern]
    return adjustment ? adjustment(beats) : beats
  }

  private inferAtmosphericQualities(journey: Partial<EmotionalJourney>): AtmosphericQuality[] {
    const qualities: AtmosphericQuality[] = []

    if (journey.intensityScore && journey.intensityScore > 0.8) {
      qualities.push({
        mood: 'intense',
        intensity: journey.intensityScore,
        consistency: 0.8,
        techniques: ['high emotional stakes', 'dramatic moments'],
      })
    }

    if (journey.overallPattern === 'bittersweet') {
      qualities.push({
        mood: 'melancholic',
        intensity: 0.6,
        consistency: 0.7,
        techniques: ['emotional complexity', 'mixed emotions'],
      })
    }

    return qualities
  }

  private calculateEmotionalSimilarity(
    journey1: EmotionalJourney,
    journey2: EmotionalJourney
  ): number {
    // Pattern similarity (40% weight)
    const patternSimilarity = journey1.overallPattern === journey2.overallPattern ? 1 : 0.3

    // Intensity similarity (30% weight)
    const intensitySimilarity = 1 - Math.abs(journey1.intensityScore - journey2.intensityScore)

    // Beat progression similarity (30% weight)
    const beatSimilarity = this.calculateBeatSimilarity(
      journey1.emotionalBeats,
      journey2.emotionalBeats
    )

    return patternSimilarity * 0.4 + intensitySimilarity * 0.3 + beatSimilarity * 0.3
  }

  private calculateBeatSimilarity(beats1: EmotionalBeat[], beats2: EmotionalBeat[]): number {
    if (beats1.length === 0 || beats2.length === 0) return 0.3

    // Compare emotional progression
    const progression1 = beats1.map(beat => beat.intensity)
    const progression2 = beats2.map(beat => beat.intensity)

    const minLength = Math.min(progression1.length, progression2.length)
    let similarity = 0

    for (let i = 0; i < minLength; i++) {
      similarity += 1 - Math.abs(progression1[i] - progression2[i])
    }

    return similarity / minLength
  }

  private generateSimilarityExplanation(
    journey1: EmotionalJourney,
    journey2: EmotionalJourney,
    similarity: number
  ): string {
    if (journey1.overallPattern === journey2.overallPattern) {
      return `Similar ${journey1.overallPattern.replace('_', ' ')} emotional pattern`
    }

    const intensityDiff = Math.abs(journey1.intensityScore - journey2.intensityScore)
    if (intensityDiff < 0.2) {
      return `Comparable emotional intensity levels`
    }

    return `Related emotional storytelling approach`
  }

  private calculateIntensityTolerance(moodHistory: MoodHistoryEntry[], mood: string): number {
    const moodEntries = moodHistory.filter(
      entry => entry.reportedMood === mood || entry.inferredMood === mood
    )

    if (moodEntries.length === 0) return 0.6

    // Calculate average intensity preference for this mood
    const avgIntensity =
      moodEntries.reduce((sum, entry) => {
        const intensityPreference = entry.preferences['intensity'] || 0.6
        return sum + intensityPreference
      }, 0) / moodEntries.length

    return avgIntensity
  }

  private consolidatePreferences(preferences: EmotionalPreference[]): EmotionalPreference[] {
    const consolidated: Record<string, EmotionalPreference> = {}

    preferences.forEach(pref => {
      if (consolidated[pref.emotionalPattern]) {
        // Average the preferences
        const existing = consolidated[pref.emotionalPattern]
        existing.preference = (existing.preference + pref.preference) / 2
        existing.intensityTolerance = (existing.intensityTolerance + pref.intensityTolerance) / 2

        // Merge mood dependencies
        Object.entries(pref.moodDependency).forEach(([mood, value]) => {
          existing.moodDependency[mood] = (existing.moodDependency[mood] || 0 + value) / 2
        })
      } else {
        consolidated[pref.emotionalPattern] = { ...pref }
      }
    })

    return Object.values(consolidated)
  }

  private getDefaultEmotionalPreferences(): EmotionalPreference[] {
    return [
      {
        emotionalPattern: 'gradual_ascent',
        preference: 0.7,
        intensityTolerance: 0.6,
        moodDependency: { happy: 0.8, neutral: 0.6 },
      },
      {
        emotionalPattern: 'bittersweet',
        preference: 0.5,
        intensityTolerance: 0.7,
        moodDependency: { contemplative: 0.8, sad: 0.6 },
      },
    ]
  }

  private createFallbackEmotionalJourney(): EmotionalJourney {
    return {
      overallPattern: 'gradual_ascent',
      emotionalBeats: [
        { timestamp: 0, emotion: 'opening', intensity: 0.4, description: 'Opening establishment' },
        { timestamp: 50, emotion: 'development', intensity: 0.6, description: 'Story development' },
        { timestamp: 75, emotion: 'climax', intensity: 0.8, description: 'Climactic moment' },
        { timestamp: 100, emotion: 'resolution', intensity: 0.5, description: 'Resolution' },
      ],
      climacticMoment: {
        timestamp: 75,
        emotion: 'climax',
        intensity: 0.8,
        description: 'Peak moment',
      },
      resolution: {
        timestamp: 100,
        emotion: 'resolution',
        intensity: 0.5,
        description: 'Story conclusion',
      },
      intensityScore: 0.6,
      catharticElements: ['closure'],
    }
  }
}

// Export singleton instance
export const emotionalJourneyMapper = EmotionalJourneyMapper.getInstance()
