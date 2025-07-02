/**
 * Advanced Movie Intelligence Types
 * Comprehensive type definitions for thematic analysis and sophisticated movie understanding
 */

// Core thematic analysis types
export interface ThematicProfile {
  movieId: string
  psychologicalThemes: PsychologicalTheme[]
  narrativeStructure: NarrativeStructure
  emotionalJourney: EmotionalJourney
  visualMotifs: VisualMotif[]
  cinematicStyle: CinematicStyle
  culturalContext: CulturalContext
  genreThemes: GenreTheme[]
  atmosphericQualities: AtmosphericQuality[]
  confidence: number // 0-1 confidence in the analysis
  lastAnalyzed: string
}

export interface PsychologicalTheme {
  id: string
  name: string
  relevanceScore: number // 0-1, how strongly this theme applies
  evidencePoints: string[] // Specific plot points or scenes supporting this theme
  subthemes?: string[]
}

export interface NarrativeStructure {
  primaryStructure: string // e.g., 'heros_journey', 'three_act', 'circular'
  structureElements: StructureElement[]
  complexityScore: number // 0-1, how complex the narrative structure is
  pacing: 'slow' | 'measured' | 'moderate' | 'fast' | 'variable'
  nonLinearElements?: NonLinearElement[]
}

export interface StructureElement {
  stage: string
  timestamp?: number // Minutes into the film
  description: string
  significance: number // 0-1, importance to overall structure
}

export interface NonLinearElement {
  type: 'flashback' | 'parallel' | 'circular' | 'fragmented'
  description: string
  narrativePurpose: string
}

export interface EmotionalJourney {
  overallPattern: 'gradual_ascent' | 'tragic_fall' | 'rollercoaster' | 'redemption_arc' | 'bittersweet' | 'complex'
  emotionalBeats: EmotionalBeat[]
  climacticMoment: EmotionalBeat
  resolution: EmotionalBeat
  intensityScore: number // 0-1, emotional intensity
  catharticElements: string[]
}

export interface EmotionalBeat {
  timestamp: number // Minutes into film
  emotion: string
  intensity: number // 0-1
  description: string
  characterFocus?: string[]
}

export interface VisualMotif {
  type: 'color_symbolism' | 'lighting' | 'symmetry' | 'recurring_objects' | 'composition'
  description: string
  symbolism: string
  frequency: number // How often it appears
  significance: number // 0-1, importance to the film's meaning
}

export interface CinematicStyle {
  directorialSignature?: string // e.g., 'kubrick_style', 'anderson_style'
  visualCharacteristics: string[]
  cameraWork: CameraWork
  editingStyle: EditingStyle
  soundDesign: SoundDesign
  productionDesign: ProductionDesign
}

export interface CameraWork {
  movementStyle: 'static' | 'dynamic' | 'fluid' | 'kinetic' | 'contemplative'
  frameComposition: 'symmetrical' | 'asymmetrical' | 'classical' | 'experimental'
  depthOfField: 'shallow' | 'deep' | 'variable'
  signature: string[] // Specific camera techniques used
}

export interface EditingStyle {
  pacing: 'slow' | 'measured' | 'standard' | 'quick' | 'frantic'
  transitions: string[] // Types of transitions used
  rhythm: 'musical' | 'dramatic' | 'naturalistic' | 'experimental'
  continuity: 'classical' | 'jump_cuts' | 'montage' | 'non_linear'
}

export interface SoundDesign {
  musicStyle: string[]
  soundscapeType: 'realistic' | 'atmospheric' | 'stylized' | 'minimalist'
  dialogueStyle: 'naturalistic' | 'heightened' | 'poetic' | 'sparse'
  silenceUsage: number // 0-1, how effectively silence is used
}

export interface ProductionDesign {
  visualStyle: string[]
  colorPalette: ColorPalette
  setDesign: 'realistic' | 'stylized' | 'minimalist' | 'elaborate'
  costumeSignificance: number // 0-1, how important costumes are to meaning
}

export interface ColorPalette {
  dominant: string[]
  symbolic: Record<string, string> // color -> meaning
  temperature: 'warm' | 'cool' | 'neutral' | 'contrasting'
  saturation: 'muted' | 'natural' | 'saturated' | 'high_contrast'
}

