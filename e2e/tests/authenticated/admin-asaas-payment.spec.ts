import { expect, test, type Browser, type Page } from '@playwright/test'
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
  refundPlanInMockDashboard,
  resetAsaasMock,
  setCardPayments,
  setOnlinePayments,
  settleMockRefunds,
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
  return { grid, modal: page.getByRole('dialog') }
}

// The admin sends a R$ 220 charge and the participant opens the link.
async function chargeAndOpenLink(page: Page, browser: Browser) {
  const event = await createSoonOpenEvent(`Asaas payment ${Date.now()}`)
  const payer = await readSetupUser()
  const participant = await enrolRegularParticipant(payer.userId, event.id)

  const { modal } = await openPaymentModal(page, event.id, participant.name)
  await modal.getByLabel('Valor a cobrar').fill('220')
  await modal.getByRole('button', { name: 'Enviar cobrança' }).click()

  const linkEmail = await waitForEmail({ to: payer.email, subject: 'Seu pagamento da' })
  const [pending] = await getParticipantPayments(participant.profileId, event.id)
  expect(pending.status).toBe('pending')
  expect(pending.base_amount).toBe(22000)
  expect(extractEmailBody(linkEmail)).toContain(`/pagamento/${pending.id}`)

  const participantContext = await browser.newContext({ storageState: PARTICIPANT_STATE })
  const participantPage = await participantContext.newPage()
  const paymentPage = new PaymentPage(participantPage)
  await paymentPage.navigate(pending.id)
  await paymentPage.fillCpfIfAsked(uniqueValidCpf())

  return { event, payer, participant, pending, participantContext, participantPage, paymentPage }
}

function createdCharges() {
  return getAsaasMockCalls().then((calls) =>
    calls.filter((call) => call.method === 'POST' && call.path === '/payments'),
  )
}

