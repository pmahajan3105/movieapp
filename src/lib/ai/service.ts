// Unified AI Service
// Single interface for all AI providers (Anthropic, OpenAI, Groq, etc.)

import { anthropic } from '@/lib/anthropic/config'
import { ModelConfig, AIModelResponse } from './models'

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export interface AIServiceOptions {
  stream?: boolean
  systemPrompt?: string
  temperature?: number
  maxTokens?: number
}

export interface StreamEvent {
  type: 'start' | 'content' | 'complete' | 'error'
  content?: string
  error?: string
  fullResponse?: string
  usage?: {
    inputTokens: number
    outputTokens: number
    totalTokens: number
  }
}

// Unified AI Service Class
export class AIService {
  private static instance: AIService
  
  public static getInstance(): AIService {
    if (!AIService.instance) {
      AIService.instance = new AIService()
    }
    return AIService.instance
  }

  // Main chat completion method
  async createChatCompletion(
    model: ModelConfig,
    messages: ChatMessage[],
    options: AIServiceOptions = {}
  ): Promise<AIModelResponse> {
    const {
      systemPrompt,
      temperature = model.temperature,
      maxTokens = model.maxTokens,
    } = options

    console.log(`🤖 Calling ${model.provider} API with model ${model.name}`)

    switch (model.provider) {
      case 'anthropic':
        return this.callAnthropicAPI(model, messages, { 
          systemPrompt, temperature, maxTokens 
        })
      
      case 'openai':
        return this.callOpenAIAPI(model, messages, { 
          systemPrompt, temperature, maxTokens 
        })
      
      case 'groq':
        return this.callGroqAPI(model, messages, { 
          systemPrompt, temperature, maxTokens 
        })
      
      default:
        throw new Error(`Provider ${model.provider} not supported`)
    }
  }

  // Streaming chat completion
  async createStreamingChatCompletion(
    model: ModelConfig,
    messages: ChatMessage[],
    options: AIServiceOptions = {}
  ): Promise<ReadableStream> {
    if (!model.capabilities.includes('streaming')) {
      throw new Error(`Model ${model.name} does not support streaming`)
    }

    const {
      systemPrompt,
      temperature = model.temperature,
      maxTokens = model.maxTokens,
    } = options

    console.log(`📡 Creating streaming response with ${model.provider}`)

    switch (model.provider) {
      case 'anthropic':
        return this.createAnthropicStream(model, messages, { 
          systemPrompt, temperature, maxTokens 
        })
      
      case 'openai':
        return this.createOpenAIStream(model, messages, { 
          systemPrompt, temperature, maxTokens 
        })
      
      case 'groq':
        return this.createGroqStream(model, messages, { 
          systemPrompt, temperature, maxTokens 
        })
      
      default:
        throw new Error(`Streaming not supported for provider ${model.provider}`)
    }
  }

