import { test, expect } from "@playwright/test"
import { loadUser } from "e2e/helpers/load-user"
import { DashboardPOM } from "e2e/poms/dashboard/dashboard.pom"
import { BdsmConsentPOM } from "e2e/poms/events/bdsm-consent.pom"
import { RulesPOM } from "e2e/poms/events/rules.pom"
import { UserDataPOM } from "e2e/poms/events/user-data.pom"
import { MailhogPOM } from "e2e/poms/mailhog/mailhog.pom"

loadUser("participant")

test.describe("BDSM Event Application Flow", () => {
  test.beforeEach(async ({ page }) => {
    // Create a BDSM event fixture in the database
    // Note: This assumes we have a seed or fixture that creates a BDSM event
    // In a real scenario, you might need to create this via API or database setup
  })

  test("Apply to BDSM event - complete flow", async ({ page }) => {
    const dashboard = new DashboardPOM(page)
    await dashboard.goto()
    
    // Navigate to a BDSM event
    // Note: This assumes the dashboard shows BDSM events
    // You might need to adjust based on how BDSM events are displayed
    await dashboard.goToEventApplication()
    
    // BDSM Consent Page - unique to BDSM events
    const bdsmConsentPage = new BdsmConsentPOM(page)
    await bdsmConsentPage.testPageElements()
    await bdsmConsentPage.verifyProhibitedPractices()
    await bdsmConsentPage.verifyPositions()
    await bdsmConsentPage.testConsentValidation()
    await bdsmConsentPage.acceptConsent()
    await bdsmConsentPage.continue()
    
    // Rules Page - same as regular events
    const rulesPage = new RulesPOM(page)
    await rulesPage.testRulesFormErrors()
    await rulesPage.fillRulesForm()
    await rulesPage.continue()
    
    // User Data Page - same as regular events
    const userDataPage = new UserDataPOM(page)
    await userDataPage.testBasicElements()
    await userDataPage.fillUserDataForm()
    await userDataPage.applyToEvent()
    
    // Verify application was successful
    await expect(page).toHaveURL(/\/dashboard/)
    
    // Cancel the application to clean up
    await dashboard.cancelApplication()
    
    // Verify email was sent
    const mailHogPage = new MailhogPOM(await page.context().newPage())
    await mailHogPage.goto()
    await mailHogPage.testBasicElements()
    await mailHogPage.testApplicationEmail()
  })

  test("Cannot proceed without accepting BDSM consent", async ({ page }) => {
    const dashboard = new DashboardPOM(page)
    await dashboard.goto()
    await dashboard.goToEventApplication()
    
    const bdsmConsentPage = new BdsmConsentPOM(page)
    
    // Try to continue without accepting consent
    await bdsmConsentPage.testConsentValidation()
    
    // Verify we're still on the consent page
    await expect(page).toHaveURL(/\/bdsm-consent$/)
    
    // Verify error message is visible
    await expect(page.getByText("Você deve aceitar para continuar")).toBeVisible()
  })

  test("BDSM test link opens in new tab", async ({ page, context }) => {
    const dashboard = new DashboardPOM(page)
    await dashboard.goto()
    await dashboard.goToEventApplication()
    
    // Listen for new page (tab) to be opened
    const pagePromise = context.waitForEvent("page")
    
    // Click the BDSM test link
    await page.getByRole("link", { name: /bdsmtest\.org/ }).click()
    
    // Get the new page
    const newPage = await pagePromise
    await newPage.waitForLoadState()
    
    // Verify the new page URL
    expect(newPage.url()).toContain("bdsmtest.org")
    
    // Close the new tab
    await newPage.close()
  })

  test("Navigation flow for BDSM events", async ({ page }) => {
    const dashboard = new DashboardPOM(page)
    await dashboard.goto()
    
    // Click on a BDSM event card
    // Note: This assumes the event card has some indicator for BDSM events
    await dashboard.goToEventApplication()
    
    // Verify we land on BDSM consent page first
    await expect(page).toHaveURL(/\/bdsm-consent$/)
    
    // Accept consent and continue
    const bdsmConsentPage = new BdsmConsentPOM(page)
    await bdsmConsentPage.acceptConsent()
    await bdsmConsentPage.continue()
    
    // Verify we're now on rules page
    await expect(page).toHaveURL(/\/regras$/)
    
    // Go back to verify navigation
    await page.goBack()
    await expect(page).toHaveURL(/\/bdsm-consent$/)
  })
})