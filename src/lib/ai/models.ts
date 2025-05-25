// AI Model Management System
// Centralized configuration for all AI models and providers

export type AIProvider = 'anthropic' | 'openai' | 'groq' | 'google'

export interface ModelConfig {
  id: string
  name: string
  provider: AIProvider
  modelId: string
  maxTokens: number
  temperature: number
  description: string
  costPer1kTokens: number
  capabilities: ModelCapability[]
  recommended: boolean
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
  'claude-3-5-sonnet': {
    id: 'claude-3-5-sonnet',
    name: 'Claude 3.5 Sonnet',
    provider: 'anthropic',
    modelId: 'claude-3-5-sonnet-20241022',
    maxTokens: 1000,
    temperature: 0.7,
    description: 'Most capable model, best for complex reasoning and movie recommendations',
    costPer1kTokens: 0.015,
    capabilities: ['chat', 'streaming', 'function-calling', 'long-context', 'high-quality'],
    recommended: true,
  },
  'claude-3-haiku': {
    id: 'claude-3-haiku',
    name: 'Claude 3 Haiku',
    provider: 'anthropic',
    modelId: 'claude-3-haiku-20240307',
    maxTokens: 1000,
    temperature: 0.7,
    description: 'Fast and efficient, good for quick responses',
    costPer1kTokens: 0.0025,
    capabilities: ['chat', 'streaming', 'fast-response'],
    recommended: false,
  },

  // OpenAI Models (future support)
  'gpt-4-turbo': {
    id: 'gpt-4-turbo',
    name: 'GPT-4 Turbo',
    provider: 'openai',
    modelId: 'gpt-4-turbo-preview',
    maxTokens: 1000,
    temperature: 0.7,
    description: 'OpenAI\'s most capable model',
    costPer1kTokens: 0.01,
    capabilities: ['chat', 'function-calling', 'vision', 'high-quality'],
    recommended: false,
  },
  'gpt-3.5-turbo': {
    id: 'gpt-3.5-turbo',
    name: 'GPT-3.5 Turbo',
    provider: 'openai',
    modelId: 'gpt-3.5-turbo',
    maxTokens: 1000,
    temperature: 0.7,
    description: 'Fast and cost-effective OpenAI model',
    costPer1kTokens: 0.001,
    capabilities: ['chat', 'fast-response'],
    recommended: false,
  },

  // Groq Models (if we want to re-enable)
  'llama-3.3-70b': {
    id: 'llama-3.3-70b',
    name: 'Llama 3.3 70B (Groq)',
    provider: 'groq',
    modelId: 'llama-3.3-70b-versatile',
    maxTokens: 500,
    temperature: 0.7,
    description: 'Very fast inference via Groq',
    costPer1kTokens: 0.0005,
    capabilities: ['chat', 'streaming', 'fast-response'], // Groq DOES support streaming!
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
      return AVAILABLE_MODELS[this.defaultModel] || AVAILABLE_MODELS['claude-3-5-sonnet']
    }
    
    return model
  }

  // Get default model
  getDefaultModel(): ModelConfig {
    return AVAILABLE_MODELS[this.defaultModel] || AVAILABLE_MODELS['claude-3-5-sonnet']
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
  estimateCost(modelId: string, tokens: number): number {
    const model = AVAILABLE_MODELS[modelId]
    return model ? (model.costPer1kTokens * tokens) / 1000 : 0
  }
}

// Global model selector instance
export const modelSelector = new AIModelSelector()

// Convenience functions
export const getModelForTask = (task: string) => modelSelector.getModelForTask(task)
export const getDefaultModel = () => modelSelector.getDefaultModel()
export const supportsStreaming = (modelId: string) => modelSelector.supportsCapability(modelId, 'streaming') 