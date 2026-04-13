import { test, expect } from "@playwright/test"
import path from "node:path"
import {
  createTestEvent,
  cleanupTestPaymentEvent,
  getPaymentRequestByEventParticipantId,
  getEventParticipantId,
  seedPaymentRequest,
  deletePaymentRequestsByParticipant,
  postWebhook,
  verifyPaymentLinkEmail,
  verifyRefundEmail,
  extractPaymentUrlFromEmail,
} from "../../utils/payment-helpers"
import {
  createTestEventWithParticipants,
  cleanupTestParticipants,
  type TestParticipant,
} from "../../utils/event-helpers"
import {
  clearAllEmails,
  waitForEmail,
  getAllEmails,
} from "../../utils/email-helpers"
import {
  resetAsaasState,
  getAllAsaasPayments,
  getAllAsaasCustomers,
  getAsaasCallsByPath,
} from "../../mocks/asaas-mock-server"

test.use({
  storageState: path.resolve(import.meta.dirname, "../../.auth/admin.json"),
})

let eventId: string
let participants: TestParticipant[]

test.beforeAll(async () => {
  const event = await createTestEvent({
    title: "[E2E-TEST] Payment Management",
    ticketPrice: 100,
  })
  eventId = event.id
  participants = await createTestEventWithParticipants(eventId, 3)
})

test.afterAll(async () => {
  for (const p of participants) {
    const epId = await getEventParticipantId(p.profileId, eventId).catch(
      () => null,
    )
    if (epId) await deletePaymentRequestsByParticipant(epId)
  }
  await cleanupTestParticipants(participants)
  await cleanupTestPaymentEvent(eventId)
})

test.beforeEach(async () => {
  await clearAllEmails()
  await resetAsaasState()
})

function participantUrl(participantIndex: number): string {
  return `/admin/eventos/${eventId}/participantes/${participants[participantIndex].profileId}`
}

function autoSavePromise(page: import("@playwright/test").Page) {
  return page.waitForResponse(
    (resp) =>
      resp.request().method() === "POST" &&
      resp.url().includes("/participantes/"),
  )
}

function assertPaymentRequest(
  pr: Awaited<ReturnType<typeof getPaymentRequestByEventParticipantId>>,
): asserts pr is NonNullable<typeof pr> {
  if (pr == null) throw new Error("Expected payment request to exist")
}

