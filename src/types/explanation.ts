export interface RecommendationExplanation {
  primary_reason: string
  explanation_type: 'similarity' | 'pattern' | 'mood' | 'discovery' | 'temporal'
  confidence_score: number
  discovery_factor: 'safe' | 'stretch' | 'adventure'
  optimal_viewing_time?: string
  supporting_movies?: string[]

  // New optional contextual hits surfaced by the recommender
  memory_hit?: string
  storyline_match?: string
  review_match?: string
} 