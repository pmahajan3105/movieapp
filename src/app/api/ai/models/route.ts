import { NextRequest, NextResponse } from 'next/server'
import { 
  modelSelector, 
  getModelForTask, 
  getDefaultModel, 
  AVAILABLE_MODELS,
  supportsStreaming,
  type AIProvider,
  type ModelCapability
} from '@/lib/ai/models'

// GET /api/ai/models - List available models and current configuration
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const provider = searchParams.get('provider')
    const capability = searchParams.get('capability')

    let models = Object.values(AVAILABLE_MODELS)

    // Filter by provider if specified
    if (provider) {
      models = modelSelector.getModelsByProvider(provider as AIProvider)
    }

    // Filter by capability if specified
    if (capability) {
      models = models.filter(model => 
        model.capabilities.includes(capability as ModelCapability)
      )
    }

    // Get current task assignments
    const taskAssignments = {
      chat: getModelForTask('chat'),
      recommendations: getModelForTask('recommendations'),
      mood_search: getModelForTask('mood_search'),
      preference_extraction: getModelForTask('preference_extraction'),
      default: getDefaultModel(),
    }

    return NextResponse.json({
      success: true,
      availableModels: models,
      currentAssignments: taskAssignments,
      summary: {
        totalModels: models.length,
        providers: [...new Set(models.map(m => m.provider))],
        recommendedModels: models.filter(m => m.recommended),
        streamingModels: models.filter(m => supportsStreaming(m.id)),
      }
    })

  } catch (error) {
    console.error('❌ Models API error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch models' },
      { status: 500 }
    )
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

    const model = AVAILABLE_MODELS[modelId]
    if (!model) {
      return NextResponse.json(
        { success: false, error: `Model ${modelId} not found` },
        { status: 404 }
      )
    }

    // If task is provided, temporarily set the model for that task
    if (task) {
      console.log(`🧪 Testing model ${model.name} for task: ${task}`)
      modelSelector.setModelForTask(task, modelId)
    }

    console.log(`🧪 Testing model: ${model.name} (${model.provider})`)
    console.log(`💬 Test message: "${message.substring(0, 50)}..."`)

    // Calculate estimated cost
    const estimatedTokens = message.length / 4 // Rough estimate
    const estimatedCost = modelSelector.estimateCost(modelId, estimatedTokens)

    return NextResponse.json({
      success: true,
      model: {
        id: model.id,
        name: model.name,
        provider: model.provider,
        capabilities: model.capabilities,
        description: model.description,
      },
      test: {
        message: message.substring(0, 100),
        estimatedTokens,
        estimatedCost: `$${estimatedCost.toFixed(6)}`,
        supportsStreaming: supportsStreaming(modelId),
        task: task || 'general',
      },
      message: `Model ${model.name} is configured and ready for testing`,
    })

  } catch (error) {
    console.error('❌ Model test error:', error)
    return NextResponse.json(
      { success: false, error: 'Model test failed' },
      { status: 500 }
    )
  }
} 