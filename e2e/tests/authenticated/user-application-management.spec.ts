import { test, expect, type Page } from '@playwright/test'
import { completeOnboarding } from '../../fixtures/auth'
import { MyApplicationsPage } from '../../pages/MyApplicationsPage'
import { EventApplicationPage } from '../../pages/EventApplicationPage'
import {
  createTestApplication,
  deleteTestApplication,
  verifyApplicationExists,
  verifyApplicationCanceled,
  getFirstOpenEvent,
  ensureEventIsOpen,
  ensureEventIsClosed,
  getApplicationState,
  ensureTestUserProfileExists,
  applyAsParticipant,
  cancelAsParticipant
} from '../../utils/application-helpers'
import { ensureMinimumOpenEvents } from '../../utils/test-event-helpers'
import { createClosedEventSoon, seedInvite } from '../../utils/invite-helpers'

test.describe('POS-191: Application Management Tests', () => {
  let myApplicationsPage: MyApplicationsPage
  let testEvent: { id: string; title: string } | null
  let profileId: string | null
  const createdApplications: Array<{ profileId: string; eventId: string }> = []

  test.beforeEach(async ({ page }) => {
    myApplicationsPage = new MyApplicationsPage(page)

    // Get the test user's profile ID
    profileId = await ensureTestUserProfileExists()
    expect(profileId).toBeTruthy()

    // Navigate to dashboard
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')

    // Check if we need to complete onboarding
    const currentUrl = page.url()
    if (currentUrl.includes('/conta/termos-e-condicoes')) {
      // Complete onboarding
      await completeOnboarding(page)
      await page.waitForLoadState('networkidle')
    }

    // Get or create an open event
    testEvent = await getFirstOpenEvent()
    if (!testEvent) {
      throw new Error('No open events available for testing')
    }

    // Ensure the event is open for applications
    await ensureEventIsOpen(testEvent.id)
  })

  test.afterEach(async () => {
    // Cleanup all applications created during this test
    for (const app of createdApplications) {
      await deleteTestApplication(app.profileId, app.eventId)
    }
    createdApplications.length = 0
  })

  test('an application shows as applied on the dashboard', async ({ page: _page }) => {
    expect(profileId).toBeTruthy()
    expect(testEvent).toBeTruthy()
    if (!profileId || !testEvent) return

    await applyAsParticipant(profileId, testEvent.id)
    createdApplications.push({ profileId, eventId: testEvent.id })

    await myApplicationsPage.goto()
    await myApplicationsPage.waitForApplicationStatusChange(testEvent.title, 'applied')

    const status = await myApplicationsPage.getApplicationStatus(testEvent.title)
    expect(status).toBe('applied')

    const appExists = await verifyApplicationExists(profileId, testEvent.id)
    expect(appExists).toBe(true)
  })

  test('cancelling with a reason withdraws the application and keeps the reason', async ({ page: _page }) => {
    expect(profileId).toBeTruthy()
    expect(testEvent).toBeTruthy()
    if (!profileId || !testEvent) return

    await applyAsParticipant(profileId, testEvent.id)
    createdApplications.push({ profileId, eventId: testEvent.id })

    await myApplicationsPage.goto()
    await myApplicationsPage.waitForApplicationStatusChange(testEvent.title, 'applied')

    await myApplicationsPage.cancelApplication(testEvent.title, { reason: 'Vou viajar nesse fim de semana' })

    await myApplicationsPage.waitForApplicationStatusChange(testEvent.title, 'not-applied')
    const canceledStatus = await myApplicationsPage.getApplicationStatus(testEvent.title)
    expect(canceledStatus).toBe('not-applied')

    const isCanceled = await verifyApplicationCanceled(profileId, testEvent.id)
    expect(isCanceled).toBe(true)

    const canceledApp = await getApplicationState(profileId, testEvent.id)
    expect(canceledApp?.cancellation_date).toBeTruthy()
    expect(canceledApp?.is_user_applied).toBe(false)
    expect(canceledApp?.cancellation_reason).toBe('Vou viajar nesse fim de semana')
  })

  test('applying again after a cancellation shows the event as applied', async ({ page: _page }) => {
    expect(profileId).toBeTruthy()
    expect(testEvent).toBeTruthy()
    if (!profileId || !testEvent) return

    await applyAsParticipant(profileId, testEvent.id)
    createdApplications.push({ profileId, eventId: testEvent.id })
    await cancelAsParticipant(profileId, testEvent.id, 'Vou viajar nesse fim de semana')

    // Applying is walked on screen by the account-vs-event-registration spec;
    // here only what the dashboard makes of a second application is at stake.
    await applyAsParticipant(profileId, testEvent.id)

    await myApplicationsPage.goto()

    await myApplicationsPage.waitForApplicationStatusChange(testEvent.title, 'applied')
    const reappliedStatus = await myApplicationsPage.getApplicationStatus(testEvent.title)
    expect(reappliedStatus).toBe('applied')

    const reappliedAppExists = await verifyApplicationExists(profileId, testEvent.id)
    expect(reappliedAppExists).toBe(true)

    const reappliedApp = await getApplicationState(profileId, testEvent.id)
    expect(reappliedApp?.is_user_applied).toBe(true)
  })

  test('Handle multiple applications', async ({ page: _page }) => {
    // Check prerequisites
    expect(profileId).toBeTruthy()
    expect(testEvent).toBeTruthy()
    if (!profileId || !testEvent) return
    
    // Ensure we have at least 2 open events
    const openEvents = await ensureMinimumOpenEvents(2)
    expect(openEvents.length).toBeGreaterThanOrEqual(2)
    
    // Get the second event (find one that's not our test event)
    const secondEvent = openEvents.find(e => testEvent && e.id !== testEvent.id) || openEvents[1]
    
    // Create applications for both events
    await createTestApplication(profileId, testEvent.id)
    createdApplications.push({ profileId, eventId: testEvent.id })
    await createTestApplication(profileId, secondEvent.id)
    createdApplications.push({ profileId, eventId: secondEvent.id })

    // Navigate to dashboard and wait for UI to reflect application status
    await myApplicationsPage.goto()
    await myApplicationsPage.waitForApplicationStatusChange(testEvent.title, 'applied')
    await myApplicationsPage.waitForApplicationStatusChange(secondEvent.title, 'applied')

    // Verify both events show as applied
    const status1 = await myApplicationsPage.getApplicationStatus(testEvent.title)
    const status2 = await myApplicationsPage.getApplicationStatus(secondEvent.title)

    expect(status1).toBe('applied')
    expect(status2).toBe('applied')
    
    // Cancel first application
    await myApplicationsPage.cancelApplication(testEvent.title)
    
    // Verify first is canceled, second still applied
    const newStatus1 = await myApplicationsPage.getApplicationStatus(testEvent.title)
    const newStatus2 = await myApplicationsPage.getApplicationStatus(secondEvent.title)
    
    expect(newStatus1).toBe('not-applied')
    expect(newStatus2).toBe('applied')
  })

  // The dashboard lists the twelve nearest events still to come, so a closed
  // event has to start in the future to be on the page at all.
  const eventCard = (page: Page, title: string) =>
    page.locator('[data-testid^="event-card"]').filter({ hasText: title })

  test('a closed event offers no application on its card', async ({ page }) => {
    const closedEvent = await createClosedEventSoon(`Closed ${Date.now()}`)

    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')

    const card = eventCard(page, closedEvent.title)
    await expect(card).toBeVisible({ timeout: 30000 })
    // The card says it twice: once as the status badge, once as the dead
    // button. The button is the one this is about.
    await expect(
      card.getByRole('button', { name: 'Candidaturas encerradas' }),
    ).toBeDisabled()
    await expect(
      card.getByRole('link', { name: 'Me candidatar' }),
    ).toHaveCount(0)
  })

  test('an invite to a closed event opens its rules', async ({ page }) => {
    expect(profileId).toBeTruthy()
    if (!profileId) return

    const invitedEvent = await createClosedEventSoon(`Invite ${Date.now()}`)
    const token = await seedInvite(invitedEvent.id, profileId)

    await page.goto(`/convite/${token}`)

    await expect(page).toHaveURL(
      new RegExp(`/dashboard/${invitedEvent.id}/regras`),
      { timeout: 30000 },
    )
  })

  test('an invited person is offered the application on the closed event card', async ({ page }) => {
    expect(profileId).toBeTruthy()
    if (!profileId) return

    const invitedEvent = await createClosedEventSoon(`Invite ${Date.now()}`)
    await seedInvite(invitedEvent.id, profileId)

    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')

    const invitedCard = eventCard(page, invitedEvent.title)
    const invitedApply = invitedCard.getByRole('link', { name: 'Me candidatar' })
    await expect(invitedApply).toBeVisible({ timeout: 30000 })

    await expect(
      invitedCard.getByRole('button', { name: 'Candidaturas encerradas' }),
    ).toHaveCount(0)

    // Clicked rather than merely looked at: the event page cannot see a closed
    // event through RLS, so a card pointing there would bounce the invited
    // person straight back to the dashboard.
    await invitedApply.click()
    await expect(page).toHaveURL(
      new RegExp(`/dashboard/${invitedEvent.id}/regras`),
      { timeout: 30000 },
    )
  })

  test('an invited person applies to a closed event through the quiz and the form', async ({ page }) => {
    // The whole rules quiz, one round trip per screen.
    test.setTimeout(120_000)

    expect(profileId).toBeTruthy()
    if (!profileId) return

    const invitedEvent = await createClosedEventSoon(`Invite ${Date.now()}`)
    await seedInvite(invitedEvent.id, profileId)
    createdApplications.push({ profileId, eventId: invitedEvent.id })

    await page.goto(`/dashboard/${invitedEvent.id}/regras`)

    const applicationPage = new EventApplicationPage(page)
    await applicationPage.fillRulesForm()
    await applicationPage.fillUserDataForm()
    await applicationPage.submitApplication()

    expect(await verifyApplicationExists(profileId, invitedEvent.id)).toBe(true)
  })

  test('POS-477: Can cancel application after registrations close', async ({ page: _page }) => {
    expect(profileId).toBeTruthy()
    expect(testEvent).toBeTruthy()
    if (!profileId || !testEvent) return

    // Setup: apply while the event is still open, then close it the same way the
    // participant limit trigger does once the event reaches 90 applications
    await createTestApplication(profileId, testEvent.id)
    createdApplications.push({ profileId, eventId: testEvent.id })
    await ensureEventIsClosed(testEvent.id)

    try {
      await myApplicationsPage.goto()

      // The cancel button must survive the event closing
      const status = await myApplicationsPage.getApplicationStatus(testEvent.title)
      expect(status).toBe('applied')

      await myApplicationsPage.cancelApplication(testEvent.title, { registrationsClosed: true })

      const isCanceled = await verifyApplicationCanceled(profileId, testEvent.id)
      expect(isCanceled).toBe(true)

      const canceledApp = await getApplicationState(profileId, testEvent.id)
      expect(canceledApp?.is_user_applied).toBe(false)
      expect(canceledApp?.cancellation_date).toBeTruthy()
    } finally {
      // Leave the shared event open again for the tests that run after this one
      await ensureEventIsOpen(testEvent.id)
    }
  })
})