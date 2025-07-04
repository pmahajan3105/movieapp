'use client'

import React, { useState } from 'react'
import { Brain, Star, MessageCircle, Bookmark, TrendingUp, ArrowRight, Sparkles } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { assessUserOnboardingStatus, getNewUserMessages, getProgressPercentage, getNextMilestone } from '@/lib/user-onboarding-utils'

interface NewUserEmptyStateProps {
  userProfile: any
  userInteractions: any
  onStartOnboarding?: () => void
  onStartRating?: () => void
  onOpenChat?: () => void
  className?: string
}

export const NewUserEmptyState: React.FC<NewUserEmptyStateProps> = ({
  userProfile,
  userInteractions,
  onStartOnboarding,
  onStartRating,
  onOpenChat,
  className = ''
}) => {
  const router = useRouter()
  const [showDetails, setShowDetails] = useState(false)
  
  const onboardingStatus = assessUserOnboardingStatus(userProfile, userInteractions)
  const messages = getNewUserMessages(onboardingStatus)
  const progress = getProgressPercentage(onboardingStatus)
  const nextMilestone = getNextMilestone(onboardingStatus)
  
  const handlePrimaryAction = () => {
    if (!onboardingStatus.hasCompletedOnboarding) {
      onStartOnboarding?.()
    } else if (!onboardingStatus.hasRatedMovies) {
      onStartRating?.()
    } else {
      onOpenChat?.()
    }
  }
  
  const actionCards = [
    {
      icon: Brain,
      title: "Complete Your Profile",
      description: "Tell us your favorite genres and movie preferences",
      action: () => onStartOnboarding?.(),
      completed: onboardingStatus.hasCompletedOnboarding,
      primary: !onboardingStatus.hasCompletedOnboarding
    },
    {
      icon: Star,
      title: "Rate Movies",
      description: "Rate movies you've seen to train your AI",
      action: () => onStartRating?.(),
      completed: onboardingStatus.hasRatedMovies,
      primary: onboardingStatus.hasCompletedOnboarding && !onboardingStatus.hasRatedMovies
    },
    {
      icon: MessageCircle,
      title: "Chat with AI",
      description: "Ask for personalized recommendations",
      action: () => onOpenChat?.(),
      completed: onboardingStatus.hasChatHistory,
      primary: onboardingStatus.hasRatedMovies && !onboardingStatus.hasChatHistory
    },
    {
      icon: Bookmark,
      title: "Build Watchlist",
      description: "Save movies you want to watch",
      action: () => router.push('/dashboard/discover'),
      completed: onboardingStatus.hasWatchlistItems,
      primary: false
    }
  ]
  
  return (
    <div className={`space-y-6 ${className}`}>
      {/* Welcome Header */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-2">
          <Sparkles className="w-8 h-8 text-primary animate-pulse" />
          <h2 className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            {messages.primaryMessage}
          </h2>
        </div>
        <p className="text-lg text-base-content/70 max-w-md mx-auto">
          {messages.secondaryMessage}
        </p>
      </div>
      
      {/* Progress Section */}
      <div className="card bg-gradient-to-br from-primary/10 to-secondary/10 border border-primary/20">
        <div className="card-body">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              AI Learning Progress
            </h3>
            <div className="text-2xl font-bold text-primary">
              {progress}%
            </div>
          </div>
          
          <div className="space-y-3">
            <progress className="progress progress-primary w-full" value={progress} max="100" />
            
            <div className="flex items-center justify-between text-sm">
              <span className="text-base-content/60">
                {nextMilestone}
              </span>
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="btn btn-xs btn-ghost"
              >
                {showDetails ? 'Hide' : 'Show'} Details
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {actionCards.map((card, index) => (
          <div
            key={index}
            className={`card cursor-pointer transition-all duration-200 hover:shadow-lg ${
              card.completed
                ? 'bg-success/10 border-success/30 hover:bg-success/20'
                : card.primary
                ? 'bg-primary/10 border-primary/30 hover:bg-primary/20 ring-2 ring-primary/20'
                : 'bg-base-100 border-base-300 hover:bg-base-200'
            }`}
            onClick={card.action}
          >
            <div className="card-body p-4">
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg ${
                  card.completed
                    ? 'bg-success/20 text-success'
                    : card.primary
                    ? 'bg-primary/20 text-primary'
                    : 'bg-base-200 text-base-content'
                }`}>
                  <card.icon className="w-5 h-5" />
                </div>
                
                <div className="flex-1">
                  <h4 className="font-semibold flex items-center gap-2">
                    {card.title}
                    {card.completed && (
                      <div className="badge badge-success badge-sm">✓</div>
                    )}
                    {card.primary && (
                      <div className="badge badge-primary badge-sm">Next</div>
                    )}
                  </h4>
                  <p className="text-sm text-base-content/60 mt-1">
                    {card.description}
                  </p>
                </div>
                
                <ArrowRight className="w-4 h-4 text-base-content/40" />
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Detailed Progress */}
      {showDetails && (
        <div className="card bg-base-100 border border-base-300">
          <div className="card-body">
            <h4 className="font-semibold mb-3">Your Journey So Far</h4>
            <div className="space-y-2">
              {onboardingStatus.suggestedActions.map((action, index) => (
                <div key={index} className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                  <span>{action}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      
      {/* Primary CTA */}
      <div className="text-center">
        <button
          onClick={handlePrimaryAction}
          className="btn btn-primary btn-lg gap-2"
        >
          <Sparkles className="w-5 h-5" />
          {messages.ctaText}
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  )
}