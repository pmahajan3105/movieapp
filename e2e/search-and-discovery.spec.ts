import { test, expect } from '@playwright/test'

test.describe('Search and Discovery Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authenticated state
    await page.addInitScript(() => {
      localStorage.setItem('supabase.auth.token', 'mock-token')
    })
    await page.goto('/dashboard')
  })

  test('should perform basic movie search', async ({ page }) => {
    await page.goto('/search')
    
    // Find search input
    const searchInput = page.locator('input[type="search"]').or(page.locator('input[placeholder*="search"]'))
    await expect(searchInput).toBeVisible()
    
    // Search for a movie
    await searchInput.fill('inception')
    await searchInput.press('Enter')
    
    // Wait for results
    await expect(page.locator('[data-testid="search-results"]').or(page.locator('.movie-card'))).toBeVisible({ timeout: 10000 })
    
    // Verify search results contain movies
    const movieCards = page.locator('[data-testid="movie-card"]').or(page.locator('.movie-card'))
    await expect(movieCards.first()).toBeVisible()
  })

  test('should filter search results by genre', async ({ page }) => {
    await page.goto('/search')
    
    // Perform initial search
    await page.locator('input[type="search"]').fill('action')
    await page.locator('input[type="search"]').press('Enter')
    
    // Wait for results
    await expect(page.locator('[data-testid="search-results"]')).toBeVisible({ timeout: 10000 })
    
    // Look for genre filters
    const genreFilter = page.locator('select[name="genre"]').or(page.locator('button:has-text("Action")')).or(page.locator('[data-testid="genre-filter"]'))
    
    if (await genreFilter.isVisible()) {
      await genreFilter.click()
      
      // Select a specific genre
      const actionGenre = page.locator('option[value="Action"]').or(page.locator('text=Action'))
      if (await actionGenre.isVisible()) {
        await actionGenre.click()
      }
      
      // Results should update
      await expect(page.locator('[data-testid="search-results"]')).toBeVisible()
    }
  })

  test('should show search suggestions/autocomplete', async ({ page }) => {
    await page.goto('/search')
    
    const searchInput = page.locator('input[type="search"]')
    await searchInput.click()
    await searchInput.type('inc', { delay: 100 })
    
    // Look for suggestions dropdown
    const suggestions = page.locator('[data-testid="search-suggestions"]').or(page.locator('.autocomplete')).or(page.locator('.suggestions'))
    
    if (await suggestions.isVisible()) {
      // Should show suggestions
      await expect(suggestions.locator('text=Inception').or(suggestions.locator('li').first())).toBeVisible()
      
      // Click on a suggestion
      await suggestions.locator('text=Inception').or(suggestions.locator('li').first()).click()
      
      // Should perform search
      await expect(page.locator('[data-testid="search-results"]')).toBeVisible({ timeout: 10000 })
    }
  })

  test('should handle advanced search filters', async ({ page }) => {
    await page.goto('/search')
    
    // Look for advanced search toggle
    const advancedSearch = page.locator('button:has-text("Advanced")').or(page.locator('[data-testid="advanced-search"]'))
    
    if (await advancedSearch.isVisible()) {
      await advancedSearch.click()
      
      // Should show additional filters
      await expect(page.locator('select[name="year"]').or(page.locator('input[name="year"]'))).toBeVisible()
      
      // Fill in filters
      const yearFilter = page.locator('select[name="year"]')
      if (await yearFilter.isVisible()) {
        await yearFilter.selectOption('2020')
      }
      
      const ratingFilter = page.locator('input[name="rating"]')
      if (await ratingFilter.isVisible()) {
        await ratingFilter.fill('8')
      }
      
      // Apply filters
      const applyButton = page.locator('button:has-text("Apply")').or(page.locator('button[type="submit"]'))
      await applyButton.click()
      
      // Should show filtered results
      await expect(page.locator('[data-testid="search-results"]')).toBeVisible({ timeout: 10000 })
    }
  })

  test('should support mood-based search', async ({ page }) => {
    await page.goto('/search')
    
    // Look for mood selection
    const moodSelector = page.locator('[data-testid="mood-selector"]').or(page.locator('select[name="mood"]'))
    
    if (await moodSelector.isVisible()) {
      await moodSelector.click()
      
      // Select a mood
      const happyMood = page.locator('option[value="happy"]').or(page.locator('text=Happy'))
      if (await happyMood.isVisible()) {
        await happyMood.click()
      }
      
      // Should trigger search
      await expect(page.locator('[data-testid="search-results"]')).toBeVisible({ timeout: 10000 })
    }
  })

  test('should handle empty search results', async ({ page }) => {
    await page.goto('/search')
    
    // Search for something unlikely to exist
    await page.locator('input[type="search"]').fill('zzzznonexistentmovie123')
    await page.locator('input[type="search"]').press('Enter')
    
    // Should show no results message
    await expect(page.locator('text=No results').or(page.locator('text=not found')).or(page.locator('text=Try different'))).toBeVisible({ timeout: 10000 })
  })

  test('should save and load search history', async ({ page }) => {
    await page.goto('/search')
    
    // Perform a search
    await page.locator('input[type="search"]').fill('batman')
    await page.locator('input[type="search"]').press('Enter')
    await page.waitForTimeout(2000)
    
    // Perform another search
    await page.locator('input[type="search"]').fill('superman')
    await page.locator('input[type="search"]').press('Enter')
    await page.waitForTimeout(2000)
    
    // Clear search and look for history
    await page.locator('input[type="search"]').clear()
    await page.locator('input[type="search"]').click()
    
    // Should show search history
    const history = page.locator('[data-testid="search-history"]').or(page.locator('.search-history'))
    if (await history.isVisible()) {
      await expect(history.locator('text=batman').or(history.locator('text=superman'))).toBeVisible()
    }
  })

  test('should support voice search if available', async ({ page }) => {
    await page.goto('/search')
    
    // Look for voice search button
    const voiceButton = page.locator('button[aria-label*="voice"]').or(page.locator('[data-testid="voice-search"]'))
    
    if (await voiceButton.isVisible()) {
      await voiceButton.click()
      
      // Should show voice interface
      await expect(page.locator('[data-testid="voice-modal"]').or(page.locator('.voice-modal'))).toBeVisible()
      
      // Should have microphone controls
      await expect(page.locator('button:has-text("Start")').or(page.locator('button[aria-label*="microphone"]'))).toBeVisible()
    }
  })

  test('should handle search API errors gracefully', async ({ page }) => {
    // Intercept search API calls
    await page.route('**/api/movies/search**', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Search service unavailable' })
      })
    })
    
    await page.goto('/search')
    await page.locator('input[type="search"]').fill('test search')
    await page.locator('input[type="search"]').press('Enter')
    
    // Should show error message
    await expect(page.locator('text=error').or(page.locator('text=unavailable'))).toBeVisible({ timeout: 10000 })
  })

  test('should support search result pagination', async ({ page }) => {
    await page.goto('/search')
    
    // Perform a broad search likely to have many results
    await page.locator('input[type="search"]').fill('the')
    await page.locator('input[type="search"]').press('Enter')
    
    // Wait for results
    await expect(page.locator('[data-testid="search-results"]')).toBeVisible({ timeout: 10000 })
    
    // Look for pagination controls
    const nextButton = page.locator('button:has-text("Next")').or(page.locator('button:has-text("Load More")'))
    
    if (await nextButton.isVisible()) {
      const initialCount = await page.locator('[data-testid="movie-card"]').count()
      
      await nextButton.click()
      await page.waitForTimeout(2000)
      
      // Should have more results
      const newCount = await page.locator('[data-testid="movie-card"]').count()
      expect(newCount).toBeGreaterThan(initialCount)
    }
  })

  test('should maintain search state on navigation', async ({ page }) => {
    await page.goto('/search')
    
    // Perform search
    await page.locator('input[type="search"]').fill('matrix')
    await page.locator('input[type="search"]').press('Enter')
    
    // Wait for results
    await expect(page.locator('[data-testid="search-results"]')).toBeVisible({ timeout: 10000 })
    
    // Navigate to a movie detail and back
    const firstMovie = page.locator('[data-testid="movie-card"]').first()
    if (await firstMovie.isVisible()) {
      await firstMovie.click()
      
      // Wait for modal or navigation
      await page.waitForTimeout(1000)
      
      // Go back
      await page.goBack()
      
      // Search results should still be there
      await expect(page.locator('[data-testid="search-results"]')).toBeVisible()
      await expect(page.locator('input[type="search"]')).toHaveValue('matrix')
    }
  })

  test('should handle real-time search (search as you type)', async ({ page }) => {
    await page.goto('/search')
    
    const searchInput = page.locator('input[type="search"]')
    
    // Type slowly to trigger real-time search
    await searchInput.type('incep', { delay: 200 })
    
    // Should show results without pressing Enter
    await expect(page.locator('[data-testid="search-results"]').or(page.locator('.search-suggestions'))).toBeVisible({ timeout: 5000 })
  })
})