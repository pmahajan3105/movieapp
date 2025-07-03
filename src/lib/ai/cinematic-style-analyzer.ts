/**
 * Cinematic Style Analyzer
 * Advanced analysis of visual and directorial styles, cinematography, and auteur signatures
 */

import { anthropic, claudeConfig } from '@/lib/anthropic/config'
import { createClient } from '@supabase/supabase-js'
import { getSupabaseUrl, getSupabaseServiceRoleKey } from '@/lib/env'
import { logger } from '@/lib/logger'
import { getMovieService } from '@/lib/services/movie-service'
import type { Movie } from '@/types'
import type {
  CinematicStyle,
  CameraWork,
  EditingStyle,
  SoundDesign,
  ProductionDesign,
  ColorPalette,
  VisualMotif,
  StyleMatch,
  AdvancedRecommendation,
} from '@/types/advanced-intelligence'
import { DIRECTORIAL_STYLES, VISUAL_MOTIFS } from './thematic-taxonomy'

export interface StyleAnalysisRequest {
  movieId: string
  focusAreas?: (
    | 'cinematography'
    | 'editing'
    | 'sound'
    | 'production_design'
    | 'color'
    | 'direction'
  )[]
  analysisDepth: 'basic' | 'detailed' | 'comprehensive' | 'expert'
  compareToDirector?: string
  referenceMovies?: string[]
}

export interface StyleAnalysisResponse {
  cinematicStyle: CinematicStyle
  styleMetadata: StyleAnalysisMetadata
  directoralSignature?: DirectorialSignature
  styleInfluences?: StyleInfluence[]
  innovations?: FilmTechniqueInnovation[]
}

export interface StyleAnalysisMetadata {
  analysisDate: string
  focusAreas: string[]
  confidence: number
  processingTime: number
  dataSource: string[]
  modelVersion: string
}

export interface DirectorialSignature {
  directorName: string
  signatureElements: string[]
  consistencyScore: number // 0-1, how consistent with director's style
  evolutionPhase: 'early' | 'mature' | 'late' | 'experimental'
  uniqueContributions: string[]
}

export interface StyleInfluence {
  influenceType: 'director' | 'movement' | 'genre' | 'period'
  influenceName: string
  influenceStrength: number // 0-1
  specificElements: string[]
  evidence: string[]
}

export interface FilmTechniqueInnovation {
  technique: string
  innovationType: 'pioneering' | 'refinement' | 'subversion' | 'synthesis'
  impact: 'revolutionary' | 'significant' | 'moderate' | 'subtle'
  description: string
  historicalContext: string
}

export interface StyleSimilarityAnalysis {
  movies: Array<{
    movieId: string
    movie: Movie
    similarity: number
    sharedElements: string[]
    distinctElements: string[]
    explanation: string
  }>
  styleCluster: string // e.g., 'neo_noir', 'french_new_wave', 'contemporary_minimalist'
  evolutionaryContext: string
}

export class CinematicStyleAnalyzer {
  private supabase = createClient(getSupabaseUrl()!, getSupabaseServiceRoleKey()!)
  private static instance: CinematicStyleAnalyzer

  static getInstance(): CinematicStyleAnalyzer {
    if (!CinematicStyleAnalyzer.instance) {
      CinematicStyleAnalyzer.instance = new CinematicStyleAnalyzer()
    }
    return CinematicStyleAnalyzer.instance
  }

  /**
   * Analyze cinematic style of a movie
   */
  async analyzeStyle(request: StyleAnalysisRequest): Promise<StyleAnalysisResponse> {
    const startTime = Date.now()

    try {
      logger.info('Starting cinematic style analysis', {
        movieId: request.movieId,
        depth: request.analysisDepth,
        focusAreas: request.focusAreas,
      })

      // Check for existing analysis
      const existingAnalysis = await this.getExistingStyleAnalysis(request.movieId)
      if (existingAnalysis && this.shouldUseCache(request, existingAnalysis)) {
        logger.info('Returning cached style analysis', { movieId: request.movieId })
        return existingAnalysis
      }

      // Get movie data
      const movie = await this.getMovieData(request.movieId)
      if (!movie) {
        throw new Error('Movie not found')
      }

      // Perform comprehensive style analysis
      const cinematicStyle = await this.performStyleAnalysis(movie, request)

      // Analyze directorial signature if director available
      const directoralSignature =
        movie.director && movie.director.length > 0
          ? await this.analyzeDirectorialSignature(movie, cinematicStyle, request)
          : undefined

      // Identify style influences
      const styleInfluences = await this.identifyStyleInfluences(movie, cinematicStyle, request)

      // Detect innovations
      const innovations = await this.detectInnovations(movie, cinematicStyle, request)

      // Store analysis results
      await this.storeStyleAnalysis(request.movieId, cinematicStyle, directoralSignature)

      const metadata: StyleAnalysisMetadata = {
        analysisDate: new Date().toISOString(),
        focusAreas: request.focusAreas || [
          'cinematography',
          'editing',
          'sound',
          'production_design',
        ],
        confidence: this.calculateStyleConfidence(cinematicStyle, directoralSignature),
        processingTime: Date.now() - startTime,
        dataSource: ['ai_analysis', 'film_studies', 'directorial_comparison'],
        modelVersion: claudeConfig.model,
      }

      logger.info('Cinematic style analysis completed', {
        movieId: request.movieId,
        confidence: metadata.confidence,
        processingTime: metadata.processingTime,
      })

      return {
        cinematicStyle,
        styleMetadata: metadata,
        directoralSignature,
        styleInfluences,
        innovations,
      }
    } catch (error) {
      logger.error('Cinematic style analysis failed', {
        error: error instanceof Error ? error.message : String(error),
        movieId: request.movieId,
      })
      throw error
    }
  }

