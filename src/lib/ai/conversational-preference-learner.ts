import { logger } from '@/lib/logger'
import { SmartCacheManager } from './smart-cache-manager'
import { PerformanceMonitor } from './performance-monitor'
import { measurePerformance } from './performance-monitor'

export interface ConversationalMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  metadata?: Record<string, any>
}

export interface ExtractedPreference {
  type: 'genre' | 'director' | 'actor' | 'theme' | 'mood' | 'era' | 'style' | 'dislike'
  value: string
  confidence: number
  source: string
  context: string
}

export interface PreferenceLearningResult {
  preferences: ExtractedPreference[]
  insights: {
    conversationTone: 'casual' | 'detailed' | 'technical' | 'emotional'
    preferenceClarity: 'explicit' | 'implicit' | 'mixed'
    dominantThemes: string[]
    conflictingPreferences: string[]
  }
  recommendations: {
    immediateActions: string[]
    followUpQuestions: string[]
    confidenceScore: number
  }
}

export class ConversationalPreferenceLearner {
  private static instance: ConversationalPreferenceLearner
  private cache: SmartCacheManager
  private monitor: PerformanceMonitor

  private constructor() {
    this.cache = SmartCacheManager.getInstance()
    this.monitor = PerformanceMonitor.getInstance()
  }

  static getInstance(): ConversationalPreferenceLearner {
    if (!ConversationalPreferenceLearner.instance) {
      ConversationalPreferenceLearner.instance = new ConversationalPreferenceLearner()
    }
    return ConversationalPreferenceLearner.instance
  }

  // @measurePerformance('learn_from_conversation')
  async learnFromConversation(
    messages: ConversationalMessage[],
    userId?: string
  ): Promise<PreferenceLearningResult> {
    try {
      const cacheKey = this.generateCacheKey(messages, userId)
      const cached = await this.cache.get<PreferenceLearningResult>(cacheKey)
      
      if (cached) {
        this.monitor.incrementCounter('preference_learning_cache_hit')
        return cached
      }

      const conversationContext = this.buildConversationContext(messages)
      const preferences = await this.extractPreferencesFromMessages(messages)
      const insights = this.analyzeConversationInsights(messages, preferences)
      const recommendations = this.generateRecommendations(preferences, insights)

      const result: PreferenceLearningResult = {
        preferences,
        insights,
        recommendations
      }

      await this.cache.set(cacheKey, result, { ttl: 3600 })
      this.monitor.incrementCounter('preference_learning_processed')
      
      return result
    } catch (error) {
      logger.error('Failed to learn from conversation', { error, userId })
      this.monitor.incrementCounter('preference_learning_error')
      throw error
    }
  }

  // @measurePerformance('extract_preferences')
  private async extractPreferencesFromMessages(
    messages: ConversationalMessage[]
  ): Promise<ExtractedPreference[]> {
    const preferences: ExtractedPreference[] = []
    
    for (const message of messages) {
      if (message.role === 'user') {
        const messagePreferences = await this.parseMessageForPreferences(message)
        preferences.push(...messagePreferences)
      }
    }

    return this.deduplicateAndRankPreferences(preferences)
  }

  private async parseMessageForPreferences(
    message: ConversationalMessage
  ): Promise<ExtractedPreference[]> {
    const preferences: ExtractedPreference[] = []
    const content = message.content.toLowerCase()

    // Genre preferences
    preferences.push(...this.extractGenrePreferences(content, message))
    
    // Director/Actor preferences
    preferences.push(...this.extractPersonPreferences(content, message))
    
    // Era/Time period preferences
    preferences.push(...this.extractEraPreferences(content, message))
    
    // Mood/Theme preferences
    preferences.push(...this.extractMoodThemePreferences(content, message))
    
    // Style preferences
    preferences.push(...this.extractStylePreferences(content, message))
    
    // Dislikes
    preferences.push(...this.extractDislikes(content, message))

    return preferences
  }