test.describe('POS-577: flat prices, and refunds done in the Asaas dashboard', () => {
  test.use({ storageState: path.resolve(import.meta.dirname, '../../.auth/admin.json') })

  test.beforeEach(async () => {
    await resetAsaasMock()
    await setOnlinePayments(true)
  })

  test('with card on, the participant pays the event price by card in 3x, and the refund done in Asaas is recorded', async ({
    page,
    browser,
  }) => {
    test.setTimeout(180_000)
    await setCardPayments(true)

    const { event, payer, participant, pending, participantContext, participantPage, paymentPage } =
      await chargeAndOpenLink(page, browser)

    // Pix at 10% off, the card at the event price in 1x to 6x.
    const pix = participantPage.getByRole('radio', { name: /^Pix R\$\s?198,00$/ })
    await expect(pix).toHaveAccessibleDescription(/10% de desconto sobre R\$\s?220,00/)
    await expect(participantPage.getByRole('radio', { name: /^Cartão à vista R\$\s?220,00$/ })).toBeVisible()
    await expect(
      participantPage.getByRole('radio', { name: /^Cartão 6x de R\$\s?36,66 R\$\s?220,00$/ }),
    ).toBeVisible()
    await expect(participantPage.getByRole('radio')).toHaveCount(7)

    await paymentPage.chooseOption(/^Cartão 3x de R\$\s?73,33 R\$\s?220,00$/)
    await paymentPage.pay()

    // The app hands off to the invoice page Asaas gave it.
    await participantPage.waitForURL(`${getAsaasMockUrl()}/i/**`)

    const charges = await createdCharges()
    expect(charges).toHaveLength(1)
    expect(charges[0].body).toMatchObject({
      billingType: 'CREDIT_CARD',
      installmentCount: 3,
      totalValue: 220,
      externalReference: pending.id,
    })

    const [awaiting] = await getParticipantPayments(participant.profileId, event.id)
    expect(awaiting.status).toBe('awaiting_payment')
    expect(awaiting.amount).toBe(22000)
    expect(awaiting.asaas_invoice_number).toMatch(/^\d+$/)

    const chargeId = awaiting.asaas_payment_id
    const installmentId = awaiting.asaas_installment_id
    if (!chargeId || !installmentId) throw new Error('The card plan was not recorded on the row')

    // The participant pays on Asaas, which confirms each charge of the plan.
    await confirmMockCharge(chargeId)
    const plan = await getMockPlanCharges(installmentId)
    expect(plan.map((charge) => charge.value)).toEqual([73.33, 73.33, 73.34])

    const confirmations = plan.map((charge) =>
      buildWebhookEvent('PAYMENT_CONFIRMED', {
        id: charge.id,
        value: charge.value,
        netValue: charge.value - 3,
        installment: installmentId,
        externalReference: pending.id,
      }),
    )
    for (const confirmation of confirmations) {
      expect((await postWebhook(confirmation)).status).toBe(200)
    }

    const [paid] = await getParticipantPayments(participant.profileId, event.id)
    expect(paid.status).toBe('paid')
    await waitForEmail({ to: payer.email, subject: 'Pagamento confirmado' })

    await paymentPage.navigate(pending.id)
    await paymentPage.expectPaid()
    await participantContext.close()

    const { grid, modal } = await openPaymentModal(page, event.id, participant.name)
    await expect(grid.getByText('Pago', { exact: true }).first()).toBeVisible()

    // "Reembolsar" opens the charge in the Asaas dashboard; the site asks Asaas
    // for nothing.
    await expect(modal.getByRole('link', { name: 'Reembolsar no Asaas' })).toHaveAttribute(
      'href',
      `https://www.asaas.com/payment/show/${awaiting.asaas_invoice_number}`,
    )
    expect((await getAsaasMockCalls()).filter((call) => call.path.endsWith('/refund'))).toEqual([])

    // The admin refunds the plan in the dashboard. A card refund stays in
    // progress, which no webhook reports: the admin reads it from Asaas.
    await refundPlanInMockDashboard(installmentId, 22000)
    await modal.getByRole('button', { name: 'Atualizar do Asaas' }).click()
    await expect(modal.getByText(/Em andamento no Asaas: R\$\s?220,00/)).toBeVisible()

    // Asaas finishes, spreads the refund over the plan's charges and reports
    // each one.
    await settleMockRefunds()
    for (const charge of plan) {
      const refunded = buildWebhookEvent('PAYMENT_REFUNDED', {
        id: charge.id,
        value: charge.value,
        netValue: charge.value - 3,
        installment: installmentId,
        externalReference: pending.id,
        refunds: [{ value: charge.value, status: 'DONE' }],
      })
      expect((await postWebhook(refunded)).status).toBe(200)
    }

    const [final] = await getParticipantPayments(participant.profileId, event.id)
    expect(final.status).toBe('refunded')
    expect(final.refund_amount).toBe(22000)

    await waitForEmail({ to: payer.email, subject: 'Reembolso' })
    const refundEmails = (await getEmailsByRecipient(payer.email)).filter((email) =>
      email.Subject.startsWith('Reembolso'),
    )
    expect(refundEmails).toHaveLength(1)
  })

  test('with card off, the participant is offered Pix alone, at the full price', async ({ page, browser }) => {
    test.setTimeout(120_000)
    await setCardPayments(false)

    const { event, participant, pending, participantContext, participantPage, paymentPage } =
      await chargeAndOpenLink(page, browser)

    await expect(participantPage.getByRole('radio')).toHaveCount(1)
    await paymentPage.chooseOption(/^Pix R\$\s?220,00$/)
    await paymentPage.pay()
    await participantPage.waitForURL(`${getAsaasMockUrl()}/i/**`)

    const charges = await createdCharges()
    expect(charges).toHaveLength(1)
    expect(charges[0].body).toMatchObject({
      billingType: 'PIX',
      value: 220,
      externalReference: pending.id,
    })

    const [awaiting] = await getParticipantPayments(participant.profileId, event.id)
    expect(awaiting.amount).toBe(22000)
    await participantContext.close()
  })
})
