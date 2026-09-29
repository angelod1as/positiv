import { expect, test, type Page } from '@playwright/test'
import path from 'path'
import { waitForAGGridReady } from '../../helpers/ag-grid'
import { AdminSettingsPage } from '../../pages/admin/AdminSettingsPage'
import { PaymentPage } from '../../pages/PaymentPage'
import { createSoonOpenEvent } from '../../utils/direct-application-helpers'
import {
  buildWebhookEvent,
  confirmMockCharge,
  enrolRegularParticipant,
  getAsaasMockCalls,
  getParticipantPayments,
  postWebhook,
  resetAsaasMock,
  setOnlinePayments,
} from '../../utils/payment-helpers'
import { getAsaasMockUrl } from '../../utils/run-context'
import { readSetupUser } from '../../utils/setup-user'
import { uniqueValidCpf } from '../../utils/unique-cpf'

const PARTICIPANT_STATE = path.resolve(import.meta.dirname, '../../.auth/user.json')

async function openPaymentModal(page: Page, eventId: string, name: string) {
  await page.goto(`/admin/eventos/${eventId}`)
  const grid = await waitForAGGridReady(page, 'participants-table')
  // AG Grid renders a row twice, once per pinned section.
  await expect(grid.locator('.ag-row').filter({ hasText: name }).first()).toBeVisible({ timeout: 30000 })
  await grid.getByRole('button', { name: 'Gerenciar pagamento' }).first().click()
  return page.getByRole('dialog')
}

test.describe('POS-565: switching online payments off and back on from the admin', () => {
  test.use({ storageState: path.resolve(import.meta.dirname, '../../.auth/admin.json') })

  test.beforeEach(async () => {
    await resetAsaasMock()
    await setOnlinePayments(true)
  })

  test('a charge already open is still recorded when paid after the switch goes off', async ({
    page,
    browser,
  }) => {
    test.setTimeout(180_000)

    const event = await createSoonOpenEvent(`Payments switch ${Date.now()}`)
    const payer = await readSetupUser()
    const participant = await enrolRegularParticipant(payer.userId, event.id)

    // 1. With online payments on, the admin charges and the participant picks Pix.
    let modal = await openPaymentModal(page, event.id, participant.name)
    await modal.getByLabel('Valor a cobrar').fill('220')
    await modal.getByRole('button', { name: 'Enviar cobrança' }).click()
    // The payer is the shared setup user, so an older link email from another
    // spec would satisfy a wait on the inbox. The row is this event's own.
    await expect
      .poll(async () => (await getParticipantPayments(participant.profileId, event.id)).length)
      .toBe(1)
    const [pending] = await getParticipantPayments(participant.profileId, event.id)

    const participantContext = await browser.newContext({ storageState: PARTICIPANT_STATE })
    const participantPage = await participantContext.newPage()
    const paymentPage = new PaymentPage(participantPage)
    await paymentPage.navigate(pending.id)
    await paymentPage.fillCpfIfAsked(uniqueValidCpf())
    await paymentPage.chooseOption(/^Pix R\$/)
    await paymentPage.pay()
    await participantPage.waitForURL(`${getAsaasMockUrl()}/i/**`)

    const [awaiting] = await getParticipantPayments(participant.profileId, event.id)
    expect(awaiting.status).toBe('awaiting_payment')
    const chargeId = awaiting.asaas_payment_id
    if (!chargeId) throw new Error('The Pix charge was not recorded on the row')
    const [charge] = (await getAsaasMockCalls()).filter(
      (call) => call.method === 'POST' && call.path === '/payments',
    )

    // 2. The admin switches online payments off.
    const settings = new AdminSettingsPage(page)
    await settings.navigate()
    await settings.turnOnlinePaymentsOff()

    // The modal no longer offers a charge.
    modal = await openPaymentModal(page, event.id, participant.name)
    await expect(modal.getByRole('heading', { name: 'Pagamentos' })).toBeVisible()
    await expect(modal.getByLabel('Valor a cobrar')).toHaveCount(0)
    await expect(modal.getByRole('button', { name: 'Enviar cobrança' })).toHaveCount(0)

    // The emailed link no longer offers anything.
    await paymentPage.navigate(pending.id)
    await paymentPage.expectClosed()

    // 3. The participant, still on the Asaas invoice page, pays anyway. The
    // webhook records it: switching off loses no money in flight.
    await confirmMockCharge(chargeId)
    const received = buildWebhookEvent('PAYMENT_RECEIVED', {
      id: chargeId,
      value: Number(charge.body?.value),
      netValue: 220,
      externalReference: pending.id,
    })
    expect((await postWebhook(received)).status).toBe(200)

    const [paid] = await getParticipantPayments(participant.profileId, event.id)
    expect(paid.status).toBe('paid')

    await paymentPage.navigate(pending.id)
    await paymentPage.expectPaid()
    await participantContext.close()

    // Settled, the modal offers manual payments only.
    modal = await openPaymentModal(page, event.id, participant.name)
    await expect(modal.getByText('Registrar pagamento manual')).toBeVisible()
    await expect(modal.getByLabel('Valor a cobrar')).toHaveCount(0)

    // 4. Back on, and the modal offers a charge again.
    await settings.navigate()
    await settings.turnOnlinePaymentsOn()

    modal = await openPaymentModal(page, event.id, participant.name)
    await expect(modal.getByLabel('Valor a cobrar')).toBeVisible()
  })
})
