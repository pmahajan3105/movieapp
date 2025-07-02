import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server-client';
import { ConversationalParser } from '@/lib/ai/conversational-parser';
import { SmartSearchEngine } from '@/lib/ai/smart-search-engine';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { query, limit = 10 } = body;

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Query parameter is required and must be a string' },
        { status: 400 }
      );
    }

    logger.info('Processing conversational search', { 
      userId: user.id, 
      query: query.substring(0, 100) // Log first 100 chars only
    });

    // Parse the conversational query
    const parser = new ConversationalParser();
    const parsedQuery = await parser.parseQuery(query, user.id);

    // Execute the search
    const searchEngine = new SmartSearchEngine();
    const results = await searchEngine.executeSearch(parsedQuery, user.id, limit);

    // Return results with metadata
    return NextResponse.json({
      success: true,
      data: {
        movies: results.movies,
        searchContext: results.searchContext,
        explanations: results.explanations,
        totalResults: results.totalResults,
        parsedQuery: {
          intent: parsedQuery.intent,
          confidence: parsedQuery.confidence,
          search_strategy: parsedQuery.search_strategy,
          extracted_criteria: parsedQuery.extracted_criteria
        }
      }
    });

  } catch (error) {
    logger.error('Conversational search failed', { 
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to process search request' 
      },
      { status: 500 }
    );
  }
}

// GET endpoint for simple text-based search (fallback)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const limit = parseInt(searchParams.get('limit') || '10');
    const simple = searchParams.get('simple') === 'true'; // Add simple search option

    if (!query) {
      return NextResponse.json(
        { error: 'Query parameter "q" is required' },
        { status: 400 }
      );
    }

    logger.info('Processing GET search', { 
      userId: user.id, 
      query: query.substring(0, 100),
      simple
    });

    if (simple) {
      // Direct TMDB search using unified service
      try {
        const { searchTmdbMovies } = await import('@/lib/utils/tmdb-helpers');
        const result = await searchTmdbMovies(query, { limit, page: 1 });

        return NextResponse.json({
          success: true,
          data: {
            movies: result.movies,
            totalResults: result.totalResults,
            searchType: result.fallbackUsed ? 'simple_fallback' : 'simple_tmdb'
          }
        });
      } catch (error) {
        logger.error('Simple search failed', { error: error instanceof Error ? error.message : 'Unknown error' });
        return NextResponse.json({
          success: false,
          error: 'Simple search failed'
        }, { status: 500 });
      }
    }

    try {
      // Use the same conversational search logic
      const parser = new ConversationalParser();
      const parsedQuery = await parser.parseQuery(query, user.id);

      const searchEngine = new SmartSearchEngine();
      const results = await searchEngine.executeSearch(parsedQuery, user.id, limit);

      return NextResponse.json({
        success: true,
        data: {
          movies: results.movies,
          searchContext: results.searchContext,
          totalResults: results.totalResults
        }
      });
    } catch (error) {
      logger.error('Advanced search failed, falling back to simple search', { 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      // Fallback to simple TMDB search using unified service
      try {
        const { searchTmdbMovies } = await import('@/lib/utils/tmdb-helpers');
        const result = await searchTmdbMovies(query, { limit, page: 1 });

        return NextResponse.json({
          success: true,
          data: {
            movies: result.movies,
            totalResults: result.totalResults,
            searchType: result.fallbackUsed ? 'fallback_fallback' : 'fallback_tmdb'
          }
        });
      } catch (fallbackError) {
        logger.error('Fallback search also failed', { 
          error: fallbackError instanceof Error ? fallbackError.message : 'Unknown error'
        });
        
        return NextResponse.json({
          success: false,
          error: 'Search failed'
        }, { status: 500 });
      }
    }

  } catch (error) {
    logger.error('GET search failed', { 
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to process search request' 
      },
      { status: 500 }
    );
  }
} 