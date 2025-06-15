import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/client'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createServerClient()

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

    const updateData: Record<string, unknown> = {}

    if (typeof watched === 'boolean') {
      updateData.watched = watched
      updateData.watched_at = watched ? new Date().toISOString() : null
    }

    if (notes !== undefined) {
      updateData.notes = notes
    }

    if (rating !== undefined && typeof rating === 'number') {
      updateData.rating = rating
    }

    console.log('📝 Update data:', updateData)

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
    const supabase = await createServerClient()

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
