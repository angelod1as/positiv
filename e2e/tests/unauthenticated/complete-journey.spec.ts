import { test, expect } from '@playwright/test'

test.describe('Complete Unauthenticated Journey', () => {
  test('from homepage through navigation to login', async ({ page }) => {
    // Monitor console errors throughout the test (excluding expected errors)
    const consoleErrors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text()
        // Ignore expected errors:
        // - Authentication errors (422 from invalid credentials)
        // - React Router dev mode manifest patches (only in dev)
        // - Vercel Speed Insights 404 (production build includes it but test server doesn't handle the route)
        const isExpectedError = 
          text.includes('422') || 
          text.includes('Unprocessable Entity') ||
          text.includes('Failed to fetch manifest patches') ||
          text.includes('/_vercel/speed-insights') ||
          (text.includes('Failed to load resource') && text.includes('404'))
          
        if (!isExpectedError) {
          consoleErrors.push(text)
        }
      }
    })
    
    // Step 1: Navigate to homepage and verify it loads
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    
    // Verify page title
    await expect(page).toHaveTitle(/Positiv/i)
    
    // Check for the Positiv logo
    const logo = page.locator('img[alt*="Positiv"]').first()
    await expect(logo).toBeVisible({ timeout: 10000 })
    
    // Verify header is present
    const header = page.locator('header').first()
    await expect(header).toBeVisible()
    
    // Verify there's substantial content
    const pageContent = await page.textContent('body')
    expect(pageContent).toBeTruthy()
    expect(pageContent?.length ?? 0).toBeGreaterThan(100)
    
    // Step 2: Navigate to login page via homepage link
    const loginLink = page.locator('a', { hasText: /login|entrar/i }).first()
    const registerLink = page.locator('a', { hasText: /register|cadastr/i }).first()
    
    // At least one auth link should be visible
    const authLinksVisible = 
      (await loginLink.isVisible().catch(() => false)) ||
      (await registerLink.isVisible().catch(() => false))
    
    expect(authLinksVisible).toBe(true)
    
    if (await loginLink.isVisible()) {
      await loginLink.click()
    } else if (await registerLink.isVisible()) {
      await registerLink.click()
    }
    
    // Verify we're on an auth page
    await expect(page).toHaveURL(/entrar|login|cadastr|register/i)
    
    // Verify login form is displayed
    const emailInput = page.getByRole('textbox', { name: 'E-mail' })
    const passwordInput = page.getByLabel('Senha')
    const submitButton = page.getByRole('button', { name: 'Entrar' })
    
    await expect(emailInput).toBeVisible()
    await expect(passwordInput).toBeVisible()
    await expect(submitButton).toBeVisible()
    
    // Final check: No console errors throughout the journey
    expect(consoleErrors).toHaveLength(0)
  })
})