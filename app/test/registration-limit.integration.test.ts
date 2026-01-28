import { describe, expect, it, beforeEach, afterEach } from "vitest"
import { setupIntegrationTest, cleanupAfterTest } from "~/test/integration-setup"
import { createTestProfile, createTestEvent } from "~/test/db-test-utils"

describe("Registration Limit - Integration Tests", () => {
  const { tracker, kysely } = setupIntegrationTest()

  beforeEach(async () => {
    tracker.clear()
  })

  afterEach(async () => {
    await cleanupAfterTest(tracker, kysely)
  })

  it("should close registrations when 90 participants apply", async () => {
    const testId = Date.now()
    const event = await createTestEvent(tracker, kysely, {
      title: "Test Event - Capacity Test",
      event_status: "Registration Open",
    })

    const profiles = await Promise.all(
      Array.from({ length: 89 }, (_, i) =>
        createTestProfile(tracker, kysely, {
          user_id: null,
          full_name: `Test User ${i + 1}`,
          email: `test${testId}-${i + 1}@example.com`,
        }),
      ),
    )

    for (const profile of profiles) {
      await kysely
        .insertInto("event_participants")
        .values({
          event_id: event.id,
          profile_id: profile.id,
          is_user_applied: true,
          application_status: "finalised",
          attendance_status: "pending",
        })
        .execute()
    }

    const eventBefore = await kysely
      .selectFrom("events")
      .select("event_status")
      .where("id", "=", event.id)
      .executeTakeFirstOrThrow()

    expect(eventBefore.event_status).toBe("Registration Open")

    const profile90 = await createTestProfile(tracker, kysely, {
      user_id: null,
      full_name: "Test User 90",
      email: `test${testId}-90@example.com`,
    })

    await kysely
      .insertInto("event_participants")
      .values({
        event_id: event.id,
        profile_id: profile90.id,
        is_user_applied: true,
        application_status: "finalised",
        attendance_status: "pending",
      })
      .execute()

    const eventAfter = await kysely
      .selectFrom("events")
      .select("event_status")
      .where("id", "=", event.id)
      .executeTakeFirstOrThrow()

    expect(eventAfter.event_status).toBe("Registration Closed")
  })

  it("should keep registrations open with 89 participants", async () => {
    const testId = Date.now() + 1
    const event = await createTestEvent(tracker, kysely, {
      title: "Test Event - Under Capacity",
      event_status: "Registration Open",
    })

    const profiles = await Promise.all(
      Array.from({ length: 89 }, (_, i) =>
        createTestProfile(tracker, kysely, {
          user_id: null,
          full_name: `Test User ${i + 1}`,
          email: `test${testId}-${i + 1}@example.com`,
        }),
      ),
    )

    for (const profile of profiles) {
      await kysely
        .insertInto("event_participants")
        .values({
          event_id: event.id,
          profile_id: profile.id,
          is_user_applied: true,
          application_status: "finalised",
          attendance_status: "pending",
        })
        .execute()
    }

    const eventAfter = await kysely
      .selectFrom("events")
      .select("event_status")
      .where("id", "=", event.id)
      .executeTakeFirstOrThrow()

    expect(eventAfter.event_status).toBe("Registration Open")
  })

  it("should not count admin-added participants toward limit", async () => {
    const testId = Date.now() + 2
    const event = await createTestEvent(tracker, kysely, {
      title: "Test Event - Admin Participants",
      event_status: "Registration Open",
    })

    const userProfiles = await Promise.all(
      Array.from({ length: 89 }, (_, i) =>
        createTestProfile(tracker, kysely, {
          user_id: null,
          full_name: `User ${i + 1}`,
          email: `user${testId}-${i + 1}@example.com`,
        }),
      ),
    )

    for (const profile of userProfiles) {
      await kysely
        .insertInto("event_participants")
        .values({
          event_id: event.id,
          profile_id: profile.id,
          is_user_applied: true,
          application_status: "finalised",
          attendance_status: "pending",
        })
        .execute()
    }

    const adminProfiles = await Promise.all(
      Array.from({ length: 10 }, (_, i) =>
        createTestProfile(tracker, kysely, {
          user_id: null,
          full_name: `Admin User ${i + 1}`,
          email: `admin${testId}-${i + 1}@example.com`,
        }),
      ),
    )

    for (const profile of adminProfiles) {
      await kysely
        .insertInto("event_participants")
        .values({
          event_id: event.id,
          profile_id: profile.id,
          is_user_applied: false,
          application_status: "finalised",
          attendance_status: "pending",
        })
        .execute()
    }

    const eventAfter = await kysely
      .selectFrom("events")
      .select("event_status")
      .where("id", "=", event.id)
      .executeTakeFirstOrThrow()

    expect(eventAfter.event_status).toBe("Registration Open")
  })
})
