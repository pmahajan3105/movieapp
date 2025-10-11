// AI Model Management System
// Centralized configuration for all AI models and providers

export type AIProvider = 'anthropic' | 'openai'

export interface AIModel {
  id: string
  name: string
  provider: AIProvider
  maxTokens: number
  costPer1kTokens: {
    input: number
    output: number
  }
  description: string
  contextWindow: number
  supportsExtendedThinking?: boolean
  supportsFunctionCalling?: boolean
  supportsMultimodal?: boolean
}

// OpenAI Models - Primary provider
const openaiModels: AIModel[] = [
  {
    id: 'gpt-5-mini',
    name: 'GPT-5 Mini',
    provider: 'openai',
    maxTokens: 16384,
    costPer1kTokens: { input: 0.004, output: 0.012 },
    description: '92% of GPT-5 capability, 60% lower cost, 400K context, multimodal',
    contextWindow: 400000,
    supportsExtendedThinking: true,
    supportsFunctionCalling: true,
    supportsMultimodal: true,
  },
]

// Anthropic Models - Fallback provider for complex analysis
const anthropicModels: AIModel[] = [
  {
    id: 'claude-sonnet-4-20250514',
    name: 'Claude 4.5 Sonnet',
    provider: 'anthropic',
    maxTokens: 64000,
    costPer1kTokens: { input: 0.003, output: 0.015 },
    description:
      'Claude 4.5 Sonnet - Latest model for complex analytical tasks and structured outputs',
    contextWindow: 200000,
    supportsExtendedThinking: true,
  },
  {
    id: 'claude-3-7-sonnet-20250219',
    name: 'Claude 3.7 Sonnet',
    provider: 'anthropic',
    maxTokens: 64000,
    costPer1kTokens: { input: 0.003, output: 0.015 },
    description:
      'Latest Claude 3.7 Sonnet - hybrid reasoning model with extended thinking capabilities, state-of-the-art coding',
    contextWindow: 200000,
    supportsExtendedThinking: true,
  },
  {
    id: 'claude-3-5-haiku-20241022',
    name: 'Claude 3.5 Haiku',
    provider: 'anthropic',
    maxTokens: 8192,
    costPer1kTokens: { input: 0.0008, output: 0.004 },
    description: 'Fast and efficient Claude - excellent for quick responses and high-volume tasks',
    contextWindow: 200000,
    supportsExtendedThinking: false,
  },
]

// All available models
export const AI_MODELS: AIModel[] = [...openaiModels, ...anthropicModels]

// Default model configurations
export const DEFAULT_MODEL = 'gpt-5-mini' // Primary AI model
export const FAST_MODEL = 'gpt-5-mini' // GPT-5-mini is already fast
export const FALLBACK_MODEL = 'claude-sonnet-4-20250514' // Claude 4.5 Sonnet for fallback
export const BEHAVIORAL_MODEL = 'claude-sonnet-4-20250514' // Claude optimized for analytics

// Model selection helpers
export function getModelById(id: string): AIModel | undefined {
  return AI_MODELS.find(model => model.id === id)
}

export function getModelsByProvider(provider: AIProvider): AIModel[] {
  return AI_MODELS.filter(model => model.provider === provider)
}

export function getBestModelForTask(
  task: 'chat' | 'recommendations' | 'analysis' | 'fast-response'
): string {
  switch (task) {
    case 'chat':
    case 'recommendations':
    case 'analysis':
      return DEFAULT_MODEL // Claude 3.7 Sonnet for complex tasks
    case 'fast-response':
      return FAST_MODEL // Claude 3.5 Haiku for speed
    default:
      return DEFAULT_MODEL
  }
}

// Cost calculation helpers
export function calculateCost(model: AIModel, inputTokens: number, outputTokens: number): number {
  const inputCost = (inputTokens / 1000) * model.costPer1kTokens.input
  const outputCost = (outputTokens / 1000) * model.costPer1kTokens.output
  return inputCost + outputCost
}

// Extended thinking support check
export function supportsExtendedThinking(modelId: string): boolean {
  const model = getModelById(modelId)
  return model?.supportsExtendedThinking ?? false
}
