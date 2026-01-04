import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  cleanupAfterTest,
  setupIntegrationTest,
} from "~/test/integration-setup"
import { createTestEvent, createTestProfile } from "~/test/db-test-utils"
import { sendGroupClosingEmailsForEvent } from "./send-group-closing-emails.server"
import { createGroupClosingTracking } from "./group-closing-tracking.server"

// Mock the sendEmail module
vi.mock("./send-email", () => ({
  sendEmail: vi.fn().mockResolvedValue({
    success: true,
    data: undefined,
    errors: [],
  }),
}))

import { sendEmail } from "./send-email"

describe("Send Group Closing Emails - Integration Tests", () => {
  const { tracker, kysely: db } = setupIntegrationTest()

  beforeEach(async () => {
    tracker.clear()
    await db.deleteFrom("event_transactional_emails").execute()
    await db.deleteFrom("event_participants").execute()
    vi.mocked(sendEmail).mockClear()
    vi.mocked(sendEmail).mockResolvedValue({
      success: true,
      data: undefined,
      errors: [],
    })
  })

  afterEach(async () => {
    await cleanupAfterTest(tracker, db)
  })

  describe("Participant Query Filtering", () => {
    it("should send emails only to non-rejected participants", async () => {
      const event = await createTestEvent(tracker, db, {
        title: "Test Event",
        event_status: "Registration Closed",
        time_group_start: new Date().toISOString(),
      })

      // Create profiles with different approval statuses
      const approvedProfile = await createTestProfile(tracker, db, {
        user_id: null,
        email: "approved@test.com",
        full_name: "Approved User",
        approved_to_attend: "approved",
      })
      const pendingProfile = await createTestProfile(tracker, db, {
        user_id: null,
        email: "pending@test.com",
        full_name: "Pending User",
        approved_to_attend: "pending",
      })
      const reservationsProfile = await createTestProfile(tracker, db, {
        user_id: null,
        email: "reservations@test.com",
        full_name: "Reservations User",
        approved_to_attend: "approved_with_reservations",
      })
      const rejectedProfile = await createTestProfile(tracker, db, {
        user_id: null,
        email: "rejected@test.com",
        full_name: "Rejected User",
        approved_to_attend: "rejected",
      })

      // Create participants
      await db
        .insertInto("event_participants")
        .values([
          {
            event_id: event.id,
            profile_id: approvedProfile.id,
            is_user_applied: true,
          },
          {
            event_id: event.id,
            profile_id: pendingProfile.id,
            is_user_applied: true,
          },
          {
            event_id: event.id,
            profile_id: reservationsProfile.id,
            is_user_applied: true,
          },
          {
            event_id: event.id,
            profile_id: rejectedProfile.id,
            is_user_applied: true,
          },
        ])
        .execute()

      await createGroupClosingTracking(event.id)

      const result = await sendGroupClosingEmailsForEvent(event.id)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toBe(3) // recipientCount
      }
      // Should send to 3 participants (approved, pending, approved_with_reservations)
      // Should NOT send to rejected
      expect(vi.mocked(sendEmail)).toHaveBeenCalledTimes(3)

      // Verify emails were sent to correct recipients
      const emailRecipients = vi.mocked(sendEmail).mock.calls.map(
        (call) => call[0].to,
      )
      expect(emailRecipients).toContain("approved@test.com")
      expect(emailRecipients).toContain("pending@test.com")
      expect(emailRecipients).toContain("reservations@test.com")
      expect(emailRecipients).not.toContain("rejected@test.com")
    })

  })

  describe("Email Sending", () => {
    it("should send emails with correct subject and content", async () => {
      const event = await createTestEvent(tracker, db, {
        title: "Festa Test",
        emoji: "🎉",
        event_status: "Registration Closed",
        time_group_start: new Date().toISOString(),
      })

      const profile = await createTestProfile(tracker, db, {
        user_id: null,
        email: "user@test.com",
        full_name: "Test User",
        approved_to_attend: "approved",
      })

      await db
        .insertInto("event_participants")
        .values({
          event_id: event.id,
          profile_id: profile.id,
          is_user_applied: true,
        })
        .execute()

      await createGroupClosingTracking(event.id)

      await sendGroupClosingEmailsForEvent(event.id)

      expect(vi.mocked(sendEmail)).toHaveBeenCalledTimes(1)

      const emailOptions = vi.mocked(sendEmail).mock.calls[0][0]
      expect(emailOptions.to).toBe("user@test.com")
      expect(emailOptions.subject).toContain("Seleção encerrada")
      expect(emailOptions.subject).toContain("Festa Test")
      expect(emailOptions.html).toContain("Seleção encerrada")
      expect(emailOptions.html).toContain("WhatsApp")
      expect(emailOptions.text).toContain("SELEÇÃO ENCERRADA")
    })
  })

  describe("Tracking Updates", () => {
    it("should update tracking with recipient count on success", async () => {
      const event = await createTestEvent(tracker, db, {
        title: "Test Event",
        event_status: "Registration Closed",
        time_group_start: new Date().toISOString(),
      })

      const profile1 = await createTestProfile(tracker, db, {
        user_id: null,
        email: "user1@test.com",
        approved_to_attend: "approved",
      })
      const profile2 = await createTestProfile(tracker, db, {
        user_id: null,
        email: "user2@test.com",
        approved_to_attend: "pending",
      })

      await db
        .insertInto("event_participants")
        .values([
          {
            event_id: event.id,
            profile_id: profile1.id,
            is_user_applied: true,
          },
          {
            event_id: event.id,
            profile_id: profile2.id,
            is_user_applied: true,
          },
        ])
        .execute()

      await createGroupClosingTracking(event.id)

      const result = await sendGroupClosingEmailsForEvent(event.id)

      expect(result.success).toBe(true)

      const tracking = await db
        .selectFrom("event_transactional_emails")
        .selectAll()
        .where("event_id", "=", event.id)
        .where("email_type", "=", "group_closing")
        .executeTakeFirstOrThrow()

      expect(tracking.emails_sent).toBe(true)
      expect(tracking.recipient_count).toBe(2)
      expect(tracking.sent_time).toBeDefined()
    })

    it("should update tracking with error on failure", async () => {
      const event = await createTestEvent(tracker, db, {
        title: "Test Event",
        event_status: "Registration Closed",
        time_group_start: new Date().toISOString(),
      })

      const profile = await createTestProfile(tracker, db, {
        user_id: null,
        email: "user@test.com",
        approved_to_attend: "approved",
      })

      await db
        .insertInto("event_participants")
        .values({
          event_id: event.id,
          profile_id: profile.id,
          is_user_applied: true,
        })
        .execute()

      await createGroupClosingTracking(event.id)

      // Mock sendEmail to fail for this test
      vi.mocked(sendEmail).mockResolvedValueOnce({
        success: false,
        errors: [{ message: "SMTP error", name: "SMTPError" }],
      })

      const result = await sendGroupClosingEmailsForEvent(event.id)

      expect(result.success).toBe(false)
      expect(result.errors).toBeDefined()

      const tracking = await db
        .selectFrom("event_transactional_emails")
        .selectAll()
        .where("event_id", "=", event.id)
        .where("email_type", "=", "group_closing")
        .executeTakeFirstOrThrow()

      expect(tracking.emails_sent).toBe(false)
      expect(tracking.times_attempted).toBe(1)
      expect(tracking.last_error).toBeDefined()
    })
  })

  describe("Edge Cases", () => {
    it("should handle event with no participants", async () => {
      const event = await createTestEvent(tracker, db, {
        title: "Empty Event",
        event_status: "Registration Closed",
        time_group_start: new Date().toISOString(),
      })

      await createGroupClosingTracking(event.id)

      const result = await sendGroupClosingEmailsForEvent(event.id)

      expect(result.success).toBe(true)
      expect(vi.mocked(sendEmail)).not.toHaveBeenCalled()

      const tracking = await db
        .selectFrom("event_transactional_emails")
        .selectAll()
        .where("event_id", "=", event.id)
        .where("email_type", "=", "group_closing")
        .executeTakeFirstOrThrow()

      expect(tracking.emails_sent).toBe(true)
      expect(tracking.recipient_count).toBe(0)
    })

    it("should handle event with all rejected participants", async () => {
      const event = await createTestEvent(tracker, db, {
        title: "All Rejected Event",
        event_status: "Registration Closed",
        time_group_start: new Date().toISOString(),
      })

      const profile = await createTestProfile(tracker, db, {
        user_id: null,
        email: "rejected@test.com",
        approved_to_attend: "rejected",
      })

      await db
        .insertInto("event_participants")
        .values({
          event_id: event.id,
          profile_id: profile.id,
          is_user_applied: true,
        })
        .execute()

      await createGroupClosingTracking(event.id)

      const result = await sendGroupClosingEmailsForEvent(event.id)

      expect(result.success).toBe(true)
      expect(vi.mocked(sendEmail)).not.toHaveBeenCalled()

      const tracking = await db
        .selectFrom("event_transactional_emails")
        .selectAll()
        .where("event_id", "=", event.id)
        .where("email_type", "=", "group_closing")
        .executeTakeFirstOrThrow()

      expect(tracking.recipient_count).toBe(0)
    })
  })
})
