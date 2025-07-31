import { test, expect } from '@playwright/test'

test.describe('Authenticated User Access', () => {
  // This test suite uses pre-authenticated state from setup
  test.use({ storageState: 'e2e-new/.auth/user.json' })
  
  test('user can access dashboard directly', async ({ page }) => {
    // Should be able to go straight to dashboard without login
    await page.goto('/dashboard')
    await expect(page).toHaveURL('/dashboard')
    
    // Just verify we're on dashboard - authenticated state is already confirmed by the fact we got here
  })
  
  test('user cannot see admin button or access admin area', async ({ page }) => {
    await page.goto('/dashboard')
    
    // Check header for admin button
    const header = page.locator('header')
    await expect(header).toBeVisible()
    
    // Admin button should NOT be visible
    const adminButton = page.getByRole('link', { name: /admin|administra/i })
    await expect(adminButton).not.toBeVisible()
    
    // Try to access admin area directly
    await page.goto('/admin')
    
    // Should either redirect or show error
    // Not expecting to be on /admin
    const currentUrl = page.url()
    expect(currentUrl).not.toMatch(/\/admin/)
  })
  
  test('authenticated user is redirected from login page', async ({ page }) => {
    // Already logged in, should redirect to dashboard
    await page.goto('/entrar')
    await expect(page).toHaveURL('/dashboard')
  })
})