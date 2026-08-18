import { expect, test } from '@playwright/test'
import { EventApplicationPage } from '../../pages/EventApplicationPage'
import { ensureTestUserProfileExists, getFirstOpenEvent } from '../../utils/application-helpers'
import { cleanupEventParticipations } from '../../utils/db-cleanup'
import { ensureMinimumOpenEvents } from '../../utils/test-event-helpers'

test.describe('POS-482: Application confirmation page', () => {
  test('a finished application lands on the confirmation page', async ({ page }) => {
    const profileId = await ensureTestUserProfileExists()
    await cleanupEventParticipations(profileId, true)
    await ensureMinimumOpenEvents(1)

    await page.goto('/dashboard')

    // Skip BDSM editions: their extra consent step is covered elsewhere and is
    // irrelevant to where the application lands
    const applyableCards = page
      .locator('[data-testid^="event-card"]')
      .filter({ has: page.getByRole('link', { name: 'Fazer inscrição' }) })
      .filter({ hasNotText: 'BDSM' })
    const applyButtonCount = await applyableCards.count()
    test.skip(applyButtonCount === 0, 'No non-BDSM event with open registration in this environment')

    await applyableCards.first().getByRole('link', { name: 'Fazer inscrição' }).click()
    await page.waitForURL(/\/dashboard\/.+/)

    const applicationPage = new EventApplicationPage(page)

    if (await applicationPage.isOnRulesPage()) {
      await applicationPage.fillRulesForm()
      await applicationPage.clickContinue()
    }

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
