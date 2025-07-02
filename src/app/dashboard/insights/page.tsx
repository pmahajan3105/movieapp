'use client'
import React, { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { ExplanationPopover } from '@/components/movies/ExplanationPopover'
import { RecommendationExplanation } from '@/types/explanation'

export default function InsightsPage() {
  const [explanations, setExplanations] = useState<RecommendationExplanation[]>([])

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createBrowserClient()
      const { data } = await supabase
        .from('recommendation_explanations')
        .select('*')
        .order('generated_at', { ascending: false })
        .limit(50)
      setExplanations((data as any[]) || [])
    }
    fetchData()
  }, [])

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold mb-4">Why These Movies?</h1>
      {explanations.length === 0 && <p className="text-sm text-gray-500">No explanations cached yet.</p>}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {explanations.map(e => (
          <ExplanationPopover key={(e as any).id} explanation={e as any} />
        ))}
      </div>
    </div>
  )
} 