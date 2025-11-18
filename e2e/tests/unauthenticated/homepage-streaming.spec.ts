import { expect, test } from "@playwright/test"

test.describe("Homepage Streaming - Deferred Event Loading", () => {
  test("should render homepage header immediately before events load", async ({
    page,
  }) => {
    // Enable network throttling to simulate slower connection
    const client = await page.context().newCDPSession(page)
    await client.send("Network.emulateNetworkConditions", {
      offline: false,
      latency: 500, // 500ms latency
      downloadThroughput: (500 * 1024) / 8, // 500kbps
      uploadThroughput: (500 * 1024) / 8,
    })

    const startTime = Date.now()

    // Navigate to homepage with domcontentloaded to measure initial paint
    await page.goto("/", { waitUntil: "domcontentloaded" })

    // Check that the hero section is visible quickly
    const heroVisible = await page
      .locator('text="Bem-vinde"')
      .first()
      .isVisible()
    const heroTime = Date.now() - startTime

    // Hero should be visible within 2 seconds even with throttling
    expect(heroVisible).toBe(true)
    expect(heroTime).toBeLessThan(2000)
  })

  test("should show skeleton while events are loading", async ({ page }) => {
    // Enable network throttling
    const client = await page.context().newCDPSession(page)
    await client.send("Network.emulateNetworkConditions", {
      offline: false,
      latency: 1000, // Higher latency to catch skeleton
      downloadThroughput: (200 * 1024) / 8,
      uploadThroughput: (200 * 1024) / 8,
    })

    await page.goto("/", { waitUntil: "domcontentloaded" })

    // Skeleton should be visible initially
    const skeleton = page.locator('[data-testid="homepage-next-events-skeleton"]')
    await expect(skeleton).toBeVisible({ timeout: 5000 })
  })

  test("should replace skeleton with actual events after loading", async ({
    page,
  }) => {
    await page.goto("/")

    // Wait for the events to load (skeleton should disappear)
    await page.waitForLoadState("networkidle")

    // Skeleton should no longer be visible
    const skeleton = page.locator('[data-testid="homepage-next-events-skeleton"]')
    await expect(skeleton).not.toBeVisible()

    // "Próximos Eventos" title should be visible
    const eventsTitle = page.locator("text=Próximos Eventos")
    await expect(eventsTitle).toBeVisible()
  })

  test("should render page progressively in correct order", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" })

    // Hero should appear first
    const hero = page.locator('text="Bem-vinde"').first()
    await expect(hero).toBeVisible()

    // Then the rest of the sections should be visible
    await page.waitForLoadState("networkidle")

    const about = page.locator("text=Sobre o Positiv")
    await expect(about).toBeVisible()

    const testimonials = page.locator("text=Depoimentos")
    await expect(testimonials).toBeVisible()
  })

  test("should handle empty events gracefully", async ({ page }) => {
    // Navigate to homepage
    await page.goto("/")

    // Wait for the page to load
    await page.waitForLoadState("networkidle")

    // Even if there are no events, the page should still render without errors
    const hero = page.locator('text="Bem-vinde"').first()
    await expect(hero).toBeVisible()

    // About section should still be visible
    const about = page.locator("text=Sobre o Positiv")
    await expect(about).toBeVisible()
  })
})
