import { expect, test } from '@playwright/test'
import { dashboardCopy } from '../../../app/copy/dashboard'
import { EventApplicationPage } from '../../pages/EventApplicationPage'
import { ensureTestUserProfileExists } from '../../utils/application-helpers'
import { cleanupEventParticipations } from '../../utils/db-cleanup'
import { ensureMinimumOpenEvents } from '../../utils/test-event-helpers'

test.describe('Account signup versus event registration', () => {
  test('a person who never applied sees the banner and an empty applied section', async ({ page }) => {
    // Other specs running earlier in this sequential project may have applied
    // this shared user to an event. Clear all their applications (including
    // cancelled ones, since hasEverApplied() counts those too) so this test
    // reliably starts from a "never applied" state.
    const profileId = await ensureTestUserProfileExists()
    await cleanupEventParticipations(profileId, true)

    await page.goto('/dashboard')

    // React streams the resolved events into a hidden div and then moves them
    // into place, and 19.2 batches those reveals, so for a moment the banner
    // is in the document twice. The hidden copy is outside the accessibility
    // tree, which the alert role is not.
    const welcome = page.getByRole('alert')
    await expect(welcome.getByText(dashboardCopy.welcome.title, { exact: true })).toBeVisible()
    await expect(welcome.getByText(dashboardCopy.welcome.body)).toBeVisible()

    // A copy that stayed behind after the swap would be a bug, not timing.
    await expect(page.getByText(dashboardCopy.welcome.title, { exact: true })).toHaveCount(1)

    await expect(
      page.getByRole('heading', { name: 'Eventos em que você se candidatou' }),
    ).toBeVisible()

    await expect(
      page.getByText('Você não tem nenhuma candidatura no momento.').filter({ visible: true }),
    ).toBeVisible()
  })

  test('an event moves to the applied section after registration and appears once', async ({ page }) => {
    await ensureMinimumOpenEvents(1)

    await page.goto('/dashboard')

    const applyableCards = page
      .locator('[data-testid^="event-card"]')
      .filter({ has: page.getByRole('link', { name: 'Me candidatar' }) })
    await expect(applyableCards.first()).toBeVisible()

    const applyButton = applyableCards
      .first()
      .getByRole('link', { name: 'Me candidatar' })

    const eventTitle = await applyableCards.first().locator('h3').innerText()

    await applyButton.click()
    await page.waitForURL(/\/dashboard\/.+/)

    // Walk the real application flow (rules quiz, then user data). The quiz is
    // a screen per question, and a save the server refuses reopens some of
    // them, so this needs the same room as the tests that walk it directly.
    test.setTimeout(120_000)

    const applicationPage = new EventApplicationPage(page)
    await applicationPage.completeFullApplication()
    await page.waitForURL('/dashboard')

    const appliedCard = page.getByTestId('event-card-applied').filter({ hasText: eventTitle })
    await expect(appliedCard).toHaveCount(1)

    const availableCard = page.getByTestId('event-card-available').filter({ hasText: eventTitle })
    await expect(availableCard).toHaveCount(0)

    await expect(
      page.getByText('Sua conta está pronta', { exact: true }),
    ).toBeHidden()
  })
})
