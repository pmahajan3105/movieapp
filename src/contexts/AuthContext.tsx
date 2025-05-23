'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { User } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'
import { Database } from '@/lib/supabase/types'

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
  const router = useRouter()
  const supabase = createClientComponentClient<Database>()

  const refreshUser = async () => {
    try {
      const { data: { user: authUser }, error } = await supabase.auth.getUser()
      
      if (error || !authUser) {
        setUser(null)
        return
      }

      // Get user profile to check onboarding status
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('onboarding_completed')
        .eq('id', authUser.id)
        .single()

      setUser({
        ...authUser,
        onboarding_completed: profile?.onboarding_completed || false
      })
    } catch (error) {
      console.error('Error refreshing user:', error)
      setUser(null)
    }
  }

  const signOut = async () => {
    try {
      setLoading(true)
      await supabase.auth.signOut()
      setUser(null)
      router.push('/auth/login')
    } catch (error) {
      console.error('Error signing out:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session?.user) {
        await refreshUser()
      }
      
      setLoading(false)
    }

    getInitialSession()

    // Listen to auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth event:', event)
      
      if (event === 'SIGNED_IN' && session?.user) {
        await refreshUser()
      } else if (event === 'SIGNED_OUT') {
        setUser(null)
        router.push('/auth/login')
      } else if (event === 'TOKEN_REFRESHED' && session?.user) {
        await refreshUser()
      }
      
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [supabase, router])

  const value = {
    user,
    loading,
    signOut,
    refreshUser,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
} 