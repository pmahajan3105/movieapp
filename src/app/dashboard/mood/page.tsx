'use client'

// Force dynamic rendering for authenticated pages
export const dynamic = 'force-dynamic'

export default function MoodPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Mood-Based Search
        </h1>
        <p className="text-gray-600">
          Find movies that match your current mood
        </p>
      </div>
      
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-gray-500 text-center">
          Mood-based movie search will appear here
        </p>
      </div>
    </div>
  )
} 