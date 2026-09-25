import { expect, test, type Page } from '@playwright/test'
import path from 'path'
import { waitForAGGridReady } from '../../helpers/ag-grid'
import { PaymentPage } from '../../pages/PaymentPage'
import { createSoonOpenEvent } from '../../utils/direct-application-helpers'
import { extractEmailBody, getEmailsByRecipient, waitForEmail } from '../../utils/email-helpers'
import {
  buildWebhookEvent,
  confirmMockCharge,
  enrolRegularParticipant,
  getAsaasMockCalls,
  getMockPlanCharges,
  getParticipantPayments,
  postWebhook,
  resetAsaasMock,
} from '../../utils/payment-helpers'
import { getAsaasMockUrl } from '../../utils/run-context'
import { readSetupUser } from '../../utils/setup-user'
import { TEST_USER_PROFILE_DATA } from '../../fixtures/test-data'

const PARTICIPANT_STATE = path.resolve(import.meta.dirname, '../../.auth/user.json')

async function openPaymentModal(page: Page, eventId: string, name: string) {
  await page.goto(`/admin/eventos/${eventId}`)
  const grid = await waitForAGGridReady(page, 'participants-table')
  // AG Grid renders a row twice, once per pinned section.
  await expect(grid.locator('.ag-row').filter({ hasText: name }).first()).toBeVisible({ timeout: 30000 })
  await grid.getByRole('button', { name: 'Gerenciar pagamento' }).first().click()
  return { grid, modal: page.getByRole('dialog') }
}

