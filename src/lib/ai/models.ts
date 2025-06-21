// AI Model Management System
// Centralized configuration for all AI models and providers

export type AIProvider = 'anthropic'

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
}

// Anthropic Models - Primary and only provider
const anthropicModels: AIModel[] = [
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
export const AI_MODELS: AIModel[] = [...anthropicModels]

// Default model configurations
export const DEFAULT_MODEL = 'claude-3-7-sonnet-20250219'
export const FAST_MODEL = 'claude-3-5-haiku-20241022'

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
