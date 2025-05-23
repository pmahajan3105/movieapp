'use client'

import { useState } from 'react'
import { LoginForm } from '@/components/auth/LoginForm'
import { MagicLinkSentForm } from '@/components/auth/MagicLinkSentForm'

export default function LoginPage() {
  const [step, setStep] = useState<'login' | 'magic-link-sent'>('login')
  const [email, setEmail] = useState('')

  const handleMagicLinkSent = (sentEmail: string) => {
    setEmail(sentEmail)
    setStep('magic-link-sent')
  }

  const handleBackToLogin = () => {
    setStep('login')
    setEmail('')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {step === 'login' ? (
            <LoginForm onMagicLinkSent={handleMagicLinkSent} />
          ) : (
            <MagicLinkSentForm 
              email={email} 
              onBackToLogin={handleBackToLogin} 
            />
          )}
        </div>
      </div>
    </div>
  )
} 