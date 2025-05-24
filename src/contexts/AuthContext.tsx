'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { User } from '@supabase/auth-helpers-nextjs'

interface AuthUser extends User {
  onboarding_completed?: boolean
}

interface AuthContextType {
  user: AuthUser | null
  loading: boolean
  signOut: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClientComponentClient()

  const refreshUser = async () => {
    console.log('🔄 refreshUser called')
    try {
      const {
        data: { user: authUser },
        error,
      } = await supabase.auth.getUser()

      if (error) {
        console.error('❌ Error getting user:', error)
        setUser(null)
        return
      }

      if (authUser) {
        console.log('✅ Auth user found:', authUser.email)
        setUser(authUser as AuthUser)
      } else {
        console.log('📭 No auth user found')
        setUser(null)
      }
    } catch (error) {
      console.error('❌ Error refreshing user:', error)
      setUser(null)
    }
  }

  const signOut = async () => {
    try {
      setLoading(true)
      const { error } = await supabase.auth.signOut()
      if (error) {
        console.error('Error signing out:', error)
      }
      setUser(null)
    } catch (error) {
      console.error('Error signing out:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    console.log('🚀 AuthContext useEffect triggered')
    let mounted = true

    const initializeAuth = async () => {
      console.log('⏳ Starting auth initialization...')

      try {
        // Simple session check
        console.log('📡 Getting session...')
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession()

        if (!mounted) {
          console.log('🚫 Component unmounted, aborting')
          return
        }

        if (error) {
          console.error('❌ Session error:', error)
          setUser(null)
        } else if (session?.user) {
          console.log('✅ Session found for:', session.user.email)
          setUser(session.user as AuthUser)
        } else {
          console.log('📭 No session found')
          setUser(null)
        }
      } catch (error) {
        console.error('❌ Auth initialization error:', error)
        if (mounted) {
          setUser(null)
        }
      } finally {
        if (mounted) {
          console.log('✅ Auth initialization complete, setting loading to false')
          setLoading(false)
        }
      }
    }

    // Start initialization
    initializeAuth()

    // Set up auth state listener
    console.log('👂 Setting up auth state listener...')
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔔 Auth state change:', event, session?.user?.email || 'no user')

      if (!mounted) return

      if (event === 'SIGNED_IN' && session?.user) {
        console.log('✅ User signed in, updating state')
        setUser(session.user as AuthUser)
      } else if (event === 'SIGNED_OUT') {
        console.log('👋 User signed out, clearing state')
        setUser(null)
      }
    })

    return () => {
      console.log('🧹 Cleaning up AuthContext')
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const value = {
    user,
    loading,
    signOut,
    refreshUser,
  }

  console.log('🎯 AuthContext state:', {
    user: user?.email || 'null',
    loading,
    timestamp: new Date().toISOString(),
  })

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
