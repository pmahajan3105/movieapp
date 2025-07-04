'use client'

import React from 'react'
import dynamic from 'next/dynamic'
import { PrecomputedRecommendations } from '@/components/dashboard/PrecomputedRecommendations'
import type { MovieActionsHandlers } from '@/hooks/useMovieActions'

// Dynamically load heavy components to avoid blocking initial render
const AILearningDashboard = dynamic(
  () =>
    import('@/components/dashboard/AILearningDashboard').then(m => ({
      default: m.AILearningDashboard,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 flex h-96 animate-pulse items-center justify-center rounded-lg border border-slate-200/50">
        <div className="text-center">
          <div className="loading loading-spinner loading-lg text-primary mb-4"></div>
          <p className="text-slate-600">Loading AI insights...</p>
        </div>
      </div>
    ),
  }
)

const BehavioralInsightsPanel = dynamic(
  () =>
    import('@/components/dashboard/BehavioralInsightsPanel').then(m => ({
      default: m.BehavioralInsightsPanel,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 flex h-64 animate-pulse items-center justify-center rounded-lg border border-slate-200/50">
        <div className="text-center">
          <div className="loading loading-spinner loading-lg text-primary mb-4"></div>
          <p className="text-slate-600">Loading behavioral insights...</p>
        </div>
      </div>
    ),
  }
)

interface DashboardContentProps {
  movieActions: Pick<MovieActionsHandlers, 'handleMovieView' | 'handleMovieSave' | 'handleMovieRate'>
}

export const DashboardContent: React.FC<DashboardContentProps> = ({ movieActions }) => {
  const { handleMovieView, handleMovieSave } = movieActions

  return (
    <>
      {/* Phase 1: Precomputed Recommendations - Instant Loading */}
      <div className="mb-12">
        <div className="rounded-3xl border border-slate-200/50 bg-white/60 p-6 shadow-xl backdrop-blur-sm">
          <div data-testid="hyper-personalized">
          <PrecomputedRecommendations
            onMovieView={handleMovieView}
            onMovieSave={handleMovieSave}
            limit={12}
            showInsights={true}
          />
          </div>
        </div>
      </div>

      {/* AI Learning Dashboard */}
      <div className="mb-12">
        <div className="rounded-3xl border border-slate-200/50 bg-white/60 p-6 shadow-xl backdrop-blur-sm">
          <AILearningDashboard />
        </div>
      </div>

      {/* Behavioral Insights Panel */}
      <div className="mb-12">
        <div className="rounded-3xl border border-slate-200/50 bg-white/60 p-6 shadow-xl backdrop-blur-sm">
          <BehavioralInsightsPanel />
        </div>
      </div>
    </>
  )
} 