import { test, expect } from '@playwright/test'
import path from 'path'
import { createSoonOpenEvent, DIRECT_APPLY_LABEL, openParticipantDashboard } from '../../utils/direct-application-helpers'

test.describe('POS-503: the direct application is for admins only', () => {
  test.use({ storageState: path.resolve(import.meta.dirname, '../../.auth/user.json') })

  test('a participant is never offered it', async ({ page }) => {
    const event = await createSoonOpenEvent(`Direct refused ${Date.now()}`)

    await openParticipantDashboard(page)

    const card = page
      .locator('[data-testid^="event-card"]')
      .filter({ hasText: event.title })

    await expect(card).toBeVisible({ timeout: 30000 })
    await expect(card.getByRole('link', { name: 'Me candidatar' })).toBeVisible()
    await expect(
      card.getByRole('button', { name: DIRECT_APPLY_LABEL }),
    ).toHaveCount(0)
  })

  test('a participant forging the submission is not applied', async ({ page }) => {
    const event = await createSoonOpenEvent(`Direct refused ${Date.now()}`)

    await openParticipantDashboard(page)

    // The button is what is missing from the page; the check that matters is
    // the one on the server, so the request is sent without it.
    await page.request.post('/dashboard', {
      form: { fetchId: 'handleAdminApply', eventId: event.id },
    })

    await page.reload()
    await page.waitForLoadState('networkidle')

    const card = page
      .locator('[data-testid^="event-card"]')
      .filter({ hasText: event.title })

    await expect(card).toBeVisible({ timeout: 30000 })
    await expect(
      card.getByRole('button', { name: 'Cancelar candidatura' }),
    ).toHaveCount(0)
    await expect(card.getByRole('link', { name: 'Me candidatar' })).toBeVisible()
  })
})
