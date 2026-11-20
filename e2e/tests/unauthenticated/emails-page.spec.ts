import { test, expect } from '@playwright/test'

// WEB-53: the old footer link carried a bare profile id that unsubscribed
// whoever held it. It now opens nothing: it redirects to Seus e-mails, which
// asks for a login without a valid token.
test.describe('Seus e-mails without a login', () => {
  test('the old unsubscribe link no longer opens anything with a bare profile id', async ({ page }) => {
    await page.goto('/newsletter/unsubscribe?id=00000000-0000-4000-8000-000000000000')

    await expect(page).toHaveURL(/\/entrar\?redirect_to=%2Femails$/)
  })

  test('a token that opens nothing asks for a login', async ({ page }) => {
    await page.goto('/emails?t=not-a-token')

    await expect(page).toHaveURL(/\/entrar\?redirect_to=%2Femails%3Ft%3Dnot-a-token$/)
  })
})
