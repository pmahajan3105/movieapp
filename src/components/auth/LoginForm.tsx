'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAsyncAction } from '@/hooks/useAsyncOperation'

const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Please enter a valid email address')
    .email('Please enter a valid email address'),
})

type LoginFormData = z.infer<typeof loginSchema>

interface LoginFormProps {
  onMagicLinkSent: (email: string) => void
}

export function LoginForm({ onMagicLinkSent }: LoginFormProps) {
  const { isLoading, error, setError, execute } = useAsyncAction()

  // Check for error from URL params (from auth callback)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const urlError = urlParams.get('error')
    if (urlError) {
      setError(urlError)
      // Clear error from URL
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [setError])

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginFormData) => {
    await execute(async () => {
      const response = await fetch('/api/auth/request-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: data.email }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to send magic link')
      }

      onMagicLinkSent(data.email)
    })
  }

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="mb-8 text-center">
        <h1 className="mb-2 text-3xl font-bold text-gray-900">Welcome to CineAI</h1>
        <p className="text-gray-600">Your personal AI movie recommendation assistant</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
        <div className="space-y-2">
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            Email address
          </label>
          <input
            id="email"
            type="email"
            placeholder="Enter your email"
            {...register('email')}
            disabled={isLoading}
            className={`w-full rounded-lg border px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500 ${
              errors.email ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.email && <p className="text-sm text-red-600">{errors.email.message}</p>}
        </div>

        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <button
          type="submit"
          className="w-full rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={isLoading}
        >
          {isLoading ? (
            <div className="flex items-center justify-center space-x-2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              <span>Sending magic link...</span>
            </div>
          ) : (
            'Send magic link'
          )}
        </button>
      </form>

      <div className="mt-6 text-center text-sm text-gray-600">
        <p>
          We&apos;ll send you a magic link via email.
          <br />
          Click the link to sign in - no password required!
        </p>
      </div>
    </div>
  )
}
