import { test, expect } from '@playwright/test'

test.describe('Admin-Specific Access', () => {
  // This test suite uses pre-authenticated admin state
  test.use({ storageState: 'e2e-new/.auth/admin.json' })
  
  test('admin can see admin button and access admin area', async ({ page }) => {
    await page.goto('/dashboard')
    
    // Admin button should be visible in header
    const adminButton = page.getByRole('link', { name: /admin|administra/i })
    await expect(adminButton).toBeVisible()
    
    // Click admin button to navigate to admin area
    await adminButton.click()
    await expect(page).toHaveURL('/admin')
    
    // Verify admin page loads
    await page.waitForLoadState('networkidle')
    const adminContent = await page.textContent('body')
    expect(adminContent).toBeTruthy()
  })
  
  test('admin can access admin routes directly', async ({ page }) => {
    // Should be able to go straight to admin area
    await page.goto('/admin')
    await expect(page).toHaveURL('/admin')
    
    // No redirect should occur
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveURL('/admin')
  })
})