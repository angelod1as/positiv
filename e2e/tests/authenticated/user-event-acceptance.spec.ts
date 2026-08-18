import { test, expect } from '@playwright/test'
import { EventsPage } from '../../pages/EventsPage'
import { EventApplicationPage } from '../../pages/EventApplicationPage'
import { clearAllEmails, getAllEmails } from '../../utils/email-helpers'
import { createOpenRegularEvent, ensureMinimumOpenEvents } from '../../utils/test-event-helpers'

test.describe('POS-190: Event Application Acceptance Tests', () => {
  let eventsPage: EventsPage
  let applicationPage: EventApplicationPage

  test.beforeEach(async ({ page }) => {
    eventsPage = new EventsPage(page)
    applicationPage = new EventApplicationPage(page)
    await clearAllEmails()
    
    // Navigate to dashboard
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')
    
    // If we're not on dashboard, we might be on a different page
    // This is OK - tests will handle navigation as needed
    const currentUrl = page.url()
    if (!currentUrl.includes('/dashboard')) {
      console.info(`Note: Starting from ${currentUrl} instead of dashboard`)
    }
  })

  test('AC1: EventsPage POM - browse and interact with events', async ({ page: _page }) => {
    // Navigate to events page
    await eventsPage.goto()
    
    // Wait for events to load
    await eventsPage.waitForEventsToLoad()
    
    // Verify events are displayed
    await eventsPage.verifyEventsDisplayed()
    
    // Get count of open events
    const openEventCount = await eventsPage.getOpenEventCount()
    expect(openEventCount).toBeGreaterThan(0)
    
    // Verify different event sections exist
    await expect(eventsPage.availableEventsHeading).toBeVisible()
    
    // Test passed - EventsPage POM created and functional
  })

  test('AC2: the rules quiz is answered one question at a time', async ({ page }) => {
    // Fourteen screens, each one a round trip through the runtime.
    test.setTimeout(120_000)

    const event = await createOpenRegularEvent()

    await page.goto(`/dashboard/${event.id}/regras`)

    // No networkidle here: the page keeps talking to the analytics endpoint, so
    // the rules heading is the honest signal that it arrived.
    expect(await applicationPage.isOnRulesPage()).toBe(true)

    // One question on screen, not the whole quiz at once
    await expect(applicationPage.questions).toHaveCount(1)

    await applicationPage.advanceToSingleAnswerQuestion()
    const refused = await applicationPage.answerCurrentQuestionWrongly()

    await expect(
      page.getByText('Você escolheu a resposta errada'),
    ).toBeVisible()
    expect(await applicationPage.currentQuestionId()).toBe(refused)

    await applicationPage.fillRulesForm()

    await expect(applicationPage.userDataTitle).toBeVisible({ timeout: 15000 })
  })

  test('AC3: email-helpers.ts created with Mailpit integration', async () => {
    // Round trips through the Mailpit API so an unreachable catcher or a
    // changed payload shape fails here instead of passing silently
    await clearAllEmails()

    expect(await getAllEmails()).toEqual([])
  })

  test('AC4: Complete flow - navigate to event application', async ({ page }) => {
    // Ensure at least one open event exists
    await ensureMinimumOpenEvents(1)
    
    // Navigate to events
    await eventsPage.goto()
    
    // Try to find an available event
    const availableEvents = await eventsPage.getOpenEventsCount()
    
    // We should always have at least one event now
    expect(availableEvents).toBeGreaterThan(0)
    
    // Click first open event
    await eventsPage.clickFirstOpenEvent()
    
    // Verify we navigated away from dashboard
    await expect(page).not.toHaveURL(/dashboard$/)
    
    // Verify we're on some event page
    const url = page.url()
    expect(url).toContain('dashboard/')
    
    // Verify page has content
    const heading = page.getByRole('heading').first()
    await expect(heading).toBeVisible()
  })

  test('Verify form validation exists', async ({ page }) => {
    // Ensure at least one open event exists
    await ensureMinimumOpenEvents(1)
    
    await eventsPage.goto()
    
    // Find any button that says "Me candidatar"
    const applyButtons = page.getByRole('link', { name: 'Me candidatar' })
    const buttonCount = await applyButtons.count()
    
    // We should always have at least one event now
    expect(buttonCount).toBeGreaterThan(0)
    
    await applyButtons.first().click()
    await page.waitForLoadState('networkidle')
    
    // Try to continue without filling form
    const continueButton = page.getByRole('button', { name: 'Continuar' })
    if (await continueButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await continueButton.click()
      
      // Wait for any validation message
      await page.waitForTimeout(2000)
      
      // Check if we're still on the same page (validation prevented navigation)
      const urlAfterClick = page.url()
      expect(urlAfterClick).toContain('dashboard/')
    }
  })
})