  /**
   * Find movies with similar cinematic styles
   */
  async findSimilarStyles(
    movieId: string,
    styleAspects: ('camera' | 'editing' | 'color' | 'composition')[] = [
      'camera',
      'editing',
      'color',
    ],
    limit: number = 10
  ): Promise<StyleSimilarityAnalysis> {
    try {
      const sourceStyle = await this.getExistingStyleAnalysis(movieId)
      if (!sourceStyle) {
        throw new Error('Source movie style analysis not found')
      }

      // Get all analyzed movies
      const { data: allStyles, error } = await this.supabase
        .from('movie_cinematic_styles')
        .select('*')
        .neq('movie_id', movieId)

      if (error) throw error

      const similarities: Array<{
        movieId: string
        movie: Movie
        similarity: number
        sharedElements: string[]
        distinctElements: string[]
        explanation: string
      }> = []

      // Calculate style similarities
      for (const styleData of allStyles || []) {
        const targetStyle = this.parseStoredStyle(styleData)
        const similarity = this.calculateStyleSimilarity(
          sourceStyle.cinematicStyle,
          targetStyle,
          styleAspects
        )

        if (similarity.score >= 0.3) {
          const movie = await this.getMovieData(styleData.movie_id)
          if (movie) {
            similarities.push({
              movieId: styleData.movie_id,
              movie,
              similarity: similarity.score,
              sharedElements: similarity.sharedElements,
              distinctElements: similarity.distinctElements,
              explanation: similarity.explanation,
            })
          }
        }
      }

      // Sort by similarity and take top results
      similarities.sort((a, b) => b.similarity - a.similarity)
      const topSimilar = similarities.slice(0, limit)

      // Determine style cluster
      const styleCluster = this.identifyStyleCluster(sourceStyle.cinematicStyle, topSimilar)

      // Provide evolutionary context
      const evolutionaryContext = this.analyzeEvolutionaryContext(
        sourceStyle.cinematicStyle,
        topSimilar
      )

      return {
        movies: topSimilar,
        styleCluster,
        evolutionaryContext,
      }
    } catch (error) {
      logger.error('Failed to find similar styles', {
        error: error instanceof Error ? error.message : String(error),
        movieId,
      })
      return {
        movies: [],
        styleCluster: 'unknown',
        evolutionaryContext: 'Unable to determine evolutionary context',
      }
    }
  }

  /**
   * Compare directorial styles between two directors
   */
  async compareDirectorialStyles(
    director1: string,
    director2: string,
    focusAspects: string[] = ['camera', 'editing', 'themes']
  ): Promise<DirectorialComparisonResult> {
    try {
      // Get movies by each director
      const movies1 = await this.getMoviesByDirector(director1)
      const movies2 = await this.getMoviesByDirector(director2)

      if (movies1.length === 0 || movies2.length === 0) {
        throw new Error('Insufficient movies found for comparison')
      }

      // Analyze directorial signatures
      const signature1 = await this.aggregateDirectorialSignature(movies1, director1)
      const signature2 = await this.aggregateDirectorialSignature(movies2, director2)

      // Compare signatures
      const comparison = this.compareSignatures(signature1, signature2, focusAspects)

      return {
        director1: { name: director1, signature: signature1, movies: movies1 },
        director2: { name: director2, signature: signature2, movies: movies2 },
        comparison,
        evolutionaryAnalysis: this.analyzeDirectorialEvolution(signature1, signature2),
      }
    } catch (error) {
      logger.error('Failed to compare directorial styles', { error, director1, director2 })
      throw error
    }
  }

  // Private helper methods

  private async getMoviesByDirector(directorName: string): Promise<Movie[]> {
    // TODO: Implement real search
    return []
  }

  private async aggregateDirectorialSignature(
    movies: Movie[],
    directorName: string
  ): Promise<DirectorialSignature> {
    // Basic implementation - this would need more sophisticated analysis
    return {
      directorName,
      signatureElements: ['Visual style', 'Narrative approach', 'Thematic consistency'],
      consistencyScore: 0.8,
      evolutionPhase: 'mature',
      uniqueContributions: ['Distinctive visual language'],
    }
  }

