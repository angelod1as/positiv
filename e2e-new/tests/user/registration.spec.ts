import { test, expect } from '@playwright/test'
import { RegisterPage } from '../../pages/RegisterPage'
import { LoginPage } from '../../pages/LoginPage'
import { 
  generateTestEmail, 
  confirmUserEmail, 
  deleteTestUser,
  waitForUserCreation 
} from '../../fixtures/supabase-mock'
import { ensureLoggedOut, isAuthenticated } from '../../fixtures/auth'

test.describe('User Registration', () => {
  let testEmail: string
  
  test.beforeEach(async ({ page }) => {
    await ensureLoggedOut(page)
    testEmail = generateTestEmail()
  })
  
  test.afterEach(async () => {
    // Clean up test user to prevent accumulation
    if (testEmail) {
      await deleteTestUser(testEmail)
    }
  })
  
  test('complete registration flow with email confirmation', async ({ page }) => {
    const registerPage = new RegisterPage(page)
    const loginPage = new LoginPage(page)
    
    // Step 1: Navigate to registration page
    await registerPage.goto()
    await registerPage.verifyRegistrationPageDisplayed()
    
    // Step 2: Test form validation - empty fields
    await registerPage.submitButton.click()
    await registerPage.verifyFormErrors()
    
    // Step 3: Test password mismatch
    await registerPage.fillRegistrationForm(testEmail, 'password123', 'different123')
    await registerPage.submitButton.click()
    await expect(registerPage.confirmPasswordError).toContainText('As senhas não são iguais')
    
    // Step 4: Test unchecked age confirmation
    await registerPage.confirmPasswordInput.clear()
    await registerPage.confirmPasswordInput.fill('password123')
    await registerPage.over18Checkbox.uncheck({ force: true })
    await registerPage.submitButton.click()
    await expect(registerPage.over18Error).toBeVisible()
    
    // Step 5: Submit valid registration form
    await registerPage.over18Checkbox.check({ force: true })
    
    // Submit and wait for redirect
    await Promise.all([
      page.waitForURL('/', { waitUntil: 'networkidle' }),
      registerPage.submitButton.click()
    ])
    
    // Verify success message is displayed
    await expect(page.getByText('Você precisa confirmar sua conta, veja seu e-mail!')).toBeVisible()
    
    // Step 6: Wait for user to be created in database
    const userCreated = await waitForUserCreation(testEmail)
    expect(userCreated).toBe(true)
    
    // Step 7: Mock email confirmation
    await confirmUserEmail(testEmail)
    
    // Step 8: Login with the newly registered user
    await loginPage.goto()
    await loginPage.login(testEmail, 'password123')
    
    // Step 9: Verify user is logged in
    const authenticated = await isAuthenticated(page)
    expect(authenticated).toBe(true)
    
    // Should be at terms page (new users need to accept terms)
    await expect(page).toHaveURL('/conta/termos-e-condicoes')
  })
  
  test('prevent duplicate registration', async ({ page }) => {
    const registerPage = new RegisterPage(page)
    
    // First registration
    await registerPage.register(testEmail, 'password123')
    await page.waitForURL('/', { waitUntil: 'networkidle' })
    
    // Wait for user creation
    const userCreated = await waitForUserCreation(testEmail)
    expect(userCreated).toBe(true)
    
    // Try to register again with same email
    await registerPage.register(testEmail, 'password123')
    
    // Should see an error (exact message may vary)
    await expect(registerPage.generalErrorAlert).toBeVisible()
  })
  
  test('registration with weak password shows error', async ({ page }) => {
    const registerPage = new RegisterPage(page)
    
    await registerPage.goto()
    await registerPage.fillRegistrationForm(testEmail, '123', '123')
    await registerPage.submitButton.click()
    
    // Should show password validation error
    await expect(registerPage.passwordError).toContainText('A senha é muito curta')
  })
  
  test('navigation between registration and login pages', async ({ page }) => {
    const registerPage = new RegisterPage(page)
    
    // Start at registration
    await registerPage.goto()
    await expect(page).toHaveURL('/registrar')
    
    // Navigate to login
    await registerPage.loginLink.click()
    await expect(page).toHaveURL('/entrar')
    
    // Navigate back to registration
    const registerLink = page.getByRole('link', { name: 'Inscreva-se' })
    await registerLink.click()
    await expect(page).toHaveURL('/registrar')
  })
})