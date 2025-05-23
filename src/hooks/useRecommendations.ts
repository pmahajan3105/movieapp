import { useState, useEffect, useCallback } from 'react';
import type { DailySpotlight, BrowseCategory, Rating } from '@/types';

interface UseRecommendationsReturn {
  spotlights: DailySpotlight[];
  categories: BrowseCategory[];
  userRatings: Rating[];
  loading: boolean;
  error: string | null;
  refreshSpotlights: () => Promise<void>;
  refreshCategories: () => Promise<void>;
  submitRating: (movieId: string, interested: boolean, rating?: number, source?: string) => Promise<void>;
}

export function useRecommendations(userId: string | null): UseRecommendationsReturn {
  const [spotlights, setSpotlights] = useState<DailySpotlight[]>([]);
  const [categories, setCategories] = useState<BrowseCategory[]>([]);
  const [userRatings, setUserRatings] = useState<Rating[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSpotlights = useCallback(async () => {
    if (!userId) return;

    try {
      const response = await fetch(`/api/spotlights?user_id=${userId}`);
      const result = await response.json();

      if (result.success) {
        setSpotlights(result.data || []);
      } else {
        setError(result.error || 'Failed to fetch spotlights');
      }
    } catch (err) {
      setError('Network error fetching spotlights');
      console.error('Error fetching spotlights:', err);
    }
  }, [userId]);

  const fetchCategories = useCallback(async () => {
    if (!userId) return;

    try {
      const response = await fetch(`/api/categories?user_id=${userId}`);
      const result = await response.json();

      if (result.success) {
        setCategories(result.data || []);
      } else {
        setError(result.error || 'Failed to fetch categories');
      }
    } catch (err) {
      setError('Network error fetching categories');
      console.error('Error fetching categories:', err);
    }
  }, [userId]);

  const fetchUserRatings = useCallback(async () => {
    if (!userId) return;

    try {
      const response = await fetch(`/api/ratings?user_id=${userId}`);
      const result = await response.json();

      if (result.success) {
        setUserRatings(result.data || []);
      } else {
        setError(result.error || 'Failed to fetch ratings');
      }
    } catch (err) {
      setError('Network error fetching ratings');
      console.error('Error fetching ratings:', err);
    }
  }, [userId]);

  const submitRating = useCallback(async (
    movieId: string, 
    interested: boolean, 
    rating?: number,
    source: string = 'browse'
  ) => {
    if (!userId) throw new Error('User not authenticated');

    try {
      const response = await fetch('/api/ratings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          movie_id: movieId,
          interested,
          rating,
          interaction_type: interested ? 'like' : 'dislike',
          source
        }),
      });

      const result = await response.json();

      if (result.success) {
        // Update local ratings state
        setUserRatings(prev => {
          const existing = prev.find(r => r.movie_id === movieId);
          if (existing) {
            return prev.map(r => 
              r.movie_id === movieId 
                ? { ...r, interested, rating, rated_at: new Date().toISOString() }
                : r
            );
          } else {
            return [...prev, result.data];
          }
        });
      } else {
        throw new Error(result.error || 'Failed to submit rating');
      }
    } catch (err) {
      setError('Failed to submit rating');
      console.error('Error submitting rating:', err);
      throw err;
    }
  }, [userId]);

  const refreshSpotlights = useCallback(async () => {
    if (!userId) return;

    try {
      const response = await fetch('/api/spotlights', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          force_regenerate: true
        }),
      });

      const result = await response.json();

      if (result.success) {
        setSpotlights(result.data || []);
      } else {
        setError(result.error || 'Failed to refresh spotlights');
      }
    } catch (err) {
      setError('Network error refreshing spotlights');
      console.error('Error refreshing spotlights:', err);
    }
  }, [userId]);

  const refreshCategories = useCallback(async () => {
    if (!userId) return;

    try {
      const response = await fetch('/api/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          force_regenerate: true
        }),
      });

      const result = await response.json();

      if (result.success) {
        setCategories(result.data || []);
      } else {
        setError(result.error || 'Failed to refresh categories');
      }
    } catch (err) {
      setError('Network error refreshing categories');
      console.error('Error refreshing categories:', err);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const loadData = async () => {
      setLoading(true);
      setError(null);

      try {
        await Promise.all([
          fetchSpotlights(),
          fetchCategories(),
          fetchUserRatings()
        ]);
      } catch (err) {
        console.error('Error loading recommendation data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [userId, fetchSpotlights, fetchCategories, fetchUserRatings]);

  return {
    spotlights,
    categories,
    userRatings,
    loading,
    error,
    refreshSpotlights,
    refreshCategories,
    submitRating
  };
} 