  private compareSignatures(
    signature1: DirectorialSignature,
    signature2: DirectorialSignature,
    focusAspects: string[]
  ): DirectorialComparison {
    return {
      similarities: ['Strong visual composition'],
      differences: ['Different narrative pacing'],
      influenceDirection: 'none',
      overallSimilarity: 0.6,
      focusAspects: focusAspects.reduce((acc, aspect) => ({ ...acc, [aspect]: 0.5 }), {}),
    }
  }

  private analyzeDirectorialEvolution(
    signature1: DirectorialSignature,
    signature2: DirectorialSignature
  ): string {
    return `Comparative analysis of ${signature1.directorName} and ${signature2.directorName} reveals distinct evolutionary paths in their cinematic approaches.`
  }

  private async performStyleAnalysis(
    movie: Movie,
    request: StyleAnalysisRequest
  ): Promise<CinematicStyle> {
    const prompt = this.buildStyleAnalysisPrompt(movie, request)

    try {
      const response = await anthropic.messages.create({
        model: claudeConfig.model,
        max_tokens:
          request.analysisDepth === 'expert'
            ? 4000
            : request.analysisDepth === 'comprehensive'
              ? 3000
              : 2000,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      })

      const aiAnalysis =
        response.content?.[0]?.type === 'text' ? (response.content?.[0]?.text ?? '') : ''
      return this.parseStyleAnalysis(aiAnalysis, movie)
    } catch (error) {
      logger.warn('AI style analysis failed, using structured approach', { error })
      return this.structuredStyleAnalysis(movie, request)
    }
  }

  private buildStyleAnalysisPrompt(movie: Movie, request: StyleAnalysisRequest): string {
    let prompt = `
Analyze the cinematic style of "${movie.title}" (${movie.year}) by ${movie.director?.join(', ')}.

Movie Details:
- Title: ${movie.title}
- Year: ${movie.year}
- Director: ${movie.director?.join(', ') || 'Unknown'}
- Genre: ${movie.genre?.join(', ') || 'Unknown'}
- Plot: ${movie.plot || 'Not available'}

Provide comprehensive cinematic style analysis covering:

1. CINEMATOGRAPHY:
   - Camera movement style (static, dynamic, fluid, kinetic, contemplative)
   - Frame composition (symmetrical, asymmetrical, classical, experimental)
   - Depth of field usage (shallow, deep, variable)
   - Signature camera techniques
   - Visual storytelling approach

2. EDITING STYLE:
   - Pacing (slow, measured, standard, quick, frantic)
   - Transition types and frequency
   - Rhythm (musical, dramatic, naturalistic, experimental)
   - Continuity approach (classical, jump cuts, montage, non-linear)

3. SOUND DESIGN:
   - Music style and integration
   - Soundscape type (realistic, atmospheric, stylized, minimalist)
   - Dialogue style (naturalistic, heightened, poetic, sparse)
   - Use of silence (effectiveness rating 0-1)

4. PRODUCTION DESIGN:
   - Visual style characteristics
   - Color palette analysis (dominant colors, symbolic usage, temperature, saturation)
   - Set design approach (realistic, stylized, minimalist, elaborate)
   - Costume significance to narrative

5. VISUAL MOTIFS:
   - Recurring visual elements
   - Symbolic imagery
   - Compositional patterns
   - Lighting patterns and significance
`

    if (request.focusAreas?.includes('direction')) {
      prompt += `

6. DIRECTORIAL SIGNATURE:
   - Unique directorial elements
   - Auteur theory connections
   - Technical innovations
   - Thematic consistency
   - Evolution within director's body of work`
    }

    if (request.compareToDirector) {
      prompt += `

7. DIRECTORIAL COMPARISON:
   - Compare to ${request.compareToDirector}'s typical style
   - Similarities and differences
   - Influence assessment
   - Unique contributions`
    }

    prompt += `

Provide specific examples and technical details. Focus on what makes this film's style distinctive and how it serves the narrative.`

    return prompt
  }

  private parseStyleAnalysis(aiText: string, movie: Movie): CinematicStyle {
    // Extract different components from AI analysis
    const cameraWork = this.extractCameraWork(aiText)
    const editingStyle = this.extractEditingStyle(aiText)
    const soundDesign = this.extractSoundDesign(aiText)
    const productionDesign = this.extractProductionDesign(aiText)
    const visualCharacteristics = this.extractVisualCharacteristics(aiText)
    const directorialSignature = this.extractDirectorialSignature(
      aiText,
      movie.director || undefined
    )

    return {
      directorialSignature,
      visualCharacteristics,
      cameraWork,
      editingStyle,
      soundDesign,
      productionDesign,
    }
  }

