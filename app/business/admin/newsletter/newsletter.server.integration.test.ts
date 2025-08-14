import { describe, expect, it, beforeEach, afterEach, vi } from "vitest"
import { setupIntegrationTest, cleanupAfterTest } from "~/test/integration-setup"
import { createTestProfile } from "~/test/db-test-utils"
import {
  createNewsletter,
  getNewslettersByStatus,
  createNewsletterSend,
  addToQueue,
  getQueueEntry,
  sendNewsletterNow
} from "./newsletter.server"

// Mock the email sending function
vi.mock("~/business/email/send-email", () => ({
  sendEmail: vi.fn().mockResolvedValue({ success: true, data: undefined, errors: [] })
}))

describe("Newsletter Tables - Integration Tests", () => {
  const { tracker, kysely } = setupIntegrationTest()

  beforeEach(async () => {
    tracker.clear()
    
    // Clear any existing newsletter data for clean tests
    await kysely.deleteFrom("newsletter_queue").execute()
    await kysely.deleteFrom("newsletter_sends").execute()
    await kysely.deleteFrom("newsletters").execute()
  })

  afterEach(async () => {
    await cleanupAfterTest(tracker, kysely)
  })

  it("should create a newsletter with all required fields", async () => {
    // Create a test profile to be the creator
    const creator = await createTestProfile(tracker, kysely, {
      user_id: null,
      email: "admin@example.com",
      full_name: "Admin User"
    })

    const newsletterData = {
      subject: "Test Newsletter",
      template_name: "general-news",
      content_mdx: "# Welcome\n\nThis is a test newsletter.",
      status: "draft" as const,
      created_by: creator.id
    }

    const result = await createNewsletter(newsletterData)
    tracker.track("newsletters", result.id)
    
    expect(result).toBeDefined()
    expect(result.id).toBeDefined()
    expect(result.subject).toBe(newsletterData.subject)
    expect(result.template_name).toBe(newsletterData.template_name)
    expect(result.content_mdx).toBe(newsletterData.content_mdx)
    expect(result.status).toBe("draft")
    expect(result.created_by).toBe(creator.id)
    expect(result.created_at).toBeDefined()
    expect(result.updated_at).toBeDefined()
  })

  it("should create a newsletter with draft status by default", async () => {
    const creator = await createTestProfile(tracker, kysely, {
      user_id: null,
      email: "admin2@example.com",
      full_name: "Admin User 2"
    })

    const newsletterData = {
      subject: "Draft Newsletter",
      template_name: "event-announcement",
      content_mdx: "# Draft Content",
      created_by: creator.id
    }

    const result = await createNewsletter(newsletterData)
    tracker.track("newsletters", result.id)
    
    expect(result.status).toBe("draft")
  })

  it("should query newsletters by status", async () => {
    const creator = await createTestProfile(tracker, kysely, {
      user_id: null,
      email: "admin3@example.com",
      full_name: "Admin User 3"
    })

    // Create newsletters with different statuses
    const newsletter1 = await createNewsletter({
      subject: "Draft 1",
      template_name: "general-news",
      content_mdx: "Draft content",
      status: "draft",
      created_by: creator.id
    })
    tracker.track("newsletters", newsletter1.id)

    const newsletter2 = await createNewsletter({
      subject: "Scheduled 1",
      template_name: "event-announcement",
      content_mdx: "Scheduled content",
      status: "scheduled",
      scheduled_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      created_by: creator.id
    })
    tracker.track("newsletters", newsletter2.id)

    const newsletter3 = await createNewsletter({
      subject: "Sent 1",
      template_name: "general-news",
      content_mdx: "Sent content",
      status: "sent",
      sent_at: new Date().toISOString(),
      created_by: creator.id
    })
    tracker.track("newsletters", newsletter3.id)

    // Query by status
    const drafts = await getNewslettersByStatus("draft")
    const scheduled = await getNewslettersByStatus("scheduled")
    const sent = await getNewslettersByStatus("sent")

    expect(drafts).toHaveLength(1)
    expect(drafts[0].subject).toBe("Draft 1")
    
    expect(scheduled).toHaveLength(1)
    expect(scheduled[0].subject).toBe("Scheduled 1")
    
    expect(sent).toHaveLength(1)
    expect(sent[0].subject).toBe("Sent 1")
  })

  it("should record newsletter sends to profiles", async () => {
    const creator = await createTestProfile(tracker, kysely, {
      user_id: null,
      email: "admin4@example.com",
      full_name: "Admin User 4"
    })

    const recipient = await createTestProfile(tracker, kysely, {
      user_id: null,
      email: "recipient@example.com",
      full_name: "Recipient User",
      allow_marketing_email: true
    })

    const newsletter = await createNewsletter({
      subject: "Test Send",
      template_name: "general-news",
      content_mdx: "Content",
      status: "sending",
      created_by: creator.id
    })
    tracker.track("newsletters", newsletter.id)

    const send = await createNewsletterSend({
      newsletter_id: newsletter.id,
      profile_id: recipient.id,
      status: "sent"
    })
    tracker.track("newsletter_sends", send.id)

    expect(send).toBeDefined()
    expect(send.newsletter_id).toBe(newsletter.id)
    expect(send.profile_id).toBe(recipient.id)
    expect(send.status).toBe("sent")
    expect(send.sent_at).toBeDefined()
  })

  it("should manage newsletter queue entries", async () => {
    const creator = await createTestProfile(tracker, kysely, {
      user_id: null,
      email: "admin5@example.com",
      full_name: "Admin User 5"
    })

    const recipient = await createTestProfile(tracker, kysely, {
      user_id: null,
      email: "queued@example.com",
      full_name: "Queued User",
      allow_marketing_email: true
    })

    const newsletter = await createNewsletter({
      subject: "Queue Test",
      template_name: "event-announcement",
      content_mdx: "Queue content",
      status: "scheduled",
      created_by: creator.id
    })
    tracker.track("newsletters", newsletter.id)

    const queueEntry = await addToQueue({
      newsletter_id: newsletter.id,
      profile_id: recipient.id,
      status: "pending"
    })
    tracker.track("newsletter_queue", queueEntry.id)

    expect(queueEntry).toBeDefined()
    expect(queueEntry.newsletter_id).toBe(newsletter.id)
    expect(queueEntry.profile_id).toBe(recipient.id)
    expect(queueEntry.status).toBe("pending")
    expect(queueEntry.attempts).toBe(0)
    expect(queueEntry.created_at).toBeDefined()

    // Fetch the queue entry
    const fetched = await getQueueEntry(queueEntry.id)
    expect(fetched).toBeDefined()
    expect(fetched?.id).toBe(queueEntry.id)
  })

  it("should enforce foreign key constraint to profiles table", async () => {
    // Try to create a newsletter with invalid created_by
    const invalidCreatorId = crypto.randomUUID()
    
    await expect(
      createNewsletter({
        subject: "Invalid Creator",
        template_name: "general-news",
        content_mdx: "Content",
        created_by: invalidCreatorId
      })
    ).rejects.toThrow()
  })

  it("should enforce unique constraint on newsletter_sends", async () => {
    const creator = await createTestProfile(tracker, kysely, {
      user_id: null,
      email: "admin6@example.com",
      full_name: "Admin User 6"
    })

    const recipient = await createTestProfile(tracker, kysely, {
      user_id: null,
      email: "unique-test@example.com",
      full_name: "Unique Test User",
      allow_marketing_email: true
    })

    const newsletter = await createNewsletter({
      subject: "Unique Test",
      template_name: "general-news",
      content_mdx: "Content",
      created_by: creator.id
    })
    tracker.track("newsletters", newsletter.id)

    // First send should succeed
    const firstSend = await createNewsletterSend({
      newsletter_id: newsletter.id,
      profile_id: recipient.id,
      status: "sent"
    })
    tracker.track("newsletter_sends", firstSend.id)

    // Second send with same newsletter_id and profile_id should fail
    await expect(
      createNewsletterSend({
        newsletter_id: newsletter.id,
        profile_id: recipient.id,
        status: "sent"
      })
    ).rejects.toThrow()
  })

  it("should enforce status enum constraints", async () => {
    const creator = await createTestProfile(tracker, kysely, {
      user_id: null,
      email: "admin7@example.com",
      full_name: "Admin User 7"
    })

    // Test invalid newsletter status
    await expect(
      kysely
        .insertInto("newsletters")
        .values({
          id: crypto.randomUUID(),
          subject: "Invalid Status",
          template_name: "general-news",
          content_mdx: "Content",
          status: "invalid_status" as unknown as "draft" | "scheduled" | "sending" | "sent" | "failed",
          created_by: creator.id
        })
        .execute()
    ).rejects.toThrow()

    // Test invalid queue status
    const newsletter = await createNewsletter({
      subject: "Valid Newsletter",
      template_name: "general-news",
      content_mdx: "Content",
      created_by: creator.id
    })
    tracker.track("newsletters", newsletter.id)

    const recipient = await createTestProfile(tracker, kysely, {
      user_id: null,
      email: "status-test@example.com",
      full_name: "Status Test User",
      allow_marketing_email: true
    })

    await expect(
      kysely
        .insertInto("newsletter_queue")
        .values({
          id: crypto.randomUUID(),
          newsletter_id: newsletter.id,
          profile_id: recipient.id,
          status: "invalid_queue_status" as unknown as "pending" | "processing" | "sent" | "failed",
          attempts: 0
        })
        .execute()
    ).rejects.toThrow()
  })

  it("should fetch all newsletters with recipient counts", async () => {
    const { getAllNewslettersWithCounts } = await import("./newsletter.server")
    
    const creator = await createTestProfile(tracker, kysely, {
      user_id: null,
      email: "admin8@example.com",
      full_name: "Admin User 8"
    })

    // Create multiple profiles to be recipients
    const recipient1 = await createTestProfile(tracker, kysely, {
      user_id: null,
      email: "recipient1@example.com",
      full_name: "Recipient 1",
      allow_marketing_email: true
    })

    const recipient2 = await createTestProfile(tracker, kysely, {
      user_id: null,
      email: "recipient2@example.com",
      full_name: "Recipient 2",
      allow_marketing_email: true
    })

    const recipient3 = await createTestProfile(tracker, kysely, {
      user_id: null,
      email: "recipient3@example.com",
      full_name: "Recipient 3",
      allow_marketing_email: true
    })

    // Create newsletters with different statuses
    const draftNewsletter = await createNewsletter({
      subject: "Draft Newsletter",
      template_name: "general-news",
      content_mdx: "# Draft Content",
      status: "draft",
      created_by: creator.id
    })
    tracker.track("newsletters", draftNewsletter.id)

    const sentNewsletter = await createNewsletter({
      subject: "Sent Newsletter",
      template_name: "event-announcement",
      content_mdx: "# Sent Content",
      status: "sent",
      sent_at: new Date().toISOString(),
      created_by: creator.id
    })
    tracker.track("newsletters", sentNewsletter.id)

    // Create newsletter sends for the sent newsletter
    const send1 = await createNewsletterSend({
      newsletter_id: sentNewsletter.id,
      profile_id: recipient1.id,
      status: "sent"
    })
    tracker.track("newsletter_sends", send1.id)

    const send2 = await createNewsletterSend({
      newsletter_id: sentNewsletter.id,
      profile_id: recipient2.id,
      status: "sent"
    })
    tracker.track("newsletter_sends", send2.id)

    const send3 = await createNewsletterSend({
      newsletter_id: sentNewsletter.id,
      profile_id: recipient3.id,
      status: "failed",
      error_message: "Email bounce"
    })
    tracker.track("newsletter_sends", send3.id)

    // Create a scheduled newsletter
    const scheduledNewsletter = await createNewsletter({
      subject: "Scheduled Newsletter",
      template_name: "general-news",
      content_mdx: "# Scheduled Content",
      status: "scheduled",
      scheduled_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      created_by: creator.id
    })
    tracker.track("newsletters", scheduledNewsletter.id)

    // Fetch all newsletters with counts
    const newsletters = await getAllNewslettersWithCounts()

    // Should have all 3 newsletters
    expect(newsletters).toHaveLength(3)

    // Find each newsletter in the results
    const draftResult = newsletters.find(n => n.id === draftNewsletter.id)
    const sentResult = newsletters.find(n => n.id === sentNewsletter.id)
    const scheduledResult = newsletters.find(n => n.id === scheduledNewsletter.id)

    // Check draft newsletter
    expect(draftResult).toBeDefined()
    expect(draftResult?.subject).toBe("Draft Newsletter")
    expect(draftResult?.status).toBe("draft")
    expect(draftResult?.recipient_count).toBe(0)

    // Check sent newsletter
    expect(sentResult).toBeDefined()
    expect(sentResult?.subject).toBe("Sent Newsletter")
    expect(sentResult?.status).toBe("sent")
    expect(sentResult?.recipient_count).toBe(3) // Total sends (regardless of status)

    // Check scheduled newsletter
    expect(scheduledResult).toBeDefined()
    expect(scheduledResult?.subject).toBe("Scheduled Newsletter")
    expect(scheduledResult?.status).toBe("scheduled")
    expect(scheduledResult?.recipient_count).toBe(0)

    // Check that newsletters are ordered by created_at DESC (newest first)
    expect(newsletters[0].id).toBe(scheduledNewsletter.id)
    expect(newsletters[1].id).toBe(sentNewsletter.id)
    expect(newsletters[2].id).toBe(draftNewsletter.id)
  })

  it("should send a newsletter immediately when sendNewsletterNow is called", async () => {
    const creator = await createTestProfile(tracker, kysely, {
      user_id: null,
      email: "admin9@example.com",
      full_name: "Admin User 9"
    })

    // Create recipients
    await createTestProfile(tracker, kysely, {
      user_id: null,
      email: "immediate1@example.com",
      full_name: "Immediate Recipient 1",
      allow_marketing_email: true
    })

    await createTestProfile(tracker, kysely, {
      user_id: null,
      email: "immediate2@example.com",
      full_name: "Immediate Recipient 2",
      allow_marketing_email: true
    })

    // Create a recipient without marketing consent
    await createTestProfile(tracker, kysely, {
      user_id: null,
      email: "no-marketing@example.com",
      full_name: "No Marketing",
      allow_marketing_email: false
    })

    // Create a draft newsletter
    const newsletter = await createNewsletter({
      subject: "Immediate Send Test",
      template_name: "general-news",
      content_mdx: "# Immediate Content\n\nThis will be sent immediately.",
      status: "draft",
      created_by: creator.id
    })
    tracker.track("newsletters", newsletter.id)

    // Send the newsletter immediately
    const result = await sendNewsletterNow(newsletter.id)

    // Check the result
    expect(result.success).toBe(true)
    expect(result.processed).toBe(2) // Only recipients with marketing consent
    expect(result.failed).toBe(0)
    expect(result.newsletterId).toBe(newsletter.id)

    // Verify newsletter status was updated
    const updatedNewsletter = await kysely
      .selectFrom("newsletters")
      .selectAll()
      .where("id", "=", newsletter.id)
      .executeTakeFirst()

    expect(updatedNewsletter?.status).toBe("sent")
    expect(updatedNewsletter?.sent_at).toBeDefined()

    // Verify queue entries were created and processed
    const queueEntries = await kysely
      .selectFrom("newsletter_queue")
      .selectAll()
      .where("newsletter_id", "=", newsletter.id)
      .execute()

    expect(queueEntries).toHaveLength(2)
    expect(queueEntries.every(e => e.status === "sent")).toBe(true)

    // Verify newsletter_sends records were created
    const sends = await kysely
      .selectFrom("newsletter_sends")
      .selectAll()
      .where("newsletter_id", "=", newsletter.id)
      .execute()

    expect(sends).toHaveLength(2)
    expect(sends.every(s => s.status === "sent")).toBe(true)
  })

  it("should fail to send a non-draft newsletter immediately", async () => {
    const creator = await createTestProfile(tracker, kysely, {
      user_id: null,
      email: "admin10@example.com",
      full_name: "Admin User 10"
    })

    // Create a scheduled newsletter
    const newsletter = await createNewsletter({
      subject: "Already Scheduled",
      template_name: "general-news",
      content_mdx: "# Content",
      status: "scheduled",
      scheduled_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      created_by: creator.id
    })
    tracker.track("newsletters", newsletter.id)

    // Try to send immediately
    await expect(sendNewsletterNow(newsletter.id)).rejects.toThrow(
      "Only draft newsletters can be sent immediately"
    )

    // Verify status wasn't changed
    const unchangedNewsletter = await kysely
      .selectFrom("newsletters")
      .selectAll()
      .where("id", "=", newsletter.id)
      .executeTakeFirst()

    expect(unchangedNewsletter?.status).toBe("scheduled")
  })

  it("should handle errors gracefully when sending immediately", async () => {
    // Try to send a non-existent newsletter
    const fakeId = crypto.randomUUID()
    
    await expect(sendNewsletterNow(fakeId)).rejects.toThrow(
      "Newsletter not found"
    )
  })
})