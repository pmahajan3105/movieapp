#!/usr/bin/env node

/**
 * Check Backend Status via Web Application
 * Tests if the backend systems are working through the deployed app
 */

async function checkBackendStatus() {
  console.log('🎬 Checking CineAI Backend Status via Web Application...\n')

  const baseUrl = 'http://localhost:3000'
  
  try {
    // Test 1: System Status Endpoint
    console.log('1. Testing System Status:')
    try {
      const response = await fetch(`${baseUrl}/api/test/system-status`)
      const data = await response.json()
      
      if (data.success) {
        console.log(`   Status: ${data.status}`)
        console.log(`   Summary: ${data.summary.ok}/${data.summary.total} components OK`)
        
        if (data.checks && data.checks.components) {
          console.log('\n   Component Details:')
          data.checks.components.forEach(comp => {
            const status = comp.status === 'ok' ? '✅' : '❌'
            console.log(`   ${status} ${comp.name}: ${comp.message}`)
          })
        }
      } else {
        console.log('   ❌ System status check failed')
      }
    } catch (error) {
      console.log(`   ❌ Cannot reach system status: ${error.message}`)
    }

    // Test 2: Background Job Status
    console.log('\n2. Testing Background Job Status:')
    try {
      const response = await fetch(`${baseUrl}/api/test/phase1-complete`)
      const data = await response.json()
      
      if (data.success) {
        console.log('   ✅ Background job system is accessible')
        if (data.status) {
          console.log(`   📊 Job Status: ${data.status}`)
        }
      } else {
        console.log(`   ❌ Background job test failed: ${data.error}`)
      }
    } catch (error) {
      console.log(`   ❌ Cannot reach background job endpoint: ${error.message}`)
    }

    // Test 3: Enhanced Intelligence
    console.log('\n3. Testing Enhanced Intelligence:')
    try {
      const response = await fetch(`${baseUrl}/api/test/enhanced-intelligence`)
      const data = await response.json()
      
      if (data.success) {
        console.log('   ✅ Enhanced intelligence system is accessible')
        if (data.aiEngines) {
          console.log(`   🧠 AI Engines: ${Object.keys(data.aiEngines).length} available`)
        }
      } else {
        console.log(`   ❌ Enhanced intelligence test failed: ${data.error}`)
      }
    } catch (error) {
      console.log(`   ❌ Cannot reach enhanced intelligence endpoint: ${error.message}`)
    }

    // Test 4: Check if dev server is running
    console.log('\n4. Development Server Status:')
    try {
      const response = await fetch(`${baseUrl}/api/healthz`)
      if (response.ok) {
        console.log('   ✅ Development server is running')
      } else {
        console.log(`   ⚠️  Development server responding with status: ${response.status}`)
      }
    } catch (error) {
      console.log('   ❌ Development server is not running')
      console.log('   💡 Run: npm run dev')
    }

    console.log('\n' + '='.repeat(50))
    console.log('💡 NEXT STEPS:')
    console.log('='.repeat(50))
    console.log('1. Start the development server: npm run dev')
    console.log('2. Check environment variables in .env.local')
    console.log('3. Test manually at: http://localhost:3000')
    console.log('4. Check dashboard for recommendations')
    console.log('5. Monitor background jobs via database queries')

  } catch (error) {
    console.error('❌ Error checking backend status:', error.message)
  }
}

// Run the check
checkBackendStatus().catch(console.error)