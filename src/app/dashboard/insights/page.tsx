'use client'
import React, { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/browser-client'
import { ExplanationPopover } from '@/components/movies/ExplanationPopover'
import { RecommendationExplanation } from '@/types/explanation'

export default function InsightsPage() {
  const [explanations, setExplanations] = useState<RecommendationExplanation[]>([])

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient()
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
    <div className="space-y-4 p-6">
      <h1 className="mb-4 text-2xl font-semibold">Why These Movies?</h1>
      {explanations.length === 0 && (
        <p className="text-sm text-gray-500">No explanations cached yet.</p>
      )}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {explanations.map(e => (
          <ExplanationPopover key={(e as any).id} explanation={e as any} />
        ))}
      </div>
    </div>
  )
}
