'use client'

import React from 'react'
import { MovieDetailsModal } from '@/components/movies/MovieDetailsModal'
import { DashboardLoadingScreen } from '@/components/dashboard/DashboardLoadingScreen'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { DashboardHeader } from '@/components/dashboard/DashboardHeader'
import { DashboardContent } from '@/components/dashboard/DashboardContent'
import { useDashboardState } from '@/hooks/useDashboardState'
import { useMovieActions } from '@/hooks/useMovieActions'

export default function DashboardPage() {
  const dashboardState = useDashboardState()
  const movieActions = useMovieActions()

  // Show loading while mounting or authenticating
  if (dashboardState.shouldShowLoading) {
    return <DashboardLoadingScreen />
  }

  // If not authenticated after mounting, redirect to login (handled in hook)
  if (dashboardState.shouldRedirect) {
    return null
  }

  return (
    <DashboardLayout>
      <DashboardHeader />
      <DashboardContent movieActions={movieActions} />
      
      {/* Movie Details Modal */}
      <MovieDetailsModal
        movie={movieActions.state.selectedMovie}
        open={movieActions.state.movieModalOpen}
        onClose={movieActions.handleModalClose}
        onAddToWatchlist={movieActions.handleMovieSave}
        aiInsights={movieActions.state.selectedMovieInsights}
      />
    </DashboardLayout>
  )
}
