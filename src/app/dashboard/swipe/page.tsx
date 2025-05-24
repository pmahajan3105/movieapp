'use client'

// Force dynamic rendering for authenticated pages
export const dynamic = 'force-dynamic'

export default function SwipePage() {
  return (
    <div className="mx-auto max-w-md">
      <div className="mb-8 text-center">
        <h1 className="mb-2 text-2xl font-bold text-gray-900">Discover Movies</h1>
        <p className="text-gray-600">Swipe right to like, left to pass, up to save to watchlist</p>
      </div>

      <div className="flex min-h-[500px] items-center justify-center rounded-lg bg-white p-6 shadow-lg">
        <p className="text-gray-500">Movie cards will appear here</p>
      </div>
    </div>
  )
}
