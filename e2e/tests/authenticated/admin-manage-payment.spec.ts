import { expect, test, type Locator, type Page } from '@playwright/test'
import path from 'path'
import { waitForAGGridReady } from '../../helpers/ag-grid'
import { AdminDashboardPage } from '../../pages/admin/AdminDashboardPage'
import { UserManagementPage } from '../../pages/admin/UserManagementPage'
import { createSoonOpenEvent } from '../../utils/direct-application-helpers'
import { recordManualPayment } from '../../utils/payment-helpers'
import { cleanupTestParticipants, createTestEventWithParticipants, type TestParticipant } from '../../utils/event-helpers'

test.describe('POS-525: managing a payment from the admin grid', () => {
  test.use({ storageState: path.resolve(import.meta.dirname, '../../.auth/admin.json') })

  // profiles.user_id is ON DELETE SET NULL, so deleting the auth user in global
  // teardown only orphans the profile. This is what actually removes it.
  const created: TestParticipant[] = []

  test.afterAll(async () => {
    await cleanupTestParticipants(created)
  })

  async function openPaymentModal(page: Page, socialName: string, eventId: string) {
    await page.goto(`/admin/eventos/${eventId}`)
    const grid = await waitForAGGridReady(page, 'participants-table')

    // AG Grid renders a row twice, once per pinned section, so a row filter
    // matches two elements carrying the same row-id.
    const row = grid.locator('.ag-row').filter({ hasText: socialName }).first()
    await expect(row).toBeVisible({ timeout: 30000 })

    await grid.getByRole('button', { name: 'Gerenciar pagamento' }).first().click()
    return { grid, modal: page.getByRole('dialog') }
  }

  async function participantWithPayment(label: string) {
    const event = await createSoonOpenEvent(`${label} ${Date.now()}`)
    const [participant] = await createTestEventWithParticipants(event.id, 1)
    created.push(participant)
    await recordManualPayment(participant.profileId, event.id, 150)
    return { event, participant }
  }

  async function refund(page: Page, modal: Locator, amount: string) {
    await modal.getByRole('button', { name: 'Marcar como reembolsado' }).click()
    await page.getByRole('alertdialog').getByLabel('Valor devolvido').fill(amount)
    await page.getByRole('alertdialog').getByRole('button', { name: 'Marcar reembolso' }).click()
  }

  test('admin records a manual payment', async ({ page }) => {
    const event = await createSoonOpenEvent(`Manage payment ${Date.now()}`)
    const [participant] = await createTestEventWithParticipants(event.id, 1)
    created.push(participant)

    const { grid, modal } = await openPaymentModal(page, participant.socialName, event.id)
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
  })

  test('a refund larger than the payment is refused with its reason', async ({ page }) => {
    const { event, participant } = await participantWithPayment('Refund too big')
    const { modal } = await openPaymentModal(page, participant.socialName, event.id)

    await refund(page, modal, '9999')

    // Every message here is raised as an Error server-side, and a production
    // build replaces those with "Unexpected Server Error" unless the message
    // is copied out — which only this suite can catch.
    await expect(
      modal.getByText('O reembolso não pode ser maior que o valor pago.'),
    ).toBeVisible()
  })

  test('admin refunds part of a payment', async ({ page }) => {
    const { event, participant } = await participantWithPayment('Partial refund')
    const { modal } = await openPaymentModal(page, participant.socialName, event.id)

    await refund(page, modal, '50')

    // A refund leaves the modal open — the admin is still reading the ledger.
    await expect(modal.getByRole('row', { name: /pix/i })).toContainText(
      'Reembolsado em parte',
    )
    await expect(modal.getByText('R$ 100,00').first()).toBeVisible()
  })

  // WEB-40: the seeded foreigner, exempted from the CPF, can only be paid by
  // hand -- the provider will not take a customer without one.
  test('a participant without a CPF can only be paid by hand', async ({ page }) => {
    const adminDashboard = new AdminDashboardPage(page)
    const userManagement = new UserManagementPage(page)
    await adminDashboard.navigate()
    await adminDashboard.clickViewEvent('Evento Com Inscrições Abertas 1')
    await userManagement.waitForTableToLoad()

    await userManagement.participantsTable
      .locator('[aria-label="Buscar participantes"]')
      .fill('user9')
    const foreignerLink = userManagement.participantsTable
      .locator('.ag-pinned-left-cols-container a')
      .getByText('user9', { exact: true })
      .first()
    // The href, not a click: AG Grid recycles rows while the quick filter
    // applies, the same reason the POS-362 journey reads it.
    await expect(foreignerLink).toBeVisible()
    const foreignerHref = await foreignerLink.getAttribute('href')
    if (!foreignerHref) throw new Error('Could not read the link to user9')
    await page.goto(foreignerHref)
    await userManagement.waitForDetailView()

    await expect(page.getByText('C01X00T47 Alemanha')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Desmarcar sem CPF' })).toBeVisible()

    await page.getByRole('button', { name: 'Gerenciar pagamento' }).click()
    const foreignerModal = page.getByRole('dialog')
    await expect(
      foreignerModal.getByText('Só pagamento manual — participante sem CPF.'),
    ).toBeVisible()
    await expect(foreignerModal.getByRole('button', { name: 'Enviar cobrança' })).toHaveCount(0)
    await expect(
      foreignerModal.getByRole('button', { name: 'Registrar pagamento' }),
    ).toBeVisible()
  })
})
