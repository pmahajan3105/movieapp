'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface SetupStatus {
  configExists: boolean
  databaseExists: boolean
  setupCompleted: boolean
  needsSetup: boolean
}

export default function SetupPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<SetupStatus | null>(null)

  // Form state
  const [name, setName] = useState('')
  const [tmdbKey, setTmdbKey] = useState('')
  const [openaiKey, setOpenaiKey] = useState('')
  const [anthropicKey, setAnthropicKey] = useState('')

  // Check setup status on mount
  useEffect(() => {
    async function checkStatus() {
      try {
        const res = await fetch('/api/setup')
        const data = await res.json()

        if (data.success) {
          setStatus(data.status)

          // If setup is already completed, check taste onboarding
          if (data.status.setupCompleted) {
            // Check if taste onboarding is needed
            if (!data.status.tasteOnboardingCompleted) {
              router.push('/onboarding/taste')
            } else {
              router.push('/dashboard')
            }
            return
          }

          // Pre-fill name if available
          if (data.config?.userName) {
            setName(data.config.userName)
          }
        }
      } catch (err) {
        console.error('Failed to check setup status:', err)
      } finally {
        setLoading(false)
      }
    }

    checkStatus()
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    try {
      const res = await fetch('/api/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          tmdbKey: tmdbKey || undefined,
          openaiKey: openaiKey || undefined,
          anthropicKey: anthropicKey || undefined,
        }),
      })

      const data = await res.json()

      if (data.success) {
        // Redirect to taste onboarding after setup
        router.push('/onboarding/taste')
      } else {
        setError(data.error || 'Setup failed. Please try again.')
      }
    } catch (err) {
      setError('Failed to complete setup. Please try again.')
      console.error('Setup error:', err)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-200">
        <div className="text-center">
          <span className="loading loading-spinner loading-lg text-primary" />
          <p className="mt-4 text-base-content/70">Checking setup status...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-base-200 py-12">
      <div className="container mx-auto px-4 max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-primary mb-2">CineAI Setup</h1>
          <p className="text-base-content/70">
            Welcome! Let&apos;s get your personal movie recommender set up.
          </p>
        </div>

        {/* Progress Steps */}
        <ul className="steps steps-horizontal w-full mb-8">
          <li className={`step ${step >= 1 ? 'step-primary' : ''}`}>Your Name</li>
          <li className={`step ${step >= 2 ? 'step-primary' : ''}`}>API Keys</li>
          <li className={`step ${step >= 3 ? 'step-primary' : ''}`}>Finish</li>
        </ul>

        {/* Error Alert */}
        {error && (
          <div className="alert alert-error mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <form onSubmit={handleSubmit}>
              {/* Step 1: Name */}
              {step === 1 && (
                <div className="space-y-4">
                  <h2 className="card-title text-2xl">What should we call you?</h2>
                  <p className="text-base-content/70">
                    This helps personalize your movie recommendations.
                  </p>

                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">Your Name</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Enter your name"
                      className="input input-bordered input-lg"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      autoFocus
                    />
                  </div>

                  <div className="card-actions justify-end mt-6">
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => setStep(2)}
                      disabled={!name.trim()}
                    >
                      Continue
                    </button>
                  </div>
                </div>
              )}

              {/* Step 2: API Keys */}
              {step === 2 && (
                <div className="space-y-4">
                  <h2 className="card-title text-2xl">API Keys (Optional)</h2>
                  <p className="text-base-content/70">
                    Add API keys to enable more features. You can skip this and add them later.
                  </p>

                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">TMDB API Key</span>
                      <span className="label-text-alt">
                        <a href="https://www.themoviedb.org/settings/api" target="_blank" rel="noopener noreferrer" className="link link-primary">
                          Get one free
                        </a>
                      </span>
                    </label>
                    <input
                      type="password"
                      placeholder="Enter TMDB API key"
                      className="input input-bordered"
                      value={tmdbKey}
                      onChange={(e) => setTmdbKey(e.target.value)}
                    />
                    <label className="label">
                      <span className="label-text-alt text-base-content/50">
                        Required for movie data and images
                      </span>
                    </label>
                  </div>

                  <div className="divider">AI Features (Optional)</div>

                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">OpenAI API Key</span>
                      <span className="label-text-alt">
                        <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="link link-primary">
                          Get one
                        </a>
                      </span>
                    </label>
                    <input
                      type="password"
                      placeholder="sk-..."
                      className="input input-bordered"
                      value={openaiKey}
                      onChange={(e) => setOpenaiKey(e.target.value)}
                    />
                  </div>

                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">Anthropic API Key</span>
                      <span className="label-text-alt">
                        <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener noreferrer" className="link link-primary">
                          Get one
                        </a>
                      </span>
                    </label>
                    <input
                      type="password"
                      placeholder="sk-ant-..."
                      className="input input-bordered"
                      value={anthropicKey}
                      onChange={(e) => setAnthropicKey(e.target.value)}
                    />
                    <label className="label">
                      <span className="label-text-alt text-base-content/50">
                        Either OpenAI or Anthropic enables AI chat features
                      </span>
                    </label>
                  </div>

                  <div className="card-actions justify-between mt-6">
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => setStep(1)}
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => setStep(3)}
                    >
                      Continue
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3: Review & Finish */}
              {step === 3 && (
                <div className="space-y-4">
                  <h2 className="card-title text-2xl">Ready to Go!</h2>
                  <p className="text-base-content/70">
                    Review your settings and complete the setup.
                  </p>

                  <div className="bg-base-200 rounded-lg p-4 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Name</span>
                      <span className="text-base-content/70">{name}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-medium">TMDB API</span>
                      <span className={tmdbKey ? 'badge badge-success' : 'badge badge-warning'}>
                        {tmdbKey ? 'Configured' : 'Not Set'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-medium">AI Features</span>
                      <span className={(openaiKey || anthropicKey) ? 'badge badge-success' : 'badge badge-ghost'}>
                        {(openaiKey || anthropicKey) ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                  </div>

                  {!tmdbKey && (
                    <div className="alert alert-warning">
                      <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <span>Without a TMDB API key, movie data and images won&apos;t load.</span>
                    </div>
                  )}

                  <div className="card-actions justify-between mt-6">
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => setStep(2)}
                      disabled={submitting}
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={submitting}
                    >
                      {submitting ? (
                        <>
                          <span className="loading loading-spinner loading-sm" />
                          Setting up...
                        </>
                      ) : (
                        'Complete Setup'
                      )}
                    </button>
                  </div>
                </div>
              )}
            </form>
          </div>
        </div>

        {/* Info Card */}
        <div className="card bg-base-100 shadow mt-6">
          <div className="card-body">
            <h3 className="font-semibold">About Your Data</h3>
            <p className="text-sm text-base-content/70">
              All your data is stored locally on your computer in <code className="bg-base-200 px-1 rounded">~/.cineai/</code>.
              Nothing is sent to the cloud. Your movie preferences, ratings, and watchlist are completely private.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
