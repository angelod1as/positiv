import { describe, expect, it, beforeEach, afterEach, vi } from "vitest"
import { setupIntegrationTest, cleanupAfterTest } from "~/test/integration-setup"
import { createTestProfile } from "~/test/db-test-utils"
import { createNewsletter } from "./newsletter.server"
import { getNewsletterAnalytics, getUnsubscribeCountForNewsletter } from "./newsletter-analytics.server"

// Mock the email sending function
vi.mock("~/business/email/send-email", () => ({
  sendEmail: vi.fn().mockResolvedValue({ success: true, data: undefined, errors: [] })
}))

describe("Newsletter Analytics - Integration Tests", () => {
  const { tracker, kysely } = setupIntegrationTest()

  beforeEach(async () => {
    tracker.clear()
    
    // Clear any existing newsletter data for clean tests
    await kysely.deleteFrom("unsubscribe_logs").execute()
    await kysely.deleteFrom("newsletter_queue").execute()
    await kysely.deleteFrom("newsletter_sends").execute()
    await kysely.deleteFrom("newsletters").execute()
  })

  afterEach(async () => {
    await cleanupAfterTest(tracker, kysely)
  })

  describe("getNewsletterAnalytics", () => {
    it("should calculate analytics for a newsletter with no sends", async () => {
      // Create a test newsletter
      const creator = await createTestProfile(tracker, kysely, {
        user_id: null,
        email: "admin@example.com",
        full_name: "Admin User"
      })

      const newsletter = await createNewsletter({
        subject: "Test Newsletter",
        template_name: "general-news",
        content_mdx: "# Test",
        status: "draft",
        created_by: creator.id
      })
      tracker.track("newsletters", newsletter.id)

      // Get analytics for the newsletter
      const analytics = await getNewsletterAnalytics(kysely, newsletter.id)

      expect(analytics).toEqual({
        newsletterId: newsletter.id,
        totalRecipients: 0,
        successfulSends: 0,
        failedSends: 0,
        deliveryRate: 0,
        unsubscribes: 0,
        sendDuration: 0,
        averageSendTime: 0
      })
    })

    it("should calculate analytics for a newsletter with successful sends", async () => {
      const creator = await createTestProfile(tracker, kysely, {
        user_id: null,
        email: "admin@example.com",
        full_name: "Admin User"
      })

      const newsletter = await createNewsletter({
        subject: "Test Newsletter",
        template_name: "general-news",
        content_mdx: "# Test",
        status: "sent",
        sent_at: new Date().toISOString(),
        created_by: creator.id
      })
      tracker.track("newsletters", newsletter.id)

      // Create test recipients
      const recipient1 = await createTestProfile(tracker, kysely, {
        user_id: null,
        email: "user1@example.com",
        full_name: "User 1",
        allow_marketing_email: true
      })

      const recipient2 = await createTestProfile(tracker, kysely, {
        user_id: null,
        email: "user2@example.com",
        full_name: "User 2",
        allow_marketing_email: true
      })

      const recipient3 = await createTestProfile(tracker, kysely, {
        user_id: null,
        email: "user3@example.com",
        full_name: "User 3",
        allow_marketing_email: true
      })

      // Simulate successful sends
      await kysely.insertInto("newsletter_sends").values([
        {
          id: crypto.randomUUID(),
          newsletter_id: newsletter.id,
          profile_id: recipient1.id,
          status: "sent",
          sent_at: new Date().toISOString()
        },
        {
          id: crypto.randomUUID(),
          newsletter_id: newsletter.id,
          profile_id: recipient2.id,
          status: "sent",
          sent_at: new Date().toISOString()
        }
      ]).execute()

      // Simulate one failed send
      await kysely.insertInto("newsletter_sends").values({
        id: crypto.randomUUID(),
        newsletter_id: newsletter.id,
        profile_id: recipient3.id,
        status: "failed",
        error_message: "Invalid email"
      }).execute()

      const analytics = await getNewsletterAnalytics(kysely, newsletter.id)

      expect(analytics.newsletterId).toBe(newsletter.id)
      expect(analytics.totalRecipients).toBe(3)
      expect(analytics.successfulSends).toBe(2)
      expect(analytics.failedSends).toBe(1)
      expect(analytics.deliveryRate).toBe(66.67) // 2/3 * 100, rounded to 2 decimals
      expect(analytics.unsubscribes).toBe(0)
    })

    it("should calculate analytics including unsubscribes", async () => {
      const creator = await createTestProfile(tracker, kysely, {
        user_id: null,
        email: "admin@example.com",
        full_name: "Admin User"
      })

      const sentAt = new Date('2024-01-15T10:00:00Z')
      const newsletter = await createNewsletter({
        subject: "Test Newsletter",
        template_name: "general-news",
        content_mdx: "# Test",
        status: "sent",
        sent_at: sentAt.toISOString(),
        created_by: creator.id
      })
      tracker.track("newsletters", newsletter.id)

      // Create test recipients
      const recipient1 = await createTestProfile(tracker, kysely, {
        user_id: null,
        email: "user1@example.com",
        full_name: "User 1",
        allow_marketing_email: false // Already unsubscribed
      })

      const recipient2 = await createTestProfile(tracker, kysely, {
        user_id: null,
        email: "user2@example.com",
        full_name: "User 2",
        allow_marketing_email: false
      })

      // Record sends
      await kysely.insertInto("newsletter_sends").values([
        {
          id: crypto.randomUUID(),
          newsletter_id: newsletter.id,
          profile_id: recipient1.id,
          status: "sent",
          sent_at: sentAt.toISOString()
        },
        {
          id: crypto.randomUUID(),
          newsletter_id: newsletter.id,
          profile_id: recipient2.id,
          status: "sent",
          sent_at: sentAt.toISOString()
        }
      ]).execute()

      // Record unsubscribes after the newsletter was sent
      await kysely.insertInto("unsubscribe_logs").values([
        {
          id: crypto.randomUUID(),
          profile_id: recipient1.id,
          unsubscribed_at: new Date('2024-01-16T10:00:00Z').toISOString(), // Day after send
          source: "email_link"
        },
        {
          id: crypto.randomUUID(),
          profile_id: recipient2.id,
          unsubscribed_at: new Date('2024-01-17T10:00:00Z').toISOString(), // 2 days after send
          source: "email_link"
        }
      ]).execute()

      const analytics = await getNewsletterAnalytics(kysely, newsletter.id)

      expect(analytics.unsubscribes).toBe(2)
      expect(analytics.totalRecipients).toBe(2)
      expect(analytics.successfulSends).toBe(2)
    })

    it("should calculate send duration when timing fields are present", async () => {
      const creator = await createTestProfile(tracker, kysely, {
        user_id: null,
        email: "admin@example.com",
        full_name: "Admin User"
      })

      const sendStartedAt = new Date('2024-01-15T10:00:00Z')
      const sendCompletedAt = new Date('2024-01-15T10:05:30Z') // 5.5 minutes later
      
      // Columns are added via migration, no need to alter schema in tests

      const newsletter = await kysely
        .insertInto("newsletters")
        .values({
          id: crypto.randomUUID(),
          subject: "Test Newsletter",
          template_name: "general-news",
          content_mdx: "# Test",
          status: "sent",
          created_by: creator.id,
          sent_at: sendCompletedAt.toISOString(),
          send_started_at: sendStartedAt.toISOString(),
          send_completed_at: sendCompletedAt.toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .returningAll()
        .executeTakeFirstOrThrow()
      
      tracker.track("newsletters", newsletter.id)

      // Create 10 successful sends
      const sendPromises = []
      for (let i = 1; i <= 10; i++) {
        const recipient = await createTestProfile(tracker, kysely, {
          user_id: null,
          email: `user${i}@example.com`,
          full_name: `User ${i}`,
          allow_marketing_email: true
        })

        sendPromises.push(
          kysely.insertInto("newsletter_sends").values({
            id: crypto.randomUUID(),
            newsletter_id: newsletter.id,
            profile_id: recipient.id,
            status: "sent",
            sent_at: new Date(sendStartedAt.getTime() + i * 33000).toISOString() // Stagger sends by 33 seconds
          }).execute()
        )
      }
      await Promise.all(sendPromises)

      const analytics = await getNewsletterAnalytics(kysely, newsletter.id)

      expect(analytics.sendDuration).toBe(5.5) // 5.5 minutes
      expect(analytics.averageSendTime).toBe(33) // 330 seconds / 10 emails = 33 seconds per email
      expect(analytics.totalRecipients).toBe(10)
      expect(analytics.successfulSends).toBe(10)
    })
  })

  describe("getUnsubscribeCountForNewsletter", () => {
    it("should count unsubscribes that occurred after newsletter was sent", async () => {
      const creator = await createTestProfile(tracker, kysely, {
        user_id: null,
        email: "admin@example.com",
        full_name: "Admin User"
      })

      const sentAt = new Date('2024-01-15T10:00:00Z')
      const newsletter = await createNewsletter({
        subject: "Test Newsletter",
        template_name: "general-news",
        content_mdx: "# Test",
        status: "sent",
        sent_at: sentAt.toISOString(),
        created_by: creator.id
      })
      tracker.track("newsletters", newsletter.id)

      // Create test recipients
      const recipients = await Promise.all([
        createTestProfile(tracker, kysely, {
          user_id: null,
          email: "user1@example.com",
          full_name: "User 1"
        }),
        createTestProfile(tracker, kysely, {
          user_id: null,
          email: "user2@example.com",
          full_name: "User 2"
        }),
        createTestProfile(tracker, kysely, {
          user_id: null,
          email: "user3@example.com",
          full_name: "User 3"
        })
      ])

      // Record sends to all recipients
      await kysely.insertInto("newsletter_sends").values(
        recipients.map(r => ({
          id: crypto.randomUUID(),
          newsletter_id: newsletter.id,
          profile_id: r.id,
          status: "sent" as const,
          sent_at: sentAt.toISOString()
        }))
      ).execute()

      // Record unsubscribes
      await kysely.insertInto("unsubscribe_logs").values([
        {
          id: crypto.randomUUID(),
          profile_id: recipients[0].id,
          unsubscribed_at: new Date('2024-01-14T10:00:00Z').toISOString(), // Before send - should NOT count
          source: "email_link"
        },
        {
          id: crypto.randomUUID(),
          profile_id: recipients[1].id,
          unsubscribed_at: new Date('2024-01-16T10:00:00Z').toISOString(), // After send - should count
          source: "email_link"
        },
        {
          id: crypto.randomUUID(),
          profile_id: recipients[2].id,
          unsubscribed_at: new Date('2024-01-20T10:00:00Z').toISOString(), // Within 7 days - should count
          source: "email_link"
        }
      ]).execute()

      const unsubscribeCount = await getUnsubscribeCountForNewsletter(kysely, newsletter.id)

      expect(unsubscribeCount).toBe(2) // Only the 2 unsubscribes after the send date
    })

    it("should return 0 for newsletter with no unsubscribes", async () => {
      const creator = await createTestProfile(tracker, kysely, {
        user_id: null,
        email: "admin@example.com",
        full_name: "Admin User"
      })

      const newsletter = await createNewsletter({
        subject: "Test Newsletter",
        template_name: "general-news",
        content_mdx: "# Test",
        status: "sent",
        sent_at: new Date().toISOString(),
        created_by: creator.id
      })
      tracker.track("newsletters", newsletter.id)

      const unsubscribeCount = await getUnsubscribeCountForNewsletter(kysely, newsletter.id)

      expect(unsubscribeCount).toBe(0)
    })
  })
})