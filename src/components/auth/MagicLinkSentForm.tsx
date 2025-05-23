'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'

interface MagicLinkSentFormProps {
  email: string
  onBackToLogin: () => void
}

export function MagicLinkSentForm({ email, onBackToLogin }: MagicLinkSentFormProps) {
  const [isResending, setIsResending] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [resendCooldown])

  const handleResendMagicLink = async () => {
    if (resendCooldown > 0) return

    setIsResending(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch('/api/auth/request-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to resend magic link')
      }

      setSuccess('Magic link sent successfully!')
      setResendCooldown(60) // 60 second cooldown
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred')
    } finally {
      setIsResending(false)
    }
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Check your email
        </h1>
        <p className="text-gray-600">
          We sent a magic link to
          <br />
          <span className="font-medium text-gray-900">{email}</span>
        </p>
      </div>

      <div className="space-y-6">
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="w-5 h-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-blue-700">
                Click the link in your email to sign in. The link will expire in 1 hour.
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
            {error}
          </div>
        )}

        {success && (
          <div className="p-3 text-sm text-green-600 bg-green-50 border border-green-200 rounded-md">
            {success}
          </div>
        )}

        <div className="space-y-3">
          <Button
            onClick={handleResendMagicLink}
            disabled={isResending || resendCooldown > 0}
            variant="outline"
            className="w-full"
          >
            {isResending ? (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                <span>Resending...</span>
              </div>
            ) : resendCooldown > 0 ? (
              `Resend in ${resendCooldown}s`
            ) : (
              'Resend magic link'
            )}
          </Button>

          <Button
            onClick={onBackToLogin}
            variant="ghost"
            className="w-full"
          >
            Back to login
          </Button>
        </div>
      </div>

      <div className="mt-6 text-center text-sm text-gray-500">
        <p>
          Didn&apos;t receive the email? Check your spam folder or try a different email address.
        </p>
      </div>
    </div>
  )
} 