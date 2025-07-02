export const RECOMMENDER_BOOSTS = {
  GENRE_MAX: 0.2,
  TEMPORAL_MAX: 0.15,
  MEMORY_MAX: 0.25,
} as const

export type RecommenderBoostKey = keyof typeof RECOMMENDER_BOOSTS;

export const RECOMMENDER_WEIGHTS = {
  semantic: Number(process.env.NEXT_PUBLIC_W_SEMANTIC ?? 0.3),
  storyline: Number(process.env.NEXT_PUBLIC_W_STORYLINE ?? 0.2),
  talent: Number(process.env.NEXT_PUBLIC_W_TALENT ?? 0.15),
  genre: Number(process.env.NEXT_PUBLIC_W_GENRE ?? 0.15),
  temporal: Number(process.env.NEXT_PUBLIC_W_TEMPORAL ?? 0.1),
  sentiment: Number(process.env.NEXT_PUBLIC_W_SENTIMENT ?? 0.05),
  social: Number(process.env.NEXT_PUBLIC_W_SOCIAL ?? 0.05),
} 