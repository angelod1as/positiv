import { afterEach, beforeEach, describe, expect, it } from "vitest"
import {
  cleanupAfterTest,
  setupIntegrationTest,
} from "~/test/integration-setup"
import { createTestEvent } from "~/test/db-test-utils"
import {
  createGroupClosingTracking,
  getPendingGroupClosingEmails,
  updateGroupClosingSent,
  updateGroupClosingError,
} from "./group-closing-tracking.server"

describe("Group Closing Email Tracking - Integration Tests", () => {
  const { tracker, kysely: db } = setupIntegrationTest()

  beforeEach(async () => {
    tracker.clear()
    await db.deleteFrom("event_transactional_emails").execute()
  })

  afterEach(async () => {
    await cleanupAfterTest(tracker, db)
  })

  describe("createGroupClosingTracking", () => {
    it("should create tracking record for event with email_type='group_closing'", async () => {
      const event = await createTestEvent(tracker, db, {
        title: "Test Event",
        event_status: "Scheduled",
      })

      const result = await createGroupClosingTracking(event.id)

      expect(result.success).toBe(true)

      const tracking = await db
        .selectFrom("event_transactional_emails")
        .selectAll()
        .where("event_id", "=", event.id)
        .where("email_type", "=", "group_closing")
        .executeTakeFirst()

      expect(tracking).toBeDefined()
      expect(tracking?.event_id).toBe(event.id)
      expect(tracking?.email_type).toBe("group_closing")
      expect(tracking?.emails_sent).toBe(false)
      expect(tracking?.times_attempted).toBe(0)
      expect(tracking?.recipient_count).toBeNull()
    })

    it("should handle duplicate tracking creation gracefully (idempotent)", async () => {
      const event = await createTestEvent(tracker, db, {
        title: "Test Event",
        event_status: "Scheduled",
      })

      await createGroupClosingTracking(event.id)
      const result = await createGroupClosingTracking(event.id)

      expect(result.success).toBe(true)

      const count = await db
        .selectFrom("event_transactional_emails")
        .select((eb) => eb.fn.countAll().as("count"))
        .where("event_id", "=", event.id)
        .where("email_type", "=", "group_closing")
        .executeTakeFirstOrThrow()

      expect(Number(count.count)).toBe(1)
    })
  })

  describe("getPendingGroupClosingEmails", () => {
    it("should return only group_closing emails where emails_sent is false", async () => {
      const event1 = await createTestEvent(tracker, db, { title: "Event 1" })
      const event2 = await createTestEvent(tracker, db, { title: "Event 2" })

      await createGroupClosingTracking(event1.id)
      await createGroupClosingTracking(event2.id)

      const result = await getPendingGroupClosingEmails()

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(2)
        expect(result.data.every((r) => r.email_type === "group_closing")).toBe(
          true,
        )
        expect(result.data.every((r) => r.emails_sent === false)).toBe(true)
      }
    })

    it("should exclude emails with times_attempted >= 3", async () => {
      const event1 = await createTestEvent(tracker, db, { title: "Event 1" })
      const event2 = await createTestEvent(tracker, db, { title: "Event 2" })

      await createGroupClosingTracking(event1.id)
      await createGroupClosingTracking(event2.id)

      // Mark event1 as having failed 3 times
      await db
        .updateTable("event_transactional_emails")
        .set({ times_attempted: 3 })
        .where("event_id", "=", event1.id)
        .where("email_type", "=", "group_closing")
        .execute()

      const result = await getPendingGroupClosingEmails()

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(1)
        expect(result.data[0].event_id).toBe(event2.id)
      }
    })

    it("should exclude emails already sent", async () => {
      const event = await createTestEvent(tracker, db, { title: "Event" })
      await createGroupClosingTracking(event.id)

      await db
        .updateTable("event_transactional_emails")
        .set({ emails_sent: true, sent_time: new Date().toISOString() })
        .where("event_id", "=", event.id)
        .where("email_type", "=", "group_closing")
        .execute()

      const result = await getPendingGroupClosingEmails()

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(0)
      }
    })
  })

  describe("updateGroupClosingSent", () => {
    it("should mark email as sent with recipient count", async () => {
      const event = await createTestEvent(tracker, db, { title: "Event" })
      await createGroupClosingTracking(event.id)

      const recipientCount = 15
      const result = await updateGroupClosingSent(event.id, recipientCount)

      expect(result.success).toBe(true)

      const tracking = await db
        .selectFrom("event_transactional_emails")
        .selectAll()
        .where("event_id", "=", event.id)
        .where("email_type", "=", "group_closing")
        .executeTakeFirstOrThrow()

      expect(tracking.emails_sent).toBe(true)
      expect(tracking.recipient_count).toBe(recipientCount)
      expect(tracking.sent_time).toBeDefined()
    })
  })

  describe("updateGroupClosingError", () => {
    it("should increment times_attempted and log error", async () => {
      const event = await createTestEvent(tracker, db, { title: "Event" })
      await createGroupClosingTracking(event.id)

      const errorData = {
        step: "email_send",
        message: "Failed to send email to some recipients",
        timestamp: new Date().toISOString(),
      }

      const result = await updateGroupClosingError(event.id, errorData)

      expect(result.success).toBe(true)

      const tracking = await db
        .selectFrom("event_transactional_emails")
        .selectAll()
        .where("event_id", "=", event.id)
        .where("email_type", "=", "group_closing")
        .executeTakeFirstOrThrow()

      expect(tracking.times_attempted).toBe(1)
      expect(tracking.last_attempt).toBeDefined()
      expect(tracking.last_error).toEqual(errorData)
    })

    it("should increment times_attempted on subsequent errors", async () => {
      const event = await createTestEvent(tracker, db, { title: "Event" })
      await createGroupClosingTracking(event.id)

      const errorData1 = {
        step: "email_send",
        message: "First error",
        timestamp: new Date().toISOString(),
      }

      await updateGroupClosingError(event.id, errorData1)

      const errorData2 = {
        step: "email_send",
        message: "Second error",
        timestamp: new Date().toISOString(),
      }

      await updateGroupClosingError(event.id, errorData2)

      const tracking = await db
        .selectFrom("event_transactional_emails")
        .selectAll()
        .where("event_id", "=", event.id)
        .where("email_type", "=", "group_closing")
        .executeTakeFirstOrThrow()

      expect(tracking.times_attempted).toBe(2)
      expect(tracking.last_error).toEqual(errorData2)
    })
  })
})