  private extractCameraWork(text: string): CameraWork {
    const lowerText = text.toLowerCase()

    // Determine movement style
    let movementStyle: CameraWork['movementStyle'] = 'dynamic'
    if (lowerText.includes('static') || lowerText.includes('fixed')) movementStyle = 'static'
    else if (lowerText.includes('fluid') || lowerText.includes('smooth')) movementStyle = 'fluid'
    else if (lowerText.includes('kinetic') || lowerText.includes('energetic'))
      movementStyle = 'kinetic'
    else if (lowerText.includes('contemplative') || lowerText.includes('meditative'))
      movementStyle = 'contemplative'

    // Determine frame composition
    let frameComposition: CameraWork['frameComposition'] = 'classical'
    if (lowerText.includes('symmetrical') || lowerText.includes('balanced'))
      frameComposition = 'symmetrical'
    else if (lowerText.includes('asymmetrical') || lowerText.includes('unbalanced'))
      frameComposition = 'asymmetrical'
    else if (lowerText.includes('experimental') || lowerText.includes('unconventional'))
      frameComposition = 'experimental'

    // Determine depth of field
    let depthOfField: CameraWork['depthOfField'] = 'variable'
    if (lowerText.includes('shallow focus') || lowerText.includes('shallow depth'))
      depthOfField = 'shallow'
    else if (lowerText.includes('deep focus') || lowerText.includes('deep depth'))
      depthOfField = 'deep'

    // Extract signature techniques
    const techniqueKeywords = [
      'long take',
      'tracking shot',
      'crane shot',
      'handheld',
      'steadicam',
      'close-up',
      'wide shot',
      'dutch angle',
      'low angle',
      'high angle',
      'zoom',
      'dolly',
      'pan',
      'tilt',
      'rack focus',
    ]

    const signature = techniqueKeywords.filter(technique =>
      lowerText.includes(technique.toLowerCase())
    )

    return {
      movementStyle,
      frameComposition,
      depthOfField,
      signature,
    }
  }

  private extractEditingStyle(text: string): EditingStyle {
    const lowerText = text.toLowerCase()

    // Determine pacing
    let pacing: EditingStyle['pacing'] = 'standard'
    if (lowerText.includes('slow paced') || lowerText.includes('deliberate')) pacing = 'slow'
    else if (lowerText.includes('measured') || lowerText.includes('steady')) pacing = 'measured'
    else if (lowerText.includes('quick') || lowerText.includes('fast')) pacing = 'quick'
    else if (lowerText.includes('frantic') || lowerText.includes('rapid')) pacing = 'frantic'

    // Extract transitions
    const transitionTypes = [
      'cut',
      'fade',
      'dissolve',
      'wipe',
      'match cut',
      'jump cut',
      'cross cut',
    ]
    const transitions = transitionTypes.filter(transition => lowerText.includes(transition))

    // Determine rhythm
    let rhythm: EditingStyle['rhythm'] = 'dramatic'
    if (lowerText.includes('musical') || lowerText.includes('rhythmic')) rhythm = 'musical'
    else if (lowerText.includes('naturalistic') || lowerText.includes('realistic'))
      rhythm = 'naturalistic'
    else if (lowerText.includes('experimental') || lowerText.includes('abstract'))
      rhythm = 'experimental'

    // Determine continuity
    let continuity: EditingStyle['continuity'] = 'classical'
    if (lowerText.includes('jump cut') || lowerText.includes('discontinuous'))
      continuity = 'jump_cuts'
    else if (lowerText.includes('montage') || lowerText.includes('montage sequence'))
      continuity = 'montage'
    else if (lowerText.includes('non-linear') || lowerText.includes('non linear'))
      continuity = 'non_linear'

    return {
      pacing,
      transitions: transitions.length > 0 ? transitions : ['cut', 'fade'],
      rhythm,
      continuity,
    }
  }

  private extractSoundDesign(text: string): SoundDesign {
    const lowerText = text.toLowerCase()

    // Extract music styles
    const musicKeywords = [
      'orchestral',
      'electronic',
      'ambient',
      'jazz',
      'classical',
      'minimalist',
      'synthesizer',
      'acoustic',
      'experimental',
      'pop',
      'rock',
    ]
    const musicStyle = musicKeywords.filter(style => lowerText.includes(style))

    // Determine soundscape type
    let soundscapeType: SoundDesign['soundscapeType'] = 'realistic'
    if (lowerText.includes('atmospheric') || lowerText.includes('immersive'))
      soundscapeType = 'atmospheric'
    else if (lowerText.includes('stylized') || lowerText.includes('artificial'))
      soundscapeType = 'stylized'
    else if (lowerText.includes('minimalist') || lowerText.includes('sparse'))
      soundscapeType = 'minimalist'

    // Determine dialogue style
    let dialogueStyle: SoundDesign['dialogueStyle'] = 'naturalistic'
    if (lowerText.includes('heightened') || lowerText.includes('theatrical'))
      dialogueStyle = 'heightened'
    else if (lowerText.includes('poetic') || lowerText.includes('lyrical')) dialogueStyle = 'poetic'
    else if (lowerText.includes('sparse') || lowerText.includes('minimal dialogue'))
      dialogueStyle = 'sparse'

    // Calculate silence usage
    let silenceUsage = 0.3 // default
    if (lowerText.includes('effective use of silence') || lowerText.includes('strategic silence'))
      silenceUsage = 0.8
    else if (lowerText.includes('minimal silence') || lowerText.includes('constant sound'))
      silenceUsage = 0.1
    else if (lowerText.includes('occasional silence')) silenceUsage = 0.5

    return {
      musicStyle,
      soundscapeType,
      dialogueStyle,
      silenceUsage,
    }
  }

