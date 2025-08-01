import { test, expect } from '@playwright/test'
import { LoginPage } from '../../pages/LoginPage'

test.describe('Onboarding Flow - New User Journey', () => {
  test('validates onboarding flow elements', async ({ page }) => {
    // Navigate to login page
    await page.goto('/entrar')
    const loginPage = new LoginPage(page)
    
    // Verify login page is loaded
    await expect(loginPage.emailInput).toBeVisible()
    await expect(loginPage.passwordInput).toBeVisible()
    await expect(loginPage.submitButton).toBeVisible()
    
    // Verify forgot password text exists
    const forgotPasswordText = page.getByText('Esqueci minha senha')
    await expect(forgotPasswordText).toBeVisible()
    
    // Verify register link exists for new users
    const registerLink = page.getByRole('link', { name: /inscreva-se/i })
    await expect(registerLink).toBeVisible()
    
    // Click register link
    await registerLink.click()
    await expect(page).toHaveURL('/registrar')
    
    // Verify registration page elements
    await expect(page.getByText('Inscreva-se')).toBeVisible()
    await expect(page.getByRole('textbox', { name: /e-mail/i })).toBeVisible()
    await expect(page.getByLabel('Senha', { exact: true })).toBeVisible()
    await expect(page.getByLabel('Confirme a senha')).toBeVisible()
    await expect(page.getByRole('checkbox', { name: /sou maior de 18 anos/i })).toBeVisible()
    
    // Go back to login using the header button
    const loginButton = page.getByRole('link', { name: 'Entrar' })
    await expect(loginButton).toBeVisible()
    await loginButton.click()
    await expect(page).toHaveURL('/entrar')
  })
})