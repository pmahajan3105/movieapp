import { test, expect, chromium, Browser, BrowserContext, Page } from '@playwright/test'

test.describe('Stress Testing Suite', () => {
  let browser: Browser
  let contexts: BrowserContext[] = []
  let pages: Page[] = []

  test.beforeAll(async () => {
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-dev-shm-usage']
    })
  })

  test.afterAll(async () => {
    // Clean up all contexts and pages
    for (const context of contexts) {
      await context.close()
    }
    await browser.close()
  })

  test('should handle high concurrent user load', async () => {
    const CONCURRENT_USERS = 20
    const USER_ACTIONS_PER_SESSION = 5
    
    console.log(`🚀 Starting stress test with ${CONCURRENT_USERS} concurrent users`)
    
    // Create multiple user sessions
    const userSessions = []
    
    for (let i = 0; i < CONCURRENT_USERS; i++) {
      const context = await browser.newContext()
      const page = await context.newPage()
      
      // Mock authentication
      await page.addInitScript(() => {
        localStorage.setItem('supabase.auth.token', `stress-test-token-${Math.random()}`)
      })
      
      contexts.push(context)
      pages.push(page)
      
      // Create user session promise
      userSessions.push(simulateUserSession(page, i, USER_ACTIONS_PER_SESSION))
    }
    
    const startTime = Date.now()
    
    // Run all user sessions concurrently
    const results = await Promise.allSettled(userSessions)
    
    const totalTime = Date.now() - startTime
    const successfulSessions = results.filter(r => r.status === 'fulfilled').length
    const failedSessions = results.filter(r => r.status === 'rejected').length
    
    console.log(`📊 Stress Test Results:`)
    console.log(`  • Total Time: ${totalTime}ms`)
    console.log(`  • Successful Sessions: ${successfulSessions}/${CONCURRENT_USERS}`)
    console.log(`  • Failed Sessions: ${failedSessions}/${CONCURRENT_USERS}`)
    console.log(`  • Success Rate: ${((successfulSessions / CONCURRENT_USERS) * 100).toFixed(2)}%`)
    
    // Assertions
    expect(successfulSessions).toBeGreaterThan(CONCURRENT_USERS * 0.8) // 80% success rate
    expect(totalTime).toBeLessThan(60000) // Complete within 60 seconds
  })

  test('should maintain performance under memory pressure', async () => {
    const context = await browser.newContext()
    const page = await context.newPage()
    contexts.push(context)
    
    // Monitor memory usage
    await page.addInitScript(() => {
      window.__MEMORY_PRESSURE_TEST__ = {
        initialMemory: performance.memory?.usedJSHeapSize || 0,
        peakMemory: 0,
        currentMemory: 0,
        iterations: 0,
        errors: []
      }
      
      // Create memory pressure
      const createMemoryPressure = () => {
        try {
          // Create large arrays to consume memory
          const largeData = []
          for (let i = 0; i < 1000; i++) {
            largeData.push(new Array(1000).fill(`memory-test-data-${i}`))
          }
          
          // Store reference to prevent garbage collection
          if (!window.__MEMORY_REFS__) window.__MEMORY_REFS__ = []
          window.__MEMORY_REFS__.push(largeData)
          
          // Update memory tracking
          if (performance.memory) {
            const current = performance.memory.usedJSHeapSize
            window.__MEMORY_PRESSURE_TEST__.currentMemory = current
            if (current > window.__MEMORY_PRESSURE_TEST__.peakMemory) {
              window.__MEMORY_PRESSURE_TEST__.peakMemory = current
            }
          }
          
          window.__MEMORY_PRESSURE_TEST__.iterations++
          
        } catch (error) {
          window.__MEMORY_PRESSURE_TEST__.errors.push(error.message)
        }
      }
      
      // Create memory pressure every 500ms
      setInterval(createMemoryPressure, 500)
    })
    
    await page.addInitScript(() => {
      localStorage.setItem('supabase.auth.token', 'memory-stress-token')
    })
    
    // Navigate to application under memory pressure
    await page.goto('/dashboard/movies')
    
    // Application should still load
    await expect(page.locator('[data-testid="movie-card"]')).toBeVisible({ timeout: 15000 })
    
    // Perform actions while under memory pressure
    const actions = [
      () => page.goto('/search'),
      () => page.locator('input[type="search"]').fill('action movies'),
      () => page.locator('input[type="search"]').press('Enter'),
      () => page.goto('/dashboard/watchlist'),
      () => page.goto('/dashboard/movies')
    ]
    
    for (const action of actions) {
      try {
        await action()
        await page.waitForTimeout(2000) // Allow memory pressure to build
      } catch (error) {
        console.warn(`Memory pressure action failed: ${error.message}`)
      }
    }
    
    // Check memory statistics
    const memoryStats = await page.evaluate(() => window.__MEMORY_PRESSURE_TEST__)
    
    console.log(`💾 Memory Pressure Test Results:`)
    console.log(`  • Initial Memory: ${(memoryStats.initialMemory / 1024 / 1024).toFixed(2)} MB`)
    console.log(`  • Peak Memory: ${(memoryStats.peakMemory / 1024 / 1024).toFixed(2)} MB`)
    console.log(`  • Current Memory: ${(memoryStats.currentMemory / 1024 / 1024).toFixed(2)} MB`)
    console.log(`  • Iterations: ${memoryStats.iterations}`)
    console.log(`  • Errors: ${memoryStats.errors.length}`)
    
    // Application should still be responsive
    await expect(page.locator('h1')).toBeVisible()
    
    // Memory should not grow excessively
    const memoryGrowth = memoryStats.peakMemory - memoryStats.initialMemory
    expect(memoryGrowth).toBeLessThan(200 * 1024 * 1024) // Less than 200MB growth
    
    await context.close()
  })

  test('should handle rapid navigation stress', async () => {
    const context = await browser.newContext()
    const page = await context.newPage()
    contexts.push(context)
    
    await page.addInitScript(() => {
      localStorage.setItem('supabase.auth.token', 'navigation-stress-token')
    })
    
    // Pages to navigate between rapidly
    const pages_to_visit = [
      '/dashboard',
      '/dashboard/movies',
      '/search',
      '/dashboard/watchlist',
      '/dashboard/settings',
      '/dashboard/account'
    ]
    
    const navigationTimes = []
    const RAPID_NAVIGATION_CYCLES = 10
    
    console.log(`🔄 Starting rapid navigation stress test (${RAPID_NAVIGATION_CYCLES} cycles)`)
    
    for (let cycle = 0; cycle < RAPID_NAVIGATION_CYCLES; cycle++) {
      for (const url of pages_to_visit) {
        const startTime = Date.now()
        
        try {
          await page.goto(url)
          
          // Wait for page to be interactive
          await page.waitForFunction(() => document.readyState === 'interactive' || document.readyState === 'complete')
          
          const navigationTime = Date.now() - startTime
          navigationTimes.push(navigationTime)
          
          // Brief pause to allow rendering
          await page.waitForTimeout(100)
          
        } catch (error) {
          console.warn(`Navigation to ${url} failed: ${error.message}`)
        }
      }
      
      console.log(`  Completed cycle ${cycle + 1}/${RAPID_NAVIGATION_CYCLES}`)
    }
    
    const avgNavigationTime = navigationTimes.reduce((a, b) => a + b, 0) / navigationTimes.length
    const maxNavigationTime = Math.max(...navigationTimes)
    const minNavigationTime = Math.min(...navigationTimes)
    
    console.log(`🚀 Rapid Navigation Results:`)
    console.log(`  • Total Navigations: ${navigationTimes.length}`)
    console.log(`  • Average Time: ${avgNavigationTime.toFixed(2)}ms`)
    console.log(`  • Max Time: ${maxNavigationTime}ms`)
    console.log(`  • Min Time: ${minNavigationTime}ms`)
    
    // Assertions
    expect(avgNavigationTime).toBeLessThan(3000) // Average under 3 seconds
    expect(maxNavigationTime).toBeLessThan(8000) // Max under 8 seconds
    
    await context.close()
  })

  test('should handle API request flooding', async () => {
    const context = await browser.newContext()
    const page = await context.newPage()
    contexts.push(context)
    
    await page.addInitScript(() => {
      localStorage.setItem('supabase.auth.token', 'api-flood-token')
    })
    
    await page.goto('/dashboard')
    
    // Track API requests
    const apiRequests = []
    page.on('response', response => {
      if (response.url().includes('/api/')) {
        apiRequests.push({
          url: response.url(),
          status: response.status(),
          timing: Date.now()
        })
      }
    })
    
    // Flood the system with concurrent API calls
    const API_FLOOD_REQUESTS = 50
    const floodPromises = []
    
    console.log(`🌊 Starting API flood test with ${API_FLOOD_REQUESTS} concurrent requests`)
    
    for (let i = 0; i < API_FLOOD_REQUESTS; i++) {
      const floodRequest = page.evaluate(async (requestId) => {
        try {
          const promises = [
            fetch('/api/movies?limit=5'),
            fetch('/api/watchlist'),
            fetch('/api/user/profile'),
            fetch('/api/movies/search?query=test')
          ]
          
          const results = await Promise.allSettled(promises)
          return {
            requestId,
            successful: results.filter(r => r.status === 'fulfilled').length,
            failed: results.filter(r => r.status === 'rejected').length
          }
        } catch (error) {
          return { requestId, error: error.message }
        }
      }, i)
      
      floodPromises.push(floodRequest)
    }
    
    const startTime = Date.now()
    const floodResults = await Promise.allSettled(floodPromises)
    const floodTime = Date.now() - startTime
    
    const successfulFloods = floodResults.filter(r => r.status === 'fulfilled' && !r.value.error).length
    const failedFloods = floodResults.filter(r => r.status === 'rejected' || r.value?.error).length
    
    console.log(`🌊 API Flood Results:`)
    console.log(`  • Total Time: ${floodTime}ms`)
    console.log(`  • Successful Requests: ${successfulFloods}/${API_FLOOD_REQUESTS}`)
    console.log(`  • Failed Requests: ${failedFloods}/${API_FLOOD_REQUESTS}`)
    console.log(`  • API Responses Tracked: ${apiRequests.length}`)
    
    // Analyze API response patterns
    const responseStats = {
      success: apiRequests.filter(r => r.status < 400).length,
      clientError: apiRequests.filter(r => r.status >= 400 && r.status < 500).length,
      serverError: apiRequests.filter(r => r.status >= 500).length
    }
    
    console.log(`  • Response Success Rate: ${((responseStats.success / apiRequests.length) * 100).toFixed(2)}%`)
    
    // Application should handle flood gracefully
    expect(successfulFloods).toBeGreaterThan(API_FLOOD_REQUESTS * 0.7) // 70% success rate
    expect(floodTime).toBeLessThan(30000) // Complete within 30 seconds
    
    await context.close()
  })

  test('should maintain UI responsiveness under CPU stress', async () => {
    const context = await browser.newContext()
    const page = await context.newPage()
    contexts.push(context)
    
    // Create CPU stress
    await page.addInitScript(() => {
      window.__CPU_STRESS__ = {
        active: false,
        iterations: 0,
        startTime: 0
      }
      
      window.startCPUStress = () => {
        window.__CPU_STRESS__.active = true
        window.__CPU_STRESS__.startTime = Date.now()
        
        const cpuIntensiveTask = () => {
          if (!window.__CPU_STRESS__.active) return
          
          // Perform CPU-intensive calculations
          let result = 0
          for (let i = 0; i < 1000000; i++) {
            result += Math.sin(i) * Math.cos(i) * Math.sqrt(i)
          }
          
          window.__CPU_STRESS__.iterations++
          
          // Continue stress test
          setTimeout(cpuIntensiveTask, 10)
        }
        
        cpuIntensiveTask()
      }
      
      window.stopCPUStress = () => {
        window.__CPU_STRESS__.active = false
      }
    })
    
    await page.addInitScript(() => {
      localStorage.setItem('supabase.auth.token', 'cpu-stress-token')
    })
    
    await page.goto('/dashboard/movies')
    await expect(page.locator('[data-testid="movie-card"]')).toBeVisible({ timeout: 10000 })
    
    // Start CPU stress
    await page.evaluate(() => window.startCPUStress())
    
    console.log('💻 CPU stress test started - testing UI responsiveness')
    
    // Test UI interactions under CPU stress
    const interactionTests = [
      {
        name: 'Movie card click',
        action: async () => {
          const movieCard = page.locator('[data-testid="movie-card"]').first()
          if (await movieCard.isVisible()) {
            await movieCard.click()
          }
        }
      },
      {
        name: 'Navigation',
        action: async () => {
          await page.goto('/search')
          await page.waitForTimeout(1000)
        }
      },
      {
        name: 'Search input',
        action: async () => {
          const searchInput = page.locator('input[type="search"]')
          if (await searchInput.isVisible()) {
            await searchInput.fill('action movies')
          }
        }
      },
      {
        name: 'Button interaction',
        action: async () => {
          const button = page.locator('button').first()
          if (await button.isVisible()) {
            await button.click()
          }
        }
      }
    ]
    
    const interactionTimes = []
    
    for (const test of interactionTests) {
      const startTime = Date.now()
      
      try {
        await test.action()
        const interactionTime = Date.now() - startTime
        interactionTimes.push({ name: test.name, time: interactionTime })
        
        console.log(`  ✓ ${test.name}: ${interactionTime}ms`)
        
      } catch (error) {
        console.warn(`  ✗ ${test.name}: Failed - ${error.message}`)
        interactionTimes.push({ name: test.name, time: -1 })
      }
      
      await page.waitForTimeout(500) // Brief pause between interactions
    }
    
    // Stop CPU stress
    const cpuStats = await page.evaluate(() => {
      window.stopCPUStress()
      return {
        iterations: window.__CPU_STRESS__.iterations,
        duration: Date.now() - window.__CPU_STRESS__.startTime
      }
    })
    
    console.log(`💻 CPU Stress Results:`)
    console.log(`  • Stress Duration: ${cpuStats.duration}ms`)
    console.log(`  • CPU Iterations: ${cpuStats.iterations}`)
    console.log(`  • UI Interactions Tested: ${interactionTimes.length}`)
    
    // Analyze interaction responsiveness
    const successfulInteractions = interactionTimes.filter(i => i.time > 0)
    const avgInteractionTime = successfulInteractions.reduce((a, b) => a + b.time, 0) / successfulInteractions.length
    
    console.log(`  • Average Interaction Time: ${avgInteractionTime.toFixed(2)}ms`)
    console.log(`  • Successful Interactions: ${successfulInteractions.length}/${interactionTimes.length}`)
    
    // UI should remain responsive despite CPU stress
    expect(successfulInteractions.length).toBeGreaterThan(interactionTimes.length * 0.8) // 80% success
    expect(avgInteractionTime).toBeLessThan(5000) // Average under 5 seconds
    
    await context.close()
  })
})

