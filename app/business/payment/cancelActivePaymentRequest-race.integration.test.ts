import { describe, expect, it, beforeEach, afterEach, vi } from "vitest"
import { setupIntegrationTest, cleanupAfterTest } from "~/test/integration-setup"
import {
  createTestProfile,
  createTestEvent,
  createTestEventParticipant,
} from "~/test/db-test-utils"
import { cancelActivePaymentRequest } from "./payment-request.server"
import * as asaasClient from "./asaas-client.server"
import { kyselyDb } from "~/kysely-db"

describe("cancelActivePaymentRequest — race condition (integration)", () => {
  const { tracker, kysely } = setupIntegrationTest()

  beforeEach(() => {
    tracker.clear()
    vi.restoreAllMocks()
  })

  afterEach(async () => {
    await cleanupAfterTest(tracker, kysely)
  })

  it("must NOT clobber a concurrently-updated row (e.g. paid via webhook)", async () => {
    const profile = await createTestProfile(tracker, kysely, {
      user_id: null,
      email: `cancel-race-${Date.now()}@test.example`,
      full_name: "Cancel Race",
      cpf: "12345678900",
    })
    const event = await createTestEvent(tracker, kysely, {
      title: "Cancel Race Event",
      ticket_price: 100,
    })
    const ep = await createTestEventParticipant(tracker, kysely, {
      profile_id: profile.id,
      event_id: event.id,
      application_status: "sent_payment_data",
    })

    const pr = await kysely
      .insertInto("payment_requests")
      .values({
        event_participant_id: ep.id,
        amount: 100,
        status: "pending",
        payment_mode: "automatic",
        asaas_payment_id: "pay_cancel_race_test",
        expires_at: new Date(Date.now() + 60000).toISOString(),
      })
      .returningAll()
      .executeTakeFirstOrThrow()
    tracker.track("payment_requests", pr.id)

    const cancelSpy = vi
      .spyOn(asaasClient, "cancelAsaasPayment")
      .mockResolvedValue(undefined)

    // Scenario: row gets paid (e.g. via webhook) BEFORE admin clicks cancel.
    // getActivePaymentRequest returns non-cancelled non-expired rows, so a
    // "paid" row still passes that filter. The fixed code's UPDATE has
    // WHERE status IN (pending, awaiting_payment) — so against a paid row
    // the UPDATE must NOT succeed, and Asaas cancel must NOT be called.
    //
    // Without the guard (the bug), cancel would:
    //   - call Asaas cancel on a paid charge (reversing a legit payment!)
    //   - flip DB status from paid → cancelled (wipes paid_at)
    await kyselyDb
      .updateTable("payment_requests")
      .set({ status: "paid", paid_at: new Date().toISOString() })
      .where("id", "=", pr.id)
      .execute()

    await cancelActivePaymentRequest(ep.id)

    const finalPr = await kyselyDb
      .selectFrom("payment_requests")
      .selectAll()
      .where("id", "=", pr.id)
      .executeTakeFirstOrThrow()

    expect(
      finalPr.status,
      "paid status MUST NOT be clobbered by cancel",
    ).toBe("paid")
    expect(
      cancelSpy,
      "Asaas cancel MUST NOT be called against a paid charge",
    ).not.toHaveBeenCalled()
  })
})
