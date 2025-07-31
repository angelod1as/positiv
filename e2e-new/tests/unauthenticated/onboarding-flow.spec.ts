import { test, expect } from '@playwright/test'
import { loginAsUserWithOnboarding } from '../../fixtures/auth'
import { TEST_USERS } from '../../fixtures/test-users'
import { resetUserToDefaultState } from '../../utils/db-cleanup'

test.describe('Onboarding Flow - New User Journey', () => {
  test('complete onboarding flow for new users', async ({ page }) => {
    // Reset user to simulate first-time login
    await resetUserToDefaultState(TEST_USERS.user4.email)
    
    // Go through full onboarding flow
    await loginAsUserWithOnboarding(page, 'user4')
    
    // Verify user ends up at dashboard after onboarding
    await expect(page).toHaveURL('/dashboard')
    
    // Verify subsequent login skips onboarding
    await page.context().clearCookies()
    await page.evaluate(() => {
      localStorage.clear()
      sessionStorage.clear()
    })
    
    // Login again - should go straight to dashboard
    await page.goto('/entrar')
    const emailInput = page.getByRole('textbox', { name: 'E-mail' })
    const passwordInput = page.getByLabel('Senha')
    const submitButton = page.getByRole('button', { name: 'Entrar' })
    
    await emailInput.fill(TEST_USERS.user4.email)
    await passwordInput.fill(TEST_USERS.user4.password)
    
    await Promise.all([
      page.waitForNavigation({ url: /dashboard$/, waitUntil: 'networkidle' }),
      submitButton.click()
    ])
    
    // Should go straight to dashboard, no onboarding
    await expect(page).toHaveURL('/dashboard')
  })
})