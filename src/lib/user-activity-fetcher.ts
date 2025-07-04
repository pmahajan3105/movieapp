/**
 * Fetches user activity data for onboarding status assessment
 */

import { supabase } from '@/lib/supabase/browser-client'

export interface UserActivityData {
  profile: {
    onboarding_completed: boolean
    preferences: any
    created_at: string
  } | null
  interactions: {
    ratings_count: number
    watchlist_count: number
    chat_messages_count: number
    last_activity: string | null
    recent_activity_days: number
  }
  aiProfile: {
    favorite_genres: string[]
    ai_confidence: number
    last_learning_event: string | null
  } | null
}

export async function fetchUserActivityData(userId: string): Promise<UserActivityData> {
  try {
    // Fetch user profile
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('onboarding_completed, preferences, created_at')
      .eq('id', userId)
      .single()

    // Fetch interaction counts
    const [ratingsResult, watchlistResult, chatSessionsResult] = await Promise.allSettled([
      supabase
        .from('ratings')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId),
      
      supabase
        .from('watchlist')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId),
      
      supabase
        .from('chat_sessions')
        .select('messages, created_at')
        .eq('user_id', userId)
    ])

    // Calculate ratings count
    const ratings_count = ratingsResult.status === 'fulfilled' ? (ratingsResult.value.count || 0) : 0
    
    // Calculate watchlist count
    const watchlist_count = watchlistResult.status === 'fulfilled' ? (watchlistResult.value.count || 0) : 0
    
    // Calculate chat messages count and last activity
    let chat_messages_count = 0
    let last_activity: string | null = null
    
    if (chatSessionsResult.status === 'fulfilled' && chatSessionsResult.value.data) {
      chat_messages_count = chatSessionsResult.value.data.reduce((total, session) => {
        const messages = session.messages as any[]
        return total + (messages?.length || 0)
      }, 0)
      
      // Get the most recent activity
      const recentSessions = chatSessionsResult.value.data
        .filter(session => session.created_at)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      
      last_activity = recentSessions[0]?.created_at || null
    }

    // Calculate recent activity days
    const recent_activity_days = last_activity 
      ? Math.floor((Date.now() - new Date(last_activity).getTime()) / (1000 * 60 * 60 * 24))
      : 999

    // Fetch AI profile data
    const { data: aiProfileData } = await supabase
      .from('user_preference_insights')
      .select('insights, confidence_score, updated_at')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .single()

    // Extract AI profile information
    let aiProfile = null
    if (aiProfileData?.insights) {
      const insights = aiProfileData.insights as any
      aiProfile = {
        favorite_genres: insights.favorite_genres || [],
        ai_confidence: aiProfileData.confidence_score || 0,
        last_learning_event: aiProfileData.updated_at
      }
    }

    return {
      profile,
      interactions: {
        ratings_count,
        watchlist_count,
        chat_messages_count,
        last_activity,
        recent_activity_days
      },
      aiProfile
    }

  } catch (error) {
    console.error('Error fetching user activity data:', error)
    
    // Return empty data structure on error
    return {
      profile: null,
      interactions: {
        ratings_count: 0,
        watchlist_count: 0,
        chat_messages_count: 0,
        last_activity: null,
        recent_activity_days: 999
      },
      aiProfile: null
    }
  }
}

// Alternative API route approach for server-side fetching
export async function fetchUserActivityDataAPI(userId: string): Promise<UserActivityData> {
  try {
    const response = await fetch(`/api/user/activity-summary?userId=${userId}`)
    
    if (!response.ok) {
      throw new Error(`Failed to fetch user activity: ${response.statusText}`)
    }
    
    return await response.json()
  } catch (error) {
    console.error('Error fetching user activity via API:', error)
    return {
      profile: null,
      interactions: {
        ratings_count: 0,
        watchlist_count: 0,
        chat_messages_count: 0,
        last_activity: null,
        recent_activity_days: 999
      },
      aiProfile: null
    }
  }
}