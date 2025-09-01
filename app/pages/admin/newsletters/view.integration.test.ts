import { describe, expect, it, beforeEach, afterEach, vi } from "vitest"
import { setupIntegrationTest, cleanupAfterTest } from "~/test/integration-setup"
import { createTestProfile } from "~/test/db-test-utils"
import { action } from "./view"
import type { Route } from "./+types/view"

// Mock dependencies  
vi.mock('~/business/admin/admin.server', () => ({
  getAdminContext: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('remix-toast', () => ({
  redirectWithToast: vi.fn((path, _toast) => {
    throw new Response(null, {
      status: 302,
      headers: { Location: path },
    })
  }),
  redirectWithSuccess: vi.fn((path, _message) => {
    throw new Response(null, {
      status: 302,
      headers: { Location: path },
    })
  }),
}))

describe("View Newsletter Page Action - Integration Tests", () => {
  const { tracker, kysely } = setupIntegrationTest()

  beforeEach(async () => {
    tracker.clear()
    
    // Clear any existing newsletters and newsletter_queue
    await kysely.deleteFrom("newsletter_queue").execute()
    await kysely.deleteFrom("newsletters").execute()
  })

  afterEach(async () => {
    await cleanupAfterTest(tracker, kysely)
  })

  describe("send-now intent", () => {
    it("should successfully send a draft newsletter", async () => {
      // Create a test profile for newsletter recipient
      await createTestProfile(tracker, kysely, {
        user_id: null,
        email: "test@example.com",
        full_name: "Test User",
        allow_marketing_email: true,
      })
      
      // Create a test newsletter (without foreign key constraint)
      const newsletterInsert = await kysely
        .insertInto("newsletters")
        .values({
          subject: "Test Newsletter",
          template_name: "general-news",
          content_mdx: "# Test Content",
          status: "draft",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          created_by: null, // Avoid foreign key constraint
        })
        .returningAll()
        .executeTakeFirst()
      
      if (!newsletterInsert) {
        throw new Error("Failed to create test newsletter")
      }
      
      tracker.track("newsletters", newsletterInsert.id)
      
      const formData = new FormData()
      formData.append("intent", "send-now")
      
      const request = new Request("http://localhost:3000/admin/newsletters/" + newsletterInsert.id, {
        method: "POST",
        body: formData,
      })
      
      // Execute the action and expect it to throw a redirect response
      await expect(action({
        request,
        params: { id: newsletterInsert.id },
      } as Route.ActionArgs)).rejects.toThrow()
      
      // Verify the newsletter status was updated
      const updatedNewsletter = await kysely
        .selectFrom("newsletters")
        .selectAll()
        .where("id", "=", newsletterInsert.id)
        .executeTakeFirst()
      
      expect(updatedNewsletter?.status).toBe("sent")
      expect(updatedNewsletter?.sent_at).not.toBeNull()
      
      // Verify newsletter queue entries were created
      const queueEntries = await kysely
        .selectFrom("newsletter_queue")
        .selectAll()
        .where("newsletter_id", "=", newsletterInsert.id)
        .execute()
      
      expect(queueEntries.length).toBeGreaterThan(0)
      expect(queueEntries[0].status).toBe("sent")
    })
    
    it("should not send a non-draft newsletter", async () => {
      // Create a scheduled newsletter
      const newsletterInsert = await kysely
        .insertInto("newsletters")
        .values({
          subject: "Scheduled Newsletter",
          template_name: "general-news",
          content_mdx: "# Scheduled Content",
          status: "scheduled",
          scheduled_at: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          created_by: null, // Avoid foreign key constraint
        })
        .returningAll()
        .executeTakeFirst()
      
      if (!newsletterInsert) {
        throw new Error("Failed to create test newsletter")
      }
      
      tracker.track("newsletters", newsletterInsert.id)
      
      const formData = new FormData()
      formData.append("intent", "send-now")
      
      const request = new Request("http://localhost:3000/admin/newsletters/" + newsletterInsert.id, {
        method: "POST",
        body: formData,
      })
      
      // Execute the action and expect it to throw a redirect with error
      await expect(action({
        request,
        params: { id: newsletterInsert.id },
      } as Route.ActionArgs)).rejects.toThrow()
      
      // Verify the newsletter status was NOT changed
      const updatedNewsletter = await kysely
        .selectFrom("newsletters")
        .selectAll()
        .where("id", "=", newsletterInsert.id)
        .executeTakeFirst()
      
      expect(updatedNewsletter?.status).toBe("scheduled")
      expect(updatedNewsletter?.sent_at).toBeNull()
    })
  })
})