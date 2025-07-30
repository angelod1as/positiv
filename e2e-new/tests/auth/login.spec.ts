import { test, expect } from '@playwright/test'
import { 
  loginAsUser, 
  logout, 
  ensureLoggedOut,
  isAuthenticated,
  getCurrentUserEmail
} from '../../fixtures/auth'
import { TEST_USERS } from '../../fixtures/test-users'
import { resetUserToDefaultState } from '../../utils/db-cleanup'

const DASHBOARD_URL = '/dashboard'

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    await ensureLoggedOut(page)
  })

  test('user can login successfully', async ({ page }) => {
    const user = TEST_USERS.user1
    
    await page.goto('/entrar')
    await expect(page).toHaveTitle(/Entrar/)
    
    const emailInput = page.getByRole('textbox', { name: 'E-mail' })
    const passwordInput = page.getByRole('textbox', { name: 'Senha' })
    const submitButton = page.getByRole('button', { name: 'Entrar' })
    
    await expect(emailInput).toBeVisible()
    await expect(passwordInput).toBeVisible()
    await expect(submitButton).toBeVisible()
    
    await loginAsUser(page, 'user1')
    
    const authenticated = await isAuthenticated(page)
    expect(authenticated).toBe(true)
    
    const currentEmail = await getCurrentUserEmail(page)
    expect(currentEmail).toBe(user.email)
    
    expect(page.url()).toMatch(/dashboard$/)
  })

  test('admin can login successfully', async ({ page }) => {
    const admin = TEST_USERS.admin
    
    await page.goto('/entrar')
    await expect(page).toHaveTitle(/Entrar/)
    
    const emailInput = page.getByRole('textbox', { name: 'E-mail' })
    const passwordInput = page.getByRole('textbox', { name: 'Senha' })
    const submitButton = page.getByRole('button', { name: 'Entrar' })
    
    await expect(emailInput).toBeVisible()
    await expect(passwordInput).toBeVisible()
    await expect(submitButton).toBeVisible()
    
    await emailInput.fill(admin.email)
    await passwordInput.fill(admin.password)
    
    await Promise.all([
      page.waitForNavigation({ url: DASHBOARD_URL, waitUntil: 'networkidle' }),
      submitButton.click()
    ])
    
    await expect(page).toHaveURL(/dashboard$/)
    
    const authenticated = await isAuthenticated(page)
    expect(authenticated).toBe(true)
    
    const currentEmail = await getCurrentUserEmail(page)
    expect(currentEmail).toBe(admin.email)
  })

  test('logout clears session completely', async ({ page }) => {
    await loginAsUser(page, 'user2')
    
    const authenticatedBefore = await isAuthenticated(page)
    expect(authenticatedBefore).toBe(true)
    
    await logout(page)
    
    const authenticatedAfter = await isAuthenticated(page)
    expect(authenticatedAfter).toBe(false)
    
    await page.goto('/dashboard')
    await expect(page).toHaveURL('/entrar')
    
    const emailAfterLogout = await getCurrentUserEmail(page)
    expect(emailAfterLogout).toBeNull()
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
    const user = TEST_USERS.user3
    await loginAsUser(page, 'user3')
    
    const authenticatedBefore = await isAuthenticated(page)
    expect(authenticatedBefore).toBe(true)
    
    const emailBefore = await getCurrentUserEmail(page)
    expect(emailBefore).toBe(user.email)
    
    await page.reload()
    await page.waitForLoadState('networkidle')
    
    const authenticatedAfter = await isAuthenticated(page)
    expect(authenticatedAfter).toBe(true)
    
    const emailAfter = await getCurrentUserEmail(page)
    expect(emailAfter).toBe(user.email)
    
    expect(page.url()).toMatch(/dashboard$/)
  })

  test('handles terms acceptance flow for new users', async ({ page }) => {
    await resetUserToDefaultState(TEST_USERS.user4.email)
    
    await page.goto('/entrar')
    
    const emailInput = page.getByRole('textbox', { name: 'E-mail' })
    const passwordInput = page.getByRole('textbox', { name: 'Senha' })
    const submitButton = page.getByRole('button', { name: 'Entrar' })
    
    await emailInput.fill(TEST_USERS.user4.email)
    await passwordInput.fill(TEST_USERS.user4.password)
    await submitButton.click()
    
    await expect(page).toHaveURL('/termos-e-condicoes')
    
    const agreeButton = page.getByRole('button', { name: 'Li e concordo' })
    await expect(agreeButton).toBeVisible()
    
    await agreeButton.click()
    
    await expect(page).toHaveURL('/dashboard')
    
    const authenticated = await isAuthenticated(page)
    expect(authenticated).toBe(true)
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
    
    await page.goto('/entrar')
    await expect(page).toHaveURL('/dashboard')
  })
})

// TODO POS-187: Enable when user auth is fixed
// test.describe('Authentication with storage state', () => {
//   test.use({ storageState: 'e2e-new/.auth/user.json' })
//   
//   test('pre-authenticated user can access dashboard directly', async ({ page }) => {
//     await page.goto('/dashboard')
//     await expect(page).toHaveURL('/dashboard')
//     
//     const authenticated = await isAuthenticated(page)
//     expect(authenticated).toBe(true)
//   })
// })

test.describe('Admin authentication with storage state', () => {
  test.use({ storageState: 'e2e-new/.auth/admin.json' })
  
  test('pre-authenticated admin can access dashboard directly', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL('/dashboard')
    
    const authenticated = await isAuthenticated(page)
    expect(authenticated).toBe(true)
    
    const email = await getCurrentUserEmail(page)
    expect(email).toBe(TEST_USERS.admin.email)
  })
})