  // Provider-specific implementations
  private async callAnthropicAPI(
    model: ModelConfig,
    messages: ChatMessage[],
    options: Omit<AIServiceOptions, 'stream'>
  ): Promise<AIModelResponse> {
    const { systemPrompt, temperature, maxTokens } = options

    // Separate system messages from regular messages
    const systemMessages = messages.filter(m => m.role === 'system')
    const chatMessages = messages.filter(m => m.role !== 'system')
    
    const finalSystemPrompt = [
      systemPrompt,
      ...systemMessages.map(m => m.content)
    ].filter(Boolean).join('\n\n')

    const completion = await anthropic.messages.create({
      model: model.modelId,
      max_tokens: maxTokens!,
      temperature: temperature!,
      system: finalSystemPrompt || undefined,
      messages: chatMessages.map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      })),
    })

    const content = completion.content.find(block => block.type === 'text')?.text

    if (!content) {
      throw new Error('No response from Anthropic')
    }

    return {
      content,
      usage: completion.usage ? {
        inputTokens: completion.usage.input_tokens,
        outputTokens: completion.usage.output_tokens,
        totalTokens: completion.usage.input_tokens + completion.usage.output_tokens,
      } : undefined,
      model: model.modelId,
      provider: 'anthropic',
    }
  }

  private async createAnthropicStream(
    model: ModelConfig,
    messages: ChatMessage[],
    options: Omit<AIServiceOptions, 'stream'>
  ): Promise<ReadableStream> {
    const { systemPrompt, temperature, maxTokens } = options

    // Separate system messages from regular messages
    const systemMessages = messages.filter(m => m.role === 'system')
    const chatMessages = messages.filter(m => m.role !== 'system')
    
    const finalSystemPrompt = [
      systemPrompt,
      ...systemMessages.map(m => m.content)
    ].filter(Boolean).join('\n\n')

    const encoder = new TextEncoder()

    return new ReadableStream({
      async start(controller) {
        try {
          // Send start event
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'start',
            model: model.name,
            provider: model.provider,
          })}\n\n`))

          const completion = await anthropic.messages.create({
            model: model.modelId,
            max_tokens: maxTokens!,
            temperature: temperature!,
            system: finalSystemPrompt || undefined,
            messages: chatMessages.map(msg => ({
              role: msg.role as 'user' | 'assistant',
              content: msg.content,
            })),
            stream: true,
          })

          let fullResponse = ''

          for await (const chunk of completion) {
            if (chunk.type === 'content_block_delta' && chunk.delta && 'text' in chunk.delta) {
              const content = chunk.delta.text
              fullResponse += content

              // Send content event
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                type: 'content',
                content,
              })}\n\n`))
            }
          }

          // Send completion event
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'complete',
            fullResponse,
            model: model.name,
            provider: model.provider,
          })}\n\n`))

          controller.enqueue(encoder.encode(`data: [DONE]\n\n`))
          controller.close()

        } catch (error) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'error',
            error: error instanceof Error ? error.message : 'Unknown error',
          })}\n\n`))
          controller.close()
        }
      }
    })
  }

  // Placeholder implementations for future providers
  private async callOpenAIAPI(
    model: ModelConfig,
    messages: ChatMessage[],
    options: Omit<AIServiceOptions, 'stream'>
  ): Promise<AIModelResponse> {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _ = { model, messages, options }
    throw new Error('OpenAI integration not yet implemented')
  }

  private async createOpenAIStream(
    model: ModelConfig,
    messages: ChatMessage[],
    options: Omit<AIServiceOptions, 'stream'>
  ): Promise<ReadableStream> {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _ = { model, messages, options }
    throw new Error('OpenAI streaming not yet implemented')
  }

  private async callGroqAPI(
    model: ModelConfig,
    messages: ChatMessage[],
    options: Omit<AIServiceOptions, 'stream'>
  ): Promise<AIModelResponse> {
    const { systemPrompt, temperature, maxTokens } = options

    const groqApiKey = process.env.GROQ_API_KEY
    if (!groqApiKey) {
      throw new Error('Groq API key not configured')
    }

    // Prepare messages for Groq (OpenAI-compatible format)
    const groqMessages: Array<{ role: string; content: string }> = []
    
    // Add system message if provided
    if (systemPrompt) {
      groqMessages.push({
        role: 'system',
        content: systemPrompt,
      })
    }

    // Add system messages from chat history
    const systemMessages = messages.filter(m => m.role === 'system')
    systemMessages.forEach(msg => {
      groqMessages.push({
        role: 'system',
        content: msg.content,
      })
    })

    // Add regular chat messages
    const chatMessages = messages.filter(m => m.role !== 'system')
    chatMessages.forEach(msg => {
      groqMessages.push({
        role: msg.role,
        content: msg.content,
      })
    })

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model.modelId,
        messages: groqMessages,
        max_tokens: maxTokens,
        temperature: temperature,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Groq API error: ${response.status} ${errorText}`)
    }

    const data = await response.json()
    const content = data.choices[0]?.message?.content

    if (!content) {
      throw new Error('No response from Groq')
    }

    return {
      content,
      usage: data.usage ? {
        inputTokens: data.usage.prompt_tokens,
        outputTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens,
      } : undefined,
      model: model.modelId,
      provider: 'groq',
    }
  }

  private async createGroqStream(
    model: ModelConfig,
    messages: ChatMessage[],
    options: Omit<AIServiceOptions, 'stream'>
  ): Promise<ReadableStream> {
    const { systemPrompt, temperature, maxTokens } = options

    const groqApiKey = process.env.GROQ_API_KEY
    if (!groqApiKey) {
      throw new Error('Groq API key not configured')
    }

    // Prepare messages for Groq (OpenAI-compatible format)
    const groqMessages: Array<{ role: string; content: string }> = []
    
    // Add system message if provided
    if (systemPrompt) {
      groqMessages.push({
        role: 'system',
        content: systemPrompt,
      })
    }

    // Add system messages from chat history
    const systemMessages = messages.filter(m => m.role === 'system')
    systemMessages.forEach(msg => {
      groqMessages.push({
        role: 'system',
        content: msg.content,
      })
    })

    // Add regular chat messages
    const chatMessages = messages.filter(m => m.role !== 'system')
    chatMessages.forEach(msg => {
      groqMessages.push({
        role: msg.role,
        content: msg.content,
      })
    })

    const encoder = new TextEncoder()

    return new ReadableStream({
      async start(controller) {
        try {
          // Send start event
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'start',
            model: model.name,
            provider: model.provider,
          })}\n\n`))

          const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${groqApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: model.modelId,
              messages: groqMessages,
              max_tokens: maxTokens,
              temperature: temperature,
              stream: true, // Enable streaming
            }),
          })

          if (!response.ok) {
            const errorText = await response.text()
            throw new Error(`Groq API error: ${response.status} ${errorText}`)
          }

          const reader = response.body?.getReader()
          if (!reader) {
            throw new Error('No response body from Groq API')
          }

          let fullResponse = ''

          try {
            while (true) {
              const { done, value } = await reader.read()
              if (done) break

              const chunk = new TextDecoder().decode(value)
              const lines = chunk.split('\n')

              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  const data = line.slice(6).trim()
                  
                  if (data === '[DONE]') {
                    // Send completion event
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                      type: 'complete',
                      fullResponse,
                      model: model.name,
                      provider: model.provider,
                    })}\n\n`))
                    
                    controller.enqueue(encoder.encode(`data: [DONE]\n\n`))
                    controller.close()
                    return
                  }

                  try {
                    const parsed = JSON.parse(data)
                    const content = parsed.choices?.[0]?.delta?.content

                    if (content) {
                      fullResponse += content

                      // Send content event
                      controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                        type: 'content',
                        content,
                      })}\n\n`))
                    }
                  } catch {
                    // Skip invalid JSON lines
                    continue
                  }
                }
              }
            }
          } finally {
            reader.releaseLock()
          }

        } catch (error) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'error',
            error: error instanceof Error ? error.message : 'Unknown error',
          })}\n\n`))
          controller.close()
        }
      }
    })
  }
}

// Global AI service instance
export const aiService = AIService.getInstance() 