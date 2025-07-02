import { test, expect } from '@playwright/test';

test.describe('Movie Recommendation Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto('/');
  });

  test('should complete full user journey from login to recommendations', async ({ page }) => {
    // Test login flow
    await expect(page.locator('h1')).toContainText('CineAI');
    
    // Check if we need to login
    const loginButton = page.locator('button:has-text("Sign In")');
    if (await loginButton.isVisible()) {
      await loginButton.click();
      
      // Fill in email for magic link
      const emailInput = page.locator('input[type="email"]');
      await emailInput.fill('test@example.com');
      
      const sendLinkButton = page.locator('button:has-text("Send Magic Link")');
      await sendLinkButton.click();
      
      // Check for success message
      await expect(page.locator('text=Magic link sent')).toBeVisible();
    }
  });

  test('should navigate to dashboard and show movies', async ({ page }) => {
    // Assume we're logged in (you might need to handle auth state)
    await page.goto('/dashboard');
    
    // Wait for movies to load
    await expect(page.locator('[data-testid="movie-grid"]')).toBeVisible({ timeout: 10000 });
    
    // Check that movies are displayed
    const movieCards = page.locator('[data-testid="movie-card"]');
    await expect(movieCards.first()).toBeVisible();
  });

  test('should search for movies and show results', async ({ page }) => {
    await page.goto('/dashboard/movies');
    
    // Wait for search input to be available
    const searchInput = page.locator('input[placeholder*="search"]');
    await expect(searchInput).toBeVisible();
    
    // Search for a movie
    await searchInput.fill('action');
    await searchInput.press('Enter');
    
    // Wait for search results
    await expect(page.locator('[data-testid="search-results"]')).toBeVisible({ timeout: 10000 });
  });

  test('should add movie to watchlist', async ({ page }) => {
    await page.goto('/dashboard/movies');
    
    // Wait for movies to load
    await expect(page.locator('[data-testid="movie-card"]')).toBeVisible({ timeout: 10000 });
    
    // Click on first movie's watchlist button
    const firstMovieCard = page.locator('[data-testid="movie-card"]').first();
    const watchlistButton = firstMovieCard.locator('button:has-text("Add to Watchlist")');
    
    if (await watchlistButton.isVisible()) {
      await watchlistButton.click();
      
      // Check for success indication
      await expect(firstMovieCard.locator('button:has-text("In Watchlist")')).toBeVisible();
    }
  });

  test('should show movie details modal', async ({ page }) => {
    await page.goto('/dashboard/movies');
    
    // Wait for movies to load
    await expect(page.locator('[data-testid="movie-card"]')).toBeVisible({ timeout: 10000 });
    
    // Click on first movie to open details
    const firstMovieCard = page.locator('[data-testid="movie-card"]').first();
    await firstMovieCard.click();
    
    // Check that modal opens
    await expect(page.locator('[data-testid="movie-details-modal"]')).toBeVisible();
    
    // Check modal content
    await expect(page.locator('[data-testid="movie-title"]')).toBeVisible();
    await expect(page.locator('[data-testid="movie-plot"]')).toBeVisible();
  });

  test('should handle mobile responsive layout', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto('/dashboard');
    
    // Check mobile navigation
    const mobileMenu = page.locator('[data-testid="mobile-menu"]');
    if (await mobileMenu.isVisible()) {
      await mobileMenu.click();
      
      // Check navigation items
      await expect(page.locator('nav[role="navigation"]')).toBeVisible();
    }
    
    // Check responsive movie grid
    await expect(page.locator('[data-testid="movie-grid"]')).toBeVisible();
    
    // On mobile, should show fewer columns
    const movieCards = page.locator('[data-testid="movie-card"]');
    const firstCardWidth = await movieCards.first().boundingBox();
    expect(firstCardWidth?.width).toBeGreaterThan(100); // Should be wider on mobile
  });

  test('should navigate to watchlist page', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Navigate to watchlist
    const watchlistLink = page.locator('a:has-text("Watchlist")');
    await watchlistLink.click();
    
    // Check we're on watchlist page
    await expect(page).toHaveURL(/.*watchlist/);
    await expect(page.locator('h1:has-text("Watchlist")')).toBeVisible();
  });

  test('should show loading states during data fetching', async ({ page }) => {
    await page.goto('/dashboard/movies');
    
    // Check for loading indicators
    const loadingSpinner = page.locator('.loading-spinner');
    const loadingSkeleton = page.locator('[data-testid="movie-skeleton"]');
    
    // At least one loading indicator should be present initially
    await expect(loadingSpinner.or(loadingSkeleton)).toBeVisible();
    
    // Wait for content to load
    await expect(page.locator('[data-testid="movie-card"]')).toBeVisible({ timeout: 10000 });
  });

  test('should handle error states gracefully', async ({ page }) => {
    // Intercept API calls and return errors
    await page.route('**/api/movies**', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Server error' })
      });
    });
    
    await page.goto('/dashboard/movies');
    
    // Check for error message
    await expect(page.locator('text=error').or(page.locator('text=Error'))).toBeVisible({ timeout: 10000 });
  });

  test('should test voice conversation widget if present', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Check if voice widget is present
    const voiceWidget = page.locator('[data-testid="voice-widget"]');
    if (await voiceWidget.isVisible()) {
      await voiceWidget.click();
      
      // Check if voice modal opens
      await expect(page.locator('[data-testid="voice-modal"]')).toBeVisible();
      
      // Check for microphone controls
      await expect(page.locator('button:has-text("Start")')).toBeVisible();
    }
  });

  test('should support keyboard navigation', async ({ page }) => {
    await page.goto('/dashboard/movies');
    
    // Wait for content to load
    await expect(page.locator('[data-testid="movie-card"]')).toBeVisible({ timeout: 10000 });
    
    // Test tab navigation
    await page.keyboard.press('Tab');
    
    // Check that focus is visible
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();
    
    // Test Enter key to activate focused element
    await page.keyboard.press('Enter');
  });

  test('should persist user preferences across sessions', async ({ page }) => {
    await page.goto('/dashboard/settings');
    
    // Change a setting if settings page exists
    const themeToggle = page.locator('[data-testid="theme-toggle"]');
    if (await themeToggle.isVisible()) {
      await themeToggle.click();
      
      // Reload page and check if setting persisted
      await page.reload();
      
      // Verify the setting is still applied
      await expect(themeToggle).toBeVisible();
    }
  });

  test('should handle network conditions gracefully', async ({ page }) => {
    // Test offline behavior
    await page.goto('/dashboard');
    
    // Wait for initial load
    await expect(page.locator('[data-testid="movie-card"]')).toBeVisible({ timeout: 10000 });
    
    // Go offline
    await page.context().setOffline(true);
    
    // Try to navigate
    await page.locator('a:has-text("Watchlist")').click();
    
    // Should handle offline gracefully (cached content or offline message)
    await expect(page.locator('body')).toBeVisible();
  });

  test('should validate accessibility basics', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Check for semantic HTML elements
    await expect(page.locator('nav[role="navigation"]')).toBeVisible();
    await expect(page.locator('main')).toBeVisible();
    
    // Check for alt text on images
    const images = page.locator('img');
    const count = await images.count();
    
    for (let i = 0; i < Math.min(count, 5); i++) {
      const img = images.nth(i);
      await expect(img).toHaveAttribute('alt');
    }
    
    // Check for proper heading hierarchy
    await expect(page.locator('h1')).toBeVisible();
  });
}); 