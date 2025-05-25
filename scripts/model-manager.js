#!/usr/bin/env node

/**
 * Movie App AI Model Manager
 * 
 * CLI tool to easily switch between AI models for different tasks
 * Usage: node scripts/model-manager.js [command] [options]
 */

const COMMANDS = {
  list: 'List all available models and current assignments',
  switch: 'Switch model for a specific task',
  test: 'Test a model with a sample message',
  info: 'Get detailed information about a specific model',
  cost: 'Calculate cost estimates for different models',
}

const API_BASE = process.env.API_BASE || 'http://localhost:3000'

async function makeRequest(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  })
  
  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`)
  }
  
  return response.json()
}

async function listModels() {
  console.log('🤖 Fetching available AI models...\n')
  
  const data = await makeRequest('/api/ai/models')
  
  console.log('📊 SUMMARY:')
  console.log(`   Total Models: ${data.summary.totalModels}`)
  console.log(`   Providers: ${data.summary.providers.join(', ')}`)
  console.log(`   Streaming Support: ${data.summary.streamingModels.length} models`)
  console.log(`   Recommended: ${data.summary.recommendedModels.length} models\n`)
  
  console.log('🎯 CURRENT ASSIGNMENTS:')
  Object.entries(data.currentAssignments).forEach(([task, model]) => {
    const costInfo = `$${model.costPer1kTokens}/1k tokens`
    console.log(`   ${task.padEnd(20)} → ${model.name} (${costInfo})`)
  })
  
  console.log('\n📋 ALL AVAILABLE MODELS:')
  data.availableModels.forEach(model => {
    const recommended = model.recommended ? '⭐' : '  '
    const streaming = model.capabilities.includes('streaming') ? '📡' : '  '
    const cost = `$${model.costPer1kTokens}/1k`
    
    console.log(`${recommended}${streaming} ${model.name.padEnd(25)} ${model.provider.padEnd(10)} ${cost.padEnd(10)} ${model.description}`)
  })
  
  console.log('\n💡 Usage examples:')
  console.log('   node scripts/model-manager.js switch chat claude-3-haiku')
  console.log('   node scripts/model-manager.js test claude-3-5-sonnet "Tell me about Inception"')
  console.log('   node scripts/model-manager.js info gpt-4-turbo')
}

async function switchModel(task, modelId) {
  console.log(`🔄 Switching ${task} task to use ${modelId}...\n`)
  
  const data = await makeRequest('/api/ai/models/test', {
    method: 'POST',
    body: JSON.stringify({
      modelId,
      message: 'Configuration test',
      task,
    }),
  })
  
  console.log('✅ Model switch successful!')
  console.log(`   Task: ${task}`)
  console.log(`   Model: ${data.model.name}`)
  console.log(`   Provider: ${data.model.provider}`)
  console.log(`   Description: ${data.model.description}`)
  console.log(`   Capabilities: ${data.model.capabilities.join(', ')}`)
  console.log(`   Estimated Cost: ${data.test.estimatedCost}`)
  console.log(`   Streaming Support: ${data.test.supportsStreaming ? 'Yes' : 'No'}`)
}

async function testModel(modelId, message) {
  console.log(`🧪 Testing model ${modelId}...\n`)
  
  const data = await makeRequest('/api/ai/models/test', {
    method: 'POST',
    body: JSON.stringify({
      modelId,
      message,
    }),
  })
  
  console.log('🎯 TEST RESULTS:')
  console.log(`   Model: ${data.model.name}`)
  console.log(`   Provider: ${data.model.provider}`)
  console.log(`   Test Message: "${data.test.message}"`)
  console.log(`   Estimated Tokens: ${data.test.estimatedTokens}`)
  console.log(`   Estimated Cost: ${data.test.estimatedCost}`)
  console.log(`   Streaming: ${data.test.supportsStreaming ? 'Supported' : 'Not supported'}`)
  console.log(`   Status: ${data.message}`)
}

async function modelInfo(modelId) {
  console.log(`ℹ️  Getting detailed information for ${modelId}...\n`)
  
  const data = await makeRequest('/api/ai/models')
  const model = data.availableModels.find(m => m.id === modelId)
  
  if (!model) {
    console.error(`❌ Model ${modelId} not found`)
    console.log('\nAvailable models:')
    data.availableModels.forEach(m => console.log(`   - ${m.id}`))
    return
  }
  
  console.log('📋 MODEL DETAILS:')
  console.log(`   ID: ${model.id}`)
  console.log(`   Name: ${model.name}`)
  console.log(`   Provider: ${model.provider}`)
  console.log(`   Model ID: ${model.modelId}`)
  console.log(`   Description: ${model.description}`)
  console.log(`   Max Tokens: ${model.maxTokens}`)
  console.log(`   Temperature: ${model.temperature}`)
  console.log(`   Cost per 1k tokens: $${model.costPer1kTokens}`)
  console.log(`   Recommended: ${model.recommended ? 'Yes' : 'No'}`)
  console.log(`   Capabilities: ${model.capabilities.join(', ')}`)
  
  // Check current usage
  const currentTasks = Object.entries(data.currentAssignments)
    .filter(([task, assignedModel]) => assignedModel.id === modelId)
    .map(([task]) => task)
  
  if (currentTasks.length > 0) {
    console.log(`   Currently used for: ${currentTasks.join(', ')}`)
  } else {
    console.log(`   Currently used for: None`)
  }
}

async function calculateCosts() {
  console.log('💰 AI Model Cost Comparison\n')
  
  const data = await makeRequest('/api/ai/models')
  const testTokens = [1000, 10000, 100000] // Different usage scenarios
  
  console.log('📊 COST ESTIMATES (for different token usage):')
  console.log('Model'.padEnd(25) + 'Provider'.padEnd(12) + '1k tokens'.padEnd(12) + '10k tokens'.padEnd(12) + '100k tokens')
  console.log('-'.repeat(80))
  
  data.availableModels
    .sort((a, b) => a.costPer1kTokens - b.costPer1kTokens)
    .forEach(model => {
      const costs = testTokens.map(tokens => 
        `$${((model.costPer1kTokens * tokens) / 1000).toFixed(4)}`
      )
      
      console.log(
        model.name.padEnd(25) +
        model.provider.padEnd(12) +
        costs[0].padEnd(12) +
        costs[1].padEnd(12) +
        costs[2]
      )
    })
  
  console.log('\n💡 Tips:')
  console.log('   • Use Claude 3 Haiku for simple tasks (mood search, quick responses)')
  console.log('   • Use Claude 3.5 Sonnet for complex reasoning (recommendations, preferences)')
  console.log('   • Consider Groq models for very fast responses with lower costs')
  console.log('   • OpenAI models available for future integration')
}

function showHelp() {
  console.log('🎬 Movie App AI Model Manager\n')
  console.log('COMMANDS:')
  Object.entries(COMMANDS).forEach(([cmd, desc]) => {
    console.log(`   ${cmd.padEnd(15)} ${desc}`)
  })
  
  console.log('\nUSAGE EXAMPLES:')
  console.log('   node scripts/model-manager.js list')
  console.log('   node scripts/model-manager.js switch chat claude-3-haiku')
  console.log('   node scripts/model-manager.js test claude-3-5-sonnet "What movies are like Inception?"')
  console.log('   node scripts/model-manager.js info gpt-4-turbo')
  console.log('   node scripts/model-manager.js cost')
  
  console.log('\nAVAILABLE TASKS:')
  console.log('   chat                 Main chat conversations with users')
  console.log('   recommendations      Movie recommendation generation')
  console.log('   mood_search          Mood-based movie search')
  console.log('   preference_extraction Extract user preferences from conversations')
  
  console.log('\nENVIRONMENT VARIABLES:')
  console.log('   API_BASE             Base URL for API calls (default: http://localhost:3000)')
}

async function main() {
  const [,, command, ...args] = process.argv
  
  if (!command || command === 'help' || command === '--help' || command === '-h') {
    showHelp()
    return
  }
  
  try {
    switch (command) {
      case 'list':
        await listModels()
        break
        
      case 'switch':
        const [task, modelId] = args
        if (!task || !modelId) {
          console.error('❌ Usage: node scripts/model-manager.js switch <task> <modelId>')
          console.log('Example: node scripts/model-manager.js switch chat claude-3-haiku')
          return
        }
        await switchModel(task, modelId)
        break
        
      case 'test':
        const [testModelId, ...messageWords] = args
        if (!testModelId || messageWords.length === 0) {
          console.error('❌ Usage: node scripts/model-manager.js test <modelId> "<message>"')
          console.log('Example: node scripts/model-manager.js test claude-3-5-sonnet "Hello world"')
          return
        }
        await testModel(testModelId, messageWords.join(' '))
        break
        
      case 'info':
        const [infoModelId] = args
        if (!infoModelId) {
          console.error('❌ Usage: node scripts/model-manager.js info <modelId>')
          console.log('Example: node scripts/model-manager.js info claude-3-haiku')
          return
        }
        await modelInfo(infoModelId)
        break
        
      case 'cost':
        await calculateCosts()
        break
        
      default:
        console.error(`❌ Unknown command: ${command}`)
        showHelp()
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message)
    
    if (error.message.includes('fetch')) {
      console.log('\n💡 Make sure the development server is running:')
      console.log('   npm run dev')
    }
  }
}

// Only run if this file is executed directly
if (require.main === module) {
  main()
} 