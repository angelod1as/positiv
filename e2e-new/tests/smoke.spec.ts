import { test, expect } from "@playwright/test"

test.describe("Smoke Test", () => {
  test("app loads successfully", async ({ page }) => {
    // Navigate to the home page
    await page.goto("/")

    // Wait for the page to be fully loaded
    await page.waitForLoadState("networkidle")

    // Verify the page title contains "Positiv"
    await expect(page).toHaveTitle(/Positiv/i)

    // Check for the Positiv logo
    const logo = page.locator("img[alt*='Positiv']").first()
    await expect(logo).toBeVisible({ timeout: 10000 })

    // Verify there are no console errors
    const consoleErrors: string[] = []
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text())
      }
    })

    // Give the page a moment to potentially log errors
    await page.waitForTimeout(1000)

    // Assert no console errors
    expect(consoleErrors).toHaveLength(0)

    // Verify the main navigation or header is present
    const header = page.locator("header").first()
    await expect(header).toBeVisible()

    // Check that we can see some content on the page
    // The app might use main, div#root, or other containers
    const bodyContent = page.locator("body")
    await expect(bodyContent).toBeVisible()
    
    // Verify there's actual content rendered
    const pageContent = await page.textContent("body")
    expect(pageContent).toBeTruthy()
    expect(pageContent?.length ?? 0).toBeGreaterThan(100) // Should have substantial content
  })

  test("navigation links are accessible", async ({ page }) => {
    await page.goto("/")
    await page.waitForLoadState("networkidle")

    // Check for login/register links (common in most apps)
    const loginLink = page.locator("a", { hasText: /login|entrar/i }).first()
    const registerLink = page.locator("a", { hasText: /register|cadastr/i }).first()

    // At least one auth link should be visible
    const authLinksVisible = 
      (await loginLink.isVisible().catch(() => false)) ||
      (await registerLink.isVisible().catch(() => false))
    
    expect(authLinksVisible).toBe(true)
  })
})