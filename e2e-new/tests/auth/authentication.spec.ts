import { test, expect } from '@playwright/test'
import { 
  loginAsUser, 
  loginAsAdmin, 
  logout, 
  ensureLoggedOut,
  isAuthenticated
} from '../../fixtures/auth'
import { LoginPage } from '../../pages/LoginPage'
import { TEST_USERS } from '../../fixtures/test-users'
import { resetUserToDefaultState } from '../../utils/db-cleanup'

test.describe('Authentication Flows', () => {
  test.beforeEach(async ({ page }) => {
    await ensureLoggedOut(page)
  })

  test('complete authentication journey with form validation and POM', async ({ page }) => {
    const loginPage = new LoginPage(page)
    
    // Step 1: Navigate to login and verify page elements
    await loginPage.goto()
    await loginPage.verifyLoginPageDisplayed()
    
    // Step 2: Test empty field validation
    await page.getByRole('button', { name: 'Entrar' }).click()
    await expect(loginPage.emailError).toBeVisible()
    await expect(loginPage.passwordError).toBeVisible()
    
    // Step 3: Test invalid credentials
    await loginPage.emailInput.fill('wrong@example.com')
    await loginPage.passwordInput.fill('wrongpassword')
    await page.getByRole('button', { name: 'Entrar' }).click()
    await expect(loginPage.generalErrorAlert).toBeVisible()
    
    // Step 4: Test successful login using POM method
    await loginPage.emailInput.clear()
    await loginPage.passwordInput.clear()
    await loginPage.login(TEST_USERS.user1.email, TEST_USERS.user1.password)
    
    // Should be authenticated
    const authenticated = await isAuthenticated(page)
    expect(authenticated).toBe(true)
    
    // Should be at dashboard or terms page (if profile not complete)
    const currentUrl = page.url()
    expect(currentUrl.includes('/dashboard') || currentUrl.includes('/conta/termos-e-condicoes')).toBe(true)
    
    // Step 5: Verify user cannot access admin area
    await page.goto('/admin')
    await expect(page).not.toHaveURL('/admin')
    
    // Step 6: Test logout
    await logout(page)
    const loggedOut = await isAuthenticated(page)
    expect(loggedOut).toBe(false)
    await expect(page).toHaveURL('/')
  })

  test('admin authentication and access control', async ({ page }) => {
    // Use auth utilities for quick admin login
    await loginAsAdmin(page)
    
    // Verify authenticated
    const authenticated = await isAuthenticated(page)
    expect(authenticated).toBe(true)
    
    // Verify on dashboard
    await expect(page).toHaveURL('/dashboard')
    
    // Verify admin can access admin area
    await page.goto('/admin')
    await expect(page).toHaveURL('/admin')
    await expect(page.getByRole('heading', { name: 'Visão geral' })).toBeVisible()
  })

  test('session persistence across page reloads', async ({ page }) => {
    // Login as user
    await loginAsUser(page, 'user2')
    
    // Verify authenticated before reload
    const authBefore = await isAuthenticated(page)
    expect(authBefore).toBe(true)
    
    // Reload page
    await page.reload()
    await page.waitForLoadState('networkidle')
    
    // Verify still authenticated
    const authenticatedAfterReload = await isAuthenticated(page)
    expect(authenticatedAfterReload).toBe(true)
    
    // Verify still on dashboard
    await expect(page).toHaveURL('/dashboard')
  })

  test('multiple users can login sequentially', async ({ page }) => {
    // Login as first user
    await loginAsUser(page, 'user3')
    expect(await isAuthenticated(page)).toBe(true)
    
    // Logout
    await logout(page)
    
    // Login as second user
    await loginAsUser(page, 'user4')
    expect(await isAuthenticated(page)).toBe(true)
    
    // Logout
    await logout(page)
    
    // Login as admin
    await loginAsAdmin(page)
    expect(await isAuthenticated(page)).toBe(true)
  })

  test('ensureLoggedOut utility works correctly', async ({ page }) => {
    // Start logged in
    await loginAsUser(page, 'user5')
    expect(await isAuthenticated(page)).toBe(true)
    
    // Use ensureLoggedOut
    await ensureLoggedOut(page)
    
    // Verify logged out
    const authenticated = await isAuthenticated(page)
    expect(authenticated).toBe(false)
    
    // Call ensureLoggedOut again (should handle already logged out state)
    await ensureLoggedOut(page)
    
    // Verify still logged out
    const stillLoggedOut = await isAuthenticated(page)
    expect(stillLoggedOut).toBe(false)
  })

  test.afterEach(async () => {
    // Clean up test data for users that were used
    const usedUsers = ['user1', 'user2', 'user3', 'user4', 'user5', 'admin']
    for (const userKey of usedUsers) {
      const user = TEST_USERS[userKey as keyof typeof TEST_USERS]
      if (user) {
        await resetUserToDefaultState(user.email)
      }
    }
  })
})