'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/contexts/AuthContext'
import { useAsyncAction } from '@/hooks/useAsyncOperation'

const otpSchema = z.object({
  otp: z
    .string()
    .length(6, 'OTP must be exactly 6 digits')
    .regex(/^\d+$/, 'OTP must contain only numbers'),
})

type OtpFormData = z.infer<typeof otpSchema>

interface OtpFormProps {
  email: string
  onBackToLogin: () => void
}

export function OtpForm({ email, onBackToLogin }: OtpFormProps) {
  const { isLoading, error, execute } = useAsyncAction()
  const { isLoading: isResending, execute: executeResend } = useAsyncAction()
  const [resendTimer, setResendTimer] = useState(60)
  const [canResend, setCanResend] = useState(false)
  const router = useRouter()
  const { refreshUser } = useAuth()
  const otpInputRef = useRef<HTMLInputElement>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<OtpFormData>({
    resolver: zodResolver(otpSchema),
  })

  const otpValue = watch('otp', '')
  const { ref: registerRef, ...registerProps } = register('otp')

  // Auto-focus OTP input
  useEffect(() => {
    if (otpInputRef.current) {
      otpInputRef.current.focus()
    }
  }, [])

  // Countdown timer for resend
  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000)
      return () => clearTimeout(timer)
    } else {
      setCanResend(true)
    }
    return undefined
  }, [resendTimer])

  const onSubmit = useCallback(
    async (data: OtpFormData) => {
      await execute(async () => {
        const response = await fetch('/api/auth/verify-otp', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email,
            token: data.otp,
          }),
        })

        const result = await response.json()

        if (!response.ok) {
          throw new Error(result.error || 'Verification failed')
        }

        // Refresh user data
        await refreshUser()

        // Redirect based on onboarding status
        if (result.user?.onboarding_completed) {
          router.push('/dashboard')
        } else {
          router.push('/dashboard/preferences')
        }
      })
    },
    [email, refreshUser, router, execute]
  )

  // Auto-submit when OTP is 6 digits
  useEffect(() => {
    if (otpValue.length === 6 && /^\d{6}$/.test(otpValue)) {
      handleSubmit(onSubmit)()
    }
  }, [otpValue, handleSubmit, onSubmit])

  const handleResend = async () => {
    setCanResend(false)
    setResendTimer(60)

    const success = await executeResend(async () => {
      const response = await fetch('/api/auth/request-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to resend verification code')
      }
    })

    // If resend failed, reset timer and allow retry
    if (!success) {
      setCanResend(true)
      setResendTimer(0)
    }
  }

  const handleOtpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6)
    setValue('otp', value)
  }

  const formatOtpDisplay = (value: string) => {
    return value.split('').join(' ')
  }

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="mb-8 text-center">
        <h1 className="mb-2 text-3xl font-bold text-gray-900">Verify your email</h1>
        <p className="text-gray-600">We sent a 6-digit code to</p>
        <p className="font-medium text-gray-900">{email}</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="otp">Verification code</Label>
          <Input
            id="otp"
            type="text"
            inputMode="numeric"
            placeholder="000000"
            {...registerProps}
            ref={e => {
              registerRef(e)
              otpInputRef.current = e
            }}
            onChange={handleOtpChange}
            value={formatOtpDisplay(otpValue)}
            disabled={isLoading}
            className={`text-center font-mono text-2xl tracking-[0.5em] ${errors.otp ? 'border-red-500' : ''}`}
            maxLength={11} // 6 digits + 5 spaces
          />
          {errors.otp && <p className="text-sm text-red-600">{errors.otp.message}</p>}
        </div>

        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <Button type="submit" className="w-full" disabled={isLoading || otpValue.length < 6}>
          {isLoading ? (
            <div className="flex items-center space-x-2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              <span>Verifying...</span>
            </div>
          ) : (
            'Verify code'
          )}
        </Button>

        <div className="text-center">
          <p className="text-sm text-gray-600">
            Didn&apos;t receive the code?{' '}
            <Button
              type="button"
              variant="link"
              className="p-0 text-blue-600 hover:text-blue-500"
              onClick={handleResend}
              disabled={!canResend || isResending}
            >
              {isResending ? (
                <>
                  <div className="mr-1 h-3 w-3 animate-spin rounded-full border border-current border-t-transparent" />
                  Sending...
                </>
              ) : canResend ? (
                'Resend code'
              ) : (
                `Resend in ${resendTimer}s`
              )}
            </Button>
          </p>
        </div>

        <div className="text-center">
          <Button
            type="button"
            variant="link"
            className="text-gray-600 hover:text-gray-500"
            onClick={onBackToLogin}
          >
            Back to login
          </Button>
        </div>
      </form>
    </div>
  )
}
