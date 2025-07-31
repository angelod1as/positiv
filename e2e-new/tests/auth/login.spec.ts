import { test, expect } from '@playwright/test'
import { 
  loginAsUser, 
  loginAsAdmin, 
  logout, 
  ensureLoggedOut,
  isAuthenticated
} from '../../fixtures/auth'
import { TEST_USERS } from '../../fixtures/test-users'
import { resetUserToDefaultState } from '../../utils/db-cleanup'

test.describe('Authentication Flow Tests', () => {
  test.beforeEach(async ({ page }) => {
    await ensureLoggedOut(page)
  })

  test('user login flow with auth utilities', async ({ page }) => {
    // Test user login
    await loginAsUser(page, 'user1')
    
    // Verify we're authenticated (without email check for now)
    const authenticated = await isAuthenticated(page)
    expect(authenticated).toBe(true)
    
    // Verify we're on dashboard
    await expect(page).toHaveURL('/dashboard')
    
    // Verify user cannot access admin area
    await page.goto('/admin')
    // User should be redirected away from admin - could be to dashboard or homepage
    await expect(page).not.toHaveURL('/admin')
    
    // Test logout
    await logout(page)
    
    // Verify we're logged out
    const loggedOut = await isAuthenticated(page)
    expect(loggedOut).toBe(false)
    
    // Verify we're back on homepage
    await expect(page).toHaveURL('/')
  })

  test('admin login flow with auth utilities', async ({ page }) => {
    // Test admin login
    await loginAsAdmin(page)
    
    // Verify we're authenticated (without email check for now)
    const authenticated = await isAuthenticated(page)
    expect(authenticated).toBe(true)
    
    // Verify we're on dashboard
    await expect(page).toHaveURL('/dashboard')
    
    // Verify admin can access admin area
    await page.goto('/admin')
    await expect(page).toHaveURL('/admin')
    await expect(page.getByRole('heading', { name: 'Visão geral' })).toBeVisible()
    
    // Test logout
    await logout(page)
    
    // Verify we're logged out
    const loggedOut = await isAuthenticated(page)
    expect(loggedOut).toBe(false)
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
    
    // Just verify still authenticated
    
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

  test('ensureLoggedOut works correctly', async ({ page }) => {
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