  private extractGenrePreferences(
    content: string,
    message: ConversationalMessage
  ): ExtractedPreference[] {
    const preferences: ExtractedPreference[] = []
    
    const genrePatterns = {
      'action': /\b(action|adventure|explosive|fight|chase|combat)\b/gi,
      'comedy': /\b(comedy|funny|hilarious|laugh|humor|comedic)\b/gi,
      'drama': /\b(drama|dramatic|emotional|deep|serious|touching)\b/gi,
      'horror': /\b(horror|scary|frightening|terror|spooky|creepy)\b/gi,
      'romance': /\b(romance|romantic|love|relationship|dating)\b/gi,
      'sci-fi': /\b(sci-?fi|science fiction|futuristic|space|alien|robot)\b/gi,
      'thriller': /\b(thriller|suspense|tense|mystery|psychological)\b/gi,
      'fantasy': /\b(fantasy|magical|magic|wizard|dragon|mythical)\b/gi,
      'documentary': /\b(documentary|real life|true story|factual)\b/gi,
      'animation': /\b(animated|animation|cartoon|pixar|disney)\b/gi
    }

    for (const [genre, pattern] of Object.entries(genrePatterns)) {
      const matches = content.match(pattern)
      if (matches) {
        preferences.push({
          type: 'genre',
          value: genre,
          confidence: Math.min(0.9, 0.6 + (matches.length * 0.1)),
          source: message.id,
          context: this.extractRelevantContext(content, matches[0] || '')
        })
      }
    }

    return preferences
  }

  private extractPersonPreferences(
    content: string,
    message: ConversationalMessage
  ): ExtractedPreference[] {
    const preferences: ExtractedPreference[] = []
    
    // Director patterns
    const directorPatterns = [
      /directed by ([a-z\s]+)/gi,
      /([a-z\s]+) films?/gi,
      /love ([a-z\s]+)'s work/gi,
      /([a-z\s]+) is amazing/gi
    ]

    // Actor patterns
    const actorPatterns = [
      /starring ([a-z\s]+)/gi,
      /([a-z\s]+) movies?/gi,
      /love ([a-z\s]+) in/gi,
      /([a-z\s]+) is great/gi
    ]

    // Extract potential director names
    for (const pattern of directorPatterns) {
      const matches = [...content.matchAll(pattern)]
      for (const match of matches) {
        if (match[1] && this.isValidPersonName(match[1])) {
          preferences.push({
            type: 'director',
            value: this.titleCase(match[1].trim()),
            confidence: 0.7,
            source: message.id,
            context: this.extractRelevantContext(content, match[0] || '')
          })
        }
      }
    }

    return preferences
  }

  private extractEraPreferences(
    content: string,
    message: ConversationalMessage
  ): ExtractedPreference[] {
    const preferences: ExtractedPreference[] = []
    
    const eraPatterns = {
      '1980s': /\b(80s|eighties|1980s|retro)\b/gi,
      '1990s': /\b(90s|nineties|1990s)\b/gi,
      '2000s': /\b(2000s|early 2000s|millennium)\b/gi,
      'modern': /\b(recent|new|modern|contemporary|latest)\b/gi,
      'classic': /\b(classic|old|vintage|golden age|black and white)\b/gi
    }

    for (const [era, pattern] of Object.entries(eraPatterns)) {
      const matches = content.match(pattern)
      if (matches) {
        preferences.push({
          type: 'era',
          value: era,
          confidence: 0.6,
          source: message.id,
          context: this.extractRelevantContext(content, matches[0] || '')
        })
      }
    }

    return preferences
  }

  private extractMoodThemePreferences(
    content: string,
    message: ConversationalMessage
  ): ExtractedPreference[] {
    const preferences: ExtractedPreference[] = []
    
    const moodPatterns = {
      'uplifting': /\b(uplifting|positive|feel-good|inspiring|motivational)\b/gi,
      'dark': /\b(dark|gritty|noir|depressing|heavy)\b/gi,
      'lighthearted': /\b(light|fun|easy|casual|entertaining)\b/gi,
      'intense': /\b(intense|gripping|powerful|heavy|serious)\b/gi,
      'thoughtful': /\b(thoughtful|intellectual|smart|clever|deep)\b/gi
    }

    for (const [mood, pattern] of Object.entries(moodPatterns)) {
      const matches = content.match(pattern)
      if (matches) {
        preferences.push({
          type: 'mood',
          value: mood,
          confidence: 0.7,
          source: message.id,
          context: this.extractRelevantContext(content, matches[0] || '')
        })
      }
    }

    return preferences
  }

