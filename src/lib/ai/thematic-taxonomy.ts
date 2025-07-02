/**
 * Comprehensive Thematic Taxonomy for Advanced Movie Intelligence
 * Based on film studies, narrative theory, and cinematic analysis
 */

// Core psychological and universal themes
export const PSYCHOLOGICAL_THEMES = {
  // Identity & Self
  IDENTITY_CRISIS: {
    id: 'identity_crisis',
    name: 'Identity Crisis',
    description: 'Characters questioning who they are or struggling with self-definition',
    keywords: ['identity', 'self-discovery', 'who am I', 'finding oneself', 'authentic self'],
    examples: ['Fight Club', 'Black Swan', 'Memento', 'The Matrix']
  },
  COMING_OF_AGE: {
    id: 'coming_of_age',
    name: 'Coming of Age',
    description: 'Transition from youth to adulthood, gaining wisdom and maturity',
    keywords: ['growing up', 'adolescence', 'maturation', 'first love', 'loss of innocence'],
    examples: ['The Graduate', 'Stand by Me', 'Lady Bird', 'Boyhood']
  },
  SELF_ACTUALIZATION: {
    id: 'self_actualization',
    name: 'Self-Actualization',
    description: 'Realizing one\'s potential and achieving personal fulfillment',
    keywords: ['potential', 'fulfillment', 'purpose', 'calling', 'authentic life'],
    examples: ['Dead Poets Society', 'Good Will Hunting', 'The Pursuit of Happyness']
  },

  // Relationships & Connection
  LOVE_AND_ROMANCE: {
    id: 'love_romance',
    name: 'Love and Romance',
    description: 'Exploration of romantic relationships and the nature of love',
    keywords: ['love', 'romance', 'soulmate', 'passion', 'heartbreak', 'devotion'],
    examples: ['Casablanca', 'The Notebook', 'Her', 'Eternal Sunshine']
  },
  FAMILY_BONDS: {
    id: 'family_bonds',
    name: 'Family Bonds',
    description: 'Complex family relationships and generational connections',
    keywords: ['family', 'parents', 'siblings', 'legacy', 'tradition', 'dysfunction'],
    examples: ['Little Women', 'The Godfather', 'Manchester by the Sea']
  },
  FRIENDSHIP: {
    id: 'friendship',
    name: 'Friendship',
    description: 'Deep platonic bonds and loyalty between friends',
    keywords: ['friendship', 'loyalty', 'brotherhood', 'companionship', 'solidarity'],
    examples: ['The Shawshank Redemption', 'Toy Story', 'The Lord of the Rings']
  },

  // Moral & Ethical
  REDEMPTION: {
    id: 'redemption',
    name: 'Redemption',
    description: 'Journey from wrongdoing to moral restoration and forgiveness',
    keywords: ['redemption', 'forgiveness', 'atonement', 'second chance', 'moral rebirth'],
    examples: ['The Shawshank Redemption', 'A Christmas Carol', 'Gran Torino']
  },
  SACRIFICE: {
    id: 'sacrifice',
    name: 'Sacrifice',
    description: 'Giving up something valuable for a greater good or principle',
    keywords: ['sacrifice', 'selflessness', 'martyrdom', 'greater good', 'noble death'],
    examples: ['Saving Private Ryan', 'The Dark Knight', 'Titanic']
  },
  JUSTICE_VS_REVENGE: {
    id: 'justice_revenge',
    name: 'Justice vs Revenge',
    description: 'Moral distinction between righteous justice and personal vengeance',
    keywords: ['justice', 'revenge', 'vengeance', 'retribution', 'moral law'],
    examples: ['Kill Bill', 'The Dark Knight', 'Unforgiven']
  },

  // Existential & Philosophical
  MORTALITY: {
    id: 'mortality',
    name: 'Mortality',
    description: 'Confronting death and the finite nature of existence',
    keywords: ['death', 'mortality', 'legacy', 'finite life', 'time running out'],
    examples: ['The Seventh Seal', 'About Time', 'Coco']
  },
  MEANING_OF_LIFE: {
    id: 'meaning_life',
    name: 'Meaning of Life',
    description: 'Searching for purpose and significance in existence',
    keywords: ['purpose', 'meaning', 'significance', 'why we exist', 'life\'s value'],
    examples: ['The Tree of Life', 'It\'s a Wonderful Life', 'Everything Everywhere All at Once']
  },
  FREE_WILL_VS_FATE: {
    id: 'freewill_fate',
    name: 'Free Will vs Fate',
    description: 'Question of whether we control our destiny or are bound by fate',
    keywords: ['destiny', 'fate', 'choice', 'predetermined', 'agency'],
    examples: ['Minority Report', 'The Matrix', 'Groundhog Day']
  }
} as const

