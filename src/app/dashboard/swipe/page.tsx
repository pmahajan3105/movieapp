'use client'

// Force dynamic rendering for authenticated pages
export const dynamic = 'force-dynamic'

export default function SwipePage() {
  return (
    <div className="max-w-md mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Discover Movies
        </h1>
        <p className="text-gray-600">
          Swipe right to like, left to pass, up to save to watchlist
        </p>
      </div>
      
      <div className="bg-white rounded-lg shadow-lg p-6 min-h-[500px] flex items-center justify-center">
        <p className="text-gray-500">Movie cards will appear here</p>
      </div>
    </div>
  )
} 