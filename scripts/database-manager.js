#!/usr/bin/env node

/**
 * Movie App Database Manager
 * 
 * CLI tool to easily switch between movie databases for different tasks
 * Usage: node scripts/database-manager.js [command] [options]
 */

const COMMANDS = {
  list: 'List all available movie databases and current assignments',
  switch: 'Switch database for a specific task',
  test: 'Test a database connection and functionality',
  info: 'Get detailed information about a specific database',
  health: 'Check health status of all configured databases',
  cost: 'Calculate cost estimates for different databases',
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

// List all databases and current configuration
async function listDatabases() {
  console.log('🎬 Movie Database Configuration\n')
  
  const data = await makeRequest('/api/movie-databases')
  
  console.log('📊 AVAILABLE DATABASES')
  console.log('=' .repeat(80))
  
  data.availableDatabases.forEach((db, index) => {
    const recommended = db.recommended ? '⭐' : '  '
    const quality = Math.round((db.dataQuality.metadata + db.dataQuality.images + db.dataQuality.freshness + db.dataQuality.coverage) / 4)
    
    console.log(`${recommended} ${index + 1}. ${db.name}`)
    console.log(`     Provider: ${db.provider.toUpperCase()}`)
    console.log(`     Description: ${db.description}`)
    console.log(`     Capabilities: ${db.capabilities.join(', ')}`)
    console.log(`     Data Quality: ${quality}/10`)
    console.log(`     Cost: $${db.costPer1kRequests}/1k requests`)
    console.log(`     Rate Limit: ${db.rateLimit.requestsPerSecond}/sec, ${db.rateLimit.requestsPerDay}/day`)
    console.log(`     API Key Required: ${db.requiresApiKey ? 'Yes' : 'No'}`)
    console.log('')
  })

  console.log('🎯 CURRENT TASK ASSIGNMENTS')
  console.log('=' .repeat(80))
  
  Object.entries(data.currentAssignments).forEach(([task, database]) => {
    const status = data.apiKeyStatus[database.provider] ? '✅' : '❌'
    console.log(`   ${task.padEnd(15)}: ${database.name} ${status}`)
  })

  console.log('\n🔑 API KEY STATUS')
  console.log('=' .repeat(80))
  
  Object.entries(data.apiKeyStatus).forEach(([provider, configured]) => {
    const status = configured ? '✅ Configured' : '❌ Missing'
    console.log(`   ${provider.toUpperCase().padEnd(8)}: ${status}`)
  })

  console.log('\n📈 SUMMARY')
  console.log('=' .repeat(80))
  console.log(`   Total Databases: ${data.summary.totalDatabases}`)
  console.log(`   Providers: ${data.summary.providers.join(', ')}`)
  console.log(`   Recommended: ${data.summary.recommendedDatabases.length}`)
  console.log(`   Free Tier: ${data.summary.freeDatabases.length}`)
  console.log(`   Real-time: ${data.summary.realTimeDatabases.length}`)
}

// Test database connection and functionality
async function testDatabase(databaseId, testType = 'basic') {
  console.log(`🔍 Testing ${databaseId} database...\n`)
  
  const data = await makeRequest('/api/movie-databases/test', {
    method: 'POST',
    body: JSON.stringify({
      databaseId,
      testType,
    }),
  })
  
  console.log('✅ Database test completed!')
  console.log(`   Database: ${data.database.name}`)
  console.log(`   Provider: ${data.database.provider}`)
  console.log(`   Description: ${data.database.description}`)
  console.log(`   Capabilities: ${data.database.capabilities.join(', ')}`)
  console.log(`   Data Quality: ${JSON.stringify(data.database.dataQuality, null, 2)}`)
  console.log('')
  console.log('📊 Test Results:')
  console.log(`   Connected: ${data.test.connected ? '✅' : '❌'}`)
  console.log(`   Response Time: ${data.test.responseTime}ms`)
  console.log(`   API Key Valid: ${data.test.apiKeyValid ? '✅' : '❌'}`)
  console.log(`   Supports Search: ${data.test.supportsSearch ? '✅' : '❌'}`)
  console.log(`   Supports Trending: ${data.test.supportsTrending ? '✅' : '❌'}`)
  console.log(`   Estimated Cost: $${data.test.estimatedCostPer1k}/1k requests`)
  
  if (data.test.error) {
    console.log(`   Error: ${data.test.error}`)
  }
}

// Get detailed information about a specific database
async function getDatabaseInfo(databaseId) {
  console.log(`ℹ️  Database Information: ${databaseId}\n`)
  
  const data = await makeRequest('/api/movie-databases')
  const database = data.availableDatabases.find(db => db.id === databaseId)
  
  if (!database) {
    console.error(`❌ Database '${databaseId}' not found`)
    console.log('\nAvailable databases:')
    data.availableDatabases.forEach(db => console.log(`   - ${db.id}`))
    return
  }

  console.log('📋 GENERAL INFORMATION')
  console.log('=' .repeat(60))
  console.log(`   Name: ${database.name}`)
  console.log(`   Provider: ${database.provider.toUpperCase()}`)
  console.log(`   Description: ${database.description}`)
  console.log(`   API URL: ${database.apiUrl}`)
  console.log(`   Recommended: ${database.recommended ? 'Yes ⭐' : 'No'}`)
  console.log(`   API Key Required: ${database.requiresApiKey ? 'Yes' : 'No'}`)

  console.log('\n🚀 CAPABILITIES')
  console.log('=' .repeat(60))
  database.capabilities.forEach(cap => {
    console.log(`   ✅ ${cap}`)
  })

  console.log('\n📊 DATA QUALITY')
  console.log('=' .repeat(60))
  console.log(`   Metadata: ${database.dataQuality.metadata}/10`)
  console.log(`   Images: ${database.dataQuality.images}/10`)
  console.log(`   Freshness: ${database.dataQuality.freshness}/10`)
  console.log(`   Coverage: ${database.dataQuality.coverage}/10`)
  
  const avgQuality = Math.round((database.dataQuality.metadata + database.dataQuality.images + database.dataQuality.freshness + database.dataQuality.coverage) / 4)
  console.log(`   Overall: ${avgQuality}/10`)

  console.log('\n💰 COST & LIMITS')
  console.log('=' .repeat(60))
  console.log(`   Cost per 1k requests: $${database.costPer1kRequests}`)
  console.log(`   Rate limit: ${database.rateLimit.requestsPerSecond} req/sec`)
  console.log(`   Daily limit: ${database.rateLimit.requestsPerDay} req/day`)

  // Check current assignments
  const assignments = Object.entries(data.currentAssignments)
    .filter(([_, db]) => db.id === databaseId)
    .map(([task, _]) => task)

  if (assignments.length > 0) {
    console.log('\n🎯 CURRENT ASSIGNMENTS')
    console.log('=' .repeat(60))
    assignments.forEach(task => {
      console.log(`   ✅ ${task}`)
    })
  }
}

// Check health status of all databases
async function checkHealth() {
  console.log('🏥 Database Health Check\n')
  
  const data = await makeRequest('/api/movie-databases')
  
  console.log('📊 HEALTH STATUS')
  console.log('=' .repeat(60))
  
  Object.entries(data.healthStatus).forEach(([database, status]) => {
    let icon = '❌'
    if (status.status === 'healthy') icon = '✅'
    else if (status.status === 'missing-key') icon = '🔑'
    
    console.log(`   ${database.toUpperCase().padEnd(8)}: ${icon} ${status.message}`)
  })

  console.log('\n🔑 API KEY CONFIGURATION')
  console.log('=' .repeat(60))
  
  Object.entries(data.apiKeyStatus).forEach(([provider, configured]) => {
    const status = configured ? '✅ Configured' : '❌ Missing'
    console.log(`   ${provider.toUpperCase().padEnd(8)}: ${status}`)
  })

  // Recommendations
  const missingKeys = Object.entries(data.apiKeyStatus)
    .filter(([_, configured]) => !configured)
    .map(([provider, _]) => provider)

  if (missingKeys.length > 0) {
    console.log('\n💡 RECOMMENDATIONS')
    console.log('=' .repeat(60))
    missingKeys.forEach(provider => {
      const envVar = `${provider.toUpperCase()}_API_KEY`
      console.log(`   Add ${envVar} to your .env.local file`)
    })
  }
}

// Calculate cost estimates
async function calculateCosts() {
  console.log('💰 Database Cost Analysis\n')
  
  const data = await makeRequest('/api/movie-databases')
  
  const scenarios = [
    { name: 'Light Usage', requests: 1000 },
    { name: 'Moderate Usage', requests: 10000 },
    { name: 'Heavy Usage', requests: 100000 },
  ]

  scenarios.forEach(scenario => {
    console.log(`📊 ${scenario.name.toUpperCase()} (${scenario.requests.toLocaleString()} requests/month)`)
    console.log('=' .repeat(60))
    
    data.availableDatabases.forEach(db => {
      const cost = (scenario.requests / 1000) * db.costPer1kRequests
      const costStr = cost === 0 ? 'FREE' : `$${cost.toFixed(2)}`
      console.log(`   ${db.name.padEnd(25)}: ${costStr}`)
    })
    console.log('')
  })

  console.log('💡 COST OPTIMIZATION TIPS')
  console.log('=' .repeat(60))
  console.log('   • Use TMDB for trending and search (free)')
  console.log('   • Use Local database for cached movies (free)')
  console.log('   • OMDB has rate limits - consider for specific lookups only')
  console.log('   • Mix databases based on task requirements')
}

// Switch database for specific task (placeholder)
async function switchDatabase(task, databaseId) {
  console.log(`🔄 Switching ${task} task to use ${databaseId}...\n`)
  
  // This would require implementing a configuration update endpoint
  console.log('❌ Database switching not yet implemented')
  console.log('   To change databases, update your environment variables:')
  console.log(`   MOVIE_${task.toUpperCase()}_DATABASE=${databaseId}`)
  console.log('   And restart your application.')
}

// Main CLI handler
async function main() {
  const args = process.argv.slice(2)
  const command = args[0]
  
  if (!command || command === 'help') {
    console.log('🎬 Movie Database Manager\n')
    console.log('Usage: node scripts/database-manager.js <command> [options]\n')
    console.log('Commands:')
    Object.entries(COMMANDS).forEach(([cmd, desc]) => {
      console.log(`   ${cmd.padEnd(10)}: ${desc}`)
    })
    console.log('\nExamples:')
    console.log('   node scripts/database-manager.js list')
    console.log('   node scripts/database-manager.js test tmdb extended')
    console.log('   node scripts/database-manager.js info omdb')
    console.log('   node scripts/database-manager.js health')
    console.log('   node scripts/database-manager.js cost')
    return
  }

  try {
    switch (command) {
      case 'list':
        await listDatabases()
        break
        
      case 'test':
        const testDbId = args[1]
        const testType = args[2] || 'basic'
        if (!testDbId) {
          console.error('❌ Database ID required for test command')
          console.log('Usage: node scripts/database-manager.js test <database-id> [basic|extended]')
          return
        }
        await testDatabase(testDbId, testType)
        break
        
      case 'info':
        const infoDbId = args[1]
        if (!infoDbId) {
          console.error('❌ Database ID required for info command')
          console.log('Usage: node scripts/database-manager.js info <database-id>')
          return
        }
        await getDatabaseInfo(infoDbId)
        break
        
      case 'health':
        await checkHealth()
        break
        
      case 'cost':
        await calculateCosts()
        break
        
      case 'switch':
        const task = args[1]
        const switchDbId = args[2]
        if (!task || !switchDbId) {
          console.error('❌ Task and database ID required for switch command')
          console.log('Usage: node scripts/database-manager.js switch <task> <database-id>')
          return
        }
        await switchDatabase(task, switchDbId)
        break
        
      default:
        console.error(`❌ Unknown command: ${command}`)
        console.log('Run "node scripts/database-manager.js help" for available commands')
    }
  } catch (error) {
    console.error(`❌ Error: ${error.message}`)
    if (process.env.DEBUG) {
      console.error(error.stack)
    }
  }
}

// Run the CLI
if (require.main === module) {
  main()
} 