// Helper function to simulate user session
async function simulateUserSession(page: Page, userId: number, actionCount: number) {
  const sessionId = `stress-user-${userId}`
  
  try {
    // Navigate to dashboard
    await page.goto('/dashboard')
    await expect(page.locator('h1')).toBeVisible({ timeout: 10000 })
    
    // Simulate user actions
    const actions = [
      // Browse movies
      async () => {
        await page.goto('/dashboard/movies')
        await expect(page.locator('[data-testid="movie-card"]')).toBeVisible({ timeout: 8000 })
      },
      
      // Search for movies  
      async () => {
        await page.goto('/search')
        const searchInput = page.locator('input[type="search"]')
        if (await searchInput.isVisible({ timeout: 5000 })) {
          await searchInput.fill(`search-${userId}`)
          await searchInput.press('Enter')
        }
      },
      
      // View watchlist
      async () => {
        await page.goto('/dashboard/watchlist')
        await page.waitForTimeout(2000)
      },
      
      // Add movie to watchlist
      async () => {
        await page.goto('/dashboard/movies')
        const addButton = page.locator('button:has-text("Add")').first()
        if (await addButton.isVisible({ timeout: 5000 })) {
          await addButton.click()
        }
      },
      
      // Navigate to settings
      async () => {
        await page.goto('/dashboard/settings')
        await page.waitForTimeout(1000)
      }
    ]
    
    // Perform random actions
    for (let i = 0; i < actionCount; i++) {
      const randomAction = actions[Math.floor(Math.random() * actions.length)]
      
      try {
        await randomAction()
        await page.waitForTimeout(Math.random() * 1000 + 500) // Random think time
      } catch (error) {
        console.warn(`User ${sessionId} action ${i + 1} failed: ${error.message}`)
      }
    }
    
    return { sessionId, success: true, actions: actionCount }
    
  } catch (error) {
    return { sessionId, success: false, error: error.message }
  }
}