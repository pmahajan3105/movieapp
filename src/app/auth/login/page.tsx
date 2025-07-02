'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { LoginForm } from '@/components/auth/LoginForm'
import { MagicLinkSentForm } from '@/components/auth/MagicLinkSentForm'
import { RefreshCw } from 'lucide-react'

export default function LoginPage() {
  const [step, setStep] = useState<'login' | 'magic-link-sent'>('login')
  const [email, setEmail] = useState('')
  const [isRedirecting, setIsRedirecting] = useState(false)
  
  const { user, isLoading } = useAuth()
  const router = useRouter()

  // Redirect authenticated users to dashboard
  useEffect(() => {
    if (!isLoading && user) {
      setIsRedirecting(true)
      router.push('/dashboard')
    }
  }, [user, isLoading, router])

  const handleMagicLinkSent = (sentEmail: string) => {
    setEmail(sentEmail)
    setStep('magic-link-sent')
  }

  const handleBackToLogin = () => {
    setStep('login')
    setEmail('')
  }

  // Show loading while checking authentication or redirecting
  if (isLoading || isRedirecting) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-gray-600">
            {isRedirecting ? 'Redirecting to dashboard...' : 'Checking authentication...'}
          </p>
        </div>
      </div>
    )
  }

  // If user is authenticated, don't render the login form (redirect should happen)
  if (user) {
    return null
  }

  return (
    <div className="flex min-h-screen flex-col justify-center bg-gray-50 py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white px-4 py-8 shadow sm:rounded-lg sm:px-10">
          {step === 'login' ? (
            <LoginForm onMagicLinkSent={handleMagicLinkSent} />
          ) : (
            <MagicLinkSentForm email={email} onBackToLogin={handleBackToLogin} />
          )}
        </div>
      </div>
    </div>
  )
}
