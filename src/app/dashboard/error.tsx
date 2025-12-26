'use client'

import { useEffect } from 'react'
import { logger } from '@/lib/logger'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    logger.error('Dashboard error boundary caught error', {
      message: error.message,
      digest: error.digest,
      stack: error.stack,
    })
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
      <div className="card bg-base-100 shadow-xl max-w-lg w-full">
        <div className="card-body text-center">
          <div className="text-5xl mb-4">🎥</div>
          <h2 className="card-title justify-center">Dashboard Error</h2>
          <p className="text-base-content/70">
            Something went wrong loading your dashboard. Your recommendations and watchlist are safe.
          </p>
          <div className="card-actions justify-center mt-4 gap-2">
            <button
              className="btn btn-primary btn-sm"
              onClick={() => reset()}
            >
              Retry
            </button>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => window.location.reload()}
            >
              Refresh page
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
