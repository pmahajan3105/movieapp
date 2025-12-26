/**
 * AI Learning Dashboard
 * Phase 3: Full AI transparency and user control
 * 
 * Shows users what the AI has learned about their taste and provides
 * visibility into recommendation reasoning and system behavior.
 */

'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Brain, TrendingUp, Eye, BarChart3, Clock, Zap, AlertCircle, Star, MessageCircle, Sparkles } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { assessUserOnboardingStatus } from '@/lib/user-onboarding-utils'
import { NewUserEmptyState } from '@/components/dashboard/NewUserEmptyState'
import { QuickRatingWidget } from '@/components/dashboard/QuickRatingWidget'
import { fetchUserActivityData } from '@/lib/user-activity-fetcher'
import Image from 'next/image'

interface TasteProfile {
  user_id: string
  preferences: any
  favorite_genres?: string[]
  preference_strength?: any
  ai_confidence?: number
  last_learning_event?: string
  updated_at: string
}

interface RecentRecommendation {
  id: string
  movie: {
    id: string
    title: string
    year: number
    poster_url?: string
  }
  confidence: number
  reason: string
  analysis_source: string
  ai_insights?: any
  generated_at: string
}

interface AIInsight {
  type: 'genre_learning' | 'mood_preference' | 'style_preference' | 'behavioral_pattern'
  title: string
  description: string
  confidence: number
  learnedFrom: string
  timestamp: string
}