export interface CulturalContext {
  historicalPeriod?: string
  geographicalSetting: string[]
  socialMovements?: string[]
  culturalIdentity?: string[]
  politicalContext?: string
  relevanceToPresent: number // 0-1, how relevant themes are today
}

export interface GenreTheme {
  genre: string
  themes: string[]
  conventions: string[] // Genre conventions followed or subverted
  subversion?: string[] // How it subverts genre expectations
}

export interface AtmosphericQuality {
  mood: string
  intensity: number // 0-1
  consistency: number // 0-1, how consistent the mood is
  techniques: string[] // How the mood is achieved
}

// Advanced query understanding types
export interface AdvancedQuery {
  originalQuery: string
  processedQuery: ProcessedQuery
  extractedEntities: QueryEntity[]
  detectedIntents: QueryIntent[]
  implicitPreferences: ImplicitPreference[]
  contextualFactors: ContextualFactor[]
  complexityLevel: 'simple' | 'moderate' | 'complex' | 'expert'
  confidence: number
}

export interface ProcessedQuery {
  cleanedText: string
  expandedTerms: string[]
  synonyms: Record<string, string[]>
  relatedConcepts: string[]
  negativeFilters: string[]
}

export interface QueryEntity {
  type: 'movie' | 'director' | 'actor' | 'theme' | 'genre' | 'mood' | 'style' | 'period'
  value: string
  confidence: number
  context?: string
}

export interface QueryIntent {
  type: 'discover' | 'similar_to' | 'mood_match' | 'thematic_explore' | 'style_match' | 'educational' | 'compare'
  confidence: number
  parameters: Record<string, any>
  priority: number // 1-10, importance relative to other intents
}

export interface ImplicitPreference {
  category: 'genre' | 'theme' | 'style' | 'mood' | 'complexity' | 'era' | 'culture'
  preference: string
  strength: number // 0-1, how strongly inferred
  evidence: string[] // What in the query suggests this preference
}

export interface ContextualFactor {
  type: 'temporal' | 'social' | 'emotional' | 'situational' | 'seasonal'
  value: string
  influence: number // 0-1, how much this should influence recommendations
}

// Advanced recommendation types  
export interface AdvancedRecommendation {
  movie: Movie // Your existing Movie type
  thematicMatch: ThematicMatch
  styleMatch: StyleMatch
  emotionalMatch: EmotionalMatch
  narrativeMatch: NarrativeMatch
  overallScore: number // 0-1, composite relevance score
  explanation: import('@/types/explanation').RecommendationExplanation
  educationalInsights?: EducationalInsight[]
}

export interface ThematicMatch {
  sharedThemes: string[]
  themeRelevance: Record<string, number> // theme -> relevance score
  thematicDepth: number // 0-1, how deeply themes are explored
  thematicNovelty: number // 0-1, how different from user's usual themes
}

export interface StyleMatch {
  cinematicSimilarity: number // 0-1
  visualCompatibility: number // 0-1
  directorialAlignment: number // 0-1
  styleElements: string[]
}

export interface EmotionalMatch {
  journeyCompatibility: number // 0-1
  moodAlignment: number // 0-1
  intensityMatch: number // 0-1
  catharticPotential: number // 0-1
}

export interface NarrativeMatch {
  structuralSimilarity: number // 0-1
  complexityAlignment: number // 0-1
  pacingCompatibility: number // 0-1
  innovationLevel: number // 0-1
}


export interface EducationalInsight {
  type: 'film_technique' | 'historical_context' | 'thematic_analysis' | 'directorial_style' | 'genre_evolution'
  title: string
  description: string
  relevance: number // 0-1, how relevant to the recommendation
  learningLevel: 'beginner' | 'intermediate' | 'advanced'
}

// User preference modeling types
export interface AdvancedUserProfile {
  userId: string
  thematicPreferences: ThematicPreference[]
  stylePreferences: StylePreference[]
  emotionalPreferences: EmotionalPreference[]
  narrativePreferences: NarrativePreference[]
  culturalPreferences: CulturalPreference[]
  complexityPreference: ComplexityPreference
  moodHistory: MoodHistoryEntry[]
  learningProfile: LearningProfile
  lastUpdated: string
}

