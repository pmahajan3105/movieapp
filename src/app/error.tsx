'use client'

import { useEffect } from 'react'
import { logger } from '@/lib/logger'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    logger.error('Root error boundary caught error', {
      message: error.message,
      digest: error.digest,
      stack: error.stack,
    })
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-base-200">
      <div className="card bg-base-100 shadow-xl max-w-md w-full mx-4">
        <div className="card-body text-center">
          <div className="text-6xl mb-4">🎬</div>
          <h2 className="card-title justify-center text-error">Something went wrong!</h2>
          <p className="text-base-content/70 mt-2">
            We encountered an unexpected error. Don&apos;t worry, your data is safe.
          </p>
          {error.digest && (
            <p className="text-xs text-base-content/50 mt-2">
              Error ID: {error.digest}
            </p>
          )}
          <div className="card-actions justify-center mt-6 gap-2">
            <button
              className="btn btn-primary"
              onClick={() => reset()}
            >
              Try again
            </button>
            <button
              className="btn btn-ghost"
              onClick={() => window.location.href = '/'}
            >
              Go home
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
