/**
 * Utilities for detecting user onboarding status and interaction level
 */

interface UserOnboardingStatus {
  hasCompletedOnboarding: boolean
  hasRatedMovies: boolean
  hasChatHistory: boolean
  hasWatchlistItems: boolean
  interactionLevel: 'new' | 'minimal' | 'active'
  suggestedActions: string[]
}

interface UserProfile {
  favorite_genres?: string[]
  preferences?: any
  ai_confidence?: number
  last_learning_event?: string
}

interface UserInteraction {
  ratings_count?: number
  watchlist_count?: number
  chat_messages_count?: number
  last_activity?: string
}

export function assessUserOnboardingStatus(
  userProfile: UserProfile | null,
  userInteractions: UserInteraction | null
): UserOnboardingStatus {
  const hasCompletedOnboarding = !!(
    userProfile?.favorite_genres?.length && 
    userProfile?.preferences
  )
  
  const hasRatedMovies = (userInteractions?.ratings_count || 0) > 0
  const hasChatHistory = (userInteractions?.chat_messages_count || 0) > 0
  const hasWatchlistItems = (userInteractions?.watchlist_count || 0) > 0
  
  // Determine interaction level
  let interactionLevel: 'new' | 'minimal' | 'active' = 'new'
  const totalInteractions = (userInteractions?.ratings_count || 0) + 
                           (userInteractions?.chat_messages_count || 0) + 
                           (userInteractions?.watchlist_count || 0)
  
  if (totalInteractions >= 10) {
    interactionLevel = 'active'
  } else if (totalInteractions >= 3) {
    interactionLevel = 'minimal'
  }
  
  // Generate suggested actions based on status
  const suggestedActions: string[] = []
  
  if (!hasCompletedOnboarding) {
    suggestedActions.push('Complete your movie profile')
  }
  
  if (!hasRatedMovies || (userInteractions?.ratings_count || 0) < 5) {
    suggestedActions.push('Rate some movies you know')
  }
  
  if (!hasChatHistory) {
    suggestedActions.push('Ask for personalized recommendations')
  }
  
  if (!hasWatchlistItems) {
    suggestedActions.push('Save movies to your watchlist')
  }
  
  return {
    hasCompletedOnboarding,
    hasRatedMovies,
    hasChatHistory,
    hasWatchlistItems,
    interactionLevel,
    suggestedActions
  }
}

export function getNewUserMessages(onboardingStatus: UserOnboardingStatus): {
  primaryMessage: string
  secondaryMessage: string
  ctaText: string
} {
  const { interactionLevel, hasCompletedOnboarding, hasRatedMovies } = onboardingStatus
  
  if (interactionLevel === 'new') {
    return {
      primaryMessage: "Welcome to CineAI! 🎬",
      secondaryMessage: "Let's learn about your movie taste to create amazing recommendations",
      ctaText: hasCompletedOnboarding ? "Rate some movies" : "Get started"
    }
  }
  
  if (interactionLevel === 'minimal') {
    return {
      primaryMessage: "Great start! 🌟",
      secondaryMessage: hasRatedMovies 
        ? "Rate a few more movies to unlock better recommendations"
        : "Your AI is learning! Try rating movies you've seen",
      ctaText: "Continue learning"
    }
  }
  
  return {
    primaryMessage: "AI is learning your taste! 🤖",
    secondaryMessage: "Keep interacting to get even better recommendations",
    ctaText: "Explore more"
  }
}

export function getProgressPercentage(onboardingStatus: UserOnboardingStatus): number {
  const { hasCompletedOnboarding, hasRatedMovies, hasChatHistory, hasWatchlistItems } = onboardingStatus
  
  let progress = 0
  
  if (hasCompletedOnboarding) progress += 30
  if (hasRatedMovies) progress += 25
  if (hasChatHistory) progress += 25
  if (hasWatchlistItems) progress += 20
  
  return Math.min(progress, 100)
}

export function getNextMilestone(onboardingStatus: UserOnboardingStatus): string {
  const { hasCompletedOnboarding, hasRatedMovies, hasChatHistory, hasWatchlistItems } = onboardingStatus
  
  if (!hasCompletedOnboarding) {
    return "Complete your movie profile to unlock personalized recommendations"
  }
  
  if (!hasRatedMovies) {
    return "Rate 5 movies to help AI understand your taste"
  }
  
  if (!hasChatHistory) {
    return "Chat with AI to get conversational recommendations"
  }
  
  if (!hasWatchlistItems) {
    return "Save movies to your watchlist to track what you want to watch"
  }
  
  return "Keep exploring to discover amazing movies!"
}