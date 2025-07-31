import { test, expect } from '@playwright/test'

test.describe('Homepage - Unauthenticated User Journey', () => {
  test('can navigate from homepage to login', async ({ page }) => {
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
    
    // Step 2: Check for auth links
    const loginLink = page.locator('a', { hasText: /login|entrar/i }).first()
    const registerLink = page.locator('a', { hasText: /register|cadastr/i }).first()
    
    // At least one auth link should be visible
    const authLinksVisible = 
      (await loginLink.isVisible().catch(() => false)) ||
      (await registerLink.isVisible().catch(() => false))
    
    expect(authLinksVisible).toBe(true)
    
    // Step 3: Navigate to login page
    if (await loginLink.isVisible()) {
      await loginLink.click()
    } else if (await registerLink.isVisible()) {
      // If only register link is visible, click it
      // Some apps have login/register on same page
      await registerLink.click()
    }
    
    // Verify we're on an auth page
    await expect(page).toHaveURL(/entrar|login|cadastr|register/i)
    
    // Verify login form elements are present
    const emailInput = page.getByRole('textbox', { name: /e-?mail/i })
    const passwordInput = page.getByRole('textbox', { name: /senha|password/i })
    const submitButton = page.getByRole('button', { name: /entrar|login/i })
    
    await expect(emailInput).toBeVisible()
    await expect(passwordInput).toBeVisible()
    await expect(submitButton).toBeVisible()
  })
  
  test('homepage has no console errors', async ({ page }) => {
    const consoleErrors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text())
      }
    })
    
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000) // Give time for any delayed errors
    
    expect(consoleErrors).toHaveLength(0)
  })
})