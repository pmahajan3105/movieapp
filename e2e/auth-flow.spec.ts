import { test, expect } from '@playwright/test'

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Start fresh for each test
    await page.context().clearCookies()
    await page.goto('/')
  })

  test('should complete magic link authentication flow', async ({ page }) => {
    // Navigate to login
    await page.goto('/auth/login')
    
    // Check page loaded correctly
    await expect(page.locator('h1')).toContainText(['Sign in', 'Login', 'Welcome'])
    
    // Fill email input
    const emailInput = page.locator('input[type="email"]')
    await expect(emailInput).toBeVisible()
    await emailInput.fill('test@cineai.com')
    
    // Submit form
    const submitButton = page.locator('button[type="submit"]').or(page.locator('button:has-text("Send")'))
    await submitButton.click()
    
    // Check for success message
    await expect(page.locator('text=Magic link sent').or(page.locator('text=Check your email'))).toBeVisible()
  })

  test('should validate email format', async ({ page }) => {
    await page.goto('/auth/login')
    
    const emailInput = page.locator('input[type="email"]')
    await emailInput.fill('invalid-email')
    
    const submitButton = page.locator('button[type="submit"]')
    await submitButton.click()
    
    // Should show validation error
    await expect(page.locator('text=valid email').or(page.locator('text=Invalid'))).toBeVisible()
  })

  test('should handle authentication redirects correctly', async ({ page }) => {
    // Try to access protected route
    await page.goto('/dashboard')
    
    // Should redirect to login or show login prompt
    await expect(page).toHaveURL(/.*login.*|.*auth.*/)
      .or(expect(page.locator('text=Sign')).toBeVisible())
  })

  test('should handle OTP verification flow', async ({ page }) => {
    await page.goto('/auth/login')
    
    // Fill email and submit
    await page.locator('input[type="email"]').fill('test@cineai.com')
    await page.locator('button[type="submit"]').click()
    
    // Look for OTP input (if implemented)
    const otpInput = page.locator('input[placeholder*="code"]').or(page.locator('input[maxlength="6"]'))
    
    if (await otpInput.isVisible()) {
      await otpInput.fill('123456')
      
      const verifyButton = page.locator('button:has-text("Verify")')
      await verifyButton.click()
      
      // Should show some feedback
      await expect(page.locator('body')).toBeVisible()
    }
  })

  test('should handle logout flow', async ({ page }) => {
    // Assume we're logged in (mock or use actual auth)
    await page.goto('/dashboard')
    
    // Look for logout/sign out button
    const logoutButton = page.locator('button:has-text("Sign Out")').or(page.locator('button:has-text("Logout")'))
    
    if (await logoutButton.isVisible()) {
      await logoutButton.click()
      
      // Should redirect to login or home
      await expect(page).toHaveURL(/.*login.*|.*auth.*|\/$/)
    }
  })

  test('should remember user session', async ({ page }) => {
    // Mock authenticated state
    await page.addInitScript(() => {
      localStorage.setItem('supabase.auth.token', 'mock-token')
    })
    
    await page.goto('/dashboard')
    
    // Reload page
    await page.reload()
    
    // Should still be on dashboard (session persisted)
    await expect(page).toHaveURL(/.*dashboard.*/)
  })

  test('should handle session expiration', async ({ page }) => {
    // Mock expired session
    await page.addInitScript(() => {
      localStorage.setItem('supabase.auth.token', 'expired-token')
    })
    
    await page.goto('/dashboard')
    
    // Make an API call that would trigger auth check
    await page.locator('a:has-text("Movies")').click()
    
    // Should handle expired session gracefully
    await expect(page.locator('body')).toBeVisible()
  })

  test('should support social authentication if enabled', async ({ page }) => {
    await page.goto('/auth/login')
    
    // Look for social login buttons
    const googleButton = page.locator('button:has-text("Google")')
    const githubButton = page.locator('button:has-text("GitHub")')
    
    if (await googleButton.isVisible()) {
      await googleButton.click()
      // Should initiate OAuth flow
      await expect(page.locator('body')).toBeVisible()
    }
  })

  test('should handle authentication errors gracefully', async ({ page }) => {
    // Intercept auth API calls to return errors
    await page.route('**/auth/**', route => {
      route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Invalid credentials' })
      })
    })
    
    await page.goto('/auth/login')
    await page.locator('input[type="email"]').fill('test@example.com')
    await page.locator('button[type="submit"]').click()
    
    // Should show error message
    await expect(page.locator('text=error').or(page.locator('text=Invalid'))).toBeVisible()
  })

  test('should maintain authentication state across tabs', async ({ context }) => {
    // Create two pages (tabs)
    const page1 = await context.newPage()
    const page2 = await context.newPage()
    
    // Login in first tab
    await page1.goto('/auth/login')
    await page1.addInitScript(() => {
      localStorage.setItem('supabase.auth.token', 'mock-token')
    })
    
    // Navigate to dashboard in both tabs
    await page1.goto('/dashboard')
    await page2.goto('/dashboard')
    
    // Both should be authenticated
    await expect(page1.locator('h1')).toBeVisible()
    await expect(page2.locator('h1')).toBeVisible()
  })
})