import { test, expect } from "@playwright/test"
import path from "node:path"
import { PaymentPage } from "../../pages/PaymentPage"
import {
  createTestEvent,
  cleanupTestPaymentEvent,
  seedPaymentRequest,
  getEventParticipantId,
  deletePaymentRequestsByParticipant,
  getPaymentRequestByEventParticipantId,
  postWebhook,
} from "../../utils/payment-helpers"
import {
  createTestEventWithParticipants,
  cleanupTestParticipants,
  type TestParticipant,
} from "../../utils/event-helpers"
import { createSupabaseAdminClient } from "../../utils/db-cleanup"
import { readAuthenticatedUserInfo } from "../../utils/user-management"
import {
  resetAsaasState,
  getAllAsaasPayments,
  getAllAsaasCustomers,
} from "../../mocks/asaas-mock-server"

test.use({
  storageState: path.resolve(import.meta.dirname, "../../.auth/user.json"),
})

const TEST_EVENT_TITLE = "[E2E-TEST] Payment Page Test"

let eventId: string
let participants: TestParticipant[]

test.beforeAll(async () => {
  const event = await createTestEvent({
    title: TEST_EVENT_TITLE,
    ticketPrice: 220,
  })
  eventId = event.id
  participants = await createTestEventWithParticipants(eventId, 1)
})

test.afterAll(async () => {
  if (!participants) return
  for (const p of participants) {
    const epId = await getEventParticipantId(p.profileId, eventId).catch(
      () => null,
    )
    if (epId) await deletePaymentRequestsByParticipant(epId)
  }
  await cleanupTestParticipants(participants)
  if (eventId) await cleanupTestPaymentEvent(eventId)
})

test.describe("User Payment Page", () => {
  test.beforeEach(async () => {
    await resetAsaasState()
  })

  test("non-owner is redirected with error", async ({ page }) => {
    const epId = await getEventParticipantId(
      participants[0].profileId,
      eventId,
    )

    await seedPaymentRequest({
      eventParticipantId: epId,
      amount: 220,
      status: "pending",
      paymentMode: "automatic",
    })

    const paymentPage = new PaymentPage(page)
    await paymentPage.navigate(epId)

    await expect(page).toHaveURL("/")
    await expect(
      page.getByText("Você não tem permissão"),
    ).toBeVisible()

    await deletePaymentRequestsByParticipant(epId)
  })

  test("owner sees payment options with correct prices", async ({ page }) => {
    const supabase = createSupabaseAdminClient()

    // Look up the specific user created by auth setup for this test project.
    // This file is written by e2e/tests/auth/setup.ts and is deterministic.
    const userInfo = await readAuthenticatedUserInfo()
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, email, full_name, user_id")
      .eq("user_id", userInfo.userId)
      .single()

    if (!profile) throw new Error(
      `Could not find profile for authenticated user ${userInfo.email}`,
    )

    const { data: ep, error } = await supabase
      .from("event_participants")
      .insert({
        profile_id: profile.id,
        event_id: eventId,
        is_user_applied: true,
        application_status: "sent_payment_data",
      })
      .select()
      .single()

    if (error || !ep)
      throw new Error(
        `Failed to create event_participant: ${error?.message}`,
      )

    await seedPaymentRequest({
      eventParticipantId: ep.id,
      amount: 220,
      status: "pending",
      paymentMode: "automatic",
    })

    const paymentPage = new PaymentPage(page)
    await paymentPage.navigate(ep.id)

    await paymentPage.expectReadyState(TEST_EVENT_TITLE)

    const options = await paymentPage.getPaymentOptionTexts()
    expect(options.length).toBeGreaterThanOrEqual(2)
    expect(options.some((o) => o.includes("Pix"))).toBe(true)
    expect(options.some((o) => o.includes("Cartão"))).toBe(true)

    await deletePaymentRequestsByParticipant(ep.id)
    await supabase.from("event_participants").delete().eq("id", ep.id)
  })

  test("full journey: owner selects PIX → Asaas call → invoice redirect → webhook → paid", async ({
    page,
  }) => {
    const supabase = createSupabaseAdminClient()

    const userInfo = await readAuthenticatedUserInfo()
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, email, full_name, cpf")
      .eq("user_id", userInfo.userId)
      .single()

    if (!profile) throw new Error(
      `Could not find profile for authenticated user ${userInfo.email}`,
    )

    // App requires CPF to create an Asaas customer. Snapshot + restore so
    // we don't leak state to other tests that assume "new user has no CPF".
    const originalCpf = profile.cpf
    if (!profile.cpf) {
      await supabase
        .from("profiles")
        .update({ cpf: "12345678900" })
        .eq("id", profile.id)
    }

    const { data: ep, error } = await supabase
      .from("event_participants")
      .insert({
        profile_id: profile.id,
        event_id: eventId,
        is_user_applied: true,
        application_status: "sent_payment_data",
      })
      .select()
      .single()

    if (error || !ep)
      throw new Error(
        `Failed to create event_participant: ${error?.message}`,
      )

    await seedPaymentRequest({
      eventParticipantId: ep.id,
      amount: 220,
      status: "pending",
      paymentMode: "automatic",
    })

    const paymentPage = new PaymentPage(page)
    await paymentPage.navigate(ep.id)
    await paymentPage.expectReadyState(TEST_EVENT_TITLE)

    // Select PIX and submit — should redirect to Asaas mock invoice URL
    const invoiceUrl = await paymentPage.submitAndWaitForRedirect("PIX")
    expect(invoiceUrl).toMatch(/\/mock-invoice\//)

    // Verify the mock received a proper customer + payment creation
    const customers = await getAllAsaasCustomers()
    expect(customers, "one customer was created in Asaas").toHaveLength(1)
    expect(customers[0].name).toBeTruthy()
    expect(customers[0].cpfCnpj).toBeTruthy()

    const payments = await getAllAsaasPayments()
    expect(payments, "one payment was created in Asaas").toHaveLength(1)
    expect(payments[0].billingType).toBe("PIX")
    expect(payments[0].value).toBe(220)
    expect(payments[0].status).toBe("PENDING")

    // Verify DB reflects the Asaas payment
    const pr = await getPaymentRequestByEventParticipantId(ep.id)
    if (!pr) throw new Error("Payment request missing after submit")
    expect(pr.status).toBe("awaiting_payment")
    expect(pr.asaas_payment_id).toBe(payments[0].id)
    expect(pr.payment_method).toBe("PIX")

    // Simulate Asaas webhook confirming the payment
    const webhookResult = await postWebhook({
      event: "PAYMENT_RECEIVED",
      payment: { id: payments[0].id, value: 220 },
    })
    expect(webhookResult.status).toBe(200)

    const finalPr = await getPaymentRequestByEventParticipantId(ep.id)
    if (!finalPr) throw new Error("Payment request missing after webhook")
    expect(finalPr.status).toBe("paid")
    expect(finalPr.paid_at).not.toBeNull()

    await deletePaymentRequestsByParticipant(ep.id)
    await supabase.from("event_participants").delete().eq("id", ep.id)

    // Restore CPF to its pre-test value so we don't leak state
    await supabase
      .from("profiles")
      .update({ cpf: originalCpf })
      .eq("id", profile.id)
  })
})
