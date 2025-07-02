import { NextRequest, NextResponse } from 'next/server'
import * as fs from 'fs'
import * as path from 'path'
import { logger } from '@/lib/logger'
import { createClient } from '@/lib/supabase/server-client'

interface WeightsUpdate {
  semantic?: number
  rating?: number
  popularity?: number
  recency?: number
  preference?: number
}

async function verifyAdminAccess(request: NextRequest) {
  const supabase = createClient()
  
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) {
    return { authorized: false, error: 'Authentication required' }
  }

  // Admin emails - in production, this should be managed through a database role
  const adminEmails = process.env.ADMIN_EMAILS?.split(',') || ['admin@cineai.app']
  
  if (!adminEmails.includes(user.email || '')) {
    return { authorized: false, error: 'Admin access required' }
  }

  return { authorized: true, user }
}

export async function GET(request: NextRequest) {
  try {
    const { authorized, error } = await verifyAdminAccess(request)
    if (!authorized) {
      return NextResponse.json({ error }, { status: 403 })
    }

    // Validate and sanitize config path to prevent path traversal
    const configDir = path.join(process.cwd(), 'config')
    const configPath = path.join(configDir, 'recommender-weights.json')
    
    // Ensure the path is within the expected directory
    if (!configPath.startsWith(configDir)) {
      return NextResponse.json({ error: 'Invalid config path' }, { status: 400 })
    }
    
    if (!fs.existsSync(configPath)) {
      return NextResponse.json({ error: 'Weights config not found' }, { status: 404 })
    }

    const rawData = fs.readFileSync(configPath, 'utf-8')
    const config = JSON.parse(rawData)

    return NextResponse.json({
      current: {
        semantic: config.weights?.semantic?.base || 0.4,
        rating: config.weights?.rating?.base || 0.25,
        popularity: config.weights?.popularity?.base || 0.15,
        recency: config.weights?.recency?.base || 0.1,
        preference: config.weights?.preference?.genreMatch || 0.1
      },
      meta: config.meta || {},
      version: config.version || '1.0'
    })
  } catch (error) {
    logger.error('Failed to get current weights', { 
      error: error instanceof Error ? error.message : String(error) 
    })
    return NextResponse.json({ error: 'Failed to get weights' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { authorized, error, user } = await verifyAdminAccess(request)
    if (!authorized) {
      return NextResponse.json({ error }, { status: 403 })
    }

    const body = await request.json()
    const updates: WeightsUpdate = body.weights

    if (!updates || typeof updates !== 'object') {
      return NextResponse.json({ error: 'Invalid weights format' }, { status: 400 })
    }

    // Validate weights are between 0 and 1
    for (const [key, value] of Object.entries(updates)) {
      if (typeof value !== 'number' || value < 0 || value > 1) {
        return NextResponse.json({ 
          error: `Invalid weight for ${key}: must be between 0 and 1` 
        }, { status: 400 })
      }
    }

    // Normalize weights to sum to 1
    const totalWeight = Object.values(updates).reduce((sum, w) => sum + w, 0)
    if (totalWeight === 0) {
      return NextResponse.json({ error: 'Total weight cannot be zero' }, { status: 400 })
    }

    const normalizedWeights = Object.fromEntries(
      Object.entries(updates).map(([key, value]) => [key, value / totalWeight])
    )

    // Validate and sanitize config path to prevent path traversal
    const configDir = path.join(process.cwd(), 'config')
    const configPath = path.join(configDir, 'recommender-weights.json')
    
    // Ensure the path is within the expected directory
    if (!configPath.startsWith(configDir)) {
      return NextResponse.json({ error: 'Invalid config path' }, { status: 400 })
    }
    
    let config: any = {}
    if (fs.existsSync(configPath)) {
      const rawData = fs.readFileSync(configPath, 'utf-8')
      config = JSON.parse(rawData)
    }

    // Update weights
    config.weights = {
      semantic: { 
        base: normalizedWeights.semantic || config.weights?.semantic?.base || 0.4, 
        description: "Base semantic similarity score from embeddings" 
      },
      rating: { 
        base: normalizedWeights.rating || config.weights?.rating?.base || 0.25, 
        description: "IMDb/TMDB rating influence" 
      },
      popularity: { 
        base: normalizedWeights.popularity || config.weights?.popularity?.base || 0.15, 
        description: "Movie popularity/vote count influence" 
      },
      recency: { 
        base: normalizedWeights.recency || config.weights?.recency?.base || 0.1, 
        description: "Release year recency boost" 
      },
      preference: { 
        genreMatch: normalizedWeights.preference || config.weights?.preference?.genreMatch || 0.1, 
        description: "User preference genre matching boost" 
      }
    }

    // Update meta information
    config.meta = {
      ...config.meta,
      dynamicWeightsEnabled: true,
      lastManualUpdate: new Date().toISOString(),
      lastUpdatedBy: user?.email || 'unknown-admin',
      notes: 'Manually tuned weights via API'
    }

    config.version = `2.0-manual-${new Date().toISOString().split('T')[0]}`
    config.lastUpdated = new Date().toISOString()

    // Ensure config directory exists (reuse configDir from above)
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true })
    }

    fs.writeFileSync(configPath, JSON.stringify(config, null, 2))

    logger.info('Updated recommender weights manually', { 
      normalizedWeights,
      version: config.version 
    })

    return NextResponse.json({
      success: true,
      updated: normalizedWeights,
      version: config.version,
      message: 'Weights updated successfully'
    })

  } catch (error) {
    logger.error('Failed to update weights', { 
      error: error instanceof Error ? error.message : String(error) 
    })
    return NextResponse.json({ error: 'Failed to update weights' }, { status: 500 })
  }
} 