export const AILearningDashboard: React.FC = () => {
  const { user } = useAuth()
  const [tasteProfile, setTasteProfile] = useState<TasteProfile | null>(null)
  const [recentRecommendations, setRecentRecommendations] = useState<RecentRecommendation[]>([])
  const [aiInsights, setAIInsights] = useState<AIInsight[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'insights' | 'recommendations' | 'learning'>('overview')
  const [userActivityData, setUserActivityData] = useState<any>(null)
  const [showQuickRating, setShowQuickRating] = useState(false)
  const [selectedMovie, setSelectedMovie] = useState<RecentRecommendation | null>(null)
  const [showModal, setShowModal] = useState(false)

  const loadAILearningData = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Load all AI learning data in parallel
      const [profileResponse, recommendationsResponse, userActivityResponse] = await Promise.allSettled([
        fetch('/api/user/ai-profile'),
        fetch('/api/recommendations/recent?limit=6'),
        fetchUserActivityData(user?.id || '')
      ])

      // Process taste profile
      if (profileResponse.status === 'fulfilled' && profileResponse.value.ok) {
        const profileData = await profileResponse.value.json()
        setTasteProfile(profileData.profile)
      }

      // Process recent recommendations
      if (recommendationsResponse.status === 'fulfilled' && recommendationsResponse.value.ok) {
        const recsData = await recommendationsResponse.value.json()
        setRecentRecommendations(recsData.recommendations || [])
      }

      // Process user activity data
      if (userActivityResponse.status === 'fulfilled') {
        setUserActivityData(userActivityResponse.value)
      }

      // Process AI insights (generate from available data)
      const insights = generateAIInsights(tasteProfile, recentRecommendations)
      setAIInsights(insights)

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load AI learning data'
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [user])

  useEffect(() => {
    if (user) {
      loadAILearningData()
    }
  }, [user, loadAILearningData])

  // Move generateAIInsights here, outside of loadAILearningData and any other function
  const generateAIInsights = (profile: TasteProfile | null, recommendations: RecentRecommendation[]): AIInsight[] => {
    const insights: AIInsight[] = []

    if (profile?.favorite_genres && profile.favorite_genres.length > 0) {
      insights.push({
        type: 'genre_learning',
        title: 'Genre Preferences Identified',
        description: `Your taste strongly aligns with ${profile.favorite_genres.slice(0, 2).join(' and ')} films`,
        confidence: profile.ai_confidence || 0.7,
        learnedFrom: 'Ratings and viewing history',
        timestamp: profile.updated_at
      })
    }

    if (recommendations.length > 0) {
      const avgConfidence = recommendations.reduce((sum, rec) => sum + rec.confidence, 0) / recommendations.length
      const enhancedCount = recommendations.filter(rec => rec.analysis_source === 'enhanced' || rec.analysis_source === 'full_ai').length
      
      insights.push({
        type: 'behavioral_pattern',
        title: 'Recommendation Quality',
        description: `AI generates ${(avgConfidence * 100).toFixed(0)}% confidence matches. ${enhancedCount}/${recommendations.length} use enhanced analysis.`,
        confidence: avgConfidence,
        learnedFrom: 'Background AI analysis',
        timestamp: recommendations[0]?.generated_at || new Date().toISOString()
      })
    }

    if (profile?.preferences) {
      const prefs = profile.preferences
      if (prefs.visual_style || prefs.pacing_preference) {
        insights.push({
          type: 'style_preference',
          title: 'Style & Pacing Learned',
          description: `Prefers ${prefs.pacing_preference || 'balanced'} pacing with ${prefs.visual_style || 'contemporary'} visual style`,
          confidence: 0.8,
          learnedFrom: 'Conversation analysis and ratings',
          timestamp: profile.updated_at
        })
      }
    }

    return insights
  }

  // Check if user is new and needs onboarding experience
  const isNewUser = userActivityData ? assessUserOnboardingStatus(
    userActivityData.aiProfile,
    userActivityData.interactions
  ).interactionLevel === 'new' : false


  // Event handlers for new user experience
  const handleStartOnboarding = () => {
    // Navigate to onboarding or trigger onboarding modal
    window.location.href = '/onboarding'
  }

  const handleStartRating = () => {
    setShowQuickRating(true)
  }

  const handleOpenChat = () => {
    // Trigger chat widget or navigate to chat
    const chatWidget = document.querySelector('[data-floating-chat-widget]')
    if (chatWidget) {
      (chatWidget as any).click?.()
    }
  }

  const handleRatingComplete = async () => {
    // Don't refresh data immediately to avoid resetting QuickRatingWidget state
    // Data will be refreshed when user exits rating mode
    // This keeps the rating flow smooth and continuous
  }

  const handleTabChange = useCallback((tab: 'overview' | 'insights' | 'recommendations' | 'learning') => {
    setActiveTab(tab)
  }, [])

  const handleRecommendationClick = useCallback((movie: RecentRecommendation) => {
    setSelectedMovie(movie)
    setShowModal(true)
  }, [])

  const handleCloseModal = useCallback(() => {
    setShowModal(false)
    setSelectedMovie(null)
  }, [])

  const handleRating = useCallback((movieId: string, rating: number) => {
    // ...
  }, [])

  if (!user) {
    return (
      <div className="text-center py-8">
        <p className="text-base-content/60">Please log in to view your AI learning dashboard</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3 mb-6">
          <Brain className="w-8 h-8 text-primary animate-pulse" />
          <h2 className="text-3xl font-bold">AI Learning Dashboard</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card bg-base-200 animate-pulse">
              <div className="card-body">
                <div className="w-full h-6 bg-base-300 rounded mb-2" />
                <div className="w-3/4 h-4 bg-base-300 rounded mb-4" />
                <div className="w-full h-20 bg-base-300 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <AlertCircle className="w-16 h-16 text-error mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-error mb-2">Failed to Load AI Data</h3>
        <p className="text-base-content/60 mb-4">{error}</p>
        <button onClick={loadAILearningData} className="btn btn-primary">
          Retry Loading
        </button>
      </div>
    )
  }

  // Show new user experience if user is new or has minimal data  
  if (isNewUser && userActivityData && !showQuickRating) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Brain className="w-8 h-8 text-primary" />
            <h2 className="text-3xl font-bold">AI Learning Dashboard</h2>
          </div>
          <div className="flex items-center gap-2">
            <div className="badge badge-warning">
              <Sparkles className="w-3 h-3 mr-1" />
              Getting Started
            </div>
          </div>
        </div>

        {/* New User Experience */}
        <NewUserEmptyState
          userProfile={userActivityData.aiProfile}
          userInteractions={userActivityData.interactions}
          onStartOnboarding={handleStartOnboarding}
          onStartRating={handleStartRating}
          onOpenChat={handleOpenChat}
        />
      </div>
    )
  }

  // Show quick rating widget if triggered
  if (showQuickRating) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Brain className="w-8 h-8 text-primary" />
            <h2 className="text-3xl font-bold">AI Learning Dashboard</h2>
          </div>
          <div className="flex items-center gap-2">
            <div className="badge badge-info">
              <Star className="w-3 h-3 mr-1" />
              Rating Mode
            </div>
            <button
              onClick={() => setShowQuickRating(false)}
              className="btn btn-sm btn-ghost"
            >
              Back to Dashboard
            </button>
          </div>
        </div>

        {/* Quick Rating Widget */}
        <QuickRatingWidget
          onRatingComplete={handleRatingComplete}
          onSkip={() => {
            setShowQuickRating(false)
            // Refresh data when exiting rating mode
            loadAILearningData()
          }}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Brain className="w-8 h-8 text-primary" />
          <h2 className="text-3xl font-bold">AI Learning Dashboard</h2>
        </div>
        <div className="flex items-center gap-2">
          <div className="badge badge-primary">
            <Zap className="w-3 h-3 mr-1" />
            AI Active
          </div>
          {tasteProfile?.ai_confidence && (
            <div className="badge badge-success">
              {(tasteProfile.ai_confidence * 100).toFixed(0)}% Confidence
            </div>
          )}
          {/* Quick actions for existing users */}
          {userActivityData && (
            <button
              onClick={handleStartRating}
              className="btn btn-sm btn-outline gap-1"
            >
              <Star className="w-3 h-3" />
              Rate Movies
            </button>
          )}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="tabs tabs-bordered">
        <button 
          className={`tab ${activeTab === 'overview' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <Eye className="w-4 h-4 mr-2" />
          Overview
        </button>
        <button 
          className={`tab ${activeTab === 'insights' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('insights')}
        >
          <Brain className="w-4 h-4 mr-2" />
          AI Insights
        </button>
        <button 
          className={`tab ${activeTab === 'recommendations' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('recommendations')}
        >
          <TrendingUp className="w-4 h-4 mr-2" />
          Recent Recommendations
        </button>
        <button 
          className={`tab ${activeTab === 'learning' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('learning')}
        >
          <BarChart3 className="w-4 h-4 mr-2" />
          Learning Progress
        </button>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === 'overview' && (
          <OverviewTab 
            tasteProfile={tasteProfile}
            recentRecommendations={recentRecommendations}
            aiInsights={aiInsights}
            onStartRating={handleStartRating}
            onOpenChat={handleOpenChat}
          />
        )}
        
        {activeTab === 'insights' && (
          <InsightsTab aiInsights={aiInsights} />
        )}
        
        {activeTab === 'recommendations' && (
          <RecommendationsTab recommendations={recentRecommendations} />
        )}
        
        {activeTab === 'learning' && (
          <LearningProgressTab tasteProfile={tasteProfile} />
        )}
      </div>
    </div>
  )
}

