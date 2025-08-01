import { test, expect } from '@playwright/test'

test.describe('Authentication Required Routes', () => {
  test('unauthenticated users are redirected to login', async ({ page }) => {
    // Clear any existing auth
    await page.context().clearCookies()
    
    // Test protected routes redirect to login
    const protectedRoutes = [
      '/dashboard',
      '/admin',
      '/conta'
    ]
    
    for (const route of protectedRoutes) {
      await page.goto(route)
      await expect(page).toHaveURL('/entrar')
    }
  })
})