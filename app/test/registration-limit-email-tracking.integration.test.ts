import { describe, expect, it, beforeEach, afterEach } from "vitest"
import { setupIntegrationTest, cleanupAfterTest } from "~/test/integration-setup"
import { createTestEvent } from "~/test/db-test-utils"

describe("Registration Limit Email Tracking - Integration Tests", () => {
  const { tracker, kysely } = setupIntegrationTest()

  beforeEach(async () => {
    tracker.clear()
  })

  afterEach(async () => {
    await cleanupAfterTest(tracker, kysely)
  })

  it("should have event_registration_limit_emails table", async () => {
    const event = await createTestEvent(tracker, kysely, {
      title: "Test Event",
      event_status: "Registration Open",
    })

    const result = await kysely
      .insertInto("event_registration_limit_emails")
      .values({
        event_id: event.id,
        admin_emails: ["admin1@example.com", "admin2@example.com"],
      })
      .returningAll()
      .executeTakeFirstOrThrow()

    expect(result).toBeDefined()
    expect(result.event_id).toBe(event.id)
    expect(result.admin_emails).toEqual(["admin1@example.com", "admin2@example.com"])
    expect(result.sent_at).toBeDefined()
    expect(result.created_at).toBeDefined()
  })

  it("should enforce unique constraint on event_id", async () => {
    const event = await createTestEvent(tracker, kysely, {
      title: "Test Event",
      event_status: "Registration Open",
    })

    await kysely
      .insertInto("event_registration_limit_emails")
      .values({
        event_id: event.id,
        admin_emails: ["admin1@example.com"],
      })
      .execute()

    await expect(
      kysely
        .insertInto("event_registration_limit_emails")
        .values({
          event_id: event.id,
          admin_emails: ["admin2@example.com"],
        })
        .execute()
    ).rejects.toThrow()
  })

  it("should cascade delete when event is deleted", async () => {
    const event = await createTestEvent(tracker, kysely, {
      title: "Test Event",
      event_status: "Registration Open",
    })

    await kysely
      .insertInto("event_registration_limit_emails")
      .values({
        event_id: event.id,
        admin_emails: ["admin@example.com"],
      })
      .execute()

    await kysely
      .deleteFrom("events")
      .where("id", "=", event.id)
      .execute()

    const result = await kysely
      .selectFrom("event_registration_limit_emails")
      .where("event_id", "=", event.id)
      .selectAll()
      .execute()

    expect(result).toHaveLength(0)
  })
})
