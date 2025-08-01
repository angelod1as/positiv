import { test, expect } from '@playwright/test'

test.describe('Admin Access Control', () => {
  test.use({ storageState: 'e2e-new/.auth/admin.json' })

  test('admin has full access to all areas', async ({ page }) => {
    // Test 1: Dashboard access (allowed)
    await page.goto('/dashboard')
    await expect(page).toHaveURL('/dashboard')
    
    // Test 2: Admin panel access (allowed)
    await page.goto('/admin')
    await expect(page).toHaveURL('/admin')
    
    // Verify admin panel content
    await expect(page.getByRole('heading', { name: 'Visão geral' })).toBeVisible()
    await expect(page.getByText('Eventos')).toBeVisible()
    
    // Test 3: Account page access (allowed)
    await page.goto('/conta')
    await expect(page).toHaveURL('/conta')
  })

  test('admin navigation shows all menu items', async ({ page }) => {
    await page.goto('/dashboard')
    
    // Admin should see user menu
    const userAvatar = page.locator('[data-testid="user-avatar"]').or(
      page.getByRole('button', { name: /menu do usuário/i })
    )
    await expect(userAvatar).toBeVisible()
    
    // Admin link should be visible in navigation or menu
    const adminLink = page.getByRole('link', { name: /admin|painel/i })
    const adminLinkVisible = await adminLink.isVisible().catch(() => false)
    
    // If not immediately visible, might be in dropdown menu
    if (!adminLinkVisible) {
      await userAvatar.click()
      await expect(adminLink).toBeVisible()
    } else {
      await expect(adminLink).toBeVisible()
    }
  })
})