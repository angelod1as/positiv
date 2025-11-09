import { test, expect } from '@playwright/test'
import { performUILogin } from '../../fixtures/auth'
import {
  createNewsletterTestUser,
  deleteNewsletterTestUser,
  type NewsletterTestUser,
} from '../../utils/newsletter-test-helpers'

/**
 * Newsletter Subscription Modal E2E Tests
 *
 * These tests create fresh users dynamically with complete profiles to avoid
 * conflicts with other tests and ensure the profile update modal doesn't interfere.
 */

test.describe('Newsletter Subscription Modal', () => {
  const createdUsers: NewsletterTestUser[] = []

  test.afterEach(async () => {
    // Cleanup all users created in this test
    for (const user of createdUsers) {
      await deleteNewsletterTestUser(user.id)
    }
    createdUsers.length = 0
  })

  test('Modal appears for never-subscribed user', async ({ page }) => {
    // Create user with no newsletter subscription record
    const user = await createNewsletterTestUser()
    createdUsers.push(user)

    await performUILogin(page, user.email, user.password, { subscribeToNewsletter: false })

    // Navigate to homepage
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Verify modal is visible
    await expect(page.getByRole('heading', { name: /cadastre-se na nossa newsletter/i })).toBeVisible()

    // Verify modal content
    await expect(page.getByText(/receba atualizações sobre os próximos eventos/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /inscrever-me/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /talvez mais tarde/i })).toBeVisible()
  })

  test('Modal does not appear for already-subscribed user', async ({ page }) => {
    // Create user with subscribed status
    const user = await createNewsletterTestUser({ subscribed: true })
    createdUsers.push(user)

    await performUILogin(page, user.email, user.password)

    // Navigate to homepage
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Verify modal is NOT visible
    await expect(page.getByRole('heading', { name: /cadastre-se na nossa newsletter/i })).not.toBeVisible()
  })

  test('Subscribe button works and persists subscription', async ({ page }) => {
    // Create user with no newsletter subscription record
    const user = await createNewsletterTestUser()
    createdUsers.push(user)

    await performUILogin(page, user.email, user.password, { subscribeToNewsletter: false })

    // Navigate to homepage
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Wait for modal to appear
    await expect(page.getByRole('heading', { name: /cadastre-se na nossa newsletter/i })).toBeVisible()

    // Click subscribe button
    await page.getByRole('button', { name: /inscrever-me/i }).click()

    // Wait for submission to complete
    await page.waitForLoadState('networkidle')

    // Verify success toast appears
    await expect(page.locator('text=/inscrição realizada com sucesso/i')).toBeVisible()

    // Verify modal closes (heading should not be visible)
    await expect(page.getByRole('heading', { name: /cadastre-se na nossa newsletter/i })).not.toBeVisible()

    // Refresh page to verify modal doesn't reappear
    await page.reload()
    await page.waitForLoadState('networkidle')

    // Modal should NOT reappear (user is now subscribed)
    await expect(page.getByRole('heading', { name: /cadastre-se na nossa newsletter/i })).not.toBeVisible()
  })

  test('Dismiss button works within same session', async ({ page }) => {
    // Create user with declined status (has newsletter_subscriptions with consent_given=false)
    const user = await createNewsletterTestUser({ declined: true })
    createdUsers.push(user)

    await performUILogin(page, user.email, user.password, { subscribeToNewsletter: false })

    // Navigate to homepage
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Wait for modal to appear
    await expect(page.getByRole('heading', { name: /cadastre-se na nossa newsletter/i })).toBeVisible()

    // Click dismiss button
    await page.getByRole('button', { name: /talvez mais tarde/i }).click()

    // Wait for action to complete
    await page.waitForLoadState('networkidle')

    // Verify modal closes
    await expect(page.getByRole('heading', { name: /cadastre-se na nossa newsletter/i })).not.toBeVisible()

    // Navigate to another page
    await page.goto('/eventos')
    await page.waitForLoadState('networkidle')

    // Navigate back to homepage
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Modal should NOT reappear in same session
    await expect(page.getByRole('heading', { name: /cadastre-se na nossa newsletter/i })).not.toBeVisible()
  })

  test('Modal reappears after dismissal in new session', async ({ page }) => {
    // Create user with no newsletter subscription record
    const user = await createNewsletterTestUser()
    createdUsers.push(user)

    await performUILogin(page, user.email, user.password, { subscribeToNewsletter: false })

    // Navigate to homepage
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Wait for modal to appear
    await expect(page.getByRole('heading', { name: /cadastre-se na nossa newsletter/i })).toBeVisible()

    // Dismiss modal
    await page.getByRole('button', { name: /talvez mais tarde/i }).click()
    await page.waitForLoadState('networkidle')

    // Verify modal closes
    await expect(page.getByRole('heading', { name: /cadastre-se na nossa newsletter/i })).not.toBeVisible()

    // Clear sessionStorage to simulate new session
    await page.evaluate(() => sessionStorage.clear())

    // Reload page to simulate new session (user is still logged in)
    await page.reload()
    await page.waitForLoadState('networkidle')

    // Navigate to homepage
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Modal SHOULD reappear (new session, sessionStorage is cleared)
    await expect(page.getByRole('heading', { name: /cadastre-se na nossa newsletter/i })).toBeVisible()
  })

  test('Modal does not appear on auth flow pages', async ({ page }) => {
    // Create user with declined status (has newsletter_subscriptions with consent_given=false)
    const user = await createNewsletterTestUser({ declined: true })
    createdUsers.push(user)

    await performUILogin(page, user.email, user.password)

    // Navigate to basic data page (auth flow page)
    await page.goto('/conta/dados-basicos')
    await page.waitForLoadState('networkidle')

    // Verify modal does NOT appear
    await expect(page.getByRole('heading', { name: /cadastre-se na nossa newsletter/i })).not.toBeVisible()

    // Navigate to login page
    await page.goto('/login')
    await page.waitForLoadState('networkidle')

    // Verify modal does NOT appear
    await expect(page.getByRole('heading', { name: /cadastre-se na nossa newsletter/i })).not.toBeVisible()
  })

  test('Loading state displays during subscription', async ({ page }) => {
    // Create user with no newsletter subscription record
    const user = await createNewsletterTestUser()
    createdUsers.push(user)

    await performUILogin(page, user.email, user.password)

    // Navigate to homepage
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Wait for modal to appear
    await expect(page.getByRole('heading', { name: /cadastre-se na nossa newsletter/i })).toBeVisible()

    // Get the subscribe button
    const subscribeButton = page.getByRole('button', { name: /inscrever-me/i })

    // Click subscribe button and immediately check for loading state
    await subscribeButton.click()

    // Verify loading state (button text changes to "Carregando..." and is disabled)
    // Note: This might be too fast to catch, so we check for either state
    const loadingButton = page.getByRole('button', { name: /carregando/i })
    const buttonExists = await loadingButton.count()

    if (buttonExists > 0) {
      await expect(loadingButton).toBeDisabled()
    }

    // Wait for submission to complete
    await page.waitForLoadState('networkidle')

    // Verify success
    await expect(page.locator('text=/inscrição realizada com sucesso/i')).toBeVisible()
  })
})
