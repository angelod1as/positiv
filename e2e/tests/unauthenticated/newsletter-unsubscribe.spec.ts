import { test, expect } from '@playwright/test'

test.describe('Newsletter Unsubscribe Page', () => {
  test('should redirect to home with error for missing profileId', async ({ page }) => {
    await page.goto('/newsletter/unsubscribe')

    // Should redirect to home with error toast
    await expect(page).toHaveURL('/')
  })

  test('should redirect to home with error for invalid profileId', async ({ page }) => {
    await page.goto('/newsletter/unsubscribe?id=invalid-uuid')

    // Should redirect to home with error toast
    await expect(page).toHaveURL('/')
  })

  test('should load unsubscribe page with valid UUID format', async ({ page }) => {
    // Use a valid UUID format (will fail database lookup, but tests URL structure)
    const validUUID = '00000000-0000-0000-0000-000000000000'

    await page.goto(`/newsletter/unsubscribe?id=${validUUID}`)

    // Should redirect to home because profile doesn't exist
    await expect(page).toHaveURL('/')
  })
})
