import { test, expect } from '@playwright/test'
import { LoginPage } from '../../pages/LoginPage'
import { TEST_USERS } from '../../fixtures/test-users'
import { ensureLoggedOut } from '../../fixtures/auth'
import { setupUserAsFullyOnboarded, resetUserToDefaultState } from '../../utils/db-cleanup'

test.describe('Login Page - POM Tests', () => {
  let loginPage: LoginPage
  
  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page)
    await ensureLoggedOut(page)
  })
  
  test('displays all login page elements correctly', async () => {
    await loginPage.goto()
    await loginPage.verifyLoginPageDisplayed()
  })
  
  test('shows validation error when submitting empty form', async () => {
    await loginPage.goto()
    await loginPage.submitEmptyForm()
    
    // Should show password validation error
    const passwordError = await loginPage.getPasswordErrorMessage()
    expect(passwordError).toContain('Insira pelo menos um caracter')
  })
  
  test('shows validation error when password is missing', async () => {
    await loginPage.goto()
    await loginPage.submitWithEmailOnly('valid@email.com')
    
    // Should show password validation error
    const passwordError = await loginPage.getPasswordErrorMessage()
    expect(passwordError).toContain('Insira pelo menos um caracter')
  })
  
  test('shows error message for invalid credentials', async () => {
    await loginPage.goto()
    await loginPage.fillLoginForm('wrong@email.com', 'wrongpassword')
    await loginPage.submitForm()
    
    // Should show general error alert
    const errorMessage = await loginPage.getGeneralErrorMessage()
    expect(errorMessage).toContain('Credenciais inválidas')
    
    // Should still be on login page
    await expect(loginPage['page']).toHaveURL(/entrar/)
  })
  
  test('admin can login successfully', async () => {
    await loginPage.goto()
    
    // Admin goes straight to dashboard
    await loginPage.loginAndWaitForDashboard(
      TEST_USERS.admin.email, 
      TEST_USERS.admin.password
    )
    
    // Verify we're logged in
    const isLoggedIn = await loginPage.isLoggedIn()
    expect(isLoggedIn).toBe(true)
    
    // Verify correct user
    const currentEmail = await loginPage.getCurrentUserEmail()
    expect(currentEmail).toBe(TEST_USERS.admin.email)
  })
  
  test('user with profile data can login successfully', async () => {
    // Ensure user has profile data to skip onboarding
    await setupUserAsFullyOnboarded(TEST_USERS.user1.email)
    
    await loginPage.goto()
    
    // User with profile goes straight to dashboard
    await loginPage.loginAndWaitForDashboard(
      TEST_USERS.user1.email, 
      TEST_USERS.user1.password
    )
    
    // Verify we're logged in
    const isLoggedIn = await loginPage.isLoggedIn()
    expect(isLoggedIn).toBe(true)
    
    // Verify correct user
    const currentEmail = await loginPage.getCurrentUserEmail()
    expect(currentEmail).toBe(TEST_USERS.user1.email)
  })
  
  test('new user is redirected to terms page', async () => {
    // Reset user to ensure they need onboarding
    await resetUserToDefaultState(TEST_USERS.user5.email)
    
    await loginPage.goto()
    
    // New user should go to terms page
    await loginPage.loginAndWaitForTerms(
      TEST_USERS.user5.email,
      TEST_USERS.user5.password
    )
    
    // Verify we're logged in even though on terms page
    const isLoggedIn = await loginPage.isLoggedIn()
    expect(isLoggedIn).toBe(true)
  })
  
  test('logged in user is redirected from login page', async ({ page }) => {
    // First login
    await setupUserAsFullyOnboarded(TEST_USERS.user2.email)
    await loginPage.loginAndWaitForDashboard(
      TEST_USERS.user2.email,
      TEST_USERS.user2.password
    )
    
    // Try to access login page while logged in
    await loginPage.goto()
    
    // Should redirect to dashboard
    await expect(page).toHaveURL(/dashboard/)
  })
  
  test('can clear form fields', async () => {
    await loginPage.goto()
    
    // Fill form
    await loginPage.fillLoginForm('test@example.com', 'password123')
    
    // Clear form
    await loginPage.clearForm()
    
    // Verify fields are empty
    const emailInput = await loginPage['page'].getByRole('textbox', { name: 'E-mail' })
    const passwordInput = await loginPage['page'].getByRole('textbox', { name: 'Senha' })
    
    await expect(emailInput).toHaveValue('')
    await expect(passwordInput).toHaveValue('')
  })
  
  test('multiple login attempts with retry mechanism', async () => {
    await loginPage.goto()
    
    // First attempt - wrong password
    await loginPage.fillLoginForm(TEST_USERS.user3.email, 'wrongpassword')
    await loginPage.submitForm()
    
    // Should show error
    const errorMessage = await loginPage.getGeneralErrorMessage()
    expect(errorMessage).toContain('Credenciais inválidas')
    
    // Clear and try again with correct password
    await loginPage.clearForm()
    await setupUserAsFullyOnboarded(TEST_USERS.user3.email)
    await loginPage.loginAndWaitForDashboard(
      TEST_USERS.user3.email,
      TEST_USERS.user3.password
    )
    
    // Should be logged in now
    const isLoggedIn = await loginPage.isLoggedIn()
    expect(isLoggedIn).toBe(true)
  })
})