// Narrative structures and storytelling patterns
export const NARRATIVE_STRUCTURES = {
  HEROS_JOURNEY: {
    id: 'heros_journey',
    name: "Hero's Journey",
    description: 'Classic monomyth structure of adventure, trial, and return',
    stages: ['Call to Adventure', 'Refusal', 'Mentor', 'Crossing Threshold', 'Tests', 'Ordeal', 'Reward', 'Return'],
    examples: ['Star Wars', 'The Lord of the Rings', 'The Matrix']
  },
  THREE_ACT_STRUCTURE: {
    id: 'three_act',
    name: 'Three-Act Structure',
    description: 'Setup, confrontation, and resolution narrative framework',
    stages: ['Setup', 'Rising Action', 'Climax', 'Falling Action', 'Resolution'],
    examples: ['Casablanca', 'Die Hard', 'The Godfather']
  },
  CIRCULAR_NARRATIVE: {
    id: 'circular',
    name: 'Circular Narrative',
    description: 'Story that ends where it began, often with new understanding',
    examples: ['Pulp Fiction', 'Memento', 'The Lion King']
  },
  PARALLEL_STORIES: {
    id: 'parallel',
    name: 'Parallel Stories',
    description: 'Multiple storylines that intersect or mirror each other',
    examples: ['Crash', 'Babel', 'Cloud Atlas']
  },
  ENSEMBLE_NARRATIVE: {
    id: 'ensemble',
    name: 'Ensemble Narrative',
    description: 'Multiple protagonists with interconnected stories',
    examples: ['The Avengers', 'Love Actually', 'Ocean\'s Eleven']
  }
} as const

// Emotional journey patterns
export const EMOTIONAL_PATTERNS = {
  GRADUAL_ASCENT: {
    id: 'gradual_ascent',
    name: 'Gradual Ascent',
    description: 'Emotional journey that builds positively throughout',
    curve: 'ascending',
    examples: ['Rocky', 'The Pursuit of Happyness']
  },
  TRAGIC_FALL: {
    id: 'tragic_fall',
    name: 'Tragic Fall',
    description: 'Downward emotional spiral toward tragedy',
    curve: 'descending',
    examples: ['Requiem for a Dream', 'There Will Be Blood']
  },
  ROLLERCOASTER: {
    id: 'rollercoaster',
    name: 'Emotional Rollercoaster',
    description: 'Intense ups and downs creating emotional turbulence',
    curve: 'volatile',
    examples: ['Black Swan', 'Whiplash']
  },
  REDEMPTION_ARC: {
    id: 'redemption_arc',
    name: 'Redemption Arc',
    description: 'Fall from grace followed by moral recovery',
    curve: 'u_shaped',
    examples: ['A Star Is Born', 'The Shawshank Redemption']
  },
  BITTERSWEET: {
    id: 'bittersweet',
    name: 'Bittersweet',
    description: 'Mix of joy and sadness, often with meaningful loss',
    curve: 'complex',
    examples: ['Her', 'Lost in Translation', 'La La Land']
  }
} as const

