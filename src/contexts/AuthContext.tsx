'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { User } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'

interface UserProfile {
  id: string
  email: string
  full_name?: string
  preferences?: any
  onboarding_completed?: boolean
  created_at?: string
  updated_at?: string
}

interface AuthUser extends User {
  onboarding_completed?: boolean
  profile?: UserProfile
}

interface AuthContextType {
  user: AuthUser | null
  loading: boolean
  signOut: () => Promise<void>
  reloadProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [initialized, setInitialized] = useState(false)

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  const supabase =
    supabaseUrl && supabaseAnonKey
      ? createBrowserClient<Database>(supabaseUrl, supabaseAnonKey)
      : null

  const loadUserProfile = async (authUser: User): Promise<AuthUser> => {
    if (!supabase) return authUser as AuthUser

    try {
      const { data: userProfile, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', authUser.id)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.warn('⚠️ Error loading user profile:', error.message)
      }

      return {
        ...authUser,
        profile: userProfile || undefined,
        onboarding_completed: userProfile?.onboarding_completed,
      }
    } catch (error) {
      console.error('❌ Error loading user profile:', error)
      return authUser as AuthUser
    }
  }

  const reloadProfile = async () => {
    if (!user || !supabase) return
    try {
      const enrichedUser = await loadUserProfile(user)
      setUser(enrichedUser)
      console.log('🔄 Profile reloaded successfully')
    } catch (error) {
      console.error('❌ Error reloading profile:', error)
    }
  }

  const signOut = async () => {
    if (!supabase) return
    try {
      await supabase.auth.signOut()
      setUser(null)
    } catch (error) {
      console.error('❌ Error signing out:', error)
    }
  }

  useEffect(() => {
    if (!supabase) {
      console.warn('Supabase not configured - auth will be disabled')
      setLoading(false)
      setInitialized(true)
      return
    }

    // Get initial session
    const initializeAuth = async () => {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession()

        if (error) {
          console.error('❌ Error getting initial session:', error)
          setUser(null)
        } else if (session?.user) {
          console.log('🔄 Initial session found, loading user profile')
          const enrichedUser = await loadUserProfile(session.user)
          setUser(enrichedUser)
        } else {
          console.log('🔄 No initial session found')
          setUser(null)
        }
      } catch (error) {
        console.error('❌ Error initializing auth:', error)
        setUser(null)
      } finally {
        setLoading(false)
        setInitialized(true)
      }
    }

    initializeAuth()

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔄 Auth state change:', { event, hasSession: !!session })

      if (!initialized) {
        // Skip processing during initialization to avoid double-loading
        return
      }

      try {
        if (session?.user) {
          const enrichedUser = await loadUserProfile(session.user)
          setUser(enrichedUser)
        } else {
          setUser(null)
        }
      } catch (error) {
        console.error('❌ Error handling auth state change:', error)
        setUser(null)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase, initialized])

  const value = {
    user,
    loading,
    signOut,
    reloadProfile,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
