import { describe, expect, it, beforeEach, afterEach, vi } from "vitest"
import { setupIntegrationTest, cleanupAfterTest } from "~/test/integration-setup"
import { createTestProfile } from "~/test/db-test-utils"
import {
  processNewsletterQueue,
  createQueueEntriesForNewsletter,
  processQueueEntry,
} from "./newsletter-queue-processor.server"
import { createNewsletter, updateNewsletter } from "./newsletter.server"
import type { SegmentFilter } from "./newsletter-recipients.server"

// Mock the email sending function
vi.mock("~/business/email/send-email", () => ({
  sendEmail: vi.fn().mockResolvedValue({ success: true })
}))

describe("Newsletter Queue Processor - Integration Tests", () => {
  const { tracker, kysely } = setupIntegrationTest()

  beforeEach(async () => {
    tracker.clear()
    // Clear existing test data in reverse dependency order
    await kysely.deleteFrom("newsletter_queue").execute()
    await kysely.deleteFrom("newsletter_sends").execute()
    await kysely.deleteFrom("newsletters").execute()
    await kysely.deleteFrom("profiles").execute()
  })

  afterEach(async () => {
    await cleanupAfterTest(tracker, kysely)
    vi.clearAllMocks()
  })

  describe("createQueueEntriesForNewsletter", () => {
    it("should create queue entries for all eligible recipients", async () => {
      // Create test profiles
      const profile1 = await createTestProfile(tracker, kysely, {
        email: "test1@test.com",
        allow_marketing_email: true,
      })
      const profile2 = await createTestProfile(tracker, kysely, {
        email: "test2@test.com",
        allow_marketing_email: true,
      })
      await createTestProfile(tracker, kysely, {
        email: "nomarketing@test.com",
        allow_marketing_email: false,
      })

      // Create newsletter
      const newsletter = await createNewsletter({
        subject: "Test Newsletter",
        template_name: "general-news",
        content_mdx: "# Test Content",
        created_by: profile1.id,
      })
      tracker.track("newsletters", newsletter.id)

      // Create queue entries
      const count = await createQueueEntriesForNewsletter(kysely, newsletter.id)

      expect(count).toBe(2)

      // Verify queue entries were created
      const queueEntries = await kysely
        .selectFrom("newsletter_queue")
        .selectAll()
        .where("newsletter_id", "=", newsletter.id)
        .execute()

      expect(queueEntries).toHaveLength(2)
      expect(queueEntries.every(e => e.status === "pending")).toBe(true)
      expect(queueEntries.every(e => e.attempts === 0)).toBe(true)
    })

    it("should apply segmentation filters", async () => {
      // Create test profiles
      const veteran = await createTestProfile(tracker, kysely, {
        email: "veteran@test.com",
        allow_marketing_email: true,
        is_veteran: true,
      })
      await createTestProfile(tracker, kysely, {
        email: "newbie@test.com",
        allow_marketing_email: true,
        is_veteran: false,
      })

      // Create newsletter
      const newsletter = await createNewsletter({
        subject: "Veterans Newsletter",
        template_name: "general-news",
        content_mdx: "# Veterans Only",
        created_by: veteran.id,
      })
      tracker.track("newsletters", newsletter.id)

      // Create queue entries with veteran filter
      const filter: SegmentFilter = { veteransOnly: true }
      const count = await createQueueEntriesForNewsletter(kysely, newsletter.id, filter)

      expect(count).toBe(1)

      // Verify only veteran got the queue entry
      const queueEntries = await kysely
        .selectFrom("newsletter_queue")
        .selectAll()
        .where("newsletter_id", "=", newsletter.id)
        .execute()

      expect(queueEntries).toHaveLength(1)
      expect(queueEntries[0].profile_id).toBe(veteran.id)
    })

    it("should not create duplicate queue entries", async () => {
      const profile = await createTestProfile(tracker, kysely, {
        email: "test@test.com",
        allow_marketing_email: true,
      })

      const newsletter = await createNewsletter({
        subject: "Test Newsletter",
        template_name: "general-news",
        content_mdx: "# Test",
        created_by: profile.id,
      })
      tracker.track("newsletters", newsletter.id)

      // Create queue entries twice
      const count1 = await createQueueEntriesForNewsletter(kysely, newsletter.id)
      const count2 = await createQueueEntriesForNewsletter(kysely, newsletter.id)

      expect(count1).toBe(1)
      expect(count2).toBe(0) // No duplicates created

      // Verify only one entry exists
      const queueEntries = await kysely
        .selectFrom("newsletter_queue")
        .selectAll()
        .where("newsletter_id", "=", newsletter.id)
        .execute()

      expect(queueEntries).toHaveLength(1)
    })
  })

  describe("processQueueEntry", () => {
    it("should process a queue entry successfully", async () => {
      const { sendEmail } = await import("~/business/email/send-email")
      const profile = await createTestProfile(tracker, kysely, {
        email: "test@test.com",
        allow_marketing_email: true,
      })

      const newsletter = await createNewsletter({
        subject: "Test Newsletter",
        template_name: "general-news",
        content_mdx: "# Test Content",
        created_by: profile.id,
      })
      tracker.track("newsletters", newsletter.id)

      // Create queue entry
      const queueEntry = await kysely
        .insertInto("newsletter_queue")
        .values({
          id: crypto.randomUUID(),
          newsletter_id: newsletter.id,
          profile_id: profile.id,
          status: "pending",
          attempts: 0,
          created_at: new Date().toISOString(),
        })
        .returningAll()
        .executeTakeFirstOrThrow()

      // Process the entry
      const result = await processQueueEntry(kysely, queueEntry.id)

      expect(result).toBe(true)
      expect(sendEmail).toHaveBeenCalledTimes(1)

      // Verify queue entry was updated
      const updatedEntry = await kysely
        .selectFrom("newsletter_queue")
        .selectAll()
        .where("id", "=", queueEntry.id)
        .executeTakeFirst()

      expect(updatedEntry?.status).toBe("sent")
      expect(updatedEntry?.processed_at).toBeDefined()

      // Verify newsletter_sends entry was created
      const sendEntry = await kysely
        .selectFrom("newsletter_sends")
        .selectAll()
        .where("newsletter_id", "=", newsletter.id)
        .where("profile_id", "=", profile.id)
        .executeTakeFirst()

      expect(sendEntry).toBeDefined()
      expect(sendEntry?.status).toBe("sent")
    })

    it("should handle send failures with retry", async () => {
      const { sendEmail } = await import("~/business/email/send-email")
      vi.mocked(sendEmail).mockRejectedValueOnce(new Error("Network error"))

      const profile = await createTestProfile(tracker, kysely, {
        email: "test@test.com",
        allow_marketing_email: true,
      })

      const newsletter = await createNewsletter({
        subject: "Test Newsletter",
        template_name: "general-news",
        content_mdx: "# Test",
        created_by: profile.id,
      })
      tracker.track("newsletters", newsletter.id)

      const queueEntry = await kysely
        .insertInto("newsletter_queue")
        .values({
          id: crypto.randomUUID(),
          newsletter_id: newsletter.id,
          profile_id: profile.id,
          status: "pending",
          attempts: 0,
          created_at: new Date().toISOString(),
        })
        .returningAll()
        .executeTakeFirstOrThrow()

      // Process should fail
      const result = await processQueueEntry(kysely, queueEntry.id)

      expect(result).toBe(false)

      // Verify queue entry was updated for retry
      const updatedEntry = await kysely
        .selectFrom("newsletter_queue")
        .selectAll()
        .where("id", "=", queueEntry.id)
        .executeTakeFirst()

      expect(updatedEntry?.status).toBe("pending") // Still pending for retry
      expect(updatedEntry?.attempts).toBe(1)
      expect(updatedEntry?.last_error).toContain("Network error")
    })

    it("should mark as failed after max retries", async () => {
      const { sendEmail } = await import("~/business/email/send-email")
      vi.mocked(sendEmail).mockRejectedValue(new Error("Permanent failure"))

      const profile = await createTestProfile(tracker, kysely, {
        email: "test@test.com",
        allow_marketing_email: true,
      })

      const newsletter = await createNewsletter({
        subject: "Test Newsletter",
        template_name: "general-news",
        content_mdx: "# Test",
        created_by: profile.id,
      })
      tracker.track("newsletters", newsletter.id)

      const queueEntry = await kysely
        .insertInto("newsletter_queue")
        .values({
          id: crypto.randomUUID(),
          newsletter_id: newsletter.id,
          profile_id: profile.id,
          status: "pending",
          attempts: 2, // Already at max attempts - 1
          created_at: new Date().toISOString(),
        })
        .returningAll()
        .executeTakeFirstOrThrow()

      // Process should fail permanently
      const result = await processQueueEntry(kysely, queueEntry.id)

      expect(result).toBe(false)

      // Verify queue entry was marked as failed
      const updatedEntry = await kysely
        .selectFrom("newsletter_queue")
        .selectAll()
        .where("id", "=", queueEntry.id)
        .executeTakeFirst()

      expect(updatedEntry?.status).toBe("failed")
      expect(updatedEntry?.attempts).toBe(3)

      // Verify newsletter_sends entry was created with failed status
      const sendEntry = await kysely
        .selectFrom("newsletter_sends")
        .selectAll()
        .where("newsletter_id", "=", newsletter.id)
        .where("profile_id", "=", profile.id)
        .executeTakeFirst()

      expect(sendEntry).toBeDefined()
      expect(sendEntry?.status).toBe("failed")
      expect(sendEntry?.error_message).toContain("Permanent failure")
    })
  })

  describe("processNewsletterQueue", () => {
    it("should process newsletter queue in batches", async () => {
      const { sendEmail } = await import("~/business/email/send-email")
      
      // Create multiple profiles
      const profiles = await Promise.all([
        createTestProfile(tracker, kysely, {
          email: "test1@test.com",
          allow_marketing_email: true,
        }),
        createTestProfile(tracker, kysely, {
          email: "test2@test.com",
          allow_marketing_email: true,
        }),
        createTestProfile(tracker, kysely, {
          email: "test3@test.com",
          allow_marketing_email: true,
        }),
      ])

      const newsletter = await createNewsletter({
        subject: "Batch Test",
        template_name: "general-news",
        content_mdx: "# Batch Test",
        created_by: profiles[0].id,
      })
      tracker.track("newsletters", newsletter.id)

      // Process the newsletter (creates queue and processes)
      const result = await processNewsletterQueue(kysely, newsletter.id, undefined, {
        batchSize: 2, // Small batch for testing
        delayMs: 10, // Short delay for testing
      })

      expect(result.processed).toBe(3)
      expect(result.failed).toBe(0)
      expect(sendEmail).toHaveBeenCalledTimes(3)

      // Verify newsletter status was updated
      const updatedNewsletter = await kysely
        .selectFrom("newsletters")
        .selectAll()
        .where("id", "=", newsletter.id)
        .executeTakeFirst()

      expect(updatedNewsletter?.status).toBe("sent")
      expect(updatedNewsletter?.sent_at).toBeDefined()
    })

    it("should handle partial failures", async () => {
      const { sendEmail } = await import("~/business/email/send-email")
      vi.mocked(sendEmail)
        .mockResolvedValueOnce({ success: true })
        .mockRejectedValueOnce(new Error("Failed"))
        .mockResolvedValueOnce({ success: true })

      const profiles = await Promise.all([
        createTestProfile(tracker, kysely, {
          email: "success1@test.com",
          allow_marketing_email: true,
        }),
        createTestProfile(tracker, kysely, {
          email: "fail@test.com",
          allow_marketing_email: true,
        }),
        createTestProfile(tracker, kysely, {
          email: "success2@test.com",
          allow_marketing_email: true,
        }),
      ])

      const newsletter = await createNewsletter({
        subject: "Partial Failure Test",
        template_name: "general-news",
        content_mdx: "# Test",
        created_by: profiles[0].id,
      })
      tracker.track("newsletters", newsletter.id)

      const result = await processNewsletterQueue(kysely, newsletter.id, undefined, {
        batchSize: 10,
        delayMs: 10,
      })

      expect(result.processed).toBe(2)
      expect(result.failed).toBe(1)

      // Newsletter should still be marked as sent even with some failures
      const updatedNewsletter = await kysely
        .selectFrom("newsletters")
        .selectAll()
        .where("id", "=", newsletter.id)
        .executeTakeFirst()

      expect(updatedNewsletter?.status).toBe("sent")
    })
  })
})