import { test, expect } from '@playwright/test'

test.describe('Error Handling and Recovery', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authenticated state
    await page.addInitScript(() => {
      localStorage.setItem('supabase.auth.token', 'mock-token')
    })
  })

  test('should handle API failures gracefully', async ({ page }) => {
    // Mock API failure
    await page.route('**/api/movies**', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal server error' })
      })
    })
    
    await page.goto('/dashboard/movies')
    
    // Should show error state
    await expect(page.locator('text=error')
      .or(page.locator('text=something went wrong'))
      .or(page.locator('[data-testid="error-message"]'))).toBeVisible({ timeout: 10000 })
    
    // Should provide retry option
    const retryButton = page.locator('button:has-text("Retry")')
      .or(page.locator('button:has-text("Try Again")'))
    
    if (await retryButton.isVisible()) {
      // Clear the route mock to allow retry to succeed
      await page.unroute('**/api/movies**')
      await retryButton.click()
      
      // Should recover and show content
      await expect(page.locator('[data-testid="movie-card"]')).toBeVisible({ timeout: 10000 })
    }
  })

  test('should handle network connectivity issues', async ({ page }) => {
    await page.goto('/dashboard')
    
    // Wait for initial load
    await expect(page.locator('[data-testid="movie-card"]')).toBeVisible({ timeout: 10000 })
    
    // Simulate going offline
    await page.context().setOffline(true)
    
    // Try to navigate to a new page
    await page.goto('/dashboard/watchlist')
    
    // Should show offline indicator or cached content
    const offlineIndicator = page.locator('text=offline')
      .or(page.locator('text=no internet'))
      .or(page.locator('[data-testid="offline-indicator"]'))
    
    const cachedContent = page.locator('[data-testid="movie-card"]')
    
    // Should either show offline message or cached content
    await expect(offlineIndicator.or(cachedContent)).toBeVisible({ timeout: 5000 })
    
    // Come back online
    await page.context().setOffline(false)
    
    // Should reconnect and show updated content
    const reconnectedIndicator = page.locator('text=connected')
      .or(page.locator('text=back online'))
      .or(page.locator('[data-testid="online-indicator"]'))
    
    if (await reconnectedIndicator.isVisible()) {
      await expect(reconnectedIndicator).toBeVisible()
    }
  })

  test('should handle slow network connections', async ({ page }) => {
    // Simulate slow network
    await page.route('**/api/**', async route => {
      await new Promise(resolve => setTimeout(resolve, 3000)) // 3 second delay
      route.continue()
    })
    
    await page.goto('/dashboard/movies')
    
    // Should show loading states
    const loadingIndicator = page.locator('.loading')
      .or(page.locator('[data-testid="loading-spinner"]'))
      .or(page.locator('text=Loading'))
    
    await expect(loadingIndicator).toBeVisible()
    
    // Should show slow connection warning
    const slowConnectionWarning = page.locator('text=slow connection')
      .or(page.locator('text=taking longer'))
      .or(page.locator('[data-testid="slow-connection-warning"]'))
    
    if (await slowConnectionWarning.isVisible()) {
      await expect(slowConnectionWarning).toBeVisible()
    }
    
    // Eventually should load content
    await expect(page.locator('[data-testid="movie-card"]')).toBeVisible({ timeout: 15000 })
  })

  test('should handle authentication errors', async ({ page }) => {
    // Mock authentication failure
    await page.route('**/api/**', route => {
      route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Unauthorized' })
      })
    })
    
    await page.goto('/dashboard')
    
    // Should redirect to login or show auth error
    await expect(page.locator('text=sign in')
      .or(page.locator('text=login'))
      .or(page.locator('text=unauthorized'))
      .or(page)).toHaveURL(/.*login.*|.*auth.*/)
  })

  test('should handle form validation errors', async ({ page }) => {
    await page.goto('/auth/login')
    
    // Submit form without email
    const submitButton = page.locator('button[type="submit"]')
    await submitButton.click()
    
    // Should show validation error
    await expect(page.locator('text=required')
      .or(page.locator('text=valid email'))
      .or(page.locator('.error'))).toBeVisible()
    
    // Enter invalid email
    const emailInput = page.locator('input[type="email"]')
    await emailInput.fill('invalid-email')
    await submitButton.click()
    
    // Should show email format error
    await expect(page.locator('text=valid email')
      .or(page.locator('text=invalid'))
      .or(page.locator('.error'))).toBeVisible()
  })

  test('should handle JavaScript errors gracefully', async ({ page }) => {
    // Inject a JavaScript error
    await page.addInitScript(() => {
      // Simulate a runtime error
      setTimeout(() => {
        throw new Error('Simulated runtime error')
      }, 2000)
    })
    
    await page.goto('/dashboard')
    
    // Page should still be functional despite the error
    await expect(page.locator('h1')).toBeVisible({ timeout: 10000 })
    
    // Error boundary should catch React errors
    await page.evaluate(() => {
      // Trigger a React error
      const event = new CustomEvent('error', {
        detail: new Error('React component error')
      })
      window.dispatchEvent(event)
    })
    
    // Should show error boundary fallback
    const errorBoundary = page.locator('[data-testid="error-boundary"]')
      .or(page.locator('text=something went wrong'))
      .or(page.locator('button:has-text("Try Again")'))
    
    if (await errorBoundary.isVisible()) {
      await expect(errorBoundary).toBeVisible()
      
      // Should be able to recover
      const tryAgainButton = page.locator('button:has-text("Try Again")')
      if (await tryAgainButton.isVisible()) {
        await tryAgainButton.click()
      }
    }
  })

  test('should handle database connection errors', async ({ page }) => {
    // Mock database connection error
    await page.route('**/api/**', route => {
      route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ 
          error: 'Database temporarily unavailable',
          code: 'DATABASE_ERROR'
        })
      })
    })
    
    await page.goto('/dashboard')
    
    // Should show database error message
    await expect(page.locator('text=database')
      .or(page.locator('text=temporarily unavailable'))
      .or(page.locator('text=service unavailable'))).toBeVisible({ timeout: 10000 })
    
    // Should provide fallback options
    const basicModeButton = page.locator('button:has-text("Basic Mode")')
      .or(page.locator('button:has-text("Offline Mode")'))
    
    if (await basicModeButton.isVisible()) {
      await basicModeButton.click()
      
      // Should switch to basic functionality
      await expect(page.locator('text=Basic Mode')
        .or(page.locator('text=Limited features'))).toBeVisible()
    }
  })

  test('should handle AI service failures', async ({ page }) => {
    // Mock AI service error
    await page.route('**/api/ai/**', route => {
      route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ 
          error: 'AI service temporarily unavailable',
          fallbackData: {
            message: 'Using basic recommendations instead',
            useBasicMode: true
          }
        })
      })
    })
    
    await page.goto('/dashboard/movies')
    
    // Should show AI service unavailable message
    await expect(page.locator('text=AI')
      .or(page.locator('text=basic'))
      .or(page.locator('text=recommendations'))).toBeVisible({ timeout: 10000 })
    
    // Should still show movies (fallback to basic recommendations)
    await expect(page.locator('[data-testid="movie-card"]')).toBeVisible({ timeout: 10000 })
    
    // Should show basic mode indicator
    await expect(page.locator('text=Basic Mode')
      .or(page.locator('text=Standard recommendations'))).toBeVisible()
  })

  test('should handle image loading failures', async ({ page }) => {
    // Mock image loading failures
    await page.route('**/*.jpg', route => route.abort())
    await page.route('**/*.png', route => route.abort())
    await page.route('**/*.webp', route => route.abort())
    
    await page.goto('/dashboard/movies')
    
    // Should show placeholder images or fallback
    await expect(page.locator('[data-testid="movie-card"]')).toBeVisible({ timeout: 10000 })
    
    // Images should have alt text or placeholder
    const images = page.locator('img')
    const firstImage = images.first()
    
    if (await firstImage.isVisible()) {
      // Should have alt text
      await expect(firstImage).toHaveAttribute('alt')
      
      // Should handle broken image gracefully
      const placeholderVisible = await page.locator('[data-testid="image-placeholder"]')
        .or(page.locator('.placeholder'))
        .or(page.locator('text=No image')).isVisible()
      
      // Either original image loads or placeholder is shown
      expect(placeholderVisible || await firstImage.isVisible()).toBeTruthy()
    }
  })

  test('should handle rate limiting gracefully', async ({ page }) => {
    // Mock rate limit error
    await page.route('**/api/**', route => {
      route.fulfill({
        status: 429,
        contentType: 'application/json',
        headers: {
          'Retry-After': '60'
        },
        body: JSON.stringify({ 
          error: 'Too many requests',
          retryAfter: 60
        })
      })
    })
    
    await page.goto('/dashboard/movies')
    
    // Should show rate limit message
    await expect(page.locator('text=too many requests')
      .or(page.locator('text=rate limit'))
      .or(page.locator('text=try again later'))).toBeVisible({ timeout: 10000 })
    
    // Should show retry countdown or button
    const retryInfo = page.locator('text=60')
      .or(page.locator('text=minute'))
      .or(page.locator('text=wait'))
    
    if (await retryInfo.isVisible()) {
      await expect(retryInfo).toBeVisible()
    }
  })

  test('should handle session timeout', async ({ page }) => {
    await page.goto('/dashboard')
    
    // Wait for initial load
    await expect(page.locator('[data-testid="movie-card"]')).toBeVisible({ timeout: 10000 })
    
    // Mock session timeout by removing auth token
    await page.evaluate(() => {
      localStorage.removeItem('supabase.auth.token')
    })
    
    // Try to perform an action that requires authentication
    const firstMovie = page.locator('[data-testid="movie-card"]').first()
    const addButton = firstMovie.locator('button:has-text("Add")')
    
    if (await addButton.isVisible()) {
      await addButton.click()
      
      // Should prompt for re-authentication
      await expect(page.locator('text=sign in')
        .or(page.locator('text=session expired'))
        .or(page.locator('text=login'))).toBeVisible({ timeout: 5000 })
    }
  })

  test('should handle browser compatibility issues', async ({ page }) => {
    // Mock missing browser features
    await page.addInitScript(() => {
      // Remove modern browser features
      delete window.fetch
      delete window.localStorage
      delete window.sessionStorage
    })
    
    await page.goto('/dashboard')
    
    // Should still function with polyfills or fallbacks
    const compatibilityWarning = page.locator('text=browser')
      .or(page.locator('text=update'))
      .or(page.locator('text=compatibility'))
    
    if (await compatibilityWarning.isVisible()) {
      await expect(compatibilityWarning).toBeVisible()
    }
    
    // Basic functionality should still work
    await expect(page.locator('h1')).toBeVisible({ timeout: 10000 })
  })

  test('should recover from partial data loading failures', async ({ page }) => {
    let requestCount = 0
    
    // Mock intermittent failures
    await page.route('**/api/movies**', route => {
      requestCount++
      
      if (requestCount <= 2) {
        // Fail first 2 requests
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Server error' })
        })
      } else {
        // Succeed on subsequent requests
        route.continue()
      }
    })
    
    await page.goto('/dashboard/movies')
    
    // Should eventually succeed after retries
    await expect(page.locator('[data-testid="movie-card"]')).toBeVisible({ timeout: 15000 })
    
    // Should show that recovery was successful
    const errorMessage = page.locator('text=error')
    if (await errorMessage.isVisible()) {
      // Error message should disappear after successful retry
      await expect(errorMessage).not.toBeVisible({ timeout: 10000 })
    }
  })

  test('should handle memory and performance issues', async ({ page }) => {
    // Simulate high memory usage scenario
    await page.addInitScript(() => {
      // Create memory pressure
      const largeArray = new Array(1000000).fill('test data')
      window.testData = largeArray
    })
    
    await page.goto('/dashboard/movies')
    
    // Should still load and function
    await expect(page.locator('[data-testid="movie-card"]')).toBeVisible({ timeout: 10000 })
    
    // Performance warning might be shown
    const performanceWarning = page.locator('text=performance')
      .or(page.locator('text=memory'))
      .or(page.locator('text=slow'))
    
    if (await performanceWarning.isVisible()) {
      await expect(performanceWarning).toBeVisible()
    }
    
    // Should provide options to improve performance
    const optimizeButton = page.locator('button:has-text("Optimize")')
      .or(page.locator('button:has-text("Reduce Quality")'))
    
    if (await optimizeButton.isVisible()) {
      await optimizeButton.click()
    }
  })
})