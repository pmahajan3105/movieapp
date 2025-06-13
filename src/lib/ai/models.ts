// AI Model Management System
// Centralized configuration for all AI models and providers

export type AIProvider = 'anthropic' | 'groq' | 'google'

export interface ModelConfig {
  id: string
  name: string
  provider: AIProvider
  modelId: string
  maxTokens: number
  temperature: number
  description: string
  costPer1kTokens: { input: number; output: number } | number
  capabilities: ModelCapability[]
  recommended: boolean
  contextWindow?: number
  tier?: 'basic' | 'standard' | 'premium'
  supported?: boolean
}

export type ModelCapability =
  | 'chat'
  | 'streaming'
  | 'function-calling'
  | 'vision'
  | 'long-context'
  | 'fast-response'
  | 'high-quality'

export interface AIModelResponse {
  content: string
  usage?: {
    inputTokens: number
    outputTokens: number
    totalTokens: number
  }
  model: string
  provider: AIProvider
}

// Available Models Configuration
export const AVAILABLE_MODELS: Record<string, ModelConfig> = {
  // Anthropic Models
  'claude-3.5-sonnet': {
    id: 'claude-3.5-sonnet',
    name: 'Claude 3.5 Sonnet',
    provider: 'anthropic',
    modelId: 'claude-3-5-sonnet-20241022',
    tier: 'premium',
    maxTokens: 8192,
    temperature: 0.7,
    capabilities: ['streaming', 'function-calling', 'vision'],
    costPer1kTokens: { input: 0.003, output: 0.015 },
    description: 'Most capable model, best for complex reasoning and movie recommendations',
    contextWindow: 200000,
    supported: true,
    recommended: true,
  },

  'claude-3-haiku': {
    id: 'claude-3-haiku',
    name: 'Claude 3 Haiku',
    provider: 'anthropic',
    modelId: 'claude-3-haiku-20240307',
    tier: 'standard',
    maxTokens: 4096,
    temperature: 0.7,
    capabilities: ['streaming'],
    costPer1kTokens: { input: 0.00025, output: 0.00125 },
    description: 'Fast and efficient model for simple tasks',
    contextWindow: 200000,
    supported: true,
    recommended: false,
  },

  // Groq Models
  'llama-3.3-70b': {
    id: 'llama-3.3-70b',
    name: 'Llama 3.3 70B',
    provider: 'groq',
    modelId: 'llama-3.3-70b-versatile',
    tier: 'standard',
    maxTokens: 8192,
    temperature: 0.7,
    capabilities: ['streaming'],
    costPer1kTokens: { input: 0.00059, output: 0.00079 },
    description: 'Large Llama model via Groq - fast inference',
    contextWindow: 131072,
    supported: true,
    recommended: false,
  },

  'llama-3.1-8b': {
    id: 'llama-3.1-8b',
    name: 'Llama 3.1 8B',
    provider: 'groq',
    modelId: 'llama-3.1-8b-instant',
    tier: 'basic',
    maxTokens: 8192,
    temperature: 0.7,
    capabilities: ['streaming'],
    costPer1kTokens: { input: 0.00005, output: 0.00008 },
    description: 'Fast and cost-effective model for basic tasks',
    contextWindow: 131072,
    supported: true,
    recommended: false,
  },
}

// Model Selection Logic
export class AIModelSelector {
  private defaultModel: string
  private taskSpecificModels: Record<string, string>

  constructor() {
    // Load from environment or use defaults
    // TEMPORARILY using Groq since Anthropic API key is invalid
    this.defaultModel = process.env.AI_DEFAULT_MODEL || 'llama-3.3-70b'
    this.taskSpecificModels = {
      chat: process.env.AI_CHAT_MODEL || 'llama-3.3-70b', // Switched to Groq
      recommendations: process.env.AI_RECOMMENDATIONS_MODEL || 'llama-3.3-70b', // Switched to Groq
      mood_search: process.env.AI_MOOD_SEARCH_MODEL || 'llama-3.3-70b', // Switched to Groq
      preference_extraction: process.env.AI_PREFERENCE_MODEL || 'llama-3.3-70b', // Switched to Groq
    }
  }

  // Get model for specific task
  getModelForTask(task: string): ModelConfig {
    const modelId = this.taskSpecificModels[task] || this.defaultModel
    const model = AVAILABLE_MODELS[modelId]

    if (!model) {
      console.warn(`Model ${modelId} not found, falling back to default`)
      const fallbackModel =
        AVAILABLE_MODELS[this.defaultModel] || AVAILABLE_MODELS['claude-3-5-sonnet']
      if (!fallbackModel) {
        throw new Error(`No valid models available. Check AVAILABLE_MODELS configuration.`)
      }
      return fallbackModel
    }

    return model
  }

  // Get default model
  getDefaultModel(): ModelConfig {
    const model = AVAILABLE_MODELS[this.defaultModel] || AVAILABLE_MODELS['claude-3-5-sonnet']
    if (!model) {
      throw new Error(`No valid default model available. Check AVAILABLE_MODELS configuration.`)
    }
    return model
  }

  // Get all available models
  getAvailableModels(): ModelConfig[] {
    return Object.values(AVAILABLE_MODELS)
  }

  // Get models by provider
  getModelsByProvider(provider: AIProvider): ModelConfig[] {
    return Object.values(AVAILABLE_MODELS).filter(model => model.provider === provider)
  }

  // Get recommended models
  getRecommendedModels(): ModelConfig[] {
    return Object.values(AVAILABLE_MODELS).filter(model => model.recommended)
  }

  // Check if model supports capability
  supportsCapability(modelId: string, capability: ModelCapability): boolean {
    const model = AVAILABLE_MODELS[modelId]
    return model?.capabilities.includes(capability) || false
  }

  // Set model for specific task (runtime configuration)
  setModelForTask(task: string, modelId: string): void {
    if (!AVAILABLE_MODELS[modelId]) {
      throw new Error(`Model ${modelId} not found`)
    }
    this.taskSpecificModels[task] = modelId
  }

  // Get cost estimate for tokens
  estimateCost(modelId: string, inputTokens: number, outputTokens: number = 0): number {
    const model = AVAILABLE_MODELS[modelId]
    if (!model) return 0

    if (typeof model.costPer1kTokens === 'number') {
      // Legacy single price
      return (model.costPer1kTokens * (inputTokens + outputTokens)) / 1000
    } else {
      // Input/output pricing
      const inputCost = (model.costPer1kTokens.input * inputTokens) / 1000
      const outputCost = (model.costPer1kTokens.output * outputTokens) / 1000
      return inputCost + outputCost
    }
  }
}

// Global model selector instance
export const modelSelector = new AIModelSelector()

// Convenience functions
export const getModelForTask = (task: string) => modelSelector.getModelForTask(task)
export const getDefaultModel = () => modelSelector.getDefaultModel()
export const supportsStreaming = (modelId: string) =>
  modelSelector.supportsCapability(modelId, 'streaming')

export const DEFAULT_MODELS = {
  chat: process.env.AI_CHAT_MODEL || 'llama-3.3-70b',
  recommendations: process.env.AI_RECOMMENDATIONS_MODEL || 'llama-3.3-70b', // Switched to Groq
}
