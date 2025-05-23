'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/lib/supabase/types'

export default function AuthCallbackPage() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClientComponentClient<Database>()

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Get the code from URL parameters
        const code = searchParams.get('code')
        
        if (code) {
          // Exchange the code for a session
          const { data, error } = await supabase.auth.exchangeCodeForSession(code)
          
          if (error) {
            console.error('Auth callback error:', error)
            setStatus('error')
            setMessage('Authentication failed. Please try again.')
            return
          }

          if (data.user) {
            setStatus('success')
            setMessage('Authentication successful! Redirecting...')
            
            // Check if user has completed onboarding
            const { data: profile } = await supabase
              .from('user_profiles')
              .select('onboarding_completed')
              .eq('id', data.user.id)
              .single()

            // Redirect based on onboarding status
            setTimeout(() => {
              if (profile?.onboarding_completed) {
                router.push('/dashboard/swipe')
              } else {
                router.push('/dashboard/preferences')
              }
            }, 2000)
          }
        } else {
          // No code provided, this might be an error case
          setStatus('error')
          setMessage('No authentication code provided.')
        }
      } catch (error) {
        console.error('Callback error:', error)
        setStatus('error')
        setMessage('An unexpected error occurred. Please try again.')
      }
    }

    handleAuthCallback()
  }, [searchParams, supabase, router])

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="text-center">
            {status === 'loading' && (
              <>
                <div className="flex justify-center mb-4">
                  <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Verifying Authentication
                </h2>
                <p className="text-gray-600">
                  Please wait while we verify your email...
                </p>
              </>
            )}

            {status === 'success' && (
              <>
                <div className="flex justify-center mb-4">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Welcome to CineAI!
                </h2>
                <p className="text-gray-600">
                  {message}
                </p>
              </>
            )}

            {status === 'error' && (
              <>
                <div className="flex justify-center mb-4">
                  <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Authentication Error
                </h2>
                <p className="text-gray-600 mb-4">
                  {message}
                </p>
                <button
                  onClick={() => router.push('/auth/login')}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Try Again
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
} 