test.describe("Admin Payment Management", () => {
  test("admin triggers automatic payment", async ({ page }) => {
    await page.goto(participantUrl(0))
    await page.waitForLoadState("networkidle")

    const trigger = page.locator("#application_status")
    await trigger.click()
    const savePromise = autoSavePromise(page)
    await page
      .getByRole("option", { name: "Dados de pagto enviados" })
      .click()

    await savePromise

    const epId = await getEventParticipantId(
      participants[0].profileId,
      eventId,
    )
    const pr = await getPaymentRequestByEventParticipantId(epId)
    assertPaymentRequest(pr)
    expect(pr.status).toBe("pending")
    expect(pr.payment_mode).toBe("automatic")

    // Asaas is only called when the participant confirms a payment option
    // (see confirmPaymentChoice). Admin triggering just creates the DB
    // record and sends the email — no Asaas call yet.
    expect(await getAllAsaasPayments(), "no Asaas payment yet").toHaveLength(0)
    expect(await getAllAsaasCustomers(), "no Asaas customer yet").toHaveLength(0)

    const email = await waitForEmail({
      to: participants[0].email,
      subject: "pagamento",
      timeout: 15000,
    })

    verifyPaymentLinkEmail(email, {
      participantName: participants[0].fullName,
      eventName: "[E2E-TEST] Payment Management",
      paymentUrl: `/pagamento/${epId}`,
      ticketPrice: 100,
    })

    const paymentUrl = extractPaymentUrlFromEmail(email)
    expect(paymentUrl).toContain(`/pagamento/${epId}`)
  })

  test("admin triggers manual payment - no email sent", async ({ page }) => {
    await page.goto(participantUrl(1))
    await page.waitForLoadState("networkidle")

    const paymentModeTrigger = page.locator("#payment_mode_select")
    await paymentModeTrigger.click()
    await page.getByRole("option", { name: "Manual" }).click()

    const statusTrigger = page.locator("#application_status")
    await statusTrigger.click()
    const savePromise = autoSavePromise(page)
    await page
      .getByRole("option", { name: "Dados de pagto enviados" })
      .click()

    await savePromise

    const epId = await getEventParticipantId(
      participants[1].profileId,
      eventId,
    )
    const pr = await getPaymentRequestByEventParticipantId(epId)
    assertPaymentRequest(pr)
    expect(pr.payment_mode).toBe("manual")

    await page.waitForTimeout(3000)
    const emails = await getAllEmails()
    const paymentEmails = emails.filter((e) => {
      const to = e.To.some(
        (r) =>
          `${r.Mailbox}@${r.Domain}`.toLowerCase() ===
          participants[1].email.toLowerCase(),
      )
      const subject = e.Content.Headers.Subject?.[0] || ""
      return to && subject.toLowerCase().includes("pagamento")
    })
    expect(paymentEmails).toHaveLength(0)
  })

  test("admin cancels pending automatic payment", async ({ page }) => {
    const epId = await getEventParticipantId(
      participants[2].profileId,
      eventId,
    )
    await deletePaymentRequestsByParticipant(epId)

    // Create a real payment on the mock Asaas server so DELETE returns
    // success. Previously the test seeded a fake asaas_payment_id; now that
    // cancelActivePaymentRequest rolls back when Asaas refuses (e.g. 404
    // for unknown payment), we need a real id.
    const customerResp = await fetch("http://localhost:9999/api/v3/customers", {
      method: "POST",
      headers: { "Content-Type": "application/json", access_token: "mock" },
      body: JSON.stringify({ name: "Test", cpfCnpj: "12345678900" }),
    })
    const customer = (await customerResp.json()) as { id: string }
    const paymentResp = await fetch("http://localhost:9999/api/v3/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json", access_token: "mock" },
      body: JSON.stringify({
        customer: customer.id,
        billingType: "PIX",
        value: 100,
        dueDate: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
      }),
    })
    const asaasPayment = (await paymentResp.json()) as { id: string }

    await seedPaymentRequest({
      eventParticipantId: epId,
      amount: 100,
      status: "pending",
      paymentMode: "automatic",
      asaasPaymentId: asaasPayment.id,
    })

    await page.goto(participantUrl(2))
    await page.waitForLoadState("networkidle")

    const cancelButton = page.getByRole("button", {
      name: "Cancelar pagamento",
    })
    await cancelButton.click()

    const confirmButton = page.getByRole("button", {
      name: "Confirmar cancelamento",
    })
    await expect(confirmButton).toBeVisible()
    await confirmButton.click()

    await page.waitForResponse(
      (resp) =>
        resp.request().method() === "POST" &&
        resp.url().includes("/participantes/") &&
        resp.status() === 200,
    )

    const pr = await getPaymentRequestByEventParticipantId(epId)
    assertPaymentRequest(pr)
    expect(pr.status).toBe("cancelled")

    // Verify the app actually called DELETE on the Asaas mock for the
    // specific payment id we created.
    const deleteCalls = (
      await getAsaasCallsByPath(/^\/api\/v3\/payments\/[^/]+$/)
    ).filter(
      (c) => c.method === "DELETE" && c.path.endsWith(asaasPayment.id),
    )
    expect(
      deleteCalls.length,
      "app should DELETE the specific Asaas payment when cancelling",
    ).toBeGreaterThanOrEqual(1)
  })

  test("admin marks manual payment as paid", async ({ page }) => {
    const epId = await getEventParticipantId(
      participants[2].profileId,
      eventId,
    )
    await deletePaymentRequestsByParticipant(epId)
    await seedPaymentRequest({
      eventParticipantId: epId,
      amount: 100,
      status: "pending",
      paymentMode: "manual",
    })

    await page.goto(participantUrl(2))
    await page.waitForLoadState("networkidle")

    const markPaidButton = page.getByRole("button", {
      name: "Marcar como pago",
    })
    await markPaidButton.click()

    const confirmButton = page.getByRole("button", {
      name: "Confirmar pagamento",
    })
    await expect(confirmButton).toBeVisible()
    await confirmButton.click()

    await page.waitForResponse(
      (resp) =>
        resp.request().method() === "POST" &&
        resp.url().includes("/participantes/") &&
        resp.status() === 200,
    )

    const pr = await getPaymentRequestByEventParticipantId(epId)
    assertPaymentRequest(pr)
    expect(pr.status).toBe("paid")
    expect(pr.paid_at).not.toBeNull()
  })

  test("admin refunds manual payment and receives refund email", async ({
    page,
  }) => {
    const epId = await getEventParticipantId(
      participants[2].profileId,
      eventId,
    )
    await deletePaymentRequestsByParticipant(epId)
    await seedPaymentRequest({
      eventParticipantId: epId,
      amount: 100,
      status: "paid",
      paymentMode: "manual",
    })

    await page.goto(participantUrl(2))
    await page.waitForLoadState("networkidle")

    const refundButton = page.getByRole("button", {
      name: "Marcar como reembolsado",
    })
    await refundButton.click()

    const confirmButton = page.getByRole("button", {
      name: "Confirmar reembolso",
    })
    await expect(confirmButton).toBeVisible()
    await confirmButton.click()

    await page.waitForResponse(
      (resp) =>
        resp.request().method() === "POST" &&
        resp.url().includes("/participantes/") &&
        resp.status() === 200,
    )

    const pr = await getPaymentRequestByEventParticipantId(epId)
    assertPaymentRequest(pr)
    expect(pr.status).toBe("refunded")

    const email = await waitForEmail({
      to: participants[2].email,
      subject: "eembolso",
      timeout: 15000,
    })

    verifyRefundEmail(email, {
      participantName: participants[2].fullName,
      eventName: "[E2E-TEST] Payment Management",
      refundAmount: 100,
    })
  })

  test("admin resends payment link", async ({ page }) => {
    await clearAllEmails()

    await page.goto(participantUrl(0))
    await page.waitForLoadState("networkidle")

    const resendButton = page.getByRole("button", { name: "Reenviar link" })
    await expect(resendButton).toBeVisible({ timeout: 10000 })
    await resendButton.click()

    await page.waitForResponse(
      (resp) =>
        resp.request().method() === "POST" &&
        resp.url().includes("/participantes/") &&
        resp.status() === 200,
    )

    const epId = await getEventParticipantId(
      participants[0].profileId,
      eventId,
    )
    const email = await waitForEmail({
      to: participants[0].email,
      subject: "pagamento",
      timeout: 15000,
    })

    verifyPaymentLinkEmail(email, {
      participantName: participants[0].fullName,
      eventName: "[E2E-TEST] Payment Management",
      paymentUrl: `/pagamento/${epId}`,
      ticketPrice: 100,
    })
  })

  test("webhook PAYMENT_CONFIRMED marks payment as paid", async ({ page }) => {
    const epId = await getEventParticipantId(
      participants[2].profileId,
      eventId,
    )
    await deletePaymentRequestsByParticipant(epId)
    const fakeAsaasId = `pay_confirmed_test_${Date.now()}`
    await seedPaymentRequest({
      eventParticipantId: epId,
      amount: 100,
      status: "awaiting_payment",
      paymentMode: "automatic",
      asaasPaymentId: fakeAsaasId,
    })

    const result = await postWebhook({
      event: "PAYMENT_CONFIRMED",
      payment: { id: fakeAsaasId },
    })

    expect(result.status).toBe(200)
    expect("action" in result.body && result.body.action).toBe("marked_paid")

    const pr = await getPaymentRequestByEventParticipantId(epId)
    assertPaymentRequest(pr)
    expect(pr.status).toBe("paid")

    await page.goto(participantUrl(2))
    await page.waitForLoadState("networkidle")
    await expect(page.getByText("Status: Pago")).toBeVisible({ timeout: 10000 })
  })

  test("webhook PAYMENT_OVERDUE marks payment as expired", async ({
    page,
  }) => {
    const epId = await getEventParticipantId(
      participants[2].profileId,
      eventId,
    )
    await deletePaymentRequestsByParticipant(epId)
    const fakeAsaasId = `pay_overdue_test_${Date.now()}`
    await seedPaymentRequest({
      eventParticipantId: epId,
      amount: 100,
      status: "awaiting_payment",
      paymentMode: "automatic",
      asaasPaymentId: fakeAsaasId,
    })

    const result = await postWebhook({
      event: "PAYMENT_OVERDUE",
      payment: { id: fakeAsaasId },
    })

    expect(result.status).toBe(200)
    expect("action" in result.body && result.body.action).toBe(
      "marked_expired",
    )

    const pr = await getPaymentRequestByEventParticipantId(epId)
    assertPaymentRequest(pr)
    expect(pr.status).toBe("expired")

    await page.goto(participantUrl(2))
    await page.waitForLoadState("networkidle")
    await expect(page.getByText("Status: Expirado")).toBeVisible({ timeout: 10000 })
  })

  test("webhook rejects request with invalid token when ASAAS_WEBHOOK_TOKEN is set", async () => {
    const epId = await getEventParticipantId(
      participants[2].profileId,
      eventId,
    )
    await deletePaymentRequestsByParticipant(epId)
    await seedPaymentRequest({
      eventParticipantId: epId,
      amount: 100,
      status: "awaiting_payment",
      paymentMode: "automatic",
      asaasPaymentId: `pay_auth_test_${Date.now()}`,
    })

    const webhookToken = process.env.ASAAS_WEBHOOK_TOKEN
    if (!webhookToken) {
      test.skip(
        true,
        "ASAAS_WEBHOOK_TOKEN not configured; auth can't be enforced",
      )
      return
    }

    const response = await fetch(`http://localhost:5173/api/asaas-webhook`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "asaas-access-token": "wrong-token",
      },
      body: JSON.stringify({
        event: "PAYMENT_CONFIRMED",
        payment: { id: "pay_auth_test" },
      }),
    })

    expect(response.status).toBe(401)
  })
})
