'use client'

import { useEffect } from 'react'
import { logger } from '@/lib/logger'

export default function SearchError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    logger.error('Search error boundary caught error', {
      message: error.message,
      digest: error.digest,
      stack: error.stack,
    })
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
      <div className="card bg-base-100 shadow-xl max-w-lg w-full">
        <div className="card-body text-center">
          <div className="text-5xl mb-4">🔍</div>
          <h2 className="card-title justify-center">Search Error</h2>
          <p className="text-base-content/70">
            We couldn&apos;t complete your search. This might be a temporary issue.
          </p>
          <div className="card-actions justify-center mt-4 gap-2">
            <button
              className="btn btn-primary btn-sm"
              onClick={() => reset()}
            >
              Try again
            </button>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => window.location.href = '/dashboard'}
            >
              Back to dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
