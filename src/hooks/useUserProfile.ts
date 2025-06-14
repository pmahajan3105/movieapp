import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'

// Define user preference types
interface UserPreferences {
  // Genre preferences
  preferredGenres?: string[]
  dislikedGenres?: string[]

  // Movie characteristics
  preferredRatings?: string[] // e.g., ['PG', 'PG-13', 'R']
  preferredYearRange?: {
    min?: number
    max?: number
  }

  // Content preferences
  includeAdultContent?: boolean
  preferredLanguages?: string[]

  // Watch preferences
  maxRuntime?: number
  minRuntime?: number

  // Recommendation settings
  diversityLevel?: 'low' | 'medium' | 'high'
  explorationLevel?: 'safe' | 'balanced' | 'adventurous'

  // UI preferences
  gridViewMode?: 'compact' | 'comfortable' | 'spacious'
  autoplayTrailers?: boolean

  // Extensible for custom preferences
  [key: string]: string | number | boolean | string[] | object | undefined
}

interface UserProfile {
  id: string
  email: string
  full_name?: string
  preferences?: UserPreferences
  onboarding_completed: boolean
  created_at: string
  updated_at: string
}

interface UserProfileResponse {
  success: boolean
  data?: UserProfile
  error?: string
}

// Query keys for caching
export const userProfileKeys = {
  all: ['userProfile'] as const,
  profile: (userId?: string) => [...userProfileKeys.all, userId] as const,
}

export function useUserProfile() {
  const { user } = useAuth()

  return useQuery({
    queryKey: userProfileKeys.profile(user?.id),
    queryFn: async (): Promise<UserProfile | null> => {
      const response = await fetch('/api/user/profile')

      if (!response.ok) {
        if (response.status === 401) {
          return null // User not authenticated
        }
        throw new Error(`Failed to fetch user profile: ${response.statusText}`)
      }

      const data: UserProfileResponse = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch user profile')
      }

      return data.data || null
    },
    enabled: !!user, // Only run query if user is authenticated
    staleTime: 10 * 60 * 1000, // 10 minutes - profile data doesn't change often
    gcTime: 30 * 60 * 1000, // 30 minutes cache time
    retry: (failureCount, error) => {
      // Don't retry on 401/403 errors (authentication issues)
      if (error instanceof Error && error.message.includes('401')) {
        return false
      }
      return failureCount < 2
    },
  })
}
