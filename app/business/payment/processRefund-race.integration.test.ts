import { describe, expect, it, beforeEach, afterEach, vi } from "vitest"
import { setupIntegrationTest, cleanupAfterTest } from "~/test/integration-setup"
import {
  createTestProfile,
  createTestEvent,
  createTestEventParticipant,
} from "~/test/db-test-utils"
import { processRefund } from "./trigger-payment-request.server"
import * as asaasClient from "./asaas-client.server"
import { kyselyDb } from "~/kysely-db"

describe("processRefund — race condition (integration)", () => {
  const { tracker, kysely } = setupIntegrationTest()

  beforeEach(() => {
    tracker.clear()
    vi.restoreAllMocks()
  })

  afterEach(async () => {
    await cleanupAfterTest(tracker, kysely)
  })

  it("must NOT call Asaas refund when payment is no longer 'paid' (lost race)", async () => {
    // Arrange: real profile, event, participant and a paid payment_request
    const profile = await createTestProfile(tracker, kysely, {
      user_id: null,
      email: `refund-race-${Date.now()}@test.example`,
      full_name: "Race Test",
      cpf: "12345678900",
    })
    const event = await createTestEvent(tracker, kysely, {
      title: "Race Event",
      ticket_price: 100,
    })
    const ep = await createTestEventParticipant(tracker, kysely, {
      profile_id: profile.id,
      event_id: event.id,
      application_status: "finalised",
    })

    const pr = await kysely
      .insertInto("payment_requests")
      .values({
        event_participant_id: ep.id,
        amount: 100,
        status: "paid",
        payment_mode: "automatic",
        payment_method: "PIX",
        asaas_payment_id: "pay_race_test",
        paid_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 60000).toISOString(),
      })
      .returningAll()
      .executeTakeFirstOrThrow()
    tracker.track("payment_requests", pr.id)

    // Simulate the race: the SELECT in processRefund sees the row as "paid",
    // but by the time the optimistic UPDATE runs, another caller already
    // flipped it to "refunded". To reproduce this without concurrency, we
    // spy on refundAsaasPayment and flip the DB inside that spy's side effect
    // — except the UPDATE in processRefund runs BEFORE Asaas is called.
    //
    // The real race point: between processRefund's initial SELECT (line 123)
    // and the optimistic UPDATE (line 141). We hook into a SELECT-adjacent
    // operation by using a flag and flipping from another call.
    //
    // Cleaner approach: run processRefund twice in parallel. With the bug,
    // both calls see status='paid' on SELECT, both UPDATE (one no-ops but
    // gets a truthy UpdateResult), both call Asaas refund.
    const refundSpy = vi
      .spyOn(asaasClient, "refundAsaasPayment")
      .mockResolvedValue(undefined)

    // Act: fire two processRefund calls in parallel to trigger the race
    const [r1, r2] = await Promise.all([
      processRefund(ep.id),
      processRefund(ep.id),
    ])

    // Assert: at most ONE call to Asaas, regardless of which won the race
    expect(
      refundSpy,
      "refundAsaasPayment must be called AT MOST once (no double-refund)",
    ).toHaveBeenCalledTimes(1)

    // One of the two calls should have succeeded, the other failed
    const succeeded = [r1, r2].filter((r) => r.success).length
    const failed = [r1, r2].filter((r) => !r.success).length
    expect(succeeded, "exactly one caller should succeed").toBe(1)
    expect(failed, "exactly one caller should fail").toBe(1)

    // Final DB state should be refunded exactly once
    const finalPr = await kyselyDb
      .selectFrom("payment_requests")
      .selectAll()
      .where("id", "=", pr.id)
      .executeTakeFirstOrThrow()
    expect(finalPr.status).toBe("refunded")
  })
})
