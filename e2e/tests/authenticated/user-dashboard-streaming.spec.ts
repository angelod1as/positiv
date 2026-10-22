import { test, expect } from '@playwright/test'
import { headerCopy } from '../../../app/copy/layout'
import { completeOnboarding } from '../../fixtures/auth'
import { ensureTestUserProfileExists } from '../../utils/application-helpers'

test.describe('POS-268: Dashboard Event Streaming Tests', () => {
  let profileId: string | null

  test.beforeEach(async ({ page }) => {
    // Get the test user's profile ID
    profileId = await ensureTestUserProfileExists()
    expect(profileId).toBeTruthy()

    // Navigate to dashboard
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')

    // Check if we need to complete onboarding
    const currentUrl = page.url()
    if (currentUrl.includes('/conta/termos-e-condicoes')) {
      await completeOnboarding(page)
      await page.waitForLoadState('networkidle')
    }
  })

  test('should render dashboard header immediately before events load', async ({ page }) => {
    // Throttle network to simulate slow connection
    const client = await page.context().newCDPSession(page)
    await client.send('Network.emulateNetworkConditions', {
      offline: false,
      latency: 500, // 500ms latency
      downloadThroughput: (500 * 1024) / 8, // 500kb/s
      uploadThroughput: (500 * 1024) / 8,
    })

    // Start navigation
    const startTime = Date.now()
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' })

    // Verify header/navigation renders quickly (before full load)
    // The page structure should be visible even if events are still loading
    const headerVisible = await page.locator('h2').first().isVisible()
    const headerTime = Date.now() - startTime

    expect(headerVisible).toBe(true)

    // Header should appear in less than 2 seconds even with slow network
    // (events might still be loading)
    expect(headerTime).toBeLessThan(2000)
  })

  test('should show loading skeleton while events are streaming', async ({ page }) => {
    // On a full page load the events arrive in the same response as the page
    // around them, so the fallback lasts only as long as the server's query,
    // which locally is never long enough to see. On a client-side navigation
    // the dashboard data is a stream whose first line is the page and whose
    // later lines resolve the events: holding those back keeps the fallback on
    // screen until the test lets them through.
    await page.addInitScript(() => {
      const realFetch = window.fetch
      let release = () => {}
      const released = new Promise<void>((resolve) => {
        release = resolve
      })
      Object.assign(window, { releaseDashboardEvents: () => release() })

      window.fetch = async (input, init) => {
        const response = await realFetch(input, init)
        const url = new URL(input instanceof Request ? input.url : input, location.href)
        if (url.pathname !== '/dashboard.data' || !response.body) return response

        let pastFirstLine = false
        const holdBack = new TransformStream<Uint8Array, Uint8Array>({
          async transform(chunk, controller) {
            if (pastFirstLine) {
              await released
              controller.enqueue(chunk)
              return
            }

            const newline = chunk.indexOf(10)
            if (newline === -1) {
              controller.enqueue(chunk)
              return
            }

            pastFirstLine = true
            controller.enqueue(chunk.subarray(0, newline + 1))
            await released
            controller.enqueue(chunk.subarray(newline + 1))
          },
        })

        return new Response(response.body.pipeThrough(holdBack), response)
      }
    })

    await page.goto('/conta')
    await expect(page.locator('html')).toHaveAttribute('data-hydrated', 'true')
    await page.getByRole('link', { name: headerCopy.dashboardTitle, exact: true }).click()

    const skeleton = page.locator('[data-testid="event-list-skeleton"]')
    const eventCards = page.locator('[data-testid^="event-card"]')

    await expect(skeleton).toBeVisible()
    await expect(eventCards).toHaveCount(0)

    await page.evaluate(() =>
      (window as unknown as { releaseDashboardEvents: () => void }).releaseDashboardEvents(),
    )

    await expect(skeleton).toBeHidden()
    await expect(eventCards.first()).toBeVisible()
  })

  test('should render all event sections after streaming completes', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')

    // Wait for events to load (they should appear after skeleton)
    await page.waitForSelector('h2:has-text("Eventos em que você se candidatou")', { timeout: 5000 })

    const appliedSection = await page.locator('h2:has-text("Eventos em que você se candidatou")').isVisible()
    expect(appliedSection).toBe(true)

    const availableSection = await page.locator('h2:has-text("Eventos da Positiv")').count()
    expect(availableSection).toBeGreaterThan(0)
  })

  test('should display event cards after loading completes', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')

    // Wait for at least one event card to appear
    const eventCard = page.locator('[data-testid^="event-card"]').first()
    await expect(eventCard).toBeVisible({ timeout: 5000 })

    // Verify event card has expected content
    const cardText = await eventCard.textContent()
    expect(cardText).toBeTruthy()
    if (cardText) {
      expect(cardText.length).toBeGreaterThan(0)
    }
  })

  test('should handle slow network gracefully with streaming', async ({ page }) => {
    // Very slow network simulation
    const client = await page.context().newCDPSession(page)
    await client.send('Network.emulateNetworkConditions', {
      offline: false,
      latency: 2000, // 2s latency
      downloadThroughput: (50 * 1024) / 8, // 50kb/s (very slow)
      uploadThroughput: (50 * 1024) / 8,
    })

    await page.goto('/dashboard', { waitUntil: 'commit' })

    // Even with very slow network, the page structure should appear within
    // 3 seconds of the response starting to arrive
    await expect(page.locator('h2').first()).toBeVisible({ timeout: 3000 })

    // Eventually events should load (but might take longer)
    await page.waitForSelector('[data-testid^="event-card"]', { timeout: 10000 })
  })
})
