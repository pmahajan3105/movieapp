import { test, expect, chromium } from '@playwright/test'

test.describe('Browser Performance Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Enable performance monitoring
    await page.addInitScript(() => {
      window.performance.mark('test-start')
      
      // Track resource loading
      window.__PERFORMANCE_DATA__ = {
        resourceTimings: [],
        navigationTiming: {},
        customMetrics: {},
        vitals: {}
      }
      
      // Monitor resource loading
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          window.__PERFORMANCE_DATA__.resourceTimings.push({
            name: entry.name,
            duration: entry.duration,
            transferSize: entry.transferSize,
            encodedBodySize: entry.encodedBodySize,
            type: entry.initiatorType
          })
        }
      })
      observer.observe({ type: 'resource', buffered: true })
      
      // Monitor navigation timing
      window.addEventListener('load', () => {
        const navTiming = performance.getEntriesByType('navigation')[0]
        window.__PERFORMANCE_DATA__.navigationTiming = {
          domContentLoaded: navTiming.domContentLoadedEventEnd - navTiming.domContentLoadedEventStart,
          loadComplete: navTiming.loadEventEnd - navTiming.loadEventStart,
          firstByte: navTiming.responseStart - navTiming.requestStart,
          domInteractive: navTiming.domInteractive - navTiming.fetchStart,
          totalLoad: navTiming.loadEventEnd - navTiming.fetchStart
        }
      })
    })
  })

  test('should meet Core Web Vitals thresholds', async ({ page }) => {
    // Mock authenticated state
    await page.addInitScript(() => {
      localStorage.setItem('supabase.auth.token', 'mock-token')
    })
    
    // Navigate to main dashboard
    const startTime = Date.now()
    await page.goto('/dashboard')
    
    // Wait for main content to load
    await expect(page.locator('[data-testid="movie-card"]')).toBeVisible({ timeout: 15000 })
    
    // Measure Web Vitals
    const webVitals = await page.evaluate(() => {
      return new Promise((resolve) => {
        const vitals = {}
        
        // Largest Contentful Paint (LCP)
        new PerformanceObserver((list) => {
          const entries = list.getEntries()
          const lastEntry = entries[entries.length - 1]
          vitals.lcp = lastEntry.startTime
        }).observe({ type: 'largest-contentful-paint', buffered: true })
        
        // First Input Delay (FID) - simulate if needed
        vitals.fid = 0 // Will be measured during interaction
        
        // Cumulative Layout Shift (CLS)
        let clsValue = 0
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!entry.hadRecentInput) {
              clsValue += entry.value
            }
          }
          vitals.cls = clsValue
        }).observe({ type: 'layout-shift', buffered: true })
        
        // First Contentful Paint (FCP)
        new PerformanceObserver((list) => {
          const entries = list.getEntries()
          vitals.fcp = entries[0]?.startTime || 0
        }).observe({ type: 'paint', buffered: true })
        
        setTimeout(() => resolve(vitals), 3000)
      })
    })
    
    const loadTime = Date.now() - startTime
    
    // Core Web Vitals thresholds
    console.log('📊 Core Web Vitals:', webVitals)
    console.log('⏱️ Total Load Time:', loadTime)
    
    // Assertions based on Core Web Vitals thresholds
    expect(webVitals.lcp).toBeLessThan(2500) // LCP should be under 2.5s
    expect(webVitals.fcp).toBeLessThan(1800) // FCP should be under 1.8s
    expect(webVitals.cls).toBeLessThan(0.1)  // CLS should be under 0.1
    expect(loadTime).toBeLessThan(5000)      // Total load under 5s
  })

  test('should perform well under simulated slow network', async ({ page }) => {
    // Simulate slow 3G connection
    await page.route('**/*', async route => {
      await new Promise(resolve => setTimeout(resolve, 500)) // 500ms delay
      route.continue()
    })
    
    await page.addInitScript(() => {
      localStorage.setItem('supabase.auth.token', 'mock-token')
    })
    
    const startTime = Date.now()
    await page.goto('/dashboard/movies')
    
    // Should show loading state immediately
    const loadingIndicator = page.locator('.loading, [data-testid="loading"], .skeleton')
    await expect(loadingIndicator.first()).toBeVisible({ timeout: 2000 })
    
    // Content should eventually load
    await expect(page.locator('[data-testid="movie-card"]')).toBeVisible({ timeout: 20000 })
    
    const loadTime = Date.now() - startTime
    console.log('🐌 Slow Network Load Time:', loadTime)
    
    // Should load within reasonable time even on slow network
    expect(loadTime).toBeLessThan(20000) // 20 seconds max for slow network
  })

  test('should handle memory efficiently with large datasets', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('supabase.auth.token', 'mock-token')
      
      // Monitor memory usage
      window.__MEMORY_MONITOR__ = {
        initial: performance.memory?.usedJSHeapSize || 0,
        peak: 0,
        current: 0
      }
      
      setInterval(() => {
        if (performance.memory) {
          const current = performance.memory.usedJSHeapSize
          window.__MEMORY_MONITOR__.current = current
          if (current > window.__MEMORY_MONITOR__.peak) {
            window.__MEMORY_MONITOR__.peak = current
          }
        }
      }, 1000)
    })
    
    // Load movies page with large dataset
    await page.goto('/dashboard/movies')
    await expect(page.locator('[data-testid="movie-card"]')).toBeVisible({ timeout: 10000 })
    
    // Simulate loading more content
    for (let i = 0; i < 5; i++) {
      const loadMoreButton = page.locator('button:has-text("Load More")')
      if (await loadMoreButton.isVisible()) {
        await loadMoreButton.click()
        await page.waitForTimeout(2000)
      }
    }
    
    // Check memory usage
    const memoryStats = await page.evaluate(() => window.__MEMORY_MONITOR__)
    console.log('💾 Memory Usage:', memoryStats)
    
    if (memoryStats.peak > 0) {
      const memoryIncrease = memoryStats.peak - memoryStats.initial
      // Memory increase should be reasonable (less than 50MB)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024)
    }
  })

  test('should render efficiently on mobile devices', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    
    await page.addInitScript(() => {
      localStorage.setItem('supabase.auth.token', 'mock-token')
    })
    
    const startTime = Date.now()
    await page.goto('/dashboard')
    
    // Measure mobile-specific performance
    await expect(page.locator('[data-testid="movie-card"]')).toBeVisible({ timeout: 10000 })
    
    const mobileLoadTime = Date.now() - startTime
    
    // Mobile should load reasonably fast
    expect(mobileLoadTime).toBeLessThan(8000) // 8 seconds max for mobile
    
    // Check touch responsiveness
    const firstMovie = page.locator('[data-testid="movie-card"]').first()
    await firstMovie.click()
    
    // Modal or navigation should respond quickly
    const modalOrNavigation = page.locator('[data-testid="movie-details-modal"]')
      .or(page.locator('[data-testid="movie-detail-page"]'))
    
    if (await modalOrNavigation.isVisible({ timeout: 3000 })) {
      console.log('📱 Touch interaction responsive')
    }
  })

  test('should optimize image loading performance', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('supabase.auth.token', 'mock-token')
      
      // Track image loading
      window.__IMAGE_METRICS__ = {
        totalImages: 0,
        loadedImages: 0,
        failedImages: 0,
        loadTimes: []
      }
      
      // Monitor image loading
      const images = []
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeName === 'IMG') {
              const img = node
              window.__IMAGE_METRICS__.totalImages++
              
              const startTime = Date.now()
              
              img.onload = () => {
                window.__IMAGE_METRICS__.loadedImages++
                window.__IMAGE_METRICS__.loadTimes.push(Date.now() - startTime)
              }
              
              img.onerror = () => {
                window.__IMAGE_METRICS__.failedImages++
              }
            }
          })
        })
      })
      
      observer.observe(document.body, { childList: true, subtree: true })
    })
    
    await page.goto('/dashboard/movies')
    await expect(page.locator('[data-testid="movie-card"]')).toBeVisible({ timeout: 10000 })
    
    // Wait for images to load
    await page.waitForTimeout(5000)
    
    const imageMetrics = await page.evaluate(() => window.__IMAGE_METRICS__)
    console.log('🖼️ Image Loading Metrics:', imageMetrics)
    
    // Most images should load successfully
    if (imageMetrics.totalImages > 0) {
      const successRate = imageMetrics.loadedImages / imageMetrics.totalImages
      expect(successRate).toBeGreaterThan(0.8) // 80% success rate
      
      // Average image load time should be reasonable
      if (imageMetrics.loadTimes.length > 0) {
        const avgLoadTime = imageMetrics.loadTimes.reduce((a, b) => a + b, 0) / imageMetrics.loadTimes.length
        expect(avgLoadTime).toBeLessThan(3000) // 3 seconds average
      }
    }
  })

  test('should handle search performance efficiently', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('supabase.auth.token', 'mock-token')
    })
    
    await page.goto('/search')
    
    const searchInput = page.locator('input[type="search"]')
    await expect(searchInput).toBeVisible()
    
    // Measure search performance
    const searchQueries = ['action', 'comedy', 'thriller', 'sci-fi']
    const searchTimes = []
    
    for (const query of searchQueries) {
      await searchInput.clear()
      
      const startTime = Date.now()
      await searchInput.fill(query)
      await searchInput.press('Enter')
      
      // Wait for results
      await expect(page.locator('[data-testid="search-results"]')).toBeVisible({ timeout: 8000 })
      
      const searchTime = Date.now() - startTime
      searchTimes.push(searchTime)
      
      console.log(`🔍 Search "${query}" took ${searchTime}ms`)
      
      await page.waitForTimeout(1000) // Brief pause between searches
    }
    
    // Average search time should be reasonable
    const avgSearchTime = searchTimes.reduce((a, b) => a + b, 0) / searchTimes.length
    expect(avgSearchTime).toBeLessThan(5000) // 5 seconds average
    
    // No search should take longer than 10 seconds
    expect(Math.max(...searchTimes)).toBeLessThan(10000)
  })

  test('should maintain performance during AI interactions', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('supabase.auth.token', 'mock-token')
    })
    
    await page.goto('/dashboard')
    
    // Look for voice/AI widget
    const aiWidget = page.locator('[data-testid="voice-widget"]')
      .or(page.locator('[data-testid="ai-chat"]'))
      .or(page.locator('button:has-text("AI")'))
    
    if (await aiWidget.isVisible()) {
      await aiWidget.click()
      
      // Test AI response time
      const textInput = page.locator('input[placeholder*="message"]')
        .or(page.locator('textarea[placeholder*="message"]'))
      
      if (await textInput.isVisible()) {
        const startTime = Date.now()
        
        await textInput.fill('Recommend me some action movies')
        await page.locator('button:has-text("Send")').click()
        
        // Wait for AI response
        await expect(page.locator('[data-testid="ai-response"]')
          .or(page.locator('.chat-message'))).toBeVisible({ timeout: 15000 })
        
        const aiResponseTime = Date.now() - startTime
        console.log('🤖 AI Response Time:', aiResponseTime)
        
        // AI should respond within reasonable time
        expect(aiResponseTime).toBeLessThan(12000) // 12 seconds max
      }
    }
  })

  test('should handle concurrent user interactions efficiently', async ({ browser }) => {
    // Create multiple browser contexts to simulate concurrent users
    const contexts = []
    const pages = []
    
    try {
      // Create 5 concurrent user sessions
      for (let i = 0; i < 5; i++) {
        const context = await browser.newContext()
        const page = await context.newPage()
        
        await page.addInitScript(() => {
          localStorage.setItem('supabase.auth.token', `mock-token-${Math.random()}`)
        })
        
        contexts.push(context)
        pages.push(page)
      }
      
      // Simulate concurrent navigation
      const navigationPromises = pages.map(async (page, index) => {
        const startTime = Date.now()
        
        await page.goto('/dashboard/movies')
        await expect(page.locator('[data-testid="movie-card"]')).toBeVisible({ timeout: 15000 })
        
        const loadTime = Date.now() - startTime
        console.log(`👥 User ${index + 1} load time: ${loadTime}ms`)
        
        return loadTime
      })
      
      const loadTimes = await Promise.all(navigationPromises)
      
      // All users should load within reasonable time
      const maxLoadTime = Math.max(...loadTimes)
      const avgLoadTime = loadTimes.reduce((a, b) => a + b, 0) / loadTimes.length
      
      console.log(`👥 Concurrent Load Times - Max: ${maxLoadTime}ms, Avg: ${avgLoadTime}ms`)
      
      expect(maxLoadTime).toBeLessThan(20000) // 20 seconds max under concurrent load
      expect(avgLoadTime).toBeLessThan(12000) // 12 seconds average
      
    } finally {
      // Clean up contexts
      for (const context of contexts) {
        await context.close()
      }
    }
  })

  test('should measure and report detailed performance metrics', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('supabase.auth.token', 'mock-token')
    })
    
    const startTime = Date.now()
    await page.goto('/dashboard')
    
    await expect(page.locator('[data-testid="movie-card"]')).toBeVisible({ timeout: 10000 })
    
    // Collect comprehensive performance data
    const performanceData = await page.evaluate(() => {
      const perfData = window.__PERFORMANCE_DATA__ || {}
      
      // Add navigation timing
      const navigation = performance.getEntriesByType('navigation')[0]
      if (navigation) {
        perfData.navigation = {
          dnsLookup: navigation.domainLookupEnd - navigation.domainLookupStart,
          tcpConnect: navigation.connectEnd - navigation.connectStart,
          serverResponse: navigation.responseEnd - navigation.responseStart,
          domProcessing: navigation.domContentLoadedEventEnd - navigation.responseEnd,
          totalLoad: navigation.loadEventEnd - navigation.navigationStart
        }
      }
      
      // Add paint timing
      const paints = performance.getEntriesByType('paint')
      perfData.paints = {}
      paints.forEach(paint => {
        perfData.paints[paint.name] = paint.startTime
      })
      
      // Add resource summary
      const resources = performance.getEntriesByType('resource')
      perfData.resourceSummary = {
        total: resources.length,
        scripts: resources.filter(r => r.initiatorType === 'script').length,
        stylesheets: resources.filter(r => r.initiatorType === 'css').length,
        images: resources.filter(r => r.initiatorType === 'img').length,
        fonts: resources.filter(r => r.initiatorType === 'font').length,
        xhr: resources.filter(r => r.initiatorType === 'xmlhttprequest').length
      }
      
      return perfData
    })
    
    const totalTime = Date.now() - startTime
    
    console.log('📊 Detailed Performance Metrics:')
    console.log('  Navigation:', performanceData.navigation)
    console.log('  Paint Timing:', performanceData.paints)
    console.log('  Resource Summary:', performanceData.resourceSummary)
    console.log('  Total Test Time:', totalTime)
    
    // Basic performance assertions
    if (performanceData.navigation) {
      expect(performanceData.navigation.totalLoad).toBeLessThan(8000)
      expect(performanceData.navigation.serverResponse).toBeLessThan(2000)
    }
    
    if (performanceData.paints?.['first-contentful-paint']) {
      expect(performanceData.paints['first-contentful-paint']).toBeLessThan(3000)
    }
  })
})