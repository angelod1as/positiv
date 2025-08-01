import { test, expect } from '@playwright/test'

test.describe('User Access Control', () => {
  test.use({ storageState: 'e2e-new/.auth/user.json' })

  test('user can access allowed areas and is blocked from admin areas', async ({ page }) => {
    // Test 1: Direct dashboard access (allowed)
    await page.goto('/dashboard')
    await expect(page).toHaveURL('/dashboard')
    
    // Verify dashboard content is visible
    const dashboardHeading = page.getByRole('heading').first()
    await expect(dashboardHeading).toBeVisible()
    
    // Test 2: Account page access (allowed)
    await page.goto('/conta')
    await expect(page).toHaveURL('/conta')
    
    // Test 3: Admin area access (blocked - redirects away from admin)
    await page.goto('/admin')
    await expect(page).not.toHaveURL('/admin')
  })

  test('user navigation shows correct menu items', async ({ page }) => {
    await page.goto('/dashboard')
    
    // User should see user menu but not admin menu
    const userAvatar = page.locator('[data-testid="user-avatar"]').or(
      page.getByRole('button', { name: /menu do usuário/i })
    )
    await expect(userAvatar).toBeVisible()
    
    // Admin link should not be visible in navigation
    const adminLink = page.getByRole('link', { name: /admin/i })
    await expect(adminLink).not.toBeVisible()
  })
})