import { test, expect } from '@playwright/test'

test.describe('Access Control and Permissions', () => {
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
      
      // Test 3: Admin area access (blocked - redirects to dashboard)
      await page.goto('/admin')
      await expect(page).toHaveURL('/dashboard')
      
      // Test 4: Direct admin sub-routes (also blocked)
      await page.goto('/admin/events')
      await expect(page).toHaveURL('/dashboard')
      
      await page.goto('/admin/participants') 
      await expect(page).toHaveURL('/dashboard')
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
      
      // Test 3: Admin sub-routes (allowed)
      await page.goto('/admin/events')
      await expect(page).toHaveURL('/admin/events')
      
      // Test 4: Account page access (allowed)
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

  test.describe('Authentication Required Routes', () => {
    test('unauthenticated users are redirected to login', async ({ page }) => {
      // Clear any existing auth
      await page.context().clearCookies()
      
      // Test protected routes redirect to login
      const protectedRoutes = [
        '/dashboard',
        '/admin',
        '/conta',
        '/admin/events'
      ]
      
      for (const route of protectedRoutes) {
        await page.goto(route)
        await expect(page).toHaveURL('/entrar')
      }
    })
  })
})