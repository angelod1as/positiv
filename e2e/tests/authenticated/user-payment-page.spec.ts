import { test, expect } from "@playwright/test"
import path from "node:path"
import { PaymentPage } from "../../pages/PaymentPage"
import {
  createTestEvent,
  cleanupTestPaymentEvent,
  seedPaymentRequest,
  getEventParticipantId,
  deletePaymentRequestsByParticipant,
} from "../../utils/payment-helpers"
import {
  createTestEventWithParticipants,
  cleanupTestParticipants,
  type TestParticipant,
} from "../../utils/event-helpers"
import { createSupabaseAdminClient } from "../../utils/db-cleanup"

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

    // The E2E setup creates a fresh user with a random email for the user.json auth state.
    // We need to find that user's profile to create an EP they own.
    // Navigate to dashboard to get Supabase session cookie, then extract user ID.
    await page.goto("/dashboard")
    await page.waitForLoadState("networkidle")

    // Find the authenticated user's profile (most recently created test user, not test-participant)
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, email, full_name, user_id")
      .ilike("email", "test-%@example.com")
      .not("email", "ilike", "test-participant-%")
      .order("created_at", { ascending: false })
      .limit(1)
      .single()

    if (!profile) throw new Error("Could not find the E2E test user profile")
    console.info("Authenticated user email:", profile.email)

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
})
