import { test, expect } from '@playwright/test'
import path from 'path'
import { getProfileIdByEmail } from '../../utils/application-helpers'
import { openParticipantDashboard } from '../../utils/direct-application-helpers'
import { createClosedEventSoon, seedInvite } from '../../utils/invite-helpers'
import { readSetupUser } from '../../utils/setup-user'

test.describe('an invited person and a closed event', () => {
  test.use({ storageState: path.resolve(import.meta.dirname, '../../.auth/user.json') })

  test('the link opens the application a closed event would refuse', async ({ page }) => {
    const user = await readSetupUser()
    const profileId = await getProfileIdByEmail(user.email)
    if (!profileId) throw new Error(`No profile for the setup user ${user.email}`)

    const event = await createClosedEventSoon(`Invite user ${Date.now()}`)

    // Closed, and nobody has been invited yet: the card is a dead button.
    await openParticipantDashboard(page)
    const cardBefore = page
      .locator('[data-testid^="event-card"]')
      .filter({ hasText: event.title })
    await expect(cardBefore).toBeVisible({ timeout: 30000 })
    await expect(
      cardBefore.getByText('Candidaturas encerradas'),
    ).toBeVisible()

    const token = await seedInvite(event.id, profileId)

    await page.goto(`/convite/${token}`)

    await expect(page).toHaveURL(new RegExp(`/dashboard/${event.id}/regras`), {
      timeout: 30000,
    })

    // And the same card now offers the application it refused a moment ago.
    await openParticipantDashboard(page)
    await expect(
      page
        .locator('[data-testid^="event-card"]')
        .filter({ hasText: event.title })
        .getByRole('link', { name: 'Me candidatar' }),
    ).toBeVisible({ timeout: 30000 })
  })
})
