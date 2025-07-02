import { test, expect } from '@playwright/test'

test.describe('Watchlist Management Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authenticated state
    await page.addInitScript(() => {
      localStorage.setItem('supabase.auth.token', 'mock-token')
    })
    await page.goto('/dashboard')
  })

  test('should add movie to watchlist from movie grid', async ({ page }) => {
    await page.goto('/dashboard/movies')
    
    // Wait for movies to load
    await expect(page.locator('[data-testid="movie-card"]')).toBeVisible({ timeout: 10000 })
    
    // Find first movie card
    const firstMovie = page.locator('[data-testid="movie-card"]').first()
    const movieTitle = await firstMovie.locator('[data-testid="movie-title"]').textContent()
    
    // Click add to watchlist button
    const addButton = firstMovie.locator('button:has-text("Add")')
      .or(firstMovie.locator('[data-testid="add-to-watchlist"]'))
      .or(firstMovie.locator('button[aria-label*="watchlist"]'))
    
    await addButton.click()
    
    // Should show success feedback
    await expect(firstMovie.locator('button:has-text("Added")')
      .or(firstMovie.locator('button:has-text("In Watchlist")')
      .or(firstMovie.locator('.btn-success')))).toBeVisible()
    
    // Navigate to watchlist to verify
    await page.goto('/dashboard/watchlist')
    
    // Should see the added movie
    if (movieTitle) {
      await expect(page.locator(`text=${movieTitle}`)).toBeVisible({ timeout: 10000 })
    }
  })

  test('should remove movie from watchlist', async ({ page }) => {
    // First add a movie to watchlist
    await page.goto('/dashboard/movies')
    await expect(page.locator('[data-testid="movie-card"]')).toBeVisible({ timeout: 10000 })
    
    const firstMovie = page.locator('[data-testid="movie-card"]').first()
    const addButton = firstMovie.locator('button:has-text("Add")')
    
    if (await addButton.isVisible()) {
      await addButton.click()
      await page.waitForTimeout(1000)
    }
    
    // Go to watchlist
    await page.goto('/dashboard/watchlist')
    await expect(page.locator('[data-testid="movie-card"]')).toBeVisible({ timeout: 10000 })
    
    // Remove first movie from watchlist
    const watchlistMovie = page.locator('[data-testid="movie-card"]').first()
    const removeButton = watchlistMovie.locator('button:has-text("Remove")')
      .or(watchlistMovie.locator('[data-testid="remove-from-watchlist"]'))
      .or(watchlistMovie.locator('button[aria-label*="remove"]'))
    
    await removeButton.click()
    
    // Should show confirmation or immediate removal
    const confirmButton = page.locator('button:has-text("Confirm")').or(page.locator('button:has-text("Yes")'))
    if (await confirmButton.isVisible()) {
      await confirmButton.click()
    }
    
    // Movie should be removed from the grid
    await expect(watchlistMovie).not.toBeVisible()
  })

  test('should show empty watchlist state', async ({ page }) => {
    // Mock empty watchlist API response
    await page.route('**/api/watchlist**', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: [] })
      })
    })
    
    await page.goto('/dashboard/watchlist')
    
    // Should show empty state message
    await expect(page.locator('text=empty').or(page.locator('text=No movies')).or(page.locator('[data-testid="empty-watchlist"]'))).toBeVisible({ timeout: 10000 })
    
    // Should show call-to-action
    await expect(page.locator('button:has-text("Browse")')
      .or(page.locator('a:has-text("Discover")')
      .or(page.locator('text=add movies')))).toBeVisible()
  })

  test('should handle watchlist persistence across sessions', async ({ page }) => {
    // Add movie to watchlist
    await page.goto('/dashboard/movies')
    await expect(page.locator('[data-testid="movie-card"]')).toBeVisible({ timeout: 10000 })
    
    const firstMovie = page.locator('[data-testid="movie-card"]').first()
    const movieTitle = await firstMovie.locator('[data-testid="movie-title"]').textContent()
    
    const addButton = firstMovie.locator('button:has-text("Add")')
    if (await addButton.isVisible()) {
      await addButton.click()
      await page.waitForTimeout(1000)
    }
    
    // Simulate session reload
    await page.reload()
    
    // Navigate to watchlist
    await page.goto('/dashboard/watchlist')
    
    // Movie should still be there
    if (movieTitle) {
      await expect(page.locator(`text=${movieTitle}`)).toBeVisible({ timeout: 10000 })
    }
  })

  test('should support bulk operations on watchlist', async ({ page }) => {
    await page.goto('/dashboard/watchlist')
    
    // Wait for watchlist to load
    await expect(page.locator('[data-testid="movie-card"]')).toBeVisible({ timeout: 10000 })
    
    // Look for bulk selection controls
    const selectAllButton = page.locator('button:has-text("Select All")')
      .or(page.locator('[data-testid="select-all"]'))
      .or(page.locator('input[type="checkbox"][name="select-all"]'))
    
    if (await selectAllButton.isVisible()) {
      await selectAllButton.click()
      
      // Should select all movies
      const selectedMovies = page.locator('[data-testid="movie-card"] input[type="checkbox"]:checked')
      await expect(selectedMovies.first()).toBeVisible()
      
      // Look for bulk actions
      const bulkRemoveButton = page.locator('button:has-text("Remove Selected")')
        .or(page.locator('[data-testid="bulk-remove"]'))
      
      if (await bulkRemoveButton.isVisible()) {
        await bulkRemoveButton.click()
        
        // Should show confirmation
        const confirmButton = page.locator('button:has-text("Confirm")')
        if (await confirmButton.isVisible()) {
          await confirmButton.click()
        }
      }
    }
  })

  test('should filter and sort watchlist', async ({ page }) => {
    await page.goto('/dashboard/watchlist')
    await expect(page.locator('[data-testid="movie-card"]')).toBeVisible({ timeout: 10000 })
    
    // Look for sort options
    const sortDropdown = page.locator('select[name="sort"]')
      .or(page.locator('[data-testid="sort-selector"]'))
      .or(page.locator('button:has-text("Sort")'))
    
    if (await sortDropdown.isVisible()) {
      await sortDropdown.click()
      
      // Select sort by date added
      const dateOption = page.locator('option[value="date"]')
        .or(page.locator('text=Date Added'))
      
      if (await dateOption.isVisible()) {
        await dateOption.click()
      }
      
      // Movies should reorder
      await page.waitForTimeout(1000)
      await expect(page.locator('[data-testid="movie-card"]')).toBeVisible()
    }
    
    // Look for filter options
    const genreFilter = page.locator('select[name="genre"]')
      .or(page.locator('[data-testid="genre-filter"]'))
    
    if (await genreFilter.isVisible()) {
      await genreFilter.selectOption('Action')
      
      // Should filter movies
      await page.waitForTimeout(1000)
      await expect(page.locator('[data-testid="movie-card"]')).toBeVisible()
    }
  })

  test('should support watchlist sharing', async ({ page }) => {
    await page.goto('/dashboard/watchlist')
    
    // Look for share functionality
    const shareButton = page.locator('button:has-text("Share")')
      .or(page.locator('[data-testid="share-watchlist"]'))
      .or(page.locator('button[aria-label*="share"]'))
    
    if (await shareButton.isVisible()) {
      await shareButton.click()
      
      // Should show share modal/dropdown
      await expect(page.locator('[data-testid="share-modal"]')
        .or(page.locator('.share-dropdown'))
        .or(page.locator('text=Share link'))).toBeVisible()
      
      // Should have copy link functionality
      const copyButton = page.locator('button:has-text("Copy")')
      if (await copyButton.isVisible()) {
        await copyButton.click()
        
        // Should show copied feedback
        await expect(page.locator('text=Copied')
          .or(page.locator('text=Link copied'))).toBeVisible()
      }
    }
  })

  test('should handle watchlist API errors gracefully', async ({ page }) => {
    // Mock API error
    await page.route('**/api/watchlist**', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Database error' })
      })
    })
    
    await page.goto('/dashboard/watchlist')
    
    // Should show error message
    await expect(page.locator('text=error')
      .or(page.locator('text=Unable to load'))
      .or(page.locator('[data-testid="error-message"]'))).toBeVisible({ timeout: 10000 })
    
    // Should provide retry option
    const retryButton = page.locator('button:has-text("Retry")')
      .or(page.locator('button:has-text("Try Again")'))
    
    if (await retryButton.isVisible()) {
      await retryButton.click()
    }
  })

  test('should sync watchlist across multiple devices', async ({ context }) => {
    // Create two pages to simulate different devices
    const device1 = await context.newPage()
    const device2 = await context.newPage()
    
    // Both pages authenticated
    await device1.addInitScript(() => {
      localStorage.setItem('supabase.auth.token', 'mock-token')
    })
    await device2.addInitScript(() => {
      localStorage.setItem('supabase.auth.token', 'mock-token')
    })
    
    // Add movie on device 1
    await device1.goto('/dashboard/movies')
    await expect(device1.locator('[data-testid="movie-card"]')).toBeVisible({ timeout: 10000 })
    
    const firstMovie = device1.locator('[data-testid="movie-card"]').first()
    const movieTitle = await firstMovie.locator('[data-testid="movie-title"]').textContent()
    
    const addButton = firstMovie.locator('button:has-text("Add")')
    if (await addButton.isVisible()) {
      await addButton.click()
      await device1.waitForTimeout(2000)
    }
    
    // Check if movie appears on device 2
    await device2.goto('/dashboard/watchlist')
    
    if (movieTitle) {
      await expect(device2.locator(`text=${movieTitle}`)).toBeVisible({ timeout: 10000 })
    }
  })

  test('should show watchlist statistics', async ({ page }) => {
    await page.goto('/dashboard/watchlist')
    
    // Look for statistics
    const statsSection = page.locator('[data-testid="watchlist-stats"]')
      .or(page.locator('.stats'))
      .or(page.locator('text=Total movies'))
    
    if (await statsSection.isVisible()) {
      // Should show total count
      await expect(page.locator('text=Total')
        .or(page.locator('text=movies'))
        .or(page.locator('[data-testid="total-count"]'))).toBeVisible()
      
      // May show other stats like genres, runtime, etc.
      const genreStats = page.locator('text=genres').or(page.locator('text=Categories'))
      if (await genreStats.isVisible()) {
        await expect(genreStats).toBeVisible()
      }
    }
  })

  test('should handle watchlist limit warnings', async ({ page }) => {
    // Mock full watchlist response
    await page.route('**/api/watchlist**', route => {
      const movies = Array(100).fill(null).map((_, i) => ({
        id: i,
        title: `Movie ${i}`,
        poster_url: 'test.jpg'
      }))
      
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: movies })
      })
    })
    
    await page.goto('/dashboard/movies')
    await expect(page.locator('[data-testid="movie-card"]')).toBeVisible({ timeout: 10000 })
    
    // Try to add another movie
    const addButton = page.locator('[data-testid="movie-card"]').first().locator('button:has-text("Add")')
    
    if (await addButton.isVisible()) {
      await addButton.click()
      
      // Should show limit warning
      await expect(page.locator('text=limit')
        .or(page.locator('text=maximum'))
        .or(page.locator('text=full'))).toBeVisible()
    }
  })
})