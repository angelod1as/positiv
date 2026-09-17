import { describe, expect, it } from "vitest"
import {
  cleanupTestData,
  createTestEvent,
  createTestEventParticipant,
  createTestProfile,
  TestDataTracker,
} from "~/test/db-test-utils"
import { getTestKysely } from "~/test/integration-setup"

describe("cleanupTestData", () => {
  const kysely = getTestKysely()

  it("removes a participant whose payment the code under test inserted", async () => {
    const tracker = new TestDataTracker()
    const event = await createTestEvent(tracker, kysely, {
      title: "Cleanup Event",
    })
    const profile = await createTestProfile(tracker, kysely, {
      user_id: null,
      email: `test${Date.now()}-cleanup@example.com`,
      full_name: "Cleanup Tester",
    })
    const participant = await createTestEventParticipant(tracker, kysely, {
      event_id: event.id,
      profile_id: profile.id,
    })

    // Inserted the way createPaymentOffer does it: straight into the table,
    // with no factory to tell the tracker.
    const now = new Date().toISOString()
    await kysely
      .insertInto("payments")
      .values({
        event_participant_id: participant.id,
        kind: "asaas",
        status: "pending",
        base_amount: 22000,
        due_at: now,
      })
      .execute()

    await cleanupTestData(tracker, kysely)

    const [participants, payments, events] = await Promise.all([
      kysely
        .selectFrom("event_participants")
        .select("id")
        .where("id", "=", participant.id)
        .execute(),
      kysely
        .selectFrom("payments")
        .select("id")
        .where("event_participant_id", "=", participant.id)
        .execute(),
      kysely
        .selectFrom("events")
        .select("id")
        .where("id", "=", event.id)
        .execute(),
    ])

    expect(payments).toHaveLength(0)
    expect(participants).toHaveLength(0)
    expect(events).toHaveLength(0)
  })
})
