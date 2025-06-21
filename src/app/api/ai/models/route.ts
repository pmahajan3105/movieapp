import { NextRequest, NextResponse } from 'next/server'
import {
  AI_MODELS,
  getModelsByProvider,
  getBestModelForTask,
  DEFAULT_MODEL,
  calculateCost,
  supportsExtendedThinking,
  type AIProvider,
} from '@/lib/ai/models'

// GET /api/ai/models - List available models and current configuration
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const provider = searchParams.get('provider')
    const capability = searchParams.get('capability')

    let models = [...AI_MODELS]

    // Filter by provider if specified
    if (provider) {
      models = getModelsByProvider(provider as AIProvider)
    }

    // Simple capability filter – only "extended" supported for now
    if (capability === 'extended') {
      models = models.filter(m => m.supportsExtendedThinking)
    }

    // Get current task assignments
    const taskAssignments = {
      chat: getBestModelForTask('chat'),
      recommendations: getBestModelForTask('recommendations'),
      analysis: getBestModelForTask('analysis'),
      'fast-response': getBestModelForTask('fast-response'),
      default: DEFAULT_MODEL,
    }

    return NextResponse.json({
      success: true,
      availableModels: models,
      currentAssignments: taskAssignments,
      summary: {
        totalModels: models.length,
        providers: [...new Set(models.map(m => m.provider))],
        extendedThinkingModels: models.filter(m => m.supportsExtendedThinking),
      },
    })
  } catch (error) {
    console.error('❌ Models API error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch models' }, { status: 500 })
  }
}

// POST /api/ai/models/test - Test a specific model
export async function POST(request: NextRequest) {
  try {
    const { modelId, message, task } = await request.json()

    if (!modelId || !message) {
      return NextResponse.json(
        { success: false, error: 'modelId and message are required' },
        { status: 400 }
      )
    }

    const model = AI_MODELS.find(m => m.id === modelId)
    if (!model) {
      return NextResponse.json(
        { success: false, error: `Model ${modelId} not found` },
        { status: 404 }
      )
    }

    console.log(`🧪 Testing model: ${model.name} (${model.provider})`)
    console.log(`💬 Test message: "${message.substring(0, 50)}..."`)

    // Calculate estimated cost
    const estimatedTokens = Math.ceil(message.length / 4) // Rough estimate
    const estimatedCost = calculateCost(model, estimatedTokens, Math.ceil(estimatedTokens / 2))

    return NextResponse.json({
      success: true,
      model: {
        id: model.id,
        name: model.name,
        provider: model.provider,
        description: model.description,
      },
      test: {
        message: message.substring(0, 100),
        estimatedTokens,
        estimatedCost: `$${estimatedCost.toFixed(6)}`,
        supportsExtendedThinking: supportsExtendedThinking(modelId),
        task: task || 'general',
      },
      message: `Model ${model.name} is configured and ready for testing`,
    })
  } catch (error) {
    console.error('❌ Model test error:', error)
    return NextResponse.json({ success: false, error: 'Model test failed' }, { status: 500 })
  }
}