// Visual and cinematic motifs
export const VISUAL_MOTIFS = {
  COLOR_SYMBOLISM: {
    id: 'color_symbolism',
    name: 'Color Symbolism',
    description: 'Deliberate use of color to convey meaning and emotion',
    elements: {
      RED: 'passion, danger, love, violence',
      BLUE: 'melancholy, tranquility, cold, isolation',
      GREEN: 'nature, growth, envy, sickness',
      YELLOW: 'happiness, madness, warning',
      BLACK_WHITE: 'moral clarity, stark contrast, timelessness'
    },
    examples: ['Amélie', 'Her', 'The Matrix', 'Schindler\'s List']
  },
  LIGHTING_PATTERNS: {
    id: 'lighting',
    name: 'Lighting Patterns',
    description: 'Use of light and shadow to create mood and meaning',
    techniques: ['chiaroscuro', 'high-key', 'low-key', 'natural', 'dramatic'],
    examples: ['Blade Runner', 'The Godfather', 'Barry Lyndon']
  },
  SYMMETRY_COMPOSITION: {
    id: 'symmetry',
    name: 'Symmetrical Composition',
    description: 'Balanced visual arrangements creating aesthetic harmony',
    examples: ['The Grand Budapest Hotel', 'Kubrick films', 'Moonrise Kingdom']
  },
  RECURRING_OBJECTS: {
    id: 'recurring_objects',
    name: 'Recurring Objects',
    description: 'Symbolic objects that appear throughout the narrative',
    examples: ['The Red Balloon', 'American Beauty (roses)', 'Inception (spinning top)']
  }
} as const

// Directorial styles and auteur signatures
export const DIRECTORIAL_STYLES = {
  KUBRICK: {
    id: 'kubrick_style',
    name: 'Kubrickian',
    characteristics: ['symmetrical framing', 'one-point perspective', 'slow zoom', 'classical music'],
    themes: ['human nature', 'violence', 'perfectionism'],
    examples: ['2001: A Space Odyssey', 'The Shining', 'A Clockwork Orange']
  },
  WES_ANDERSON: {
    id: 'anderson_style',
    name: 'Anderson-esque',
    characteristics: ['symmetrical composition', 'pastel palettes', 'whimsical detail', 'deadpan humor'],
    themes: ['family dysfunction', 'nostalgia', 'coming of age'],
    examples: ['The Grand Budapest Hotel', 'Moonrise Kingdom', 'The Royal Tenenbaums']
  },
  TARANTINO: {
    id: 'tarantino_style',
    name: 'Tarantino-esque',
    characteristics: ['non-linear narrative', 'pop culture references', 'stylized violence', 'dialogue-heavy'],
    themes: ['violence and morality', 'pop culture', 'revenge'],
    examples: ['Pulp Fiction', 'Kill Bill', 'Django Unchained']
  },
  NOIR: {
    id: 'film_noir',
    name: 'Film Noir',
    characteristics: ['high contrast lighting', 'urban settings', 'femme fatales', 'moral ambiguity'],
    themes: ['crime', 'corruption', 'fatalism'],
    examples: ['Maltese Falcon', 'Double Indemnity', 'Chinatown']
  }
} as const

// Cultural and temporal contexts
export const CULTURAL_CONTEXTS = {
  HISTORICAL_PERIODS: {
    ANCIENT: ['antiquity', 'classical', 'biblical', 'mythology'],
    MEDIEVAL: ['middle ages', 'feudalism', 'crusades', 'chivalry'],
    RENAISSANCE: ['rebirth', 'humanism', 'art', 'discovery'],
    INDUSTRIAL: ['revolution', 'progress', 'urbanization', 'class struggle'],
    MODERN: ['20th century', 'world wars', 'technology', 'alienation'],
    CONTEMPORARY: ['21st century', 'digital age', 'globalization', 'social media']
  },
  SOCIAL_MOVEMENTS: {
    CIVIL_RIGHTS: ['equality', 'justice', 'discrimination', 'protest'],
    FEMINISM: ['gender equality', 'empowerment', 'patriarchy', 'liberation'],
    COUNTERCULTURE: ['rebellion', 'alternative values', 'anti-establishment'],
    ENVIRONMENTALISM: ['nature', 'conservation', 'climate change', 'sustainability']
  },
  CULTURAL_IDENTITY: {
    AMERICAN_DREAM: ['opportunity', 'success', 'freedom', 'capitalism'],
    IMMIGRANT_EXPERIENCE: ['displacement', 'assimilation', 'identity', 'belonging'],
    GENERATIONAL_CONFLICT: ['tradition vs. modernity', 'old vs. new', 'values clash']
  }
} as const

