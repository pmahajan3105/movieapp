'use client'

import React from 'react'
import dynamic from 'next/dynamic'
import { PrecomputedRecommendations } from '@/components/dashboard/PrecomputedRecommendations'
import { AILearningDashboard } from '@/components/dashboard/AILearningDashboard'
import type { MovieActionsHandlers } from '@/hooks/useMovieActions'

const BehavioralInsightsPanel = dynamic(
  () =>
    import('@/components/dashboard/BehavioralInsightsPanel').then(m => ({
      default: m.BehavioralInsightsPanel,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="bg-base-200 flex h-64 animate-pulse items-center justify-center rounded-lg">
        <span className="loading loading-spinner text-primary"></span>
      </div>
    ),
  }
)

interface DashboardContentProps {
  movieActions: Pick<MovieActionsHandlers, 'handleMovieView' | 'handleMovieSave' | 'handleMovieRate'>
}

export const DashboardContent: React.FC<DashboardContentProps> = ({ movieActions }) => {
  const { handleMovieView, handleMovieSave, handleMovieRate } = movieActions

  return (
    <>
      {/* Phase 1: Precomputed Recommendations - Instant Loading */}
      <div className="mb-12">
        <div className="rounded-3xl border border-slate-200/50 bg-white/60 p-6 shadow-xl backdrop-blur-sm">
          <div data-testid="hyper-personalized">
          <PrecomputedRecommendations
            onMovieView={handleMovieView}
            onMovieSave={handleMovieSave}
            onMovieRate={handleMovieRate}
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