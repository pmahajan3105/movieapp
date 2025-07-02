export interface RecommendationExplanation {
  primary_reason: string
  explanation_type: 'similarity' | 'pattern' | 'mood' | 'discovery' | 'temporal'
  confidence_score: number
  discovery_factor: 'safe' | 'stretch' | 'adventure'
  optimal_viewing_time?: string
  supporting_movies?: string[]

  // Contextual hits surfaced by the recommender
  memory_hit?: string
  storyline_match?: string
  review_match?: string

  // Advanced explanation fields (optional for backward compatibility)
  thematic_reasons?: string[]
  style_reasons?: string[]
  emotional_reasons?: string[]
  narrative_reasons?: string[]
  cultural_reasons?: string[]
  personalized_insights?: string[]
  comparison_to_liked_movies?: string[]
} 