  private extractProductionDesign(text: string): ProductionDesign {
    const lowerText = text.toLowerCase()

    // Extract visual style elements
    const styleKeywords = [
      'art deco',
      'minimalist',
      'baroque',
      'industrial',
      'futuristic',
      'period accurate',
      'stylized',
      'realistic',
      'surreal',
    ]
    const visualStyle = styleKeywords.filter(style => lowerText.includes(style))

    // Extract color palette
    const colorPalette = this.extractColorPalette(text)

    // Determine set design
    let setDesign: ProductionDesign['setDesign'] = 'realistic'
    if (lowerText.includes('stylized') || lowerText.includes('artificial')) setDesign = 'stylized'
    else if (lowerText.includes('minimalist') || lowerText.includes('sparse'))
      setDesign = 'minimalist'
    else if (lowerText.includes('elaborate') || lowerText.includes('detailed'))
      setDesign = 'elaborate'

    // Calculate costume significance
    let costumeSignificance = 0.5 // default
    if (
      lowerText.includes('costume design') ||
      lowerText.includes('wardrobe') ||
      lowerText.includes('clothing')
    ) {
      if (lowerText.includes('symbolic') || lowerText.includes('significant'))
        costumeSignificance = 0.9
      else if (lowerText.includes('functional') || lowerText.includes('basic'))
        costumeSignificance = 0.3
      else costumeSignificance = 0.6
    }

    return {
      visualStyle,
      colorPalette,
      setDesign,
      costumeSignificance,
    }
  }

  private extractColorPalette(text: string): ColorPalette {
    const lowerText = text.toLowerCase()

    // Extract dominant colors
    const colorKeywords = [
      'red',
      'blue',
      'green',
      'yellow',
      'orange',
      'purple',
      'black',
      'white',
      'gray',
      'brown',
    ]
    const dominant = colorKeywords.filter(color => lowerText.includes(color))

    // Extract symbolic meanings
    const symbolic: Record<string, string> = {}
    if (
      lowerText.includes('red') &&
      (lowerText.includes('passion') || lowerText.includes('danger'))
    ) {
      symbolic.red = 'passion/danger'
    }
    if (
      lowerText.includes('blue') &&
      (lowerText.includes('melancholy') || lowerText.includes('cold'))
    ) {
      symbolic.blue = 'melancholy/isolation'
    }
    if (
      lowerText.includes('green') &&
      (lowerText.includes('nature') || lowerText.includes('growth'))
    ) {
      symbolic.green = 'nature/growth'
    }

    // Determine temperature
    let temperature: ColorPalette['temperature'] = 'neutral'
    if (lowerText.includes('warm colors') || lowerText.includes('warm palette'))
      temperature = 'warm'
    else if (lowerText.includes('cool colors') || lowerText.includes('cool palette'))
      temperature = 'cool'
    else if (lowerText.includes('contrasting') || lowerText.includes('opposing'))
      temperature = 'contrasting'

    // Determine saturation
    let saturation: ColorPalette['saturation'] = 'natural'
    if (lowerText.includes('muted') || lowerText.includes('desaturated')) saturation = 'muted'
    else if (lowerText.includes('saturated') || lowerText.includes('vibrant'))
      saturation = 'saturated'
    else if (lowerText.includes('high contrast') || lowerText.includes('stark'))
      saturation = 'high_contrast'

    return {
      dominant,
      symbolic,
      temperature,
      saturation,
    }
  }

  private extractVisualCharacteristics(text: string): string[] {
    const characteristics: string[] = []
    const lowerText = text.toLowerCase()

    const visualKeywords = [
      'symmetrical composition',
      'asymmetrical framing',
      'rule of thirds',
      'leading lines',
      'depth of field',
      'bokeh',
      'chiaroscuro',
      'high contrast',
      'low contrast',
      'natural lighting',
      'artificial lighting',
      'golden hour',
      'blue hour',
      'harsh shadows',
      'soft shadows',
    ]

    visualKeywords.forEach(keyword => {
      if (lowerText.includes(keyword)) {
        characteristics.push(keyword)
      }
    })

    return characteristics
  }

