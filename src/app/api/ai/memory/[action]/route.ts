import { NextResponse } from 'next/server'

// Memory functionality temporarily disabled due to package removal
export async function POST() {
  return NextResponse.json(
    { success: false, error: 'Memory functionality temporarily disabled' },
    { status: 501 }
  )
}

export async function GET() {
  return NextResponse.json(
    { success: false, error: 'Memory functionality temporarily disabled' },
    { status: 501 }
  )
}

export async function DELETE() {
  return NextResponse.json(
    { success: false, error: 'Memory functionality temporarily disabled' },
    { status: 501 }
  )
}

/*
// Original implementation commented out due to mem0 package removal
import { requireAuth } from '@/lib/auth-server'
// import { createMem0, addMemories } from '@mem0/vercel-ai-provider' // Package removed

// Temporary placeholders for memory functionality
const createMem0 = () => ({
  add: (...args: any[]) => {
    console.log('Memory functionality disabled - package removed', args)
    return { success: true }
  },
  search: (...args: any[]) => {
    console.log('Memory functionality disabled - package removed', args)
    return { memories: [] }
  }
})

const addMemories = async (...args: any[]) => {
  console.log('Memory functionality disabled - package removed', args)
  return { success: true }
}
// import { generateText } from 'ai' // Package removed

// Initialize the Mem0 provider
const mem0 = createMem0({
  apiKey: process.env.MEM0_API_KEY,
})

interface MemoryParams {
  action: string
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<MemoryParams> }
) {
  try {
    const resolvedParams = await params
    const { action } = resolvedParams

    if (!['add', 'search'].includes(action)) {
      return NextResponse.json(
        { success: false, error: 'Invalid action' },
        { status: 400 }
      )
    }

    const userId = await requireAuth(request)
    const body = await request.json()

    if (action === 'add') {
      const { memories } = body
      
      if (!memories || !Array.isArray(memories)) {
        return NextResponse.json(
          { success: false, error: 'Memories array is required' },
          { status: 400 }
        )
      }

      const results = await Promise.all(
        memories.map(async (memory: string) => {
          return await mem0.add(memory, { user_id: userId })
        })
      )

      return NextResponse.json({ success: true, results })
    }

    if (action === 'search') {
      const { query, limit = 10 } = body
      
      if (!query) {
        return NextResponse.json(
          { success: false, error: 'Query is required' },
          { status: 400 }
        )
      }

      const results = await mem0.search(query, { 
        user_id: userId,
        limit 
      })

      return NextResponse.json({ 
        success: true, 
        memories: results?.memories || [] 
      })
    }

  } catch (error) {
    console.error('Memory API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
*/