test.describe('POS-532: an Asaas payment from the charge to the refund', () => {
  test.use({ storageState: path.resolve(import.meta.dirname, '../../.auth/admin.json') })

  test.beforeEach(async () => {
    await resetAsaasMock()
  })

  test('the admin charges, the participant pays by card in 3x, Asaas confirms, the admin refunds', async ({
    page,
    browser,
  }) => {
    test.setTimeout(180_000)

    const event = await createSoonOpenEvent(`Asaas payment ${Date.now()}`)
    const payer = await readSetupUser()
    const participant = await enrolRegularParticipant(payer.userId, event.id)

    // 1. The admin sends the charge.
    let { modal } = await openPaymentModal(page, event.id, participant.name)
    await modal.getByLabel('Valor a cobrar').fill('220')
    await modal.getByRole('button', { name: 'Enviar cobrança' }).click()

    const linkEmail = await waitForEmail({ to: payer.email, subject: 'Seu pagamento da' })
    const [pending] = await getParticipantPayments(participant.profileId, event.id)
    expect(pending.status).toBe('pending')
    expect(pending.base_amount).toBe(22000)
    expect(extractEmailBody(linkEmail)).toContain(`/pagamento/${pending.id}`)

    // 2. The participant opens the link and picks the card in 3x.
    const participantContext = await browser.newContext({ storageState: PARTICIPANT_STATE })
    const participantPage = await participantContext.newPage()
    const paymentPage = new PaymentPage(participantPage)
    await paymentPage.navigate(pending.id)
    await paymentPage.fillCpfIfAsked(TEST_USER_PROFILE_DATA.cpf)

    // Every option is priced above the ticket: the fees are the participant's.
    await expect(participantPage.getByRole('radio', { name: /^Pix — R\$/ })).toBeVisible()
    await paymentPage.chooseOption(/^Cartão 3x de R\$/)
    await paymentPage.pay()

    // The app hands off to the invoice page Asaas gave it.
    await participantPage.waitForURL(`${getAsaasMockUrl()}/i/**`)

    const charges = (await getAsaasMockCalls()).filter(
      (call) => call.method === 'POST' && call.path === '/payments',
    )
    expect(charges).toHaveLength(1)
    expect(charges[0].body).toMatchObject({
      billingType: 'CREDIT_CARD',
      installmentCount: 3,
      externalReference: pending.id,
    })

    const [awaiting] = await getParticipantPayments(participant.profileId, event.id)
    expect(awaiting.status).toBe('awaiting_payment')
    expect(awaiting.amount).toBe(Math.round(Number(charges[0].body?.totalValue) * 100))
    expect(awaiting.amount).toBeGreaterThan(22000)

    const chargeId = awaiting.asaas_payment_id
    const installmentId = awaiting.asaas_installment_id
    if (!chargeId || !installmentId) throw new Error('The card plan was not recorded on the row')

    // 3. The participant pays on Asaas, which confirms each charge of the plan.
    await confirmMockCharge(chargeId)
    const plan = await getMockPlanCharges(installmentId)
    expect(plan).toHaveLength(3)

    const nets = [73.33, 73.33, 73.34]
    const confirmations = plan.map((charge, index) =>
      buildWebhookEvent('PAYMENT_CONFIRMED', {
        id: charge.id,
        value: charge.value,
        netValue: nets[index],
        installment: installmentId,
        externalReference: pending.id,
      }),
    )
    for (const confirmation of confirmations) {
      expect((await postWebhook(confirmation)).status).toBe(200)
    }

    const [paid] = await getParticipantPayments(participant.profileId, event.id)
    expect(paid.status).toBe('paid')
    expect(paid.asaas_net).toBe(22000)

    await waitForEmail({ to: payer.email, subject: 'Pagamento confirmado' })

    // Asaas redelivers: nothing changes, and nobody is told twice.
    const redelivered = await postWebhook(confirmations[0])
    expect(redelivered.status).toBe(200)
    expect(await redelivered.json()).toMatchObject({ deduped: true })

    const confirmationEmails = (await getEmailsByRecipient(payer.email)).filter((email) =>
      email.Subject.startsWith('Pagamento confirmado'),
    )
    expect(confirmationEmails).toHaveLength(1)

    // The link now shows a receipt, and the grid says so.
    await paymentPage.navigate(pending.id)
    await paymentPage.expectPaid()
    await participantContext.close()

    const opened = await openPaymentModal(page, event.id, participant.name)
    modal = opened.modal
    await expect(opened.grid.getByText('Pago', { exact: true }).first()).toBeVisible()

    // 4. The admin refunds what Positiv received, through Asaas.
    await modal.getByRole('button', { name: 'Reembolsar', exact: true }).click()
    await page.getByRole('alertdialog').getByRole('button', { name: 'Solicitar reembolso' }).click()
    await expect(page.getByRole('alertdialog')).toBeHidden()

    // A plan goes back one charge at a time, never as one full refund, and the
    // shares add up to the net: the fees stay with the participant.
    await expect
      .poll(async () =>
        (await getAsaasMockCalls()).filter((call) => call.path.endsWith('/refund')).length,
      )
      .toBe(3)
    const refunds = (await getAsaasMockCalls()).filter((call) => call.path.endsWith('/refund'))
    const shares = refunds.map((call) => ({
      id: call.path.split('/')[2],
      value: Number(call.body?.value),
    }))
    expect(shares.reduce((total, share) => total + Math.round(share.value * 100), 0)).toBe(22000)

    const [requested] = await getParticipantPayments(participant.profileId, event.id)
    expect(requested.refund_requested_at).not.toBeNull()

    // 5. Asaas confirms each refund.
    for (const [index, charge] of plan.entries()) {
      const share = shares.find((item) => item.id === charge.id)
      if (!share) continue
      const refunded = buildWebhookEvent('PAYMENT_PARTIALLY_REFUNDED', {
        id: charge.id,
        value: charge.value,
        netValue: nets[index],
        installment: installmentId,
        externalReference: pending.id,
        refunds: [{ value: share.value, status: 'DONE' }],
      })
      expect((await postWebhook(refunded)).status).toBe(200)
    }

    const [final] = await getParticipantPayments(participant.profileId, event.id)
    expect(final.status).toBe('partially_refunded')
    expect(final.refund_amount).toBe(22000)

    await waitForEmail({ to: payer.email, subject: 'Reembolso' })
    const refundEmails = (await getEmailsByRecipient(payer.email)).filter((email) =>
      email.Subject.startsWith('Reembolso'),
    )
    expect(refundEmails).toHaveLength(1)
  })
})
