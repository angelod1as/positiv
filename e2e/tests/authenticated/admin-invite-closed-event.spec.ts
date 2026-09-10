import { test, expect } from '@playwright/test'
import path from 'path'
import { adminInvitesCopy } from '../../../app/copy/admin/invites'
import { createClosedEventSoon } from '../../utils/invite-helpers'
import { readSetupUser } from '../../utils/setup-user'

const { modal } = adminInvitesCopy

test.describe('inviting somebody into a closed event', () => {
  test.use({ storageState: path.resolve(import.meta.dirname, '../../.auth/admin.json') })

  test('the admin generates a link and can call it off', async ({ page }) => {
    const event = await createClosedEventSoon(`Invite admin ${Date.now()}`)
    const user = await readSetupUser()

    await page.goto(`/admin/eventos/${event.id}`)
    await page.getByRole('button', { name: adminInvitesCopy.trigger }).click()

    // Searched by e-mail: it is the one thing about the setup user that no
    // other suite can be using at the same time.
    await page.getByLabel(modal.searchLabel).fill(user.email)

    await expect(
      page.getByRole('button', { name: modal.invite, exact: true }),
    ).toBeVisible({ timeout: 15000 })

    await page.getByRole('button', { name: modal.invite, exact: true }).click()

    const link = page.getByTestId('invite-link')
    await expect(link).toHaveValue(/\/convite\/.+/, { timeout: 15000 })
    await expect(page.getByText(modal.status.created, { exact: false })).toBeVisible()

    await page.getByRole('button', { name: modal.revoke }).click()

    await expect(
      page.getByText(modal.status.revoked, { exact: false }),
    ).toBeVisible({ timeout: 15000 })
  })
})
