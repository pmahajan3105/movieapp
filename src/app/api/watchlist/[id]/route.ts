import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

// Create Supabase client for server-side use
function createSupabaseServerClient(request: NextRequest) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set() {
          // API routes don't set cookies
        },
        remove() {
          // API routes don't remove cookies
        },
      },
    }
  )
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = createSupabaseServerClient(request)

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { id: watchlistId } = await params
    const body = await request.json()
    const { watched, notes, rating } = body

    console.log('🔄 Updating watchlist item:', {
      watchlistId,
      userId: user.id,
      updates: { watched, notes, rating },
    })

    if (!watchlistId) {
      return NextResponse.json(
        { success: false, error: 'Watchlist ID is required' },
        { status: 400 }
      )
    }

    // First, update without rating to avoid schema cache issues
    const updateData: Record<string, unknown> = {}

    if (typeof watched === 'boolean') {
      updateData.watched = watched
      updateData.watched_at = watched ? new Date().toISOString() : null
    }

    if (notes !== undefined) {
      updateData.notes = notes
    }

    console.log('📝 Update data (without rating):', updateData)

    const { data, error } = await supabase
      .from('watchlist')
      .update(updateData)
      .eq('id', watchlistId)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      console.error('❌ Watchlist update error:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to update watchlist item' },
        { status: 500 }
      )
    }

    // If rating is provided, try to update it using a database function to bypass schema cache
    if (rating !== undefined && typeof rating === 'number') {
      console.log('📝 Attempting to update rating using database function:', {
        rating,
        watchlistId,
      })

      try {
        // Use database function to bypass the schema cache issue
        const { data: ratingResult, error: ratingError } = await supabase.rpc(
          'update_watchlist_rating',
          {
            watchlist_id: watchlistId,
            user_id: user.id,
            new_rating: rating,
          }
        )

        if (ratingError) {
          console.warn('⚠️ Rating update failed:', ratingError)
          // Don't fail the entire request since the main update succeeded
          console.log('✅ Main update succeeded, rating update skipped due to error')
        } else if (ratingResult) {
          console.log('✅ Rating updated successfully via database function')
        } else {
          console.warn('⚠️ Rating update returned false (item not found or not updated)')
        }
      } catch (ratingErr) {
        console.warn('⚠️ Rating update error (non-critical):', ratingErr)
        // Continue with success since the main update worked
      }
    }

    if (!data) {
      console.log('⚠️ Watchlist item not found:', { watchlistId, userId: user.id })
      return NextResponse.json(
        { success: false, error: 'Watchlist item not found' },
        { status: 404 }
      )
    }

    console.log('✅ Successfully updated watchlist item:', {
      watchlistId,
      userId: user.id,
      watched: data.watched,
      watchedAt: data.watched_at,
    })

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('❌ Watchlist PATCH error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createSupabaseServerClient(request)

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { id: watchlistId } = await params

    console.log('🗑️ Deleting watchlist item:', {
      watchlistId,
      userId: user.id,
    })

    if (!watchlistId) {
      return NextResponse.json(
        { success: false, error: 'Watchlist ID is required' },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('watchlist')
      .delete()
      .eq('id', watchlistId)
      .eq('user_id', user.id)

    if (error) {
      console.error('❌ Watchlist delete error:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to delete watchlist item' },
        { status: 500 }
      )
    }

    console.log('✅ Successfully deleted watchlist item:', {
      watchlistId,
      userId: user.id,
    })

    return NextResponse.json({ success: true, message: 'Watchlist item deleted' })
  } catch (error) {
    console.error('❌ Watchlist DELETE error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
