'use client'

// Force dynamic rendering for authenticated pages
export const dynamic = 'force-dynamic'

export default function WatchlistPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Your Watchlist
        </h1>
        <p className="text-gray-600">
          Movies you&apos;ve saved to watch later
        </p>
      </div>
      
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-gray-500 text-center">
          Your watchlist will appear here
        </p>
      </div>
    </div>
  )
} 