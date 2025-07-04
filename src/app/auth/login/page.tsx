'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { LoginForm } from '@/components/auth/LoginForm'
import { MagicLinkSentForm } from '@/components/auth/MagicLinkSentForm'
import { RefreshCw } from 'lucide-react'

function LoginPageContent() {
  const [step, setStep] = useState<'login' | 'magic-link-sent'>('login')
  const [email, setEmail] = useState('')
  const [isRedirecting, setIsRedirecting] = useState(false)
  
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const nextPath = searchParams.get('next') || '/dashboard'

  // Redirect authenticated users to dashboard
  useEffect(() => {
    if (!isLoading && user) {
      setIsRedirecting(true)
      router.push(nextPath)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isLoading, nextPath, router])

  const handleMagicLinkSent = (sentEmail: string) => {
    setEmail(sentEmail)
    setStep('magic-link-sent')
  }

  const handleBackToLogin = () => {
    setStep('login')
  }

  // Show loading while checking auth or redirecting
  if (isLoading || isRedirecting) {
    return (
      <div className="hero min-h-screen bg-base-200">
        <div className="hero-content text-center">
          <div className="max-w-md">
            <RefreshCw className="mx-auto mb-4 h-8 w-8 animate-spin text-primary" />
            <p>{isRedirecting ? 'Redirecting...' : 'Loading...'}</p>
          </div>
        </div>
      </div>
    )
  }

  // Don't render login form if user is authenticated
  if (user) {
    return null
  }

  return (
    <div className="hero min-h-screen bg-base-200">
      <div className="hero-content flex-col lg:flex-row-reverse">
        <div className="text-center lg:text-left">
          <h1 className="text-5xl font-bold">🎬 CineAI</h1>
          <p className="py-6">
            Your personal AI movie recommendation assistant. Sign in to get started with personalized movie recommendations.
          </p>
        </div>
        <div className="card flex-shrink-0 w-full max-w-sm shadow-2xl bg-base-100">
          <div className="card-body">
            {step === 'login' ? (
              <LoginForm onMagicLinkSent={handleMagicLinkSent} />
            ) : (
              <MagicLinkSentForm email={email} onBackToLogin={handleBackToLogin} />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="hero min-h-screen bg-base-200">
        <div className="hero-content text-center">
          <div className="max-w-md">
            <RefreshCw className="mx-auto mb-4 h-8 w-8 animate-spin text-primary" />
            <p>Loading...</p>
          </div>
        </div>
      </div>
    }>
      <LoginPageContent />
    </Suspense>
  )
}