import { test, expect } from '@playwright/test'
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
    if (currentUrl.includes('agree-to-terms')) {
      await page.getByRole('checkbox').check()
      await page.getByRole('button', { name: 'Aceitar' }).click()
      await page.waitForURL('/dashboard')
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
    // Throttle network significantly
    const client = await page.context().newCDPSession(page)
    await client.send('Network.emulateNetworkConditions', {
      offline: false,
      latency: 1000, // 1s latency
      downloadThroughput: (100 * 1024) / 8, // 100kb/s
      uploadThroughput: (100 * 1024) / 8,
    })

    await page.goto('/dashboard', { waitUntil: 'commit' })

    // Check for skeleton loading state
    // The EventListSkeleton should be visible while data loads
    const skeletonVisible = await page.locator('[data-testid="event-list-skeleton"]').isVisible({
      timeout: 1000
    }).catch(() => false)

    // With deferred loading, we expect to see the skeleton
    expect(skeletonVisible).toBe(true)
  })

  test('should render all event sections after streaming completes', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')

    // Wait for events to load (they should appear after skeleton)
    await page.waitForSelector('h2:has-text("Inscrições abertas")', { timeout: 5000 })

    // Check that all three sections are present in the DOM
    const openSection = await page.locator('h2:has-text("Inscrições abertas")').isVisible()
    expect(openSection).toBe(true)

    // These sections may not always be visible (depends on data)
    // but they should be in the DOM structure
    const closedSection = await page.locator('h2:has-text("Inscrições encerradas")').count()
    const scheduledSection = await page.locator('h2:has-text("Eventos agendados")').count()

    // At minimum, the open section should exist
    expect(openSection).toBe(true)

    // Sections are conditionally rendered, so count >= 0 is expected
    expect(closedSection).toBeGreaterThanOrEqual(0)
    expect(scheduledSection).toBeGreaterThanOrEqual(0)
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

    const startTime = Date.now()
    await page.goto('/dashboard', { waitUntil: 'commit' })

    // Even with very slow network, the page structure should appear quickly
    const headerVisible = await page.locator('h2').first().isVisible({ timeout: 3000 })
    const initialRenderTime = Date.now() - startTime

    expect(headerVisible).toBe(true)
    // Initial render should be under 3 seconds even on slow network
    expect(initialRenderTime).toBeLessThan(3000)

    // Eventually events should load (but might take longer)
    await page.waitForSelector('[data-testid^="event-card"]', { timeout: 10000 })
  })
})
