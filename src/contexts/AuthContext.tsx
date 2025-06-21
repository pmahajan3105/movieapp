'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase as browserClient } from '@/lib/supabase/browser-client'
import type { UserProfile } from '@/lib/supabase/browser-client'

interface AuthUser extends User {
  profile?: UserProfile
}

interface AuthContextType {
  user: AuthUser | null
  isLoading: boolean
  signOut: () => Promise<void>
  refreshUser: () => Promise<void>
  isSessionValid: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  const supabase = supabaseUrl && supabaseAnonKey ? browserClient : null

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
      setIsLoading(false)
      return
    }

    // Get initial session
    const initializeAuth = async () => {
      try {
        console.log('🔍 AuthContext: Starting session initialization...')
        console.log(
          '🔍 AuthContext: Supabase URL:',
          process.env.NEXT_PUBLIC_SUPABASE_URL ? 'SET' : 'NOT SET'
        )
        console.log(
          '🔍 AuthContext: Supabase Key:',
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'SET' : 'NOT SET'
        )

        // Debug cookie information
        if (typeof document !== 'undefined') {
          const cookies = document.cookie.split('; ')
          const authCookies = cookies.filter(c => c.includes('auth-token'))
          console.log('🍪 AuthContext: Available cookies:', cookies.length)
          console.log('🍪 AuthContext: Auth cookies:', authCookies)
          console.log('🍪 AuthContext: Full document.cookie:', document.cookie)
        }

        console.log('🔄 AuthContext: Calling supabase.auth.getSession()...')
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession()

        console.log('🔍 AuthContext: Session check result:', {
          hasSession: !!session,
          hasUser: !!session?.user,
          userEmail: session?.user?.email,
          sessionExpiresAt: session?.expires_at,
          hasAccessToken: !!session?.access_token,
          hasRefreshToken: !!session?.refresh_token,
          error: error?.message || 'NONE',
        })

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
        setIsLoading(false)
      }
    }

    initializeAuth()

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔄 AuthContext: Auth state change:', {
        event,
        hasSession: !!session,
        hasUser: !!session?.user,
        userEmail: session?.user?.email,
      })

      try {
        if (session?.user) {
          console.log('✅ AuthContext: Setting user from auth state change')
          const enrichedUser = await loadUserProfile(session.user)
          setUser(enrichedUser)
        } else {
          console.log('❌ AuthContext: Clearing user from auth state change')
          setUser(null)
        }
      } catch (error) {
        console.error('❌ Error handling auth state change:', error)
        setUser(null)
      } finally {
        setIsLoading(false)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase])

  const value = {
    user,
    isLoading,
    signOut,
    refreshUser: reloadProfile,
    isSessionValid: !!user,
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
