import { test, expect } from '@playwright/test'
import path from 'path'
import { MyApplicationsPage } from '../../pages/MyApplicationsPage'
import { createSoonOpenEvent, DIRECT_APPLY_LABEL, openParticipantDashboard } from '../../utils/direct-application-helpers'

test.describe('POS-503: direct admin application', () => {
  test.use({ storageState: path.resolve(import.meta.dirname, '../../.auth/admin.json') })

  test('admin applies from the card without walking the quiz', async ({ page }) => {
    const event = await createSoonOpenEvent(`Direct admin ${Date.now()}`)
    const myApplications = new MyApplicationsPage(page)

    await openParticipantDashboard(page)

    const card = page
      .locator('[data-testid^="event-card"]')
      .filter({ hasText: event.title })

    await expect(card).toBeVisible({ timeout: 30000 })

    // The ordinary path stays exactly where it was, beside the new one.
    await expect(card.getByRole('link', { name: 'Me candidatar' })).toBeVisible()

    await card.getByRole('button', { name: DIRECT_APPLY_LABEL }).click()

    await expect(
      page
        .locator('[data-testid="event-card-applied"]')
        .filter({ hasText: event.title }),
    ).toBeVisible({ timeout: 30000 })

    // Never left the dashboard: no rules page, no fourteen questions.
    await expect(page).toHaveURL(/\/dashboard$/)
    expect(await myApplications.isAppliedToEvent(event.title)).toBe(true)

    await myApplications.cancelApplication(event.title)
  })
})

test.describe('POS-516: direct application by a staff', () => {
  test.use({ storageState: path.resolve(import.meta.dirname, '../../.auth/staff.json') })

  test('a staff applies from the card and never reaches the admin panel', async ({ page }) => {
    const event = await createSoonOpenEvent(`Direct staff ${Date.now()}`)
    const myApplications = new MyApplicationsPage(page)

    await openParticipantDashboard(page)

    const card = page
      .locator('[data-testid^="event-card"]')
      .filter({ hasText: event.title })

    await expect(card).toBeVisible({ timeout: 30000 })
    await expect(page.getByTitle('Área Admin')).toHaveCount(0)

    await card.getByRole('button', { name: DIRECT_APPLY_LABEL }).click()

    await expect(
      page
        .locator('[data-testid="event-card-applied"]')
        .filter({ hasText: event.title }),
    ).toBeVisible({ timeout: 30000 })

    await expect(page).toHaveURL(/\/dashboard$/)
    expect(await myApplications.isAppliedToEvent(event.title)).toBe(true)

    await myApplications.cancelApplication(event.title)

    // The button is the only thing a staff shares with an admin.
    await page.goto('/admin')
    await expect(page).not.toHaveURL(/\/admin/)
  })
})
