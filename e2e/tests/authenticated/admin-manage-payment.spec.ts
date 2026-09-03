import { expect, test } from '@playwright/test'
import path from 'path'
import { waitForAGGridReady } from '../../helpers/ag-grid'
import { createSoonOpenEvent } from '../../utils/direct-application-helpers'
import { cleanupTestParticipants, createTestEventWithParticipants, type TestParticipant } from '../../utils/event-helpers'

test.describe('POS-525: managing a payment from the admin grid', () => {
  test.use({ storageState: path.resolve(import.meta.dirname, '../../.auth/admin.json') })

  // profiles.user_id is ON DELETE SET NULL, so deleting the auth user in global
  // teardown only orphans the profile. This is what actually removes it.
  const created: TestParticipant[] = []

  test.afterAll(async () => {
    await cleanupTestParticipants(created)
  })

  test('admin records a manual payment and then refunds part of it', async ({ page }) => {
    const event = await createSoonOpenEvent(`Manage payment ${Date.now()}`)
    const [participant] = await createTestEventWithParticipants(event.id, 1)
    created.push(participant)

    await page.goto(`/admin/eventos/${event.id}`)
    const grid = await waitForAGGridReady(page, 'participants-table')

    // AG Grid renders a row twice, once per pinned section, so a row filter
    // matches two elements carrying the same row-id.
    const row = grid
      .locator('.ag-row')
      .filter({ hasText: participant.socialName })
      .first()
    await expect(row).toBeVisible({ timeout: 30000 })

    await grid.getByRole('button', { name: 'Gerenciar pagamento' }).first().click()

    const modal = page.getByRole('dialog')
    await expect(modal.getByText('Nenhum pagamento registrado.')).toBeVisible()

    await modal.getByLabel('Valor recebido').fill('150')
    await modal.getByLabel('Data do pagamento').fill('2026-08-20')
    await modal.getByRole('button', { name: 'Registrar pagamento' }).click()

    // Recording is the end of the errand: the modal closes and the grid,
    // revalidated, carries the answer.
    await expect(modal).toBeHidden()
    await expect(grid.getByText('R$ 150,00').first()).toBeVisible()

    await grid.getByRole('button', { name: 'Gerenciar pagamento' }).first().click()
    await expect(modal.getByRole('row', { name: /pix/i })).toContainText('R$ 150,00')
    await expect(modal.getByRole('row', { name: /pix/i })).toContainText('Pago')

    // A refused refund has to say why. Every message here is raised as an Error
    // server-side, and a production build replaces those with "Unexpected
    // Server Error" unless the message is copied out — which only this suite
    // can catch, because only this suite runs the production build.
    await modal.getByRole('button', { name: 'Marcar como reembolsado' }).click()
    await page.getByRole('alertdialog').getByLabel('Valor devolvido').fill('9999')
    await page.getByRole('alertdialog').getByRole('button', { name: 'Marcar reembolso' }).click()

    await expect(
      modal.getByText('O reembolso não pode ser maior que o valor pago.'),
    ).toBeVisible()

    await modal.getByRole('button', { name: 'Marcar como reembolsado' }).click()
    await page.getByRole('alertdialog').getByLabel('Valor devolvido').fill('50')
    await page.getByRole('alertdialog').getByRole('button', { name: 'Marcar reembolso' }).click()

    // A refund leaves the modal open — the admin is still reading the ledger.
    await expect(modal.getByRole('row', { name: /pix/i })).toContainText(
      'Reembolsado em parte',
    )
    await expect(modal.getByText('R$ 100,00').first()).toBeVisible()
  })
})