export interface ThematicPreference {
  themeId: string
  affinity: number // -1 to 1, negative means dislike
  confidence: number // 0-1, how confident we are in this preference
  context?: string[] // When this preference applies
  evolution: PreferenceEvolution[]
}

export interface StylePreference {
  styleElement: string
  preference: number // -1 to 1
  examples: string[] // Movie IDs that exemplify this preference
  contextual: boolean // Whether this preference is context-dependent
}

export interface EmotionalPreference {
  emotionalPattern: string
  preference: number // -1 to 1
  intensityTolerance: number // 0-1, how much emotional intensity user can handle
  moodDependency: Record<string, number> // how preference changes with user's mood
}

export interface NarrativePreference {
  structureType: string
  preference: number // -1 to 1
  complexityTolerance: number // 0-1
  pacingPreference: string
}

export interface CulturalPreference {
  culture: string
  affinity: number // -1 to 1
  historicalPeriods: Record<string, number>
  languagePreferences: Record<string, number>
}

export interface ComplexityPreference {
  thematicComplexity: number // 0-1, preferred level
  narrativeComplexity: number // 0-1
  visualComplexity: number // 0-1
  intellectualEngagement: number // 0-1, how much user wants to think
}

export interface MoodHistoryEntry {
  timestamp: string
  reportedMood: string
  inferredMood: string
  preferences: Record<string, number> // what they preferred in this mood
  satisfaction: number // 0-1, how satisfied they were with recommendations
}

export interface LearningProfile {
  filmKnowledgeLevel: 'novice' | 'casual' | 'enthusiast' | 'expert'
  interestInEducation: number // 0-1, how much they want to learn about film
  preferredInsightTypes: string[]
  learningGoals?: string[]
}

export interface PreferenceEvolution {
  timestamp: string
  previousValue: number
  newValue: number
  trigger: string // what caused the change
  confidence: number
}

// Analysis request and response types
export interface ThematicAnalysisRequest {
  movieId: string
  forceReanalysis?: boolean
  analysisDepth: 'basic' | 'standard' | 'comprehensive' | 'expert'
  focusAreas?: string[] // Specific areas to focus analysis on
}

export interface ThematicAnalysisResponse {
  thematicProfile: ThematicProfile
  analysisMetadata: AnalysisMetadata
  recommendations?: AdvancedRecommendation[]
  educationalInsights?: EducationalInsight[]
}

export interface AnalysisMetadata {
  analysisDate: string
  analysisDepth: string
  dataSource: string[]
  confidence: number
  processingTime: number
  modelVersion: string
}

// Advanced search and filtering types
export interface AdvancedSearchFilters {
  thematicFilters?: ThematicFilter[]
  styleFilters?: StyleFilter[]
  emotionalFilters?: EmotionalFilter[]
  narrativeFilters?: NarrativeFilter[]
  culturalFilters?: CulturalFilter[]
  complexityRange?: [number, number]
  moodAlignment?: string
  excludeThemes?: string[]
  minConfidence?: number
}

export interface ThematicFilter {
  themes: string[]
  operator: 'AND' | 'OR' | 'NOT'
  minRelevance?: number
  exactMatch?: boolean
}

export interface StyleFilter {
  directors?: string[]
  visualStyles?: string[]
  cinematicTechniques?: string[]
  colorPalettes?: string[]
  editingStyles?: string[]
}

export interface EmotionalFilter {
  journeyPattern?: string[]
  moodRange?: string[]
  intensityRange?: [number, number]
  catharticPreference?: boolean
}

export interface NarrativeFilter {
  structures?: string[]
  complexityRange?: [number, number]
  pacingPreference?: string[]
  linearityPreference?: 'linear' | 'non_linear' | 'either'
}

export interface CulturalFilter {
  periods?: string[]
  cultures?: string[]
  languages?: string[]
  socialMovements?: string[]
  relevanceToPresent?: number
}

// Import your existing Movie type
import type { Movie } from './index'