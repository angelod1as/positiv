import { expect, test } from '@playwright/test'
import { EventApplicationPage } from '../../pages/EventApplicationPage'
import { ensureEventIsOpen, ensureTestUserProfileExists, getFirstOpenEvent } from '../../utils/application-helpers'
import { cleanupEventParticipations } from '../../utils/db-cleanup'
import { ensureMinimumOpenEvents } from '../../utils/test-event-helpers'

test.describe('POS-482: Application confirmation page', () => {
  test('a finished application lands on the confirmation page', async ({ page }) => {
    const profileId = await ensureTestUserProfileExists()
    await cleanupEventParticipations(profileId, true)
    const [event] = await ensureMinimumOpenEvents(1)
    await ensureEventIsOpen(event.id)

    // Enter the flow by URL instead of through a dashboard card: other
    // worktrees share this database and delete test events, which turned
    // clicking a card into a race that sometimes bounced back to /dashboard
    await page.goto(`/dashboard/${event.id}/regras`)

    const applicationPage = new EventApplicationPage(page)

    await applicationPage.fillRulesForm()
    await applicationPage.clickContinue()

    await applicationPage.fillUserDataForm('Test application notes', 'ninguém')
    await applicationPage.submitApplication()

    await expect(page.getByText(/candidatura não garante uma vaga/)).toBeVisible()
    await expect(
      page.getByText(/a organização seleciona quem vai e entra em contato/),
    ).toBeVisible()
    await expect(page.getByText(/um e-mail com os detalhes do evento/)).toBeVisible()

    await applicationPage.returnToDashboard()
  })

  test('the confirmation page is not reachable without an application', async ({ page }) => {
    const profileId = await ensureTestUserProfileExists()
    await cleanupEventParticipations(profileId, true)

    const event = await getFirstOpenEvent()
    expect(event).toBeTruthy()
    if (!event) return

    await page.goto(`/dashboard/${event.id}/candidatura-enviada`)

    await expect(page).toHaveURL(/\/dashboard$/)
  })
})