  private extractDirectorialSignature(text: string, directors?: string[]): string | undefined {
    if (!directors || directors.length === 0) return undefined

    const director = directors[0]?.toLowerCase()
    if (!director) return undefined

    const lowerText = text.toLowerCase()

    // Check for known directorial styles
    const signatures = Object.entries(DIRECTORIAL_STYLES)
    for (const [key, style] of signatures) {
      if (
        style.name.toLowerCase().includes(director) ||
        lowerText.includes(style.name.toLowerCase())
      ) {
        return key
      }
    }

    // Check if director name is mentioned with style descriptors
    if (
      lowerText.includes(director) &&
      (lowerText.includes('style') ||
        lowerText.includes('signature') ||
        lowerText.includes('trademark'))
    ) {
      return `${director}_style`
    }

    return undefined
  }

  private structuredStyleAnalysis(movie: Movie, request: StyleAnalysisRequest): CinematicStyle {
    // Fallback structured analysis based on genre and year
    const genre = movie.genre?.[0]?.toLowerCase() || 'drama'
    const year = movie.year || 2000

    // Genre-based style defaults
    const genreDefaults = this.getGenreStyleDefaults(genre)

    // Era-based style defaults
    const eraDefaults = this.getEraStyleDefaults(year)

    // Merge defaults
    return this.mergeStyleDefaults(genreDefaults, eraDefaults)
  }

  private getGenreStyleDefaults(genre: string): Partial<CinematicStyle> {
    const defaults: Record<string, Partial<CinematicStyle>> = {
      action: {
        cameraWork: {
          movementStyle: 'kinetic',
          frameComposition: 'asymmetrical',
          depthOfField: 'variable',
          signature: ['handheld', 'quick cuts', 'close-ups'],
        },
        editingStyle: {
          pacing: 'quick',
          transitions: ['cut', 'match cut'],
          rhythm: 'dramatic',
          continuity: 'classical',
        },
      },
      drama: {
        cameraWork: {
          movementStyle: 'contemplative',
          frameComposition: 'classical',
          depthOfField: 'deep',
          signature: ['medium shots', 'tracking shots'],
        },
        editingStyle: {
          pacing: 'measured',
          transitions: ['cut', 'fade'],
          rhythm: 'naturalistic',
          continuity: 'classical',
        },
      },
      horror: {
        cameraWork: {
          movementStyle: 'dynamic',
          frameComposition: 'asymmetrical',
          depthOfField: 'shallow',
          signature: ['low angle', 'dutch angle', 'handheld'],
        },
        productionDesign: {
          visualStyle: ['dark', 'atmospheric'],
          colorPalette: {
            dominant: ['black', 'red'],
            symbolic: { red: 'danger/blood', black: 'fear/unknown' },
            temperature: 'cool',
            saturation: 'high_contrast',
          },
          setDesign: 'stylized',
          costumeSignificance: 0.6,
        },
      },
    }

    return defaults[genre] || defaults['drama']!
  }

  private getEraStyleDefaults(year: number): Partial<CinematicStyle> {
    if (year < 1960) {
      return {
        cameraWork: {
          movementStyle: 'static',
          frameComposition: 'classical',
          depthOfField: 'deep',
          signature: ['wide shots', 'master shots'],
        },
        editingStyle: {
          pacing: 'slow',
          transitions: ['cut', 'fade'],
          rhythm: 'dramatic',
          continuity: 'classical',
        },
      }
    } else if (year < 1980) {
      return {
        cameraWork: {
          movementStyle: 'dynamic',
          frameComposition: 'classical',
          depthOfField: 'variable',
          signature: ['zoom', 'tracking shots'],
        },
      }
    } else if (year < 2000) {
      return {
        cameraWork: {
          movementStyle: 'fluid',
          frameComposition: 'asymmetrical',
          depthOfField: 'variable',
          signature: ['steadicam', 'crane shots'],
        },
      }
    } else {
      return {
        cameraWork: {
          movementStyle: 'kinetic',
          frameComposition: 'experimental',
          depthOfField: 'shallow',
          signature: ['handheld', 'digital effects'],
        },
        editingStyle: {
          pacing: 'quick',
          transitions: ['cut', 'jump cut'],
          rhythm: 'experimental',
          continuity: 'montage',
        },
      }
    }
  }

