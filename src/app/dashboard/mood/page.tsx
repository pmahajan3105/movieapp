'use client'

// Force dynamic rendering for authenticated pages
export const dynamic = 'force-dynamic'

export default function MoodPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="mb-2 text-2xl font-bold text-gray-900">Mood-Based Search</h1>
        <p className="text-gray-600">Find movies that match your current mood</p>
      </div>

      <div className="rounded-lg bg-white p-6 shadow">
        <p className="text-center text-gray-500">Mood-based movie search will appear here</p>
      </div>
    </div>
  )
}