  private extractStylePreferences(
    content: string,
    message: ConversationalMessage
  ): ExtractedPreference[] {
    const preferences: ExtractedPreference[] = []
    
    const stylePatterns = {
      'indie': /\b(indie|independent|art house|experimental)\b/gi,
      'blockbuster': /\b(blockbuster|big budget|mainstream|popular)\b/gi,
      'foreign': /\b(foreign|international|subtitled|non-english)\b/gi,
      'miniseries': /\b(series|miniseries|tv show|limited series)\b/gi
    }

    for (const [style, pattern] of Object.entries(stylePatterns)) {
      const matches = content.match(pattern)
      if (matches) {
        preferences.push({
          type: 'style',
          value: style,
          confidence: 0.7,
          source: message.id,
          context: this.extractRelevantContext(content, matches[0] || '')
        })
      }
    }

    return preferences
  }

  private extractDislikes(
    content: string,
    message: ConversationalMessage
  ): ExtractedPreference[] {
    const preferences: ExtractedPreference[] = []
    
    const dislikePatterns = [
      /don't like ([a-z\s]+)/gi,
      /hate ([a-z\s]+)/gi,
      /not a fan of ([a-z\s]+)/gi,
      /avoid ([a-z\s]+)/gi,
      /can't stand ([a-z\s]+)/gi
    ]

    for (const pattern of dislikePatterns) {
      const matches = [...content.matchAll(pattern)]
      for (const match of matches) {
        if (match[1]) {
          preferences.push({
            type: 'dislike',
            value: match[1].trim(),
            confidence: 0.8,
            source: message.id,
            context: this.extractRelevantContext(content, match[0] || '')
          })
        }
      }
    }

    return preferences
  }

  private deduplicateAndRankPreferences(
    preferences: ExtractedPreference[]
  ): ExtractedPreference[] {
    const grouped = new Map<string, ExtractedPreference[]>();
    for (const pref of preferences) {
      if (!pref || !pref.type || !pref.value) continue;
      const key = `${pref.type}:${pref.value.toLowerCase()}`;
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(pref);
    }
    const deduplicated: ExtractedPreference[] = [];
    for (const [, prefs] of grouped) {
      if (!prefs || prefs.length === 0 || prefs.some(p => !p)) continue;
      if (prefs.length === 1 && prefs[0]) {
        deduplicated.push(prefs[0]);
      } else if (prefs.length > 1 && prefs.every(p => p)) {
        const firstPref = prefs[0];
        if (!firstPref || typeof firstPref.type !== 'string' || typeof firstPref.value !== 'string') continue;
        // Merge multiple instances
        const merged: ExtractedPreference = {
          type: firstPref.type,
          value: firstPref.value,
          confidence: Math.min(0.95, prefs.reduce((sum, p) => sum + p.confidence, 0) / prefs.length + 0.1),
          source: prefs.map(p => typeof p.source === 'string' ? p.source : '').join(','),
          context: prefs.map(p => typeof p.context === 'string' ? p.context : '').join(' | ')
        };
        deduplicated.push(merged);
      }
    }
    return deduplicated.filter((p): p is ExtractedPreference => !!p && typeof p.confidence === 'number').sort((a, b) => b.confidence - a.confidence);
  }

  private analyzeConversationInsights(
    messages: ConversationalMessage[],
    preferences: ExtractedPreference[]
  ): PreferenceLearningResult['insights'] {
    const userMessages = messages.filter(m => m.role === 'user')
    const totalLength = userMessages.reduce((sum, m) => sum + (m && m.content ? m.content.length : 0), 0)
    const avgLength = userMessages.length > 0 ? totalLength / userMessages.length : 0

    // Determine conversation tone
    let conversationTone: 'casual' | 'detailed' | 'technical' | 'emotional' = 'casual'
    if (avgLength > 200) conversationTone = 'detailed'
    if (userMessages.some(m => m && m.content && /\b(cinematography|direction|screenplay)\b/i.test(m.content))) {
      conversationTone = 'technical'
    }
    if (userMessages.some(m => m && m.content && /\b(love|hate|amazing|terrible|incredible)\b/i.test(m.content))) {
      conversationTone = 'emotional'
    }

    // Determine preference clarity
    const explicitCount = preferences.filter(p => p.confidence > 0.8).length
    const implicitCount = preferences.filter(p => p.confidence <= 0.8).length
    let preferenceClarity: 'explicit' | 'implicit' | 'mixed' = 'mixed'
    if (explicitCount > implicitCount * 2) preferenceClarity = 'explicit'
    if (implicitCount > explicitCount * 2) preferenceClarity = 'implicit'

    // Find dominant themes
    const themeCount = new Map<string, number>()
    for (const pref of preferences) {
      if (!pref || typeof pref.type !== 'string') continue;
      themeCount.set(pref.type, (themeCount.get(pref.type) || 0) + 1)
    }
    const dominantThemes = Array.from(themeCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([theme]) => theme)

    return {
      conversationTone,
      preferenceClarity,
      dominantThemes,
      conflictingPreferences: this.findConflictingPreferences(preferences)
    }
  }

