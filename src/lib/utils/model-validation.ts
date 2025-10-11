/**
 * Model Validation Utilities
 * 
 * Provides runtime validation for AI model IDs with graceful fallbacks
 */

import { logger } from '@/lib/logger'

export interface ModelValidationResult {
  isValid: boolean
  modelId: string
  fallbackModelId?: string
  reason?: string
}

/**
 * Valid OpenAI models with their capabilities
 */
const OPENAI_MODELS = {
  'gpt-5-mini': { maxTokens: 128000, supportsStreaming: true, supportsVision: false },
  'gpt-4.5-turbo': { maxTokens: 128000, supportsStreaming: true, supportsVision: true },
  'gpt-4o': { maxTokens: 128000, supportsStreaming: true, supportsVision: true },
  'gpt-4o-mini': { maxTokens: 128000, supportsStreaming: true, supportsVision: true },
  'gpt-4-turbo': { maxTokens: 128000, supportsStreaming: true, supportsVision: true },
  'gpt-3.5-turbo': { maxTokens: 16385, supportsStreaming: true, supportsVision: false }
}

/**
 * Valid Anthropic models with their capabilities
 */
const ANTHROPIC_MODELS = {
  'claude-sonnet-4-20250514': { maxTokens: 200000, supportsStreaming: true, supportsVision: true },
  'claude-3-5-sonnet-20241022': { maxTokens: 200000, supportsStreaming: true, supportsVision: true },
  'claude-3-5-haiku-20241022': { maxTokens: 200000, supportsStreaming: true, supportsVision: true },
  'claude-3-opus-20240229': { maxTokens: 200000, supportsStreaming: true, supportsVision: true }
}

/**
 * Validate OpenAI model ID
 */
export function validateOpenAIModel(modelId: string): ModelValidationResult {
  if (!modelId || typeof modelId !== 'string') {
    return {
      isValid: false,
      modelId: modelId || 'unknown',
      fallbackModelId: 'gpt-4o-mini',
      reason: 'Invalid model ID format'
    }
  }

  if (OPENAI_MODELS[modelId as keyof typeof OPENAI_MODELS]) {
    return {
      isValid: true,
      modelId
    }
  }

  // Try to find a similar model
  const fallbackModel = findFallbackModel(modelId, OPENAI_MODELS)
  
  return {
    isValid: false,
    modelId,
    fallbackModelId: fallbackModel,
    reason: `Model '${modelId}' not found in OpenAI models`
  }
}

/**
 * Validate Anthropic model ID
 */
export function validateAnthropicModel(modelId: string): ModelValidationResult {
  if (!modelId || typeof modelId !== 'string') {
    return {
      isValid: false,
      modelId: modelId || 'unknown',
      fallbackModelId: 'claude-3-5-sonnet-20241022',
      reason: 'Invalid model ID format'
    }
  }

  if (ANTHROPIC_MODELS[modelId as keyof typeof ANTHROPIC_MODELS]) {
    return {
      isValid: true,
      modelId
    }
  }

  // Try to find a similar model
  const fallbackModel = findFallbackModel(modelId, ANTHROPIC_MODELS)
  
  return {
    isValid: false,
    modelId,
    fallbackModelId: fallbackModel,
    reason: `Model '${modelId}' not found in Anthropic models`
  }
}

/**
 * Validate any model ID (auto-detect provider)
 */
export function validateModel(modelId: string): ModelValidationResult {
  if (!modelId || typeof modelId !== 'string') {
    return {
      isValid: false,
      modelId: modelId || 'unknown',
      fallbackModelId: 'gpt-4o-mini',
      reason: 'Invalid model ID format'
    }
  }

  // Detect provider by model ID pattern
  if (modelId.startsWith('gpt-') || modelId.startsWith('o1-')) {
    return validateOpenAIModel(modelId)
  } else if (modelId.startsWith('claude-')) {
    return validateAnthropicModel(modelId)
  }

  // Unknown provider, try OpenAI first
  const openaiResult = validateOpenAIModel(modelId)
  if (openaiResult.isValid) {
    return openaiResult
  }

  const anthropicResult = validateAnthropicModel(modelId)
  if (anthropicResult.isValid) {
    return anthropicResult
  }

  // Neither provider recognizes it
  return {
    isValid: false,
    modelId,
    fallbackModelId: 'gpt-4o-mini',
    reason: `Model '${modelId}' not recognized by any provider`
  }
}

/**
 * Find a fallback model based on similarity
 */
function findFallbackModel(modelId: string, models: Record<string, any>): string {
  const modelKeys = Object.keys(models)
  
  // Try exact matches first
  if (modelKeys.includes(modelId)) {
    return modelId
  }

  // Try partial matches
  const partialMatch = modelKeys.find(key => 
    key.includes(modelId) || modelId.includes(key)
  )
  
  if (partialMatch) {
    return partialMatch
  }

  // Return the first available model as fallback
  return modelKeys[0] || 'gpt-4o-mini'
}

/**
 * Get model capabilities
 */
export function getModelCapabilities(modelId: string): {
  maxTokens: number
  supportsStreaming: boolean
  supportsVision: boolean
} | null {
  if (OPENAI_MODELS[modelId as keyof typeof OPENAI_MODELS]) {
    return OPENAI_MODELS[modelId as keyof typeof OPENAI_MODELS]
  }
  
  if (ANTHROPIC_MODELS[modelId as keyof typeof ANTHROPIC_MODELS]) {
    return ANTHROPIC_MODELS[modelId as keyof typeof ANTHROPIC_MODELS]
  }
  
  return null
}

/**
 * Log model validation results
 */
export function logModelValidation(result: ModelValidationResult, context: string = 'Model validation') {
  if (result.isValid) {
    logger.info(`✅ ${context}: Using model '${result.modelId}'`)
  } else {
    logger.warn(`⚠️ ${context}: Invalid model '${result.modelId}', using fallback '${result.fallbackModelId}'`, {
      reason: result.reason,
      originalModel: result.modelId,
      fallbackModel: result.fallbackModelId
    })
  }
}
