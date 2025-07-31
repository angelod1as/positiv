import { test, expect } from '@playwright/test'
import { LoginPage } from '../../pages/LoginPage'
import { TEST_USERS } from '../../fixtures/test-users'

test.describe('Login Page Tests - Simple', () => {
  test('can navigate to login page and see form elements', async ({ page }) => {
    const loginPage = new LoginPage(page)
    await loginPage.goto()
    
    // Check basic elements are visible
    await expect(page.getByRole('textbox', { name: 'E-mail' })).toBeVisible()
    await expect(page.getByRole('textbox', { name: 'Senha' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Entrar' })).toBeVisible()
  })
  
  test('shows validation error for empty password', async ({ page }) => {
    const loginPage = new LoginPage(page)
    await loginPage.goto()
    
    await loginPage.emailInput.fill('test@example.com')
    await page.getByRole('button', { name: 'Entrar' }).click()
    
    // Check for password error - use a more specific locator
    const passwordError = page.locator('#errors-for-password').filter({ hasText: 'Insira pelo menos um caracter' })
    await expect(passwordError).toBeVisible()
  })
  
  test('shows error for invalid credentials', async ({ page }) => {
    const loginPage = new LoginPage(page)
    await loginPage.goto()
    
    await loginPage.emailInput.fill('wrong@example.com')
    await loginPage.passwordInput.fill('wrongpassword')
    await page.getByRole('button', { name: 'Entrar' }).click()
    
    // Check for error alert - filter for the general error message
    const errorAlert = page.getByRole('alert').filter({ hasText: 'Credenciais inválidas' })
    await expect(errorAlert).toBeVisible()
  })
  
  test('admin can login successfully', async ({ page }) => {
    const loginPage = new LoginPage(page)
    
    // Use the login method from LoginPage
    await loginPage.login(TEST_USERS.admin.email, TEST_USERS.admin.password)
    
    // Should be at dashboard or terms page (if profile not complete)
    const currentUrl = page.url()
    expect(currentUrl.includes('/dashboard') || currentUrl.includes('/conta/termos-e-condicoes')).toBe(true)
  })
})