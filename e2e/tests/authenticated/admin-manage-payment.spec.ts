import { expect, test } from '@playwright/test'
import path from 'path'
import { waitForAGGridReady } from '../../helpers/ag-grid'
import { createSoonOpenEvent } from '../../utils/direct-application-helpers'
import { createTestEventWithParticipants } from '../../utils/event-helpers'

test.describe('POS-525: managing a payment from the admin grid', () => {
  test.use({ storageState: path.resolve(import.meta.dirname, '../../.auth/admin.json') })

  test('admin records a manual payment and then refunds part of it', async ({ page }) => {
    const event = await createSoonOpenEvent(`Manage payment ${Date.now()}`)
    const [participant] = await createTestEventWithParticipants(event.id, 1)

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

    // The row is written, the loader revalidates, and the grid answers with it.
    await expect(modal.getByRole('row', { name: /pix/i })).toContainText('R$ 150,00')
    await expect(modal.getByRole('row', { name: /pix/i })).toContainText('Pago')

    await modal.getByRole('button', { name: 'Marcar como reembolsado' }).click()
    await page.getByRole('alertdialog').getByLabel('Valor devolvido').fill('50')
    await page.getByRole('alertdialog').getByRole('button', { name: 'Marcar reembolso' }).click()

    await expect(modal.getByRole('row', { name: /pix/i })).toContainText(
      'Reembolsado em parte',
    )
    await expect(modal.getByText('R$ 100,00')).toBeVisible()
  })
})
