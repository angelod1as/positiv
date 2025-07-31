import { test, expect } from '@playwright/test'
import { 
  loginAsUser, 
  loginAsUserWithOnboarding,
  loginAsAdmin,
  logout, 
  ensureLoggedOut,
  isAuthenticated
} from '../../fixtures/auth'
import { TEST_USERS } from '../../fixtures/test-users'
import { resetUserToDefaultState } from '../../utils/db-cleanup'

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    await ensureLoggedOut(page)
  })

  test('user can login successfully', async ({ page }) => {
    await loginAsUser(page, 'user1')
    
    // Simple check: we should be at dashboard
    await expect(page).toHaveURL(/dashboard$/)
  })

  test('admin can login successfully', async ({ page }) => {
    await loginAsAdmin(page)
    
    // Simple check: we should be at dashboard
    await expect(page).toHaveURL(/dashboard$/)
  })

  test('logout clears session completely', async ({ page }) => {
    await loginAsUser(page, 'user2')
    
    // Verify we're logged in
    await expect(page).toHaveURL(/dashboard$/)
    
    await logout(page)
    
    // Try to access dashboard - should redirect to login
    await page.goto('/dashboard')
    await expect(page).toHaveURL('/entrar')
  })

  test('handles invalid credentials with error message', async ({ page }) => {
    await page.goto('/entrar')
    
    const emailInput = page.getByRole('textbox', { name: 'E-mail' })
    const passwordInput = page.getByRole('textbox', { name: 'Senha' })
    const submitButton = page.getByRole('button', { name: 'Entrar' })
    
    await emailInput.fill('wrong@example.com')
    await passwordInput.fill('wrongpassword')
    await submitButton.click()
    
    const errorAlert = page.getByRole('alert').filter({ hasText: 'Credenciais inválidas' })
    await expect(errorAlert).toBeVisible({ timeout: 10000 })
    
    const authenticated = await isAuthenticated(page)
    expect(authenticated).toBe(false)
  })

  test('persists session across page reloads', async ({ page }) => {
    await loginAsUser(page, 'user3')
    
    // Verify we're at dashboard
    await expect(page).toHaveURL(/dashboard$/)
    
    // Reload page
    await page.reload()
    await page.waitForLoadState('networkidle')
    
    // Should still be at dashboard
    await expect(page).toHaveURL(/dashboard$/)
  })

  test('handles terms acceptance and onboarding flow for new users', async ({ page }) => {
    await resetUserToDefaultState(TEST_USERS.user4.email)
    
    // Use loginAsUserWithOnboarding to test the full onboarding flow
    await loginAsUserWithOnboarding(page, 'user4')
    
    // After going through the full onboarding flow, user should be at dashboard
    await expect(page).toHaveURL('/dashboard')
  })

  test('validates empty fields', async ({ page }) => {
    await page.goto('/entrar')
    
    const submitButton = page.getByRole('button', { name: 'Entrar' })
    await submitButton.click()
    
    const emailError = page.locator('#errors-for-email').filter({ hasText: 'Insira pelo menos um caracter' })
    const passwordError = page.locator('#errors-for-password').filter({ hasText: 'Insira pelo menos um caracter' })
    
    await expect(emailError).toBeVisible()
    await expect(passwordError).toBeVisible()
  })

  test('login redirects authenticated users away from login page', async ({ page }) => {
    await loginAsUser(page, 'user5')
    
    // Try to go to login page while authenticated
    await page.goto('/entrar')
    
    // Should redirect to dashboard
    await expect(page).toHaveURL('/dashboard')
  })
})

test.describe('Authentication with storage state', () => {
  test.use({ storageState: 'e2e-new/.auth/user.json' })
  
  test('pre-authenticated user can access dashboard directly', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL('/dashboard')
  })
})

test.describe('Admin authentication with storage state', () => {
  test.use({ storageState: 'e2e-new/.auth/admin.json' })
  
  test('pre-authenticated admin can access dashboard directly', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL('/dashboard')
  })
})