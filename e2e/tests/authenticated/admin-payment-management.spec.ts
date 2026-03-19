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
})

function participantUrl(participantIndex: number): string {
  return `/admin/eventos/${eventId}/participantes/${participants[participantIndex].profileId}`
}

async function waitForAutoSave(page: import("@playwright/test").Page) {
  await page.waitForResponse(
    (resp) =>
      resp.request().method() === "POST" &&
      resp.url().includes("/participantes/") &&
      resp.status() === 200,
  )
}

test.describe("Admin Payment Management", () => {
  test("admin triggers automatic payment", async ({ page }) => {
    await page.goto(participantUrl(0))
    await page.waitForLoadState("networkidle")

    const trigger = page.locator("#application_status")
    await trigger.click()
    await page
      .getByRole("option", { name: "Dados de pagto enviados" })
      .click()

    await waitForAutoSave(page)

    const epId = await getEventParticipantId(participants[0].profileId, eventId)
    const pr = await getPaymentRequestByEventParticipantId(epId)
    expect(pr).not.toBeNull()
    expect(pr!.status).toBe("pending")
    expect(pr!.payment_mode).toBe("automatic")

    const email = await waitForEmail({
      to: participants[0].email,
      subject: "pagamento",
      timeout: 15000,
    })
    expect(email).toBeTruthy()
  })

  test("admin triggers manual payment - no email sent", async ({ page }) => {
    await page.goto(participantUrl(1))
    await page.waitForLoadState("networkidle")

    const paymentModeTrigger = page.locator("#payment_mode_select")
    await paymentModeTrigger.click()
    await page.getByRole("option", { name: "Manual" }).click()

    const statusTrigger = page.locator("#application_status")
    await statusTrigger.click()
    await page
      .getByRole("option", { name: "Dados de pagto enviados" })
      .click()

    await waitForAutoSave(page)

    const epId = await getEventParticipantId(participants[1].profileId, eventId)
    const pr = await getPaymentRequestByEventParticipantId(epId)
    expect(pr).not.toBeNull()
    expect(pr!.payment_mode).toBe("manual")

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
    const epId = await getEventParticipantId(participants[2].profileId, eventId)
    await deletePaymentRequestsByParticipant(epId)
    await seedPaymentRequest({
      eventParticipantId: epId,
      amount: 100,
      status: "pending",
      paymentMode: "automatic",
      asaasPaymentId: `pay_cancel_test_${Date.now()}`,
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
    expect(pr).not.toBeNull()
    expect(pr!.status).toBe("cancelled")
  })

  test("admin marks manual payment as paid", async ({ page }) => {
    const epId = await getEventParticipantId(participants[2].profileId, eventId)
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
    expect(pr).not.toBeNull()
    expect(pr!.status).toBe("paid")
    expect(pr!.paid_at).not.toBeNull()
  })

  test("admin refunds manual payment and receives refund email", async ({
    page,
  }) => {
    const epId = await getEventParticipantId(participants[2].profileId, eventId)
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
    expect(pr).not.toBeNull()
    expect(pr!.status).toBe("refunded")

    const email = await waitForEmail({
      to: participants[2].email,
      subject: "eembolso",
      timeout: 15000,
    })
    expect(email).toBeTruthy()
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

    const email = await waitForEmail({
      to: participants[0].email,
      subject: "pagamento",
      timeout: 15000,
    })
    expect(email).toBeTruthy()
  })

  test("webhook PAYMENT_CONFIRMED marks payment as paid", async ({ page }) => {
    const epId = await getEventParticipantId(participants[2].profileId, eventId)
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
    expect(pr).not.toBeNull()
    expect(pr!.status).toBe("paid")

    await page.goto(participantUrl(2))
    await page.waitForLoadState("networkidle")
    await expect(page.getByText("Pago")).toBeVisible({ timeout: 10000 })
  })

  test("webhook PAYMENT_OVERDUE marks payment as expired", async ({
    page,
  }) => {
    const epId = await getEventParticipantId(participants[2].profileId, eventId)
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
    expect(pr).not.toBeNull()
    expect(pr!.status).toBe("expired")

    await page.goto(participantUrl(2))
    await page.waitForLoadState("networkidle")
    await expect(page.getByText("Expirado")).toBeVisible({ timeout: 10000 })
  })
})
