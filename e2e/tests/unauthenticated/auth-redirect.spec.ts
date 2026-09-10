import { test, expect } from '@playwright/test'

test.describe('Authentication Required Routes', () => {
  test('unauthenticated users are redirected to login', async ({ page }) => {
    // Clear any existing auth
    await page.context().clearCookies()
    
    // Test protected routes redirect to login
    const protectedRoutes = [
      '/dashboard',
      '/admin',
      '/conta',
      // An invite arrives by message and is opened signed out more often than
      // not. Losing it at the door is the failure this guards against.
      '/convite/whatever-token'
    ]
    
    for (const route of protectedRoutes) {
      await page.goto(route)
      // The login now carries where the visitor was going, so it can put them
      // back after they sign in.
      await expect(page).toHaveURL(
        new RegExp(`/entrar\\?redirect_to=${encodeURIComponent(route)}`),
      )
    }
  })
})