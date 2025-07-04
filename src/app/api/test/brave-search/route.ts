/**
 * Test endpoint to verify Brave Search API integration
 */

import { NextRequest, NextResponse } from 'next/server'
import { ExternalContextService } from '@/lib/ai/external-context-service'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const movieTitle = searchParams.get('movie') || 'Dune'
    const year = parseInt(searchParams.get('year') || '2021')
    
    const contextService = new ExternalContextService()
    
    // Test the Brave Search integration
    const result = await contextService.getEnhancedContext({
      id: '438631', // Dune movie ID
      title: movieTitle,
      year: year,
      release_date: `${year}-01-01`
    })
    
    return NextResponse.json({
      success: true,
      movie: movieTitle,
      year,
      braveSearchEnabled: !!process.env.BRAVE_API_KEY,
      result: {
        source: result.source,
        confidence: result.confidence,
        currentBuzz: result.currentBuzz ? {
          recentReviews: result.currentBuzz.recentReviews?.length || 0,
          audienceReaction: result.currentBuzz.audienceReaction,
          culturalDiscussion: result.currentBuzz.culturalDiscussion,
          currentRelevance: result.currentBuzz.currentRelevance
        } : null,
        culturalContext: result.culturalContext ? {
          culturalSignificance: result.culturalContext.culturalSignificance,
          directorContext: result.culturalContext.directorContext
        } : null
      }
    })
    
  } catch (error) {
    console.error('Brave Search test error:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      braveSearchEnabled: !!process.env.BRAVE_API_KEY,
      environmentCheck: {
        hasBraveKey: !!process.env.BRAVE_API_KEY,
        keyLength: process.env.BRAVE_API_KEY?.length || 0
      }
    }, { status: 500 })
  }
}