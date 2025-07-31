import { test, expect } from '@playwright/test'
import { TEST_USERS } from '../../fixtures/test-users'
import { logout } from '../../fixtures/auth'

test.describe('Complete Unauthenticated Journey', () => {
  test('from homepage to login to dashboard to logout', async ({ page }) => {
    // Monitor console errors throughout the test (excluding expected errors)
    const consoleErrors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text()
        // Ignore expected errors:
        // - Authentication errors (422 from invalid credentials)
        // - React Router dev mode manifest patches (only in dev)
        if (!text.includes('422') && 
            !text.includes('Unprocessable Entity') &&
            !text.includes('Failed to fetch manifest patches')) {
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
    
    const emailInput = page.getByRole('textbox', { name: 'E-mail' })
    const passwordInput = page.getByRole('textbox', { name: 'Senha' })
    const submitButton = page.getByRole('button', { name: 'Entrar' })
    
    await expect(emailInput).toBeVisible()
    await expect(passwordInput).toBeVisible()
    await expect(submitButton).toBeVisible()
    
    // Step 3: Test empty field validation
    await submitButton.click()
    
    const emailError = page.locator('#errors-for-email').filter({ hasText: 'Insira pelo menos um caracter' })
    const passwordError = page.locator('#errors-for-password').filter({ hasText: 'Insira pelo menos um caracter' })
    
    await expect(emailError).toBeVisible()
    await expect(passwordError).toBeVisible()
    
    // Step 4: Test invalid credentials
    await emailInput.fill('wrong@example.com')
    await passwordInput.fill('wrongpassword')
    await submitButton.click()
    
    const errorAlert = page.getByRole('alert').filter({ hasText: 'Credenciais inválidas' })
    await expect(errorAlert).toBeVisible({ timeout: 10000 })
    
    // Verify we're still on login page (may have query params)
    await expect(page).toHaveURL(/\/entrar/)
    
    // Step 5: Clear form and test successful login
    await emailInput.clear()
    await passwordInput.clear()
    await emailInput.fill(TEST_USERS.user1.email)
    await passwordInput.fill(TEST_USERS.user1.password)
    
    await Promise.all([
      page.waitForNavigation({ url: /dashboard$/, waitUntil: 'networkidle' }),
      submitButton.click()
    ])
    
    // Step 6: Verify dashboard access
    await expect(page).toHaveURL('/dashboard')
    
    // Step 7: Test session persistence on reload
    await page.reload()
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveURL('/dashboard')
    
    // Step 8: Test that authenticated users are redirected from login
    await page.goto('/entrar')
    await expect(page).toHaveURL('/dashboard')
    
    // Step 9: Test logout
    await logout(page)
    
    // Verify we're logged out by trying to access dashboard
    await page.goto('/dashboard')
    await expect(page).toHaveURL('/entrar')
    
    // Final check: No console errors throughout the journey
    expect(consoleErrors).toHaveLength(0)
  })
})