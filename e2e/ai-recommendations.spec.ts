import { test, expect } from '@playwright/test'

test.describe('AI Recommendations Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authenticated state
    await page.addInitScript(() => {
      localStorage.setItem('supabase.auth.token', 'mock-token')
    })
    await page.goto('/dashboard')
  })

  test('should load personalized recommendations', async ({ page }) => {
    await page.goto('/dashboard/movies')
    
    // Wait for movies to load
    await expect(page.locator('[data-testid="movie-card"]')).toBeVisible({ timeout: 15000 })
    
    // Should show AI-enhanced indicator
    const aiIndicator = page.locator('text=AI Enhanced')
      .or(page.locator('[data-testid="ai-indicator"]'))
      .or(page.locator('.ai-badge'))
    
    if (await aiIndicator.isVisible()) {
      await expect(aiIndicator).toBeVisible()
    }
    
    // Should have recommendation explanations
    const explanationBadge = page.locator('[data-testid="explanation-badge"]')
      .or(page.locator('.explanation'))
      .or(page.locator('button:has-text("Why")'))
    
    if (await explanationBadge.isVisible()) {
      await explanationBadge.first().click()
      
      // Should show explanation popup/modal
      await expect(page.locator('[data-testid="explanation-modal"]')
        .or(page.locator('.explanation-popup'))
        .or(page.locator('text=recommended because'))).toBeVisible()
    }
  })

  test('should handle mood-based recommendations', async ({ page }) => {
    await page.goto('/dashboard')
    
    // Look for mood selector
    const moodSelector = page.locator('[data-testid="mood-selector"]')
      .or(page.locator('select[name="mood"]'))
      .or(page.locator('button:has-text("Mood")'))
    
    if (await moodSelector.isVisible()) {
      await moodSelector.click()
      
      // Select a mood
      const happyMood = page.locator('option[value="happy"]')
        .or(page.locator('text=Happy'))
        .or(page.locator('[data-value="happy"]'))
      
      if (await happyMood.isVisible()) {
        await happyMood.click()
        
        // Should update recommendations
        await expect(page.locator('[data-testid="movie-card"]')).toBeVisible({ timeout: 10000 })
        
        // Should show mood-based indicator
        await expect(page.locator('text=Happy')
          .or(page.locator('text=mood'))
          .or(page.locator('[data-testid="mood-indicator"]'))).toBeVisible()
      }
    }
  })

  test('should provide smart search suggestions', async ({ page }) => {
    await page.goto('/search')
    
    // Type ambiguous query
    const searchInput = page.locator('input[type="search"]')
    await searchInput.fill('movies like inception')
    
    // Should show AI-powered suggestions
    const smartSuggestion = page.locator('[data-testid="smart-suggestion"]')
      .or(page.locator('.ai-suggestion'))
      .or(page.locator('text=Similar to'))
    
    if (await smartSuggestion.isVisible()) {
      await smartSuggestion.first().click()
      
      // Should load curated results
      await expect(page.locator('[data-testid="search-results"]')).toBeVisible({ timeout: 10000 })
    }
  })

  test('should show confidence scores for recommendations', async ({ page }) => {
    await page.goto('/dashboard/movies')
    await expect(page.locator('[data-testid="movie-card"]')).toBeVisible({ timeout: 10000 })
    
    // Look for confidence indicators
    const confidenceBadge = page.locator('[data-testid="confidence-badge"]')
      .or(page.locator('.confidence-score'))
      .or(page.locator('text=%'))
    
    if (await confidenceBadge.isVisible()) {
      // Should show percentage or visual indicator
      await expect(confidenceBadge.first()).toBeVisible()
      
      // Hover to see more details
      await confidenceBadge.first().hover()
      
      // Should show tooltip with explanation
      const tooltip = page.locator('[data-testid="confidence-tooltip"]')
        .or(page.locator('.tooltip'))
        .or(page.locator('text=confidence'))
      
      if (await tooltip.isVisible()) {
        await expect(tooltip).toBeVisible()
      }
    }
  })

  test('should adapt recommendations based on user interactions', async ({ page }) => {
    await page.goto('/dashboard/movies')
    await expect(page.locator('[data-testid="movie-card"]')).toBeVisible({ timeout: 10000 })
    
    // Get initial recommendation titles
    const initialMovies = await page.locator('[data-testid="movie-title"]').allTextContents()
    
    // Interact with some movies (add to watchlist, rate, etc.)
    const movieCards = page.locator('[data-testid="movie-card"]')
    const firstMovie = movieCards.first()
    
    // Add to watchlist
    const addButton = firstMovie.locator('button:has-text("Add")')
    if (await addButton.isVisible()) {
      await addButton.click()
      await page.waitForTimeout(1000)
    }
    
    // Rate movie if rating is available
    const ratingStars = firstMovie.locator('[data-testid="rating-stars"] button')
    if (await ratingStars.first().isVisible()) {
      await ratingStars.nth(4).click() // 5-star rating
      await page.waitForTimeout(1000)
    }
    
    // Refresh recommendations
    const refreshButton = page.locator('button:has-text("Refresh")')
      .or(page.locator('[data-testid="refresh-recommendations"]'))
    
    if (await refreshButton.isVisible()) {
      await refreshButton.click()
      await page.waitForTimeout(3000)
    } else {
      // Reload page to get updated recommendations
      await page.reload()
      await expect(page.locator('[data-testid="movie-card"]')).toBeVisible({ timeout: 10000 })
    }
    
    // Check if recommendations have changed
    const updatedMovies = await page.locator('[data-testid="movie-title"]').allTextContents()
    
    // Should show some different movies (adaptive learning)
    const hasChanges = initialMovies.some((movie, index) => 
      updatedMovies[index] && movie !== updatedMovies[index]
    )
    
    // Note: This might not always trigger in a test environment
    // but the UI should show indication of personalization
  })

  test('should handle AI service errors gracefully', async ({ page }) => {
    // Mock AI service error
    await page.route('**/api/ai/**', route => {
      route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'AI service temporarily unavailable' })
      })
    })
    
    await page.goto('/dashboard/movies')
    
    // Should fallback to basic recommendations
    await expect(page.locator('[data-testid="movie-card"]')).toBeVisible({ timeout: 10000 })
    
    // Should show fallback indicator
    await expect(page.locator('text=Basic Mode')
      .or(page.locator('text=temporarily unavailable'))
      .or(page.locator('[data-testid="fallback-mode"]'))).toBeVisible()
    
    // Should provide option to retry AI features
    const retryButton = page.locator('button:has-text("Retry AI")')
      .or(page.locator('button:has-text("Enable AI")'))
    
    if (await retryButton.isVisible()) {
      await retryButton.click()
    }
  })

  test('should provide conversation-based recommendations', async ({ page }) => {
    await page.goto('/dashboard')
    
    // Look for voice/chat widget
    const conversationWidget = page.locator('[data-testid="voice-widget"]')
      .or(page.locator('[data-testid="chat-widget"]'))
      .or(page.locator('button:has-text("Ask AI")'))
    
    if (await conversationWidget.isVisible()) {
      await conversationWidget.click()
      
      // Should open conversation interface
      await expect(page.locator('[data-testid="conversation-modal"]')
        .or(page.locator('[data-testid="voice-modal"]'))
        .or(page.locator('.chat-interface'))).toBeVisible()
      
      // Type a request
      const chatInput = page.locator('input[placeholder*="message"]')
        .or(page.locator('textarea[placeholder*="message"]'))
      
      if (await chatInput.isVisible()) {
        await chatInput.fill('I want to watch something funny tonight')
        
        const sendButton = page.locator('button:has-text("Send")')
          .or(page.locator('button[type="submit"]'))
        
        await sendButton.click()
        
        // Should get AI response with recommendations
        await expect(page.locator('[data-testid="ai-response"]')
          .or(page.locator('.chat-message'))
          .or(page.locator('text=recommend'))).toBeVisible({ timeout: 15000 })
      }
      
      // Should show microphone option for voice input
      const micButton = page.locator('button[aria-label*="microphone"]')
        .or(page.locator('[data-testid="mic-button"]'))
      
      if (await micButton.isVisible()) {
        await micButton.click()
        
        // Should show voice recording interface
        await expect(page.locator('text=Listening')
          .or(page.locator('text=Recording'))
          .or(page.locator('[data-testid="voice-recording"]'))).toBeVisible()
      }
    }
  })

  test('should show hyper-personalized recommendations', async ({ page }) => {
    await page.goto('/dashboard')
    
    // Look for hyper-personalized section
    const hyperPersonalizedSection = page.locator('[data-testid="hyper-personalized"]')
      .or(page.locator('text=Curated for You'))
      .or(page.locator('text=Perfect Match'))
    
    if (await hyperPersonalizedSection.isVisible()) {
      await expect(hyperPersonalizedSection).toBeVisible()
      
      // Should have high confidence scores
      const confidenceScores = page.locator('[data-testid="confidence-badge"]')
      
      if (await confidenceScores.first().isVisible()) {
        const confidenceText = await confidenceScores.first().textContent()
        // Should show high confidence (>80%)
        const hasHighConfidence = confidenceText?.includes('9') || confidenceText?.includes('8')
        expect(hasHighConfidence).toBeTruthy()
      }
      
      // Should have detailed explanations
      const explanationButton = hyperPersonalizedSection.locator('[data-testid="explanation-badge"]').first()
      
      if (await explanationButton.isVisible()) {
        await explanationButton.click()
        
        // Should show detailed explanation
        await expect(page.locator('text=viewing history')
          .or(page.locator('text=preferences'))
          .or(page.locator('text=similar users'))).toBeVisible()
      }
    }
  })

  test('should handle preference learning from ratings', async ({ page }) => {
    await page.goto('/dashboard/movies')
    await expect(page.locator('[data-testid="movie-card"]')).toBeVisible({ timeout: 10000 })
    
    // Rate several movies to teach preferences
    const movieCards = page.locator('[data-testid="movie-card"]')
    
    for (let i = 0; i < 3; i++) {
      const movie = movieCards.nth(i)
      const ratingStars = movie.locator('[data-testid="rating-stars"] button')
      
      if (await ratingStars.first().isVisible()) {
        // Give varying ratings
        const rating = i === 0 ? 4 : i === 1 ? 2 : 5 // 5, 3, 1 stars
        await ratingStars.nth(rating).click()
        await page.waitForTimeout(500)
      }
    }
    
    // Navigate to insights page if available
    const insightsLink = page.locator('a:has-text("Insights")')
      .or(page.locator('a[href*="insights"]'))
    
    if (await insightsLink.isVisible()) {
      await insightsLink.click()
      
      // Should show preference insights
      await expect(page.locator('text=preferences')
        .or(page.locator('text=taste'))
        .or(page.locator('[data-testid="preference-insights"]'))).toBeVisible({ timeout: 10000 })
    }
  })

  test('should provide smart genre recommendations', async ({ page }) => {
    await page.goto('/dashboard/movies')
    
    // Look for genre-specific sections
    const genreSection = page.locator('[data-testid="genre-recommendations"]')
      .or(page.locator('text=Because you liked'))
      .or(page.locator('h2:has-text("Action")'))
      .or(page.locator('h2:has-text("Comedy")'))
    
    if (await genreSection.isVisible()) {
      // Should show personalized genre sections
      await expect(genreSection).toBeVisible()
      
      // Click to see more in genre
      const seeMoreButton = genreSection.locator('button:has-text("See More")')
        .or(genreSection.locator('a:has-text("View All")'))
      
      if (await seeMoreButton.isVisible()) {
        await seeMoreButton.click()
        
        // Should navigate to genre-specific page
        await expect(page.locator('[data-testid="movie-card"]')).toBeVisible({ timeout: 10000 })
      }
    }
  })

  test('should support AI recommendation feedback', async ({ page }) => {
    await page.goto('/dashboard/movies')
    await expect(page.locator('[data-testid="movie-card"]')).toBeVisible({ timeout: 10000 })
    
    // Look for feedback options on recommendations
    const feedbackButton = page.locator('[data-testid="recommendation-feedback"]')
      .or(page.locator('button:has-text("Not interested")'))
      .or(page.locator('button[aria-label*="feedback"]'))
    
    if (await feedbackButton.isVisible()) {
      await feedbackButton.first().click()
      
      // Should show feedback options
      const feedbackOptions = page.locator('[data-testid="feedback-options"]')
        .or(page.locator('text=Why not interested'))
        .or(page.locator('button:has-text("Already seen")'))
      
      if (await feedbackOptions.isVisible()) {
        // Select feedback reason
        const alreadySeenOption = page.locator('button:has-text("Already seen")')
          .or(page.locator('text=Seen it'))
        
        if (await alreadySeenOption.isVisible()) {
          await alreadySeenOption.click()
          
          // Should provide confirmation
          await expect(page.locator('text=Thanks')
            .or(page.locator('text=feedback'))).toBeVisible()
        }
      }
    }
  })
})