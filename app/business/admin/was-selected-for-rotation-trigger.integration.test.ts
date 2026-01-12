import { describe, expect, it, beforeEach, afterEach } from "vitest"
import { setupIntegrationTest, cleanupAfterTest } from "~/test/integration-setup"
import {
  createTestEvent,
  createTestEventParticipant,
  createTestProfile,
} from "~/test/db-test-utils"

describe("was_selected_for_rotation trigger (POS-386)", () => {
  const { tracker, kysely } = setupIntegrationTest()

  beforeEach(async () => {
    tracker.clear()

    await kysely
      .deleteFrom("event_participants")
      .where("profile_id", "in", (eb) =>
        eb
          .selectFrom("profiles")
          .select("id")
          .where("email", "like", "test-rotation-trigger-%"),
      )
      .execute()
  })

  afterEach(async () => {
    await cleanupAfterTest(tracker, kysely)
  })

  it("should set was_selected_for_rotation to true when attendance_status is set to skipped", async () => {
    const profile = await createTestProfile(tracker, kysely, {
      user_id: null,
      email: "test-rotation-trigger-skipped@example.com",
      full_name: "Test Profile - Trigger Skipped",
    })

    const event = await createTestEvent(tracker, kysely, {
      title: "Test Event for Trigger",
      emoji: "🎯",
      location: "Test Location",
      description: "Test Description",
      event_status: "Registration Open",
      event_type: "regular",
      time_event_start: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      time_event_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString(),
      time_application_start: new Date().toISOString(),
      ticket_price: 100,
      total_spots: 50,
    })

    const participant = await createTestEventParticipant(tracker, kysely, {
      profile_id: profile.id,
      event_id: event.id,
      is_user_applied: true,
      application_status: "finalised",
      attendance_status: "skipped",
    })

    const result = await kysely
      .selectFrom("event_participants")
      .select(["was_selected_for_rotation", "attendance_status"])
      .where("id", "=", participant.id)
      .executeTakeFirstOrThrow()

    expect(result.attendance_status).toBe("skipped")
    expect(result.was_selected_for_rotation).toBe(true)
  })

  it("should keep was_selected_for_rotation true when attendance_status changes from skipped to attended", async () => {
    const profile = await createTestProfile(tracker, kysely, {
      user_id: null,
      email: "test-rotation-trigger-skipped-then-attended@example.com",
      full_name: "Test Profile - Skipped Then Attended",
    })

    const event = await createTestEvent(tracker, kysely, {
      title: "Test Event for Status Change",
      emoji: "🔄",
      location: "Test Location",
      description: "Test Description",
      event_status: "Registration Open",
      event_type: "regular",
      time_event_start: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      time_event_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString(),
      time_application_start: new Date().toISOString(),
      ticket_price: 100,
      total_spots: 50,
    })

    const participant = await createTestEventParticipant(tracker, kysely, {
      profile_id: profile.id,
      event_id: event.id,
      is_user_applied: true,
      application_status: "finalised",
      attendance_status: "skipped",
    })

    const beforeUpdate = await kysely
      .selectFrom("event_participants")
      .select(["was_selected_for_rotation", "attendance_status"])
      .where("id", "=", participant.id)
      .executeTakeFirstOrThrow()

    expect(beforeUpdate.attendance_status).toBe("skipped")
    expect(beforeUpdate.was_selected_for_rotation).toBe(true)

    await kysely
      .updateTable("event_participants")
      .set({ attendance_status: "attended" })
      .where("id", "=", participant.id)
      .execute()

    const afterUpdate = await kysely
      .selectFrom("event_participants")
      .select(["was_selected_for_rotation", "attendance_status"])
      .where("id", "=", participant.id)
      .executeTakeFirstOrThrow()

    expect(afterUpdate.attendance_status).toBe("attended")
    expect(afterUpdate.was_selected_for_rotation).toBe(true)
  })

  it("should keep was_selected_for_rotation false when attendance_status is never skipped", async () => {
    const profile = await createTestProfile(tracker, kysely, {
      user_id: null,
      email: "test-rotation-trigger-never-skipped@example.com",
      full_name: "Test Profile - Never Skipped",
    })

    const event = await createTestEvent(tracker, kysely, {
      title: "Test Event Never Skipped",
      emoji: "✅",
      location: "Test Location",
      description: "Test Description",
      event_status: "Registration Open",
      event_type: "regular",
      time_event_start: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      time_event_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString(),
      time_application_start: new Date().toISOString(),
      ticket_price: 100,
      total_spots: 50,
    })

    const participant = await createTestEventParticipant(tracker, kysely, {
      profile_id: profile.id,
      event_id: event.id,
      is_user_applied: true,
      application_status: "finalised",
      attendance_status: "pending",
    })

    const afterInsert = await kysely
      .selectFrom("event_participants")
      .select(["was_selected_for_rotation", "attendance_status"])
      .where("id", "=", participant.id)
      .executeTakeFirstOrThrow()

    expect(afterInsert.attendance_status).toBe("pending")
    expect(afterInsert.was_selected_for_rotation).toBe(false)

    await kysely
      .updateTable("event_participants")
      .set({ attendance_status: "attended" })
      .where("id", "=", participant.id)
      .execute()

    const afterUpdate = await kysely
      .selectFrom("event_participants")
      .select(["was_selected_for_rotation", "attendance_status"])
      .where("id", "=", participant.id)
      .executeTakeFirstOrThrow()

    expect(afterUpdate.attendance_status).toBe("attended")
    expect(afterUpdate.was_selected_for_rotation).toBe(false)
  })

  it("should set was_selected_for_rotation to true when updating from pending to skipped", async () => {
    const profile = await createTestProfile(tracker, kysely, {
      user_id: null,
      email: "test-rotation-trigger-pending-to-skipped@example.com",
      full_name: "Test Profile - Pending to Skipped",
    })

    const event = await createTestEvent(tracker, kysely, {
      title: "Test Event Pending to Skipped",
      emoji: "⏳",
      location: "Test Location",
      description: "Test Description",
      event_status: "Registration Open",
      event_type: "regular",
      time_event_start: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      time_event_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString(),
      time_application_start: new Date().toISOString(),
      ticket_price: 100,
      total_spots: 50,
    })

    const participant = await createTestEventParticipant(tracker, kysely, {
      profile_id: profile.id,
      event_id: event.id,
      is_user_applied: true,
      application_status: "finalised",
      attendance_status: "pending",
    })

    const beforeUpdate = await kysely
      .selectFrom("event_participants")
      .select(["was_selected_for_rotation", "attendance_status"])
      .where("id", "=", participant.id)
      .executeTakeFirstOrThrow()

    expect(beforeUpdate.attendance_status).toBe("pending")
    expect(beforeUpdate.was_selected_for_rotation).toBe(false)

    await kysely
      .updateTable("event_participants")
      .set({ attendance_status: "skipped" })
      .where("id", "=", participant.id)
      .execute()

    const afterUpdate = await kysely
      .selectFrom("event_participants")
      .select(["was_selected_for_rotation", "attendance_status"])
      .where("id", "=", participant.id)
      .executeTakeFirstOrThrow()

    expect(afterUpdate.attendance_status).toBe("skipped")
    expect(afterUpdate.was_selected_for_rotation).toBe(true)
  })
})
