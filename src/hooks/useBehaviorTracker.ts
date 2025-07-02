import { useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';

export interface RecommendationInteraction {
  movieId: string;
  type: 'view_details' | 'add_to_watchlist' | 'rate' | 'search_result_click' | 'recommendation_click';
  context?: string[];
  metadata?: {
    searchQuery?: string;
    recommendationType?: string;
    timeSpent?: number; // Time spent on movie details page
    ratingValue?: number;
  };
}

export const useBehaviorTracker = () => {
  const { user } = useAuth();

  const trackInteraction = useCallback(async (interaction: RecommendationInteraction) => {
    // Don't track if user is not authenticated
    if (!user) return;

    try {
      const response = await fetch('/api/user/interactions', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        },
        body: JSON.stringify({
          ...interaction,
          timestamp: new Date().toISOString(),
          browserContext: {
            timeOfDay: new Date().getHours(),
            dayOfWeek: new Date().getDay()
          }
        })
      });

      if (!response.ok) {
        // Fail silently - don't disrupt UX
      }
    } catch {
      // Fail silently - don't disrupt UX
    }
  }, [user]);

  // Realistic tracking methods for a recommendation app
  const trackMovieView = useCallback((movieId: string, context?: string[]) => 
    trackInteraction({ 
      movieId, 
      type: 'view_details', 
      context 
    }), [trackInteraction]);

  const trackWatchlistAdd = useCallback((movieId: string, context?: string[]) => 
    trackInteraction({ 
      movieId, 
      type: 'add_to_watchlist', 
      context 
    }), [trackInteraction]);

  const trackRating = useCallback((movieId: string, rating: number, context?: string[]) => 
    trackInteraction({ 
      movieId, 
      type: 'rate', 
      context,
      metadata: { ratingValue: rating }
    }), [trackInteraction]);

  const trackSearchClick = useCallback((movieId: string, searchQuery: string, position: number) => 
    trackInteraction({ 
      movieId, 
      type: 'search_result_click', 
      context: [`position_${position}`],
      metadata: { searchQuery }
    }), [trackInteraction]);

  const trackRecommendationClick = useCallback((movieId: string, recommendationType: string, position: number) => 
    trackInteraction({ 
      movieId, 
      type: 'recommendation_click', 
      context: [`position_${position}`, recommendationType],
      metadata: { recommendationType }
    }), [trackInteraction]);

  return {
    trackInteraction,
    trackMovieView,
    trackWatchlistAdd,
    trackRating,
    trackSearchClick,
    trackRecommendationClick,
    isEnabled: !!user
  };
};

// Hook for tracking time spent on pages
export const usePageBehaviorTracker = (pageType: string, pageId?: string) => {
  const { trackInteraction } = useBehaviorTracker();
  const startTime = useCallback(() => Date.now(), []);

  const trackPageExit = useCallback((startTime: number) => {
    if (!pageId) return;
    
    const timeSpent = Date.now() - startTime;
    trackInteraction({
      movieId: pageId,
      type: 'view_details',
      metadata: { timeSpent }
    });
  }, [pageId, trackInteraction]);

  return { startTime, trackPageExit };
}; 