  private generateRecommendations(
    preferences: ExtractedPreference[],
    insights: PreferenceLearningResult['insights']
  ): PreferenceLearningResult['recommendations'] {
    const immediateActions: string[] = []
    const followUpQuestions: string[] = []

    // Generate immediate actions based on high-confidence preferences
    const highConfidencePrefs = preferences.filter(p => p.confidence > 0.8)
    const firstHigh = highConfidencePrefs[0];
    if (firstHigh) {
      const type = typeof firstHigh.type === 'string' ? firstHigh.type : '';
      const value = typeof firstHigh.value === 'string' ? firstHigh.value : '';
      immediateActions.push(`Search for ${type} "${value}"`)
    }

    // Generate follow-up questions based on conversation tone and clarity
    if (insights.preferenceClarity === 'implicit') {
      followUpQuestions.push('Could you tell me more specifically what you like?')
    }
    
    if (insights.conflictingPreferences.length > 0) {
      followUpQuestions.push('I noticed some conflicting preferences - which is more important to you?')
    }

    const confidenceScore = preferences.length > 0 
      ? preferences.reduce((sum, p) => sum + (p && typeof p.confidence === 'number' ? p.confidence : 0), 0) / preferences.length
      : 0

    return {
      immediateActions,
      followUpQuestions,
      confidenceScore
    }
  }

  private findConflictingPreferences(preferences: ExtractedPreference[]): string[] {
    const conflicts: string[] = []
    const conflictPairs = [
      ['action', 'drama'],
      ['comedy', 'horror'],
      ['classic', 'modern'],
      ['indie', 'blockbuster']
    ]

    for (const [type1, type2] of conflictPairs) {
      const has1 = preferences.some(p => typeof p.value === 'string' && p.value.toLowerCase().includes(type1));
      const has2 = preferences.some(p => typeof p.value === 'string' && p.value.toLowerCase().includes(type2));
      if (has1 && has2) {
        conflicts.push(`${type1} vs ${type2}`);
      }
    }

    return conflicts
  }

  private buildConversationContext(messages: ConversationalMessage[]): string {
    return messages
      .slice(-5) // Last 5 messages for context
      .map(m => `${typeof m.role === 'string' ? m.role : ''}: ${m.content || ''}`)
      .join('\n')
  }

  private generateCacheKey(messages: ConversationalMessage[], userId?: string): string {
    const messageHash = messages
      .map(m => `${typeof m.role === 'string' ? m.role : ''}:${m.content?.substring(0, 50) || ''}`)
      .join('|')
    return `conversation_learning:${userId || 'anonymous'}:${this.hashString(messageHash)}`
  }

  private hashString(str: string | undefined): string {
    const safeStr = str || '';
    let hash = 0;
    for (let i = 0; i < safeStr.length; i++) {
      const char = safeStr.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  private extractRelevantContext(content: string | undefined, match: string | undefined): string {
    const safeContent = content || '';
    const safeMatch = match || '';
    const matchIndex = safeContent.toLowerCase().indexOf(safeMatch.toLowerCase());
    const start = Math.max(0, matchIndex - 30);
    const end = Math.min(safeContent.length, matchIndex + safeMatch.length + 30);
    return safeContent.substring(start, end).trim();
  }

  private isValidPersonName(name: string): boolean {
    const trimmed = name.trim()
    return trimmed.length > 2 && 
           trimmed.length < 50 && 
           /^[a-z\s'-]+$/i.test(trimmed) &&
           !/\b(movie|film|show|series)\b/i.test(trimmed)
  }

  private titleCase(str: string | undefined): string {
    const safeStr = str || '';
    return safeStr.replace(/\w\S*/g, (txt) => 
      txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
    );
  }
}