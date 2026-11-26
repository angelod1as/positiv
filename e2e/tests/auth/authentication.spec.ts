import { test, expect } from '@playwright/test'
import { 
  logout, 
  isAuthenticated,
  performUILogin
} from '../../fixtures/auth'
import { LoginPage } from '../../pages/LoginPage'
import { createTestUser, generateTestEmail, generateTestPassword, deleteTestUser } from '../../utils/user-management'

test.describe('Authentication Flows', () => {
  let testUsers: Array<{ id: string; email: string; password: string }> = []

  test.afterEach(async () => {
    // Clean up any users created in individual tests
    for (const user of testUsers) {
      await deleteTestUser(user.id)
    }
    testUsers = []
  })

  test('the login page shows its form', async ({ page }) => {
    const loginPage = new LoginPage(page)

    await loginPage.goto()
    await loginPage.verifyLoginPageDisplayed()
  })

  test('an empty login form asks for both fields', async ({ page }) => {
    const loginPage = new LoginPage(page)
    await loginPage.goto()

    await page.getByRole('button', { name: 'Entrar' }).click()

    await expect(loginPage.emailError).toBeVisible()
    await expect(loginPage.passwordError).toBeVisible()
  })

  test('wrong credentials are refused', async ({ page }) => {
    const loginPage = new LoginPage(page)
    await loginPage.goto()

    await loginPage.emailInput.fill('wrong@example.com')
    await loginPage.passwordInput.fill('wrongpassword')
    await page.getByRole('button', { name: 'Entrar' }).click()

    await expect(loginPage.generalErrorAlert).toBeVisible()
  })

  test('a participant logs in and is kept out of the admin area', async ({ page }) => {
    const email = generateTestEmail()
    const password = generateTestPassword()
    testUsers.push(await createTestUser(email, password))
    const loginPage = new LoginPage(page)
    await loginPage.goto()

    await loginPage.login(email, password)

    expect(await isAuthenticated(page)).toBe(true)
    const currentUrl = page.url()
    expect(currentUrl.includes('/dashboard') || currentUrl.includes('/conta/termos-e-condicoes')).toBe(true)
    await page.goto('/admin')
    await expect(page).not.toHaveURL('/admin')
  })

  test('a participant logs out to the homepage', async ({ page }) => {
    const email = generateTestEmail()
    const password = generateTestPassword()
    testUsers.push(await createTestUser(email, password))
    const loginPage = new LoginPage(page)
    await loginPage.goto()
    await loginPage.login(email, password)

    await logout(page)

    expect(await isAuthenticated(page)).toBe(false)
    await expect(page).toHaveURL('/')
  })

  test('admin authentication and access control', async ({ page }) => {
    // Create an admin user for this test
    const email = generateTestEmail()
    const password = generateTestPassword()
    const adminUser = await createTestUser(email, password, { admin: true })
    testUsers.push(adminUser)

    // Use performUILogin which handles the full onboarding flow
    await performUILogin(page, email, password, { isAdmin: true })

    // Verify authenticated
    const authenticated = await isAuthenticated(page)
    expect(authenticated).toBe(true)

    // Admin users should be redirected to /admin after login
    await expect(page).toHaveURL('/admin')
    await expect(page.getByRole('heading', { name: 'Visão geral' })).toBeVisible()
  })

  test('session persistence across page reloads', async ({ page }) => {
    // Create a user for this test
    const email = generateTestEmail()
    const password = generateTestPassword()
    const testUser = await createTestUser(email, password)
    testUsers.push(testUser)
    
    // Login
    const loginPage = new LoginPage(page)
    await loginPage.goto()
    await loginPage.login(email, password)
    
    // Verify authenticated before reload
    const authBefore = await isAuthenticated(page)
    expect(authBefore).toBe(true)
    
    // Reload page
    await page.reload()
    await page.waitForLoadState('networkidle')
    
    // Verify still authenticated
    const authenticatedAfterReload = await isAuthenticated(page)
    expect(authenticatedAfterReload).toBe(true)
    
    // Should still be on dashboard or terms page
    const url = page.url()
    expect(url.includes('/dashboard') || url.includes('/conta/termos-e-condicoes')).toBe(true)
  })
})