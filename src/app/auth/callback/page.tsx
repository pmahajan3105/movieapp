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
        const error_param = searchParams.get('error')
        const error_description = searchParams.get('error_description')

        console.log('🔗 Magic link callback - code:', code, 'error:', error_param)

        if (error_param) {
          console.error('Auth callback error from URL:', error_param, error_description)
          setStatus('error')
          setMessage(`Authentication failed: ${error_description || error_param}`)
          return
        }

        if (code) {
          // Exchange the code for a session
          const { data, error } = await supabase.auth.exchangeCodeForSession(code)

          console.log('🔐 Exchange code result - data:', data, 'error:', error)

          if (error) {
            console.error('Auth callback error:', error)
            setStatus('error')
            setMessage(`Authentication failed: ${error.message}`)
            return
          }

          if (data?.user && data?.session) {
            console.log('✅ User authenticated:', data.user.email)
            setStatus('success')
            setMessage('Authentication successful! Redirecting...')

            // Create user profile if it doesn't exist (fallback)
            try {
              const { error: profileError } = await supabase.from('user_profiles').upsert(
                {
                  id: data.user.id,
                  email: data.user.email!,
                  full_name: data.user.user_metadata?.full_name || data.user.email!.split('@')[0],
                  onboarding_completed: true,
                },
                {
                  onConflict: 'id',
                }
              )

              if (profileError) {
                console.error('Profile creation error:', profileError)
                // Don't fail the auth flow for profile errors
              } else {
                console.log('✅ User profile created/updated')
              }
            } catch (profileError) {
              console.error('Profile creation failed:', profileError)
            }

            // Redirect to dashboard
            setTimeout(() => {
              router.push('/dashboard')
            }, 1500)
          } else {
            setStatus('error')
            setMessage('No user session created. Please try again.')
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
    <div className="flex min-h-screen flex-col justify-center bg-gray-50 py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white px-4 py-8 shadow sm:rounded-lg sm:px-10">
          <div className="text-center">
            {status === 'loading' && (
              <>
                <div className="mb-4 flex justify-center">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
                </div>
                <h2 className="mb-2 text-2xl font-bold text-gray-900">Verifying Authentication</h2>
                <p className="text-gray-600">Please wait while we verify your email...</p>
              </>
            )}

            {status === 'success' && (
              <>
                <div className="mb-4 flex justify-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                    <svg
                      className="h-6 w-6 text-green-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                </div>
                <h2 className="mb-2 text-2xl font-bold text-gray-900">Welcome to CineAI!</h2>
                <p className="text-gray-600">{message}</p>
              </>
            )}

            {status === 'error' && (
              <>
                <div className="mb-4 flex justify-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                    <svg
                      className="h-6 w-6 text-red-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </div>
                </div>
                <h2 className="mb-2 text-2xl font-bold text-gray-900">Authentication Error</h2>
                <p className="mb-4 text-gray-600">{message}</p>
                <button
                  onClick={() => router.push('/auth/login')}
                  className="inline-flex items-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
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
