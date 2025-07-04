/**
 * Movie AI Insights Component
 * Phase 3.3: Displays detailed AI reasoning and analysis for movie recommendations
 */

'use client'

import React, { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Brain, 
  Target, 
  TrendingUp, 
  Heart, 
  Eye, 
  Palette, 
  Users, 
  ChevronDown, 
  ChevronRight,
  Lightbulb,
  Star,
  Gauge
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface AIInsights {
  // Core recommendation data
  confidence: number
  analysis_source: 'full_ai' | 'enhanced' | 'local_ai' | 'fallback'
  discovery_source: 'trending' | 'ai_analysis' | 'mood_match' | 'fallback' | 'user_request'
  
  // AI analysis insights
  ai_insights?: {
    emotional_analysis?: {
      primary_emotions?: string[]
      emotional_journey?: string
      mood_match_score?: number
    }
    thematic_analysis?: {
      core_themes?: string[]
      philosophical_elements?: string[]
      social_commentary?: string
    }
    cinematic_analysis?: {
      visual_style?: string
      narrative_structure?: string
      pacing?: string
      technical_excellence?: string
    }
    personalization?: {
      genre_match?: number
      director_preference?: string
      similar_movies?: string[]
      user_pattern_match?: string
    }
    recommendation_reasoning?: {
      primary_reason?: string
      supporting_factors?: string[]
      discovery_factor?: 'safe' | 'stretch' | 'adventure'
      optimal_viewing_context?: string
    }
  }
  
  // Basic recommendation data
  reason?: string
  score?: number
}

interface Props {
  insights: AIInsights
  movieTitle: string
  className?: string
}

export const MovieAIInsights: React.FC<Props> = ({ insights, movieTitle, className }) => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['overview']))

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections)
    if (newExpanded.has(section)) {
      newExpanded.delete(section)
    } else {
      newExpanded.add(section)
    }
    setExpandedSections(newExpanded)
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600 bg-green-50 border-green-200'
    if (confidence >= 0.6) return 'text-blue-600 bg-blue-50 border-blue-200'
    if (confidence >= 0.4) return 'text-yellow-600 bg-yellow-50 border-yellow-200'
    return 'text-red-600 bg-red-50 border-red-200'
  }

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'full_ai': return <Brain className="w-4 h-4 text-purple-500" />
      case 'enhanced': return <TrendingUp className="w-4 h-4 text-blue-500" />
      case 'local_ai': return <Target className="w-4 h-4 text-green-500" />
      default: return <Lightbulb className="w-4 h-4 text-gray-500" />
    }
  }

  const getDiscoveryIcon = (source: string) => {
    switch (source) {
      case 'trending': return <TrendingUp className="w-4 h-4 text-orange-500" />
      case 'ai_analysis': return <Brain className="w-4 h-4 text-purple-500" />
      case 'mood_match': return <Heart className="w-4 h-4 text-red-500" />
      default: return <Eye className="w-4 h-4 text-gray-500" />
    }
  }

  const aiInsights = insights.ai_insights || {}

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Brain className="w-5 h-5 text-purple-500" />
        <h3 className="text-lg font-semibold">AI Analysis</h3>
        <Badge variant="outline" className={cn('text-xs', getConfidenceColor(insights.confidence || 0))}>
          {Math.round((insights.confidence || 0) * 100)}% confidence
        </Badge>
      </div>

      {/* Overview Section */}
      <Card className="border-l-4 border-l-purple-500">
        <div 
          className="p-4 cursor-pointer flex items-center justify-between"
          onClick={() => toggleSection('overview')}
        >
          <div className="flex items-center gap-2">
            <Gauge className="w-4 h-4 text-purple-500" />
            <span className="font-medium">Recommendation Overview</span>
          </div>
          {expandedSections.has('overview') ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </div>
        
        {expandedSections.has('overview') && (
          <div className="px-4 pb-4 border-t border-gray-100">
            <div className="grid grid-cols-2 gap-4 mt-3">
              <div className="flex items-center gap-2">
                {getSourceIcon(insights.analysis_source)}
                <div>
                  <div className="text-xs text-gray-500">Analysis Depth</div>
                  <div className="text-sm font-medium capitalize">
                    {insights.analysis_source?.replace('_', ' ')}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {getDiscoveryIcon(insights.discovery_source)}
                <div>
                  <div className="text-xs text-gray-500">Discovery Method</div>
                  <div className="text-sm font-medium capitalize">
                    {insights.discovery_source?.replace('_', ' ')}
                  </div>
                </div>
              </div>
            </div>

            {insights.reason && (
              <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                <div className="text-xs text-gray-500 mb-1">Primary Reason</div>
                <p className="text-sm">{insights.reason}</p>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Emotional Analysis */}
      {aiInsights.emotional_analysis && (
        <Card className="border-l-4 border-l-red-500">
          <div 
            className="p-4 cursor-pointer flex items-center justify-between"
            onClick={() => toggleSection('emotional')}
          >
            <div className="flex items-center gap-2">
              <Heart className="w-4 h-4 text-red-500" />
              <span className="font-medium">Emotional Analysis</span>
            </div>
            {expandedSections.has('emotional') ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </div>
          
          {expandedSections.has('emotional') && (
            <div className="px-4 pb-4 border-t border-gray-100">
              <div className="space-y-3 mt-3">
                {aiInsights.emotional_analysis.primary_emotions && (
                  <div>
                    <div className="text-xs text-gray-500 mb-2">Primary Emotions</div>
                    <div className="flex flex-wrap gap-1">
                      {aiInsights.emotional_analysis.primary_emotions.map(emotion => (
                        <Badge key={emotion} variant="secondary" className="text-xs">
                          {emotion}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                
                {aiInsights.emotional_analysis.emotional_journey && (
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Emotional Journey</div>
                    <p className="text-sm text-gray-700">{aiInsights.emotional_analysis.emotional_journey}</p>
                  </div>
                )}

                {aiInsights.emotional_analysis.mood_match_score && (
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Mood Match</div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-red-500 h-2 rounded-full transition-all"
                          style={{ width: `${aiInsights.emotional_analysis.mood_match_score * 100}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium">
                        {Math.round(aiInsights.emotional_analysis.mood_match_score * 100)}%
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Thematic Analysis */}
      {aiInsights.thematic_analysis && (
        <Card className="border-l-4 border-l-blue-500">
          <div 
            className="p-4 cursor-pointer flex items-center justify-between"
            onClick={() => toggleSection('thematic')}
          >
            <div className="flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-blue-500" />
              <span className="font-medium">Thematic Analysis</span>
            </div>
            {expandedSections.has('thematic') ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </div>
          
          {expandedSections.has('thematic') && (
            <div className="px-4 pb-4 border-t border-gray-100">
              <div className="space-y-3 mt-3">
                {aiInsights.thematic_analysis.core_themes && (
                  <div>
                    <div className="text-xs text-gray-500 mb-2">Core Themes</div>
                    <div className="flex flex-wrap gap-1">
                      {aiInsights.thematic_analysis.core_themes.map(theme => (
                        <Badge key={theme} variant="outline" className="text-xs">
                          {theme}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                
                {aiInsights.thematic_analysis.social_commentary && (
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Social Commentary</div>
                    <p className="text-sm text-gray-700">{aiInsights.thematic_analysis.social_commentary}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Cinematic Analysis */}
      {aiInsights.cinematic_analysis && (
        <Card className="border-l-4 border-l-green-500">
          <div 
            className="p-4 cursor-pointer flex items-center justify-between"
            onClick={() => toggleSection('cinematic')}
          >
            <div className="flex items-center gap-2">
              <Palette className="w-4 h-4 text-green-500" />
              <span className="font-medium">Cinematic Analysis</span>
            </div>
            {expandedSections.has('cinematic') ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </div>
          
          {expandedSections.has('cinematic') && (
            <div className="px-4 pb-4 border-t border-gray-100">
              <div className="grid grid-cols-2 gap-3 mt-3">
                {aiInsights.cinematic_analysis.visual_style && (
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Visual Style</div>
                    <p className="text-sm">{aiInsights.cinematic_analysis.visual_style}</p>
                  </div>
                )}
                
                {aiInsights.cinematic_analysis.pacing && (
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Pacing</div>
                    <p className="text-sm">{aiInsights.cinematic_analysis.pacing}</p>
                  </div>
                )}
                
                {aiInsights.cinematic_analysis.narrative_structure && (
                  <div className="col-span-2">
                    <div className="text-xs text-gray-500 mb-1">Narrative Structure</div>
                    <p className="text-sm">{aiInsights.cinematic_analysis.narrative_structure}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Personalization */}
      {aiInsights.personalization && (
        <Card className="border-l-4 border-l-yellow-500">
          <div 
            className="p-4 cursor-pointer flex items-center justify-between"
            onClick={() => toggleSection('personalization')}
          >
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-yellow-500" />
              <span className="font-medium">Personal Match</span>
            </div>
            {expandedSections.has('personalization') ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </div>
          
          {expandedSections.has('personalization') && (
            <div className="px-4 pb-4 border-t border-gray-100">
              <div className="space-y-3 mt-3">
                {aiInsights.personalization.genre_match && (
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Genre Preference Match</div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-yellow-500 h-2 rounded-full transition-all"
                          style={{ width: `${aiInsights.personalization.genre_match * 100}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium">
                        {Math.round(aiInsights.personalization.genre_match * 100)}%
                      </span>
                    </div>
                  </div>
                )}
                
                {aiInsights.personalization.similar_movies && (
                  <div>
                    <div className="text-xs text-gray-500 mb-2">Similar to movies you liked</div>
                    <div className="flex flex-wrap gap-1">
                      {aiInsights.personalization.similar_movies.slice(0, 3).map(movie => (
                        <Badge key={movie} variant="secondary" className="text-xs">
                          {movie}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                
                {aiInsights.personalization.user_pattern_match && (
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Pattern Match</div>
                    <p className="text-sm text-gray-700">{aiInsights.personalization.user_pattern_match}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Recommendation Reasoning */}
      {aiInsights.recommendation_reasoning && (
        <Card className="border-l-4 border-l-indigo-500">
          <div 
            className="p-4 cursor-pointer flex items-center justify-between"
            onClick={() => toggleSection('reasoning')}
          >
            <div className="flex items-center gap-2">
              <Brain className="w-4 h-4 text-indigo-500" />
              <span className="font-medium">AI Reasoning</span>
            </div>
            {expandedSections.has('reasoning') ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </div>
          
          {expandedSections.has('reasoning') && (
            <div className="px-4 pb-4 border-t border-gray-100">
              <div className="space-y-3 mt-3">
                {aiInsights.recommendation_reasoning.primary_reason && (
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Primary Reason</div>
                    <p className="text-sm font-medium text-gray-800">
                      {aiInsights.recommendation_reasoning.primary_reason}
                    </p>
                  </div>
                )}
                
                {aiInsights.recommendation_reasoning.supporting_factors && (
                  <div>
                    <div className="text-xs text-gray-500 mb-2">Supporting Factors</div>
                    <ul className="text-sm space-y-1">
                      {aiInsights.recommendation_reasoning.supporting_factors.map((factor, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <Star className="w-3 h-3 text-indigo-500 mt-0.5 flex-shrink-0" />
                          <span>{factor}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {aiInsights.recommendation_reasoning.discovery_factor && (
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Discovery Type</div>
                    <Badge 
                      variant={
                        aiInsights.recommendation_reasoning.discovery_factor === 'safe' ? 'default' :
                        aiInsights.recommendation_reasoning.discovery_factor === 'stretch' ? 'secondary' : 'outline'
                      }
                      className="text-xs"
                    >
                      {aiInsights.recommendation_reasoning.discovery_factor} choice
                    </Badge>
                  </div>
                )}
                
                {aiInsights.recommendation_reasoning.optimal_viewing_context && (
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Best Viewing Context</div>
                    <p className="text-sm text-gray-700">
                      {aiInsights.recommendation_reasoning.optimal_viewing_context}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Expand All / Collapse All */}
      <div className="flex gap-2 pt-2">
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => setExpandedSections(new Set(['overview', 'emotional', 'thematic', 'cinematic', 'personalization', 'reasoning']))}
          className="text-xs"
        >
          Expand All
        </Button>
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => setExpandedSections(new Set(['overview']))}
          className="text-xs"
        >
          Collapse All
        </Button>
      </div>
    </div>
  )
}