  private mergeStyleDefaults(
    genreDefaults: Partial<CinematicStyle>,
    eraDefaults: Partial<CinematicStyle>
  ): CinematicStyle {
    return {
      visualCharacteristics: [],
      cameraWork: {
        movementStyle:
          genreDefaults.cameraWork?.movementStyle ||
          eraDefaults.cameraWork?.movementStyle ||
          'dynamic',
        frameComposition:
          genreDefaults.cameraWork?.frameComposition ||
          eraDefaults.cameraWork?.frameComposition ||
          'classical',
        depthOfField:
          genreDefaults.cameraWork?.depthOfField ||
          eraDefaults.cameraWork?.depthOfField ||
          'variable',
        signature: [
          ...(genreDefaults.cameraWork?.signature || []),
          ...(eraDefaults.cameraWork?.signature || []),
        ],
      },
      editingStyle: {
        pacing:
          genreDefaults.editingStyle?.pacing || eraDefaults.editingStyle?.pacing || 'standard',
        transitions: [
          ...(genreDefaults.editingStyle?.transitions || []),
          ...(eraDefaults.editingStyle?.transitions || ['cut', 'fade']),
        ],
        rhythm:
          genreDefaults.editingStyle?.rhythm || eraDefaults.editingStyle?.rhythm || 'dramatic',
        continuity:
          genreDefaults.editingStyle?.continuity ||
          eraDefaults.editingStyle?.continuity ||
          'classical',
      },
      soundDesign: {
        musicStyle: [],
        soundscapeType: 'realistic',
        dialogueStyle: 'naturalistic',
        silenceUsage: 0.3,
      },
      productionDesign: {
        visualStyle: genreDefaults.productionDesign?.visualStyle || [],
        colorPalette: genreDefaults.productionDesign?.colorPalette || {
          dominant: [],
          symbolic: {},
          temperature: 'neutral',
          saturation: 'natural',
        },
        setDesign: genreDefaults.productionDesign?.setDesign || 'realistic',
        costumeSignificance: genreDefaults.productionDesign?.costumeSignificance || 0.5,
      },
    }
  }

  // Additional methods for style analysis would continue here...
  // Including: analyzeDirectorialSignature, identifyStyleInfluences, detectInnovations,
  // calculateStyleSimilarity, getExistingStyleAnalysis, storeStyleAnalysis, etc.

  private async getExistingStyleAnalysis(movieId: string): Promise<StyleAnalysisResponse | null> {
    try {
      const { data, error } = await this.supabase
        .from('movie_cinematic_styles')
        .select('*')
        .eq('movie_id', movieId)
        .single()

      if (error && error.code !== 'PGRST116') {
        logger.error('Error fetching existing style analysis', { error })
        return null
      }

      if (!data) return null

      // Parse stored analysis into response format
      const cinematicStyle = this.parseStoredStyle(data)
      return {
        cinematicStyle,
        styleMetadata: {
          analysisDate: data.created_at || new Date().toISOString(),
          focusAreas: data.focus_areas || ['cinematography', 'editing'],
          confidence: data.confidence || 0.7,
          processingTime: 0,
          dataSource: ['cache'],
          modelVersion: 'cached',
        },
        directoralSignature: data.directoral_signature,
        styleInfluences: data.style_influences || [],
        innovations: data.innovations || [],
      }
    } catch (error) {
      logger.error('Failed to retrieve existing style analysis', { error, movieId })
      return null
    }
  }

  private shouldUseCache(request: StyleAnalysisRequest, existing: StyleAnalysisResponse): boolean {
    // Check if cache is recent (within 7 days)
    const cacheAge = Date.now() - new Date(existing.styleMetadata.analysisDate).getTime()
    const maxCacheAge = 7 * 24 * 60 * 60 * 1000 // 7 days in milliseconds

    if (cacheAge > maxCacheAge) return false

    // Check if analysis depth is sufficient
    const cachedDepth = existing.styleMetadata.dataSource.includes('ai_analysis')
      ? 'detailed'
      : 'basic'
    const requestDepth = request.analysisDepth

    if (requestDepth === 'expert') return false // Expert always requires fresh analysis
    if (requestDepth === 'comprehensive' && ['basic'].includes(cachedDepth)) return false

    // Check if focus areas match
    if (request.focusAreas && request.focusAreas.length > 0) {
      const cachedAreas = existing.styleMetadata.focusAreas
      const hasRequiredAreas = request.focusAreas.every(area => cachedAreas.includes(area))
      if (!hasRequiredAreas) return false
    }

    return true
  }

