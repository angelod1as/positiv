import { describe, expect, it, beforeEach, afterEach, vi } from "vitest"
import { setupIntegrationTest, cleanupAfterTest } from "~/test/integration-setup"
import { createTestProfile } from "~/test/db-test-utils"
import { createNewsletter } from "./newsletter.server"
import { processScheduledNewsletters } from "./newsletter-scheduler.server"

// Mock the email sending function
vi.mock("~/business/email/send-email", () => ({
  sendEmail: vi.fn().mockResolvedValue({ success: true, data: undefined, errors: [] })
}))

describe("Newsletter Scheduler - Integration Tests", () => {
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

  describe("processScheduledNewsletters", () => {
    it("should find and process newsletters scheduled for now or past", async () => {
      // Create test profiles
      const admin = await createTestProfile(tracker, kysely, {
        user_id: null,
        email: "admin@test.com",
        allow_marketing_email: false,
      })
      await createTestProfile(tracker, kysely, {
        user_id: null,
        email: "subscriber1@test.com",
        allow_marketing_email: true,
      })
      await createTestProfile(tracker, kysely, {
        user_id: null,
        email: "subscriber2@test.com",
        allow_marketing_email: true,
      })

      // Create a newsletter scheduled for the past
      const pastNewsletter = await createNewsletter({
        subject: "Past Newsletter",
        template_name: "general-news",
        content_mdx: "# Past News",
        created_by: admin.id,
        status: "scheduled",
        scheduled_at: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
      })
      tracker.track("newsletters", pastNewsletter.id)

      // Create a newsletter scheduled for the future
      const futureNewsletter = await createNewsletter({
        subject: "Future Newsletter",
        template_name: "general-news",
        content_mdx: "# Future News",
        created_by: admin.id,
        status: "scheduled",
        scheduled_at: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
      })
      tracker.track("newsletters", futureNewsletter.id)

      // Create a draft newsletter
      const draftNewsletter = await createNewsletter({
        subject: "Draft Newsletter",
        template_name: "general-news",
        content_mdx: "# Draft News",
        created_by: admin.id,
        status: "draft",
      })
      tracker.track("newsletters", draftNewsletter.id)

      // Process scheduled newsletters
      const result = await processScheduledNewsletters(kysely)

      // Verify only the past newsletter was processed
      expect(result.processedNewsletters).toHaveLength(1)
      expect(result.processedNewsletters[0].id).toBe(pastNewsletter.id)
      expect(result.totalProcessed).toBe(2) // 2 subscribers
      expect(result.totalFailed).toBe(0)

      // Verify newsletter status was updated
      const updatedPastNewsletter = await kysely
        .selectFrom("newsletters")
        .selectAll()
        .where("id", "=", pastNewsletter.id)
        .executeTakeFirst()
      
      expect(updatedPastNewsletter?.status).toBe("sent")
      expect(updatedPastNewsletter?.sent_at).toBeTruthy()

      // Verify future and draft newsletters were not processed
      const updatedFutureNewsletter = await kysely
        .selectFrom("newsletters")
        .selectAll()
        .where("id", "=", futureNewsletter.id)
        .executeTakeFirst()
      
      expect(updatedFutureNewsletter?.status).toBe("scheduled")
      expect(updatedFutureNewsletter?.sent_at).toBeNull()

      const updatedDraftNewsletter = await kysely
        .selectFrom("newsletters")
        .selectAll()
        .where("id", "=", draftNewsletter.id)
        .executeTakeFirst()
      
      expect(updatedDraftNewsletter?.status).toBe("draft")
    })

    it("should handle multiple scheduled newsletters", async () => {
      const admin = await createTestProfile(tracker, kysely, {
        user_id: null,
        email: "admin@test.com",
        allow_marketing_email: false,
      })
      await createTestProfile(tracker, kysely, {
        user_id: null,
        email: "subscriber@test.com",
        allow_marketing_email: true,
      })

      // Create multiple scheduled newsletters
      const newsletter1 = await createNewsletter({
        subject: "Newsletter 1",
        template_name: "general-news",
        content_mdx: "# News 1",
        created_by: admin.id,
        status: "scheduled",
        scheduled_at: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
      })
      tracker.track("newsletters", newsletter1.id)

      const newsletter2 = await createNewsletter({
        subject: "Newsletter 2",
        template_name: "event-announcement",
        content_mdx: "# News 2",
        created_by: admin.id,
        status: "scheduled",
        scheduled_at: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
      })
      tracker.track("newsletters", newsletter2.id)

      // Process scheduled newsletters
      const result = await processScheduledNewsletters(kysely)

      // Verify both newsletters were processed
      expect(result.processedNewsletters).toHaveLength(2)
      expect(result.totalProcessed).toBe(2) // 1 subscriber * 2 newsletters
      
      // Verify both newsletters have been sent
      const sentNewsletters = await kysely
        .selectFrom("newsletters")
        .selectAll()
        .where("status", "=", "sent")
        .execute()
      
      expect(sentNewsletters).toHaveLength(2)
    })

    it("should handle errors gracefully", async () => {
      const admin = await createTestProfile(tracker, kysely, {
        user_id: null,
        email: "admin@test.com",
        allow_marketing_email: false,
      })
      await createTestProfile(tracker, kysely, {
        user_id: null,
        email: "subscriber@test.com",
        allow_marketing_email: true,
      })

      // Create a newsletter with a template that will trigger an error
      const newsletter = await createNewsletter({
        subject: "Error Newsletter",
        template_name: "general-news",
        content_mdx: "# Error News",
        created_by: admin.id,
        status: "scheduled",
        scheduled_at: new Date(Date.now() - 3600000).toISOString(),
      })
      tracker.track("newsletters", newsletter.id)

      // Mock email sending to fail
      const { sendEmail } = await import("~/business/email/send-email")
      vi.mocked(sendEmail).mockRejectedValue(new Error("Email sending failed"))

      // Process scheduled newsletters
      const result = await processScheduledNewsletters(kysely)

      // Verify the newsletter was attempted but failed
      expect(result.processedNewsletters).toHaveLength(1)
      expect(result.totalProcessed).toBe(0)
      expect(result.totalFailed).toBe(1)

      // Verify newsletter status reflects the failure
      const updatedNewsletter = await kysely
        .selectFrom("newsletters")
        .selectAll()
        .where("id", "=", newsletter.id)
        .executeTakeFirst()
      
      // Newsletter should be marked as failed or still sending (depending on retry logic)
      expect(["sending", "failed"]).toContain(updatedNewsletter?.status)
    })

    it("should not process already sent newsletters", async () => {
      const admin = await createTestProfile(tracker, kysely, {
        user_id: null,
        email: "admin@test.com",
        allow_marketing_email: false,
      })

      // Create an already sent newsletter
      const sentNewsletter = await createNewsletter({
        subject: "Already Sent",
        template_name: "general-news",
        content_mdx: "# Already Sent",
        created_by: admin.id,
        status: "sent",
        sent_at: new Date(Date.now() - 86400000).toISOString(), // Yesterday
      })
      tracker.track("newsletters", sentNewsletter.id)

      // Process scheduled newsletters
      const result = await processScheduledNewsletters(kysely)

      // Verify no newsletters were processed
      expect(result.processedNewsletters).toHaveLength(0)
      expect(result.totalProcessed).toBe(0)
    })

  })
})