// Overview Tab Component
const OverviewTab: React.FC<{
  tasteProfile: TasteProfile | null
  recentRecommendations: RecentRecommendation[]
  aiInsights: AIInsight[]
  onStartRating: () => void
  onOpenChat: () => void
}> = ({ tasteProfile, recentRecommendations, aiInsights, onStartRating, onOpenChat }) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Taste Profile Summary */}
      <div className="card bg-base-100 shadow-lg">
        <div className="card-body">
          <h3 className="card-title flex items-center gap-2">
            <Brain className="w-5 h-5 text-primary" />
            What I Know About Your Taste
          </h3>
          
          {tasteProfile ? (
            <div className="space-y-4">
              {/* Favorite Genres */}
              {tasteProfile.favorite_genres && tasteProfile.favorite_genres.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">Favorite Genres</h4>
                  <div className="flex flex-wrap gap-2">
                    {tasteProfile.favorite_genres.map((genre, index) => (
                      <span key={index} className="badge badge-primary">{genre}</span>
                    ))}
                  </div>
                </div>
              )}
              
              {/* AI Confidence */}
              <div>
                <h4 className="font-semibold mb-2">AI Confidence</h4>
                <div className="flex items-center gap-2">
                  <progress 
                    className="progress progress-primary w-full" 
                    value={(tasteProfile.ai_confidence || 0.5) * 100} 
                    max="100"
                  />
                  <span className="text-sm">{((tasteProfile.ai_confidence || 0.5) * 100).toFixed(0)}%</span>
                </div>
                <p className="text-sm text-base-content/60 mt-1">
                  How confident the AI is about understanding your preferences
                </p>
              </div>

              {/* Last Learning Event */}
              {tasteProfile.last_learning_event && (
                <div>
                  <h4 className="font-semibold mb-2">Last Learning</h4>
                  <div className="flex items-center gap-2 text-sm text-base-content/60">
                    <Clock className="w-4 h-4" />
                    {new Date(tasteProfile.last_learning_event).toLocaleDateString()}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-4 space-y-3">
              <Brain className="w-12 h-12 text-base-content/30 mx-auto mb-2" />
              <div>
                <p className="text-base-content/60 font-medium">No taste profile yet</p>
                <p className="text-sm text-base-content/40">Rate some movies to help AI learn your preferences</p>
              </div>
              <button
                onClick={onStartRating}
                className="btn btn-sm btn-primary gap-2"
              >
                <Star className="w-4 h-4" />
                Start Rating Movies
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Recent AI Insights */}
      <div className="card bg-base-100 shadow-lg">
        <div className="card-body">
          <h3 className="card-title flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-secondary" />
            Recent AI Insights
          </h3>
          
          <div className="space-y-3">
            {aiInsights.slice(0, 3).map((insight, index) => (
              <div key={index} className="border-l-4 border-primary pl-4">
                <h4 className="font-semibold text-sm">{insight.title}</h4>
                <p className="text-sm text-base-content/70">{insight.description}</p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-base-content/50">{insight.learnedFrom}</span>
                  <div className="badge badge-outline badge-sm">
                    {(insight.confidence * 100).toFixed(0)}% confident
                  </div>
                </div>
              </div>
            ))}
            
            {aiInsights.length === 0 && (
              <div className="text-center py-4 space-y-3">
                <Eye className="w-12 h-12 text-base-content/30 mx-auto mb-2" />
                <div>
                  <p className="text-base-content/60 font-medium">No insights yet</p>
                  <p className="text-sm text-base-content/40">AI will learn more as you interact with recommendations</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 justify-center">
                  <button
                    onClick={onStartRating}
                    className="btn btn-sm btn-primary gap-2"
                  >
                    <Star className="w-4 h-4" />
                    Rate Movies
                  </button>
                  <button
                    onClick={onOpenChat}
                    className="btn btn-sm btn-outline gap-2"
                  >
                    <MessageCircle className="w-4 h-4" />
                    Chat with AI
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// AI Insights Tab
const InsightsTab: React.FC<{ aiInsights: AIInsight[] }> = ({ aiInsights }) => {
  return (
    <div className="space-y-4">
      {aiInsights.map((insight, index) => (
        <div key={index} className="card bg-base-100 shadow-lg">
          <div className="card-body">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="card-title text-lg">{insight.title}</h3>
                <p className="text-base-content/70 mt-2">{insight.description}</p>
                
                <div className="flex items-center gap-4 mt-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-base-content/60">Learned from:</span>
                    <span className="text-sm font-medium">{insight.learnedFrom}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-base-content/60">When:</span>
                    <span className="text-sm">{new Date(insight.timestamp).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
              
              <div className="ml-4">
                <div className="radial-progress text-primary" style={{"--value": insight.confidence * 100} as any}>
                  {(insight.confidence * 100).toFixed(0)}%
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
      
      {aiInsights.length === 0 && (
        <div className="text-center py-12">
          <Brain className="w-16 h-16 text-base-content/30 mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">No AI Insights Yet</h3>
          <p className="text-base-content/60">
            The AI will generate insights as you rate movies and interact with recommendations
          </p>
        </div>
      )}
    </div>
  )
}

// Recent Recommendations Tab
const RecommendationsTab: React.FC<{ recommendations: RecentRecommendation[] }> = ({ recommendations }) => {
  return (
    <div className="space-y-4">
      {recommendations.map((rec, index) => (
        <div key={index} className="card bg-base-100 shadow-lg">
          <div className="card-body">
            <div className="flex items-start gap-4">
              {rec.movie.poster_url && (
                <Image
                  src={rec.movie.poster_url}
                  alt={rec.movie.title}
                  width={64}
                  height={96}
                  className="w-16 h-24 object-cover rounded"
                  unoptimized
                />
              )}
              
              <div className="flex-1">
                <h3 className="font-bold text-lg">{rec.movie.title} ({rec.movie.year})</h3>
                <p className="text-base-content/70 mt-1">{rec.reason}</p>
                
                <div className="flex items-center gap-4 mt-3">
                  <div className="badge badge-primary">
                    {(rec.confidence * 100).toFixed(0)}% match
                  </div>
                  <div className="badge badge-outline">
                    {rec.analysis_source.replace('_', ' ')}
                  </div>
                  <span className="text-sm text-base-content/60">
                    {new Date(rec.generated_at).toLocaleDateString()}
                  </span>
                </div>
                
                {/* AI Insights Preview */}
                {rec.ai_insights && (
                  <div className="mt-3 p-3 bg-base-200 rounded-lg">
                    <h4 className="font-semibold text-sm mb-2">AI Analysis</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
                      {rec.ai_insights.emotional && (
                        <div>
                          <span className="font-medium">Tone:</span> {rec.ai_insights.emotional.dominantTone}
                        </div>
                      )}
                      {rec.ai_insights.thematic && (
                        <div>
                          <span className="font-medium">Theme:</span> {rec.ai_insights.thematic.coreTheme}
                        </div>
                      )}
                      {rec.ai_insights.cinematic && (
                        <div>
                          <span className="font-medium">Style:</span> {rec.ai_insights.cinematic.visualSignature}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}
      
      {recommendations.length === 0 && (
        <div className="text-center py-12">
          <TrendingUp className="w-16 h-16 text-base-content/30 mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">No Recent Recommendations</h3>
          <p className="text-base-content/60">
            Background AI will generate personalized recommendations based on trending movies
          </p>
        </div>
      )}
    </div>
  )
}

// Learning Progress Tab
const LearningProgressTab: React.FC<{ tasteProfile: TasteProfile | null }> = ({ tasteProfile }) => {
  const learningMetrics = [
    {
      name: 'Genre Understanding',
      value: tasteProfile?.favorite_genres?.length ? Math.min(tasteProfile.favorite_genres.length * 20, 100) : 0,
      description: 'How well AI understands your genre preferences'
    },
    {
      name: 'Style Preferences',
      value: tasteProfile?.preferences?.visual_style ? 80 : 20,
      description: 'Knowledge of your visual and stylistic preferences'
    },
    {
      name: 'Overall Confidence',
      value: (tasteProfile?.ai_confidence || 0.3) * 100,
      description: 'AI confidence in making accurate recommendations'
    }
  ]

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {learningMetrics.map((metric, index) => (
          <div key={index} className="card bg-base-100 shadow-lg">
            <div className="card-body text-center">
              <div className="radial-progress text-primary text-2xl" style={{"--value": metric.value} as any}>
                {metric.value.toFixed(0)}%
              </div>
              <h3 className="font-bold mt-4">{metric.name}</h3>
              <p className="text-sm text-base-content/60">{metric.description}</p>
            </div>
          </div>
        ))}
      </div>
      
      <div className="card bg-base-100 shadow-lg">
        <div className="card-body">
          <h3 className="card-title">Improvement Suggestions</h3>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="badge badge-primary mt-1">1</div>
              <div>
                <h4 className="font-semibold">Rate More Movies</h4>
                <p className="text-sm text-base-content/60">
                  Rating movies helps AI understand your taste patterns better
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="badge badge-secondary mt-1">2</div>
              <div>
                <h4 className="font-semibold">Explore Different Genres</h4>
                <p className="text-sm text-base-content/60">
                  Try rating movies from various genres to improve recommendation diversity
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="badge badge-accent mt-1">3</div>
              <div>
                <h4 className="font-semibold">Use Chat Features</h4>
                <p className="text-sm text-base-content/60">
                  Tell the AI what you liked or disliked about specific movies
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}