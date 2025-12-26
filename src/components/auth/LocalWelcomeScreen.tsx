'use client'

import { useState } from 'react'
import { Film, Sparkles, ArrowRight, Check } from 'lucide-react'
import { logger } from '@/lib/logger'

interface LocalWelcomeScreenProps {
  onComplete: (name: string) => void
}

export function LocalWelcomeScreen({ onComplete }: LocalWelcomeScreenProps) {
  const [name, setName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!name.trim()) return
    
    setIsSubmitting(true)
    
    try {
      logger.info('Creating local user', { name: name.trim() })
      onComplete(name.trim())
    } catch (error) {
      logger.error('Error creating local user', { error })
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-base-200 to-secondary/5 flex items-center justify-center p-6 sm:p-8">
      <div className="max-w-lg w-full">
        {/* Logo/Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-primary rounded-2xl mb-6 shadow-lg">
            <Film className="w-10 h-10 text-primary-content" />
          </div>
          <h1 className="text-5xl font-bold mb-3 text-base-content">
            Welcome to <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">CineAI</span>
          </h1>
          <p className="text-base-content/80 text-xl font-medium">
            Your personal AI movie companion
          </p>
        </div>

        {/* Welcome Card */}
        <div className="card bg-base-100 shadow-2xl border border-base-300">
          <div className="card-body p-8 sm:p-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Sparkles className="w-6 h-6 text-primary" />
              </div>
              <h2 className="card-title text-2xl font-bold text-base-content">Let&apos;s get started!</h2>
            </div>
            
            <p className="text-base-content/90 text-base mb-8 leading-relaxed">
              No sign-up required. Just tell us your name and start discovering movies tailored to your taste.
            </p>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="form-control">
                <label className="label pb-3">
                  <span className="label-text font-semibold text-base text-base-content">What should we call you?</span>
                </label>
                <input
                  type="text"
                  placeholder="Enter your name"
                  className="input input-bordered input-lg w-full text-lg bg-base-200 border-2 border-base-300 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoFocus
                  maxLength={50}
                  disabled={isSubmitting}
                />
                <label className="label pt-3">
                  <span className="label-text-alt text-base-content/70 text-sm">
                    We&apos;ll use this to personalize your experience
                  </span>
                </label>
              </div>

              <button
                type="submit"
                className="btn btn-primary btn-lg w-full text-lg font-semibold shadow-lg hover:shadow-xl transition-all"
                disabled={!name.trim() || isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <span className="loading loading-spinner loading-md"></span>
                    Setting up...
                  </>
                ) : (
                  <>
                    Start Exploring
                    <ArrowRight className="w-6 h-6" />
                  </>
                )}
              </button>
            </form>

            {/* Features Preview */}
            <div className="divider text-sm font-semibold text-base-content/60 my-8">What you&apos;ll get</div>
            <div className="space-y-4">
              <div className="flex items-start gap-4 p-4 rounded-lg bg-base-200/50 border border-base-300">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center mt-0.5">
                  <Check className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-base-content text-base">
                    AI-powered recommendations
                  </p>
                  <p className="text-base-content/70 text-sm mt-1">
                    Tailored to your unique taste
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4 p-4 rounded-lg bg-base-200/50 border border-base-300">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center mt-0.5">
                  <Check className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-base-content text-base">
                    Smart watchlist
                  </p>
                  <p className="text-base-content/70 text-sm mt-1">
                    That learns from your preferences
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4 p-4 rounded-lg bg-base-200/50 border border-base-300">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center mt-0.5">
                  <Check className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-base-content text-base">
                    Voice chat assistant
                  </p>
                  <p className="text-base-content/70 text-sm mt-1">
                    Talk to AI about movies
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Privacy Note */}
        <div className="text-center mt-8">
          <div className="inline-flex items-center gap-2 px-6 py-3 bg-base-100 rounded-full border border-base-300 shadow-sm">
            <span className="text-2xl">🔒</span>
            <p className="text-sm font-medium text-base-content/90">
              Running locally on your device. Your data stays private.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

