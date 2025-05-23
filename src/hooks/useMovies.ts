import { useState, useEffect, useCallback } from 'react';
import type { Movie, Recommendation } from '@/types';

interface UseMoviesReturn {
  movies: Movie[];
  recommendations: Recommendation[];
  loading: boolean;
  error: string | null;
  refreshMovies: () => Promise<void>;
  refreshRecommendations: () => Promise<void>;
}

export function useMovies(): UseMoviesReturn {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMovies = useCallback(async () => {
    try {
      const response = await fetch('/api/movies?limit=20');
      const result = await response.json();

      if (result.success) {
        setMovies(result.data || []);
      } else {
        setError(result.error || 'Failed to fetch movies');
      }
    } catch (err) {
      setError('Network error fetching movies');
      console.error('Error fetching movies:', err);
    }
  }, []);

  const fetchRecommendations = useCallback(async () => {
    try {
      const response = await fetch('/api/recommendations?limit=10');
      const result = await response.json();

      if (result.success) {
        setRecommendations(result.data || []);
      } else {
        setError(result.error || 'Failed to fetch recommendations');
      }
    } catch (err) {
      setError('Network error fetching recommendations');
      console.error('Error fetching recommendations:', err);
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);

      try {
        await Promise.all([fetchMovies(), fetchRecommendations()]);
      } catch (err) {
        console.error('Error loading movie data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [fetchMovies, fetchRecommendations]);

  return {
    movies,
    recommendations,
    loading,
    error,
    refreshMovies: fetchMovies,
    refreshRecommendations: fetchRecommendations
  };
} 