// Genre-specific thematic elements
export const GENRE_THEMES = {
  HORROR: {
    psychological: ['fear of unknown', 'loss of control', 'sanity vs madness'],
    supernatural: ['good vs evil', 'death and afterlife', 'supernatural justice'],
    survival: ['primal instincts', 'human nature under stress', 'moral breakdown']
  },
  SCIENCE_FICTION: {
    technology: ['human vs machine', 'progress vs humanity', 'artificial intelligence'],
    exploration: ['unknown frontiers', 'human curiosity', 'cosmic insignificance'],
    dystopian: ['social control', 'loss of freedom', 'technological dependence']
  },
  ROMANCE: {
    obstacles: ['star-crossed lovers', 'social barriers', 'timing and fate'],
    growth: ['personal transformation', 'vulnerability', 'emotional maturity'],
    commitment: ['devotion', 'sacrifice for love', 'choosing love over security']
  },
  THRILLER: {
    paranoia: ['trust and betrayal', 'hidden threats', 'reality vs perception'],
    pursuit: ['hunter and hunted', 'cat and mouse', 'escape and survival'],
    revelation: ['hidden truth', 'conspiracy', 'shocking discoveries']
  }
} as const

// Mood and atmospheric qualities
export const ATMOSPHERIC_QUALITIES = {
  CONTEMPLATIVE: {
    id: 'contemplative',
    description: 'Reflective, thoughtful, meditative atmosphere',
    pacing: 'slow',
    examples: ['Lost in Translation', 'The Tree of Life', 'Her']
  },
  INTENSE: {
    id: 'intense',
    description: 'High-energy, gripping, emotionally charged',
    pacing: 'fast',
    examples: ['Whiplash', 'Mad Max: Fury Road', 'Uncut Gems']
  },
  MELANCHOLIC: {
    id: 'melancholic',
    description: 'Sad, nostalgic, bittersweet mood',
    pacing: 'measured',
    examples: ['Manchester by the Sea', 'Moonlight', 'The Grand Budapest Hotel']
  },
  UPLIFTING: {
    id: 'uplifting',
    description: 'Inspiring, hopeful, life-affirming',
    pacing: 'building',
    examples: ['The Pursuit of Happyness', 'Rocky', 'It\'s a Wonderful Life']
  },
  MYSTERIOUS: {
    id: 'mysterious',
    description: 'Enigmatic, puzzling, suspenseful atmosphere',
    pacing: 'deliberate',
    examples: ['Mulholland Drive', 'The Prestige', 'Shutter Island']
  }
} as const

// Thematic analysis utilities
export class ThematicTaxonomy {
  
  /**
   * Get all themes related to a concept
   */
  static findRelatedThemes(concept: string): string[] {
    const related: string[] = []
    const searchTerm = concept.toLowerCase()
    
    // Search through psychological themes
    Object.values(PSYCHOLOGICAL_THEMES).forEach(theme => {
      if (theme.keywords.some(keyword => 
        keyword.toLowerCase().includes(searchTerm) || 
        searchTerm.includes(keyword.toLowerCase())
      )) {
        related.push(theme.id)
      }
    })
    
    return related
  }
  
  /**
   * Calculate thematic similarity between two movies
   */
  static calculateThematicSimilarity(
    themes1: string[], 
    themes2: string[]
  ): number {
    const intersection = themes1.filter(theme => themes2.includes(theme))
    const union = [...new Set([...themes1, ...themes2])]
    
    return union.length > 0 ? intersection.length / union.length : 0
  }
  
  /**
   * Get theme hierarchy for complex analysis
   */
  static getThemeHierarchy(): Record<string, string[]> {
    return {
      identity: ['identity_crisis', 'coming_of_age', 'self_actualization'],
      relationships: ['love_romance', 'family_bonds', 'friendship'],
      morality: ['redemption', 'sacrifice', 'justice_revenge'],
      existential: ['mortality', 'meaning_life', 'freewill_fate']
    }
  }
  
  /**
   * Extract themes from text description using keyword matching
   */
  static extractThemesFromText(text: string): string[] {
    const extractedThemes: string[] = []
    const lowerText = text.toLowerCase()
    
    Object.values(PSYCHOLOGICAL_THEMES).forEach(theme => {
      const hasTheme = theme.keywords.some(keyword => 
        lowerText.includes(keyword.toLowerCase())
      )
      if (hasTheme) {
        extractedThemes.push(theme.id)
      }
    })
    
    return extractedThemes
  }
}