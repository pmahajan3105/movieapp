import { ConversationalQuery } from './conversational-parser';
import { SmartRecommenderV2 } from './smart-recommender-v2';
import { supabase } from '@/lib/supabase/browser-client';
import { logger } from '@/lib/logger';
import type { Movie } from '@/types';

export interface SearchResult {
  movies: Movie[];
  searchContext: {
    strategy: 'semantic' | 'filter' | 'hybrid';
    query_interpretation: string;
    confidence: number;
    [key: string]: any;
  };
  explanations: string[];
  totalResults: number;
}

export class SmartSearchEngine {
  private recommender = SmartRecommenderV2.getInstance();
  private supabaseClient = supabase;

  async executeSearch(
    query: ConversationalQuery,
    userId: string,
    limit: number = 10
  ): Promise<SearchResult> {
    
    logger.info('Executing smart search', { 
      intent: query.intent, 
      strategy: query.search_strategy,
      userId 
    });

    try {
      switch (query.search_strategy) {
        case 'semantic':
          return await this.executeSemanticSearch(query, userId, limit);
        case 'filter':
          return await this.executeFilterSearch(query, userId, limit);
        case 'hybrid':
          return await this.executeHybridSearch(query, userId, limit);
        default:
          return await this.executeHybridSearch(query, userId, limit);
      }
    } catch (error) {
      logger.error('Search execution failed', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        query: query.original_text 
      });
      return this.createFallbackResult(query, userId, limit);
    }
  }

  private async executeSemanticSearch(
    query: ConversationalQuery,
    userId: string,
    limit: number
  ): Promise<SearchResult> {
    
    // Build semantic search text from query criteria
    const searchText = this.buildSemanticSearchText(query);
    
    // Use the existing smart recommender for semantic search
    const personalizedResults = await this.recommender.getSmartRecommendations({
      userId,
      userQuery: searchText,
      limit: limit * 2, // Get more to filter/rank
      semanticThreshold: 0.6
    });

    // Apply query-specific filtering
    const filteredMovies = this.applyQueryFilters(personalizedResults.movies, query);
    
    return {
      movies: filteredMovies.slice(0, limit),
      searchContext: {
        strategy: 'semantic',
        query_interpretation: searchText,
        confidence: query.confidence,
        semantic_threshold: 0.6,
        personalized: true
      },
      explanations: [
        `Found movies semantically similar to: "${query.original_text}"`,
        `Applied your personal preferences and viewing history`,
        `Ranked by relevance and compatibility with your taste`
      ],
      totalResults: filteredMovies.length
    };
  }

  private async executeFilterSearch(
    query: ConversationalQuery,
    userId: string,
    limit: number
  ): Promise<SearchResult> {
    
    const filters = this.buildDatabaseFilters(query.extracted_criteria);
    
    // Get movies from database with filters
    const filteredMovies = await this.getMoviesWithFilters(filters, limit * 3);
    
    // Apply personal ranking using the recommender
    const rankedMovies = await this.applyPersonalRanking(filteredMovies, userId, limit);

    return {
      movies: rankedMovies,
      searchContext: {
        strategy: 'filter',
        query_interpretation: this.describeFilters(filters),
        confidence: query.confidence,
        applied_filters: filters,
        personalized: true
      },
      explanations: [
        `Filtered movies by: ${this.describeFilters(filters)}`,
        `Ranked by your personal preferences`,
        `Found ${filteredMovies.length} matching movies`
      ],
      totalResults: filteredMovies.length
    };
  }

  private async executeHybridSearch(
    query: ConversationalQuery,
    userId: string,
    limit: number
  ): Promise<SearchResult> {
    
    // Execute both strategies in parallel
    const [semanticResults, filterResults] = await Promise.all([
      this.executeSemanticSearch(query, userId, Math.ceil(limit * 0.7)),
      this.executeFilterSearch(query, userId, Math.ceil(limit * 0.7))
    ]);

    // Merge and deduplicate results
    const mergedMovies = this.mergeSearchResults(
      semanticResults.movies,
      filterResults.movies,
      query.confidence,
      limit
    );

    return {
      movies: mergedMovies,
      searchContext: {
        strategy: 'hybrid',
        query_interpretation: `${semanticResults.searchContext.query_interpretation} + ${filterResults.searchContext.query_interpretation}`,
        confidence: query.confidence,
        semantic_weight: query.confidence,
        filter_weight: 1 - query.confidence,
        personalized: true
      },
      explanations: [
        `Combined semantic similarity and filtered search`,
        `Weighted by query confidence: ${Math.round(query.confidence * 100)}%`,
        `Personalized for your viewing preferences`
      ],
      totalResults: semanticResults.totalResults + filterResults.totalResults
    };
  }

  private buildSemanticSearchText(query: ConversationalQuery): string {
    const criteria = query.extracted_criteria;
    const parts: string[] = [query.original_text];

    if (criteria.genres?.length) {
      parts.push(`Genres: ${criteria.genres.join(', ')}`);
    }
    if (criteria.moods?.length) {
      parts.push(`Mood: ${criteria.moods.join(', ')}`);
    }
    if (criteria.emotional_tone) {
      parts.push(`Tone: ${criteria.emotional_tone}`);
    }
    if (criteria.similar_to?.length) {
      parts.push(`Similar to: ${criteria.similar_to.join(', ')}`);
    }
    if (criteria.keywords?.length) {
      parts.push(`Keywords: ${criteria.keywords.join(', ')}`);
    }

    return parts.join('. ');
  }

  private buildDatabaseFilters(criteria: ConversationalQuery['extracted_criteria']) {
    const filters: any = {};

    if (criteria.genres?.length) {
      // Map genre names to IDs (you'd need a genre mapping)
      filters.genres = criteria.genres;
    }
    if (criteria.year_range) {
      filters.year_min = criteria.year_range[0];
      filters.year_max = criteria.year_range[1];
    }
    if (criteria.actors?.length) {
      filters.actors = criteria.actors;
    }
    if (criteria.directors?.length) {
      filters.directors = criteria.directors;
    }

    return filters;
  }

  private async getMoviesWithFilters(filters: any, limit: number): Promise<Movie[]> {
    let query = this.supabaseClient
      .from('movies')
      .select('*')
      .limit(limit);

    // Apply filters to the query
    if (filters.year_min || filters.year_max) {
      if (filters.year_min) {
        query = query.gte('release_date', `${filters.year_min}-01-01`);
      }
      if (filters.year_max) {
        query = query.lte('release_date', `${filters.year_max}-12-31`);
      }
    }

    // For genre filtering, you'd need to implement based on your schema
    // This is a simplified version
    if (filters.genres?.length) {
      // Assuming you have a way to filter by genre names or IDs
      // This would need to be implemented based on your actual schema
    }

    const { data, error } = await query;
    
    if (error) {
      logger.error('Database filter query failed', { error, filters });
      return [];
    }

    return data || [];
  }

  private async applyPersonalRanking(movies: Movie[], userId: string, limit: number): Promise<Movie[]> {
    if (movies.length === 0) return [];

    try {
      // Use existing recommendation system to rank filtered movies
      const recommendations = await this.recommender.getSmartRecommendations({
        userId,
        limit: movies.length
      });

      // Create a ranking map from the recommendations
      const rankingMap = new Map<string, number>();
      recommendations.movies.forEach((movie, index) => {
        rankingMap.set(movie.id, index);
      });

      // Sort the filtered movies by their ranking in recommendations
      return movies
        .sort((a, b) => {
          const aRank = rankingMap.get(a.id) ?? 999999;
          const bRank = rankingMap.get(b.id) ?? 999999;
          return aRank - bRank;
        })
        .slice(0, limit);
    } catch (error) {
      logger.error('Personal ranking failed', { 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return movies.slice(0, limit);
    }
  }

  private applyQueryFilters(movies: Movie[], query: ConversationalQuery): Movie[] {
    let filtered = [...movies];

    const criteria = query.extracted_criteria;

    // Apply year range filter
    if (criteria.year_range) {
      const [minYear, maxYear] = criteria.year_range;
      filtered = filtered.filter(movie => {
        if (!movie.release_date) return false;
        const year = parseInt(movie.release_date.split('-')[0] || '0');
        return year >= minYear && year <= maxYear;
      });
    }

    // Apply other filters as needed based on your movie schema
    
    return filtered;
  }

  private mergeSearchResults(
    semanticMovies: Movie[],
    filterMovies: Movie[],
    semanticWeight: number,
    limit: number
  ): Movie[] {
    const merged = new Map<string, Movie & { score: number }>();

    // Add semantic results with weight
    semanticMovies.forEach((movie, index) => {
      const score = (semanticMovies.length - index) * semanticWeight;
      merged.set(movie.id, { ...movie, score });
    });

    // Add filter results with weight
    filterMovies.forEach((movie, index) => {
      const score = (filterMovies.length - index) * (1 - semanticWeight);
      const existing = merged.get(movie.id);
      
      if (existing) {
        existing.score += score;
      } else {
        merged.set(movie.id, { ...movie, score });
      }
    });

    // Sort by combined score and return
    return Array.from(merged.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  private describeFilters(filters: any): string {
    const descriptions: string[] = [];
    
    if (filters.genres) descriptions.push(`genres: ${filters.genres.join(', ')}`);
    if (filters.year_min || filters.year_max) {
      descriptions.push(`years: ${filters.year_min || 'any'}-${filters.year_max || 'any'}`);
    }
    if (filters.actors) descriptions.push(`actors: ${filters.actors.join(', ')}`);
    if (filters.directors) descriptions.push(`directors: ${filters.directors.join(', ')}`);
    
    return descriptions.join(', ') || 'general criteria';
  }

  private async createFallbackResult(
    query: ConversationalQuery,
    userId: string,
    limit: number
  ): Promise<SearchResult> {
    try {
      // Fallback to basic smart recommendations
      const recommendations = await this.recommender.getSmartRecommendations({
        userId,
        userQuery: query.original_text,
        limit
      });

      return {
        movies: recommendations.movies,
        searchContext: {
          strategy: 'hybrid',
          query_interpretation: 'Fallback to general recommendations',
          confidence: 0.5,
          fallback: true
        },
        explanations: [
          'Using general recommendations based on your preferences',
          'Search query could not be fully processed'
        ],
        totalResults: recommendations.movies.length
      };
    } catch (error) {
      logger.error('Fallback search failed', { 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return {
        movies: [],
        searchContext: {
          strategy: 'hybrid',
          query_interpretation: 'Search failed',
          confidence: 0,
          error: true
        },
        explanations: ['Search could not be completed'],
        totalResults: 0
      };
    }
  }
} 