  private async getMovieData(movieId: string): Promise<Movie | null> {
    // Implementation for retrieving movie data
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

  private calculateStyleConfidence(
    style: CinematicStyle,
    signature?: DirectorialSignature
  ): number {
    let confidence = 0.6 // Base confidence

    // Add confidence based on available data
    if (style.cameraWork.signature.length > 0) confidence += 0.1
    if (style.editingStyle.transitions.length > 0) confidence += 0.1
    if (style.visualCharacteristics.length > 0) confidence += 0.1
    if (signature) confidence += 0.1

    return Math.min(confidence, 1.0)
  }

  // Placeholder for additional private methods
  private async analyzeDirectorialSignature(
    movie: Movie,
    style: CinematicStyle,
    request: StyleAnalysisRequest
  ): Promise<DirectorialSignature | undefined> {
    // Implementation placeholder
    return undefined
  }

  private async identifyStyleInfluences(
    movie: Movie,
    style: CinematicStyle,
    request: StyleAnalysisRequest
  ): Promise<StyleInfluence[]> {
    // Implementation placeholder
    return []
  }

  private async detectInnovations(
    movie: Movie,
    style: CinematicStyle,
    request: StyleAnalysisRequest
  ): Promise<FilmTechniqueInnovation[]> {
    // Implementation placeholder
    return []
  }

  private async storeStyleAnalysis(
    movieId: string,
    style: CinematicStyle,
    signature?: DirectorialSignature
  ): Promise<void> {
    try {
      const { error } = await this.supabase.from('movie_cinematic_styles').upsert({
        movie_id: movieId,
        visual_characteristics: style.visualCharacteristics,
        camera_work: style.cameraWork,
        editing_style: style.editingStyle,
        sound_design: style.soundDesign,
        production_design: style.productionDesign,
        directoral_signature: signature,
        confidence: this.calculateStyleConfidence(style, signature),
        created_at: new Date().toISOString(),
      })

      if (error) {
        logger.error('Failed to store style analysis', { error, movieId })
      } else {
        logger.debug('Style analysis stored successfully', { movieId })
      }
    } catch (error) {
      logger.error('Error storing style analysis', { error, movieId })
    }
  }

  private parseStoredStyle(data: any): CinematicStyle {
    return {
      visualCharacteristics: data.visual_characteristics || [],
      cameraWork: data.camera_work || {
        movementStyle: 'dynamic',
        frameComposition: 'classical',
        depthOfField: 'variable',
        signature: [],
      },
      editingStyle: data.editing_style || {
        pacing: 'standard',
        transitions: ['cut', 'fade'],
        rhythm: 'dramatic',
        continuity: 'classical',
      },
      soundDesign: data.sound_design || {
        musicStyle: [],
        soundscapeType: 'realistic',
        dialogueStyle: 'naturalistic',
        silenceUsage: 0.3,
      },
      productionDesign: data.production_design || {
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

  private calculateStyleSimilarity(
    style1: CinematicStyle,
    style2: CinematicStyle,
    aspects: string[]
  ): { score: number; sharedElements: string[]; distinctElements: string[]; explanation: string } {
    let totalScore = 0
    let scoreCount = 0
    const sharedElements: string[] = []
    const distinctElements: string[] = []

    // Camera work similarity
    if (aspects.includes('camera')) {
      if (style1.cameraWork.movementStyle === style2.cameraWork.movementStyle) {
        totalScore += 1
        sharedElements.push(`${style1.cameraWork.movementStyle} camera movement`)
      } else {
        distinctElements.push(
          `Different camera movement: ${style1.cameraWork.movementStyle} vs ${style2.cameraWork.movementStyle}`
        )
      }

      if (style1.cameraWork.frameComposition === style2.cameraWork.frameComposition) {
        totalScore += 1
        sharedElements.push(`${style1.cameraWork.frameComposition} composition`)
      }
      scoreCount += 2
    }

    // Editing similarity
    if (aspects.includes('editing')) {
      if (style1.editingStyle.pacing === style2.editingStyle.pacing) {
        totalScore += 1
        sharedElements.push(`${style1.editingStyle.pacing} editing pace`)
      } else {
        distinctElements.push(
          `Different pacing: ${style1.editingStyle.pacing} vs ${style2.editingStyle.pacing}`
        )
      }
      scoreCount += 1
    }

    // Color similarity
    if (aspects.includes('color')) {
      const commonColors = style1.productionDesign.colorPalette.dominant.filter(color =>
        style2.productionDesign.colorPalette.dominant.includes(color)
      )
      if (commonColors.length > 0) {
        totalScore += 0.8
        sharedElements.push(`Similar color palette: ${commonColors.join(', ')}`)
      }
      scoreCount += 1
    }

    const finalScore = scoreCount > 0 ? totalScore / scoreCount : 0
    const explanation =
      sharedElements.length > 0
        ? `Movies share ${sharedElements.length} stylistic elements`
        : 'Movies have distinct visual styles'

    return {
      score: Math.round(finalScore * 100) / 100,
      sharedElements,
      distinctElements,
      explanation,
    }
  }

  private identifyStyleCluster(style: CinematicStyle, similarMovies: any[]): string {
    // Implementation placeholder
    return 'contemporary'
  }

  private analyzeEvolutionaryContext(style: CinematicStyle, similarMovies: any[]): string {
    // Implementation placeholder
    return 'Part of contemporary filmmaking trends'
  }
}

// Export singleton instance
export const cinematicStyleAnalyzer = CinematicStyleAnalyzer.getInstance()

// Additional interfaces for completeness
interface DirectorialComparisonResult {
  director1: { name: string; signature: DirectorialSignature; movies: Movie[] }
  director2: { name: string; signature: DirectorialSignature; movies: Movie[] }
  comparison: DirectorialComparison
  evolutionaryAnalysis: string
}

interface DirectorialComparison {
  similarities: string[]
  differences: string[]
  influenceDirection: 'mutual' | 'director1_to_director2' | 'director2_to_director1' | 'none'
  overallSimilarity: number
  focusAspects: Record<string, number>
}
