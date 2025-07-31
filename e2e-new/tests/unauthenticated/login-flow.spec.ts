import { test, expect } from '@playwright/test'
import { TEST_USERS } from '../../fixtures/test-users'
import { logout } from '../../fixtures/auth'

test.describe('Login Flow - Complete Journey', () => {
  test('complete login flow from validation to logout', async ({ page }) => {
    // Step 1: Navigate to login page
    await page.goto('/entrar')
    await page.waitForLoadState('networkidle')
    
    const emailInput = page.getByRole('textbox', { name: 'E-mail' })
    const passwordInput = page.getByRole('textbox', { name: 'Senha' })
    const submitButton = page.getByRole('button', { name: 'Entrar' })
    
    // Step 2: Test empty field validation
    await submitButton.click()
    
    const emailError = page.locator('#errors-for-email').filter({ hasText: 'Insira pelo menos um caracter' })
    const passwordError = page.locator('#errors-for-password').filter({ hasText: 'Insira pelo menos um caracter' })
    
    await expect(emailError).toBeVisible()
    await expect(passwordError).toBeVisible()
    
    // Step 3: Test invalid credentials
    await emailInput.fill('wrong@example.com')
    await passwordInput.fill('wrongpassword')
    await submitButton.click()
    
    const errorAlert = page.getByRole('alert').filter({ hasText: 'Credenciais inválidas' })
    await expect(errorAlert).toBeVisible({ timeout: 10000 })
    
    // Verify we're still on login page (may have query params)
    await expect(page).toHaveURL(/\/entrar/)
    
    // Step 4: Clear form and test successful login
    await emailInput.clear()
    await passwordInput.clear()
    await emailInput.fill(TEST_USERS.user1.email)
    await passwordInput.fill(TEST_USERS.user1.password)
    
    await Promise.all([
      page.waitForNavigation({ url: /dashboard$/, waitUntil: 'networkidle' }),
      submitButton.click()
    ])
    
    // Step 5: Verify dashboard access
    await expect(page).toHaveURL('/dashboard')
    
    // Step 6: Test session persistence on reload
    await page.reload()
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveURL('/dashboard')
    
    // Step 7: Test that authenticated users are redirected from login
    await page.goto('/entrar')
    await expect(page).toHaveURL('/dashboard')
    
    // Step 8: Test logout
    await logout(page)
    
    // Verify we're logged out by trying to access dashboard
    await page.goto('/dashboard')
    await expect(page).toHaveURL('/entrar')
  })
})