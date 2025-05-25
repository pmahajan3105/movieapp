import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/client'
import { movieMemoryService } from '@/lib/mem0/client'

export async function GET(request: NextRequest) {
  try {
    // Use server client to get authenticated user
    const supabase = await createServerClient()

    // Get the authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      console.error('❌ Authentication required for memories:', authError?.message)
      return NextResponse.json(
        { error: 'Authentication required', success: false },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action') || 'preferences'
    const query = searchParams.get('query')

    console.log('🧠 Mem0 API request:', { action, query, userId: user.id })

    switch (action) {
      case 'preferences':
        // Get organized user preferences
        const organizedPreferences = await movieMemoryService.getUserPreferences(user.id)
        return NextResponse.json({
          success: true,
          data: organizedPreferences,
          type: 'organized_preferences',
        })

      case 'context':
        // Get recommendation context
        const context = await movieMemoryService.getRecommendationContext(
          user.id,
          query || undefined
        )
        return NextResponse.json({
          success: true,
          data: context,
          type: 'recommendation_context',
        })

      case 'search':
        if (!query) {
          return NextResponse.json(
            { error: 'Query parameter required for search', success: false },
            { status: 400 }
          )
        }
        // Search memories by query
        const searchResults = await movieMemoryService.searchPreferences(query, user.id)
        return NextResponse.json({
          success: true,
          data: searchResults,
          type: 'search_results',
          query,
        })

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: preferences, context, or search', success: false },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('❌ Memories API error:', error)

    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    return NextResponse.json(
      {
        error: 'Failed to retrieve memories',
        success: false,
        details: errorMessage,
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // Use server client to get authenticated user
    const supabase = await createServerClient()

    // Get the authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required', success: false },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { preferenceType, content, metadata } = body

    if (!preferenceType || !content) {
      return NextResponse.json(
        { error: 'preferenceType and content are required', success: false },
        { status: 400 }
      )
    }

    console.log('🧠 Adding memory:', { preferenceType, content, userId: user.id })

    // Add specific movie preference
    const result = await movieMemoryService.addMoviePreference(
      user.id,
      preferenceType,
      content,
      metadata || {}
    )

    return NextResponse.json({
      success: true,
      data: result,
      message: 'Memory added successfully',
    })
  } catch (error) {
    console.error('❌ Add memory error:', error)

    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    return NextResponse.json(
      {
        error: 'Failed to add memory',
        success: false,
        details: errorMessage,
      },
      { status: 500 }
    )
  }
}
