import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  cleanupAfterTest,
  setupIntegrationTest,
} from "~/test/integration-setup"
import { createTestEvent } from "~/test/db-test-utils"
import type { Database } from "~/types/database/database.types"

type EventNewsletterCampaign = Database["public"]["Tables"]["event_newsletter_campaigns"]["Row"]

// Helper to create mock campaign objects
const createMockCampaign = (
  overrides: Partial<EventNewsletterCampaign>,
): EventNewsletterCampaign => ({
  id: crypto.randomUUID(),
  event_id: "",
  campaign_type: "pre_opening",
  should_send_at: new Date().toISOString(),
  campaign_is_created: false,
  campaign_is_sent: false,
  times_attempted: 0,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  campaign_creation_time: null,
  campaign_id: null,
  campaign_sent_time: null,
  last_attempt: null,
  last_error: null,
  ...overrides,
})

// Mock the newsletter functions
vi.mock("~/business/newsletter/campaign-automation.server", () => ({
  processCampaignForEvent: vi.fn(),
}))

vi.mock("~/business/newsletter/campaign-tracking.server", async () => {
  const actual = await vi.importActual<
    typeof import("~/business/newsletter/campaign-tracking.server")
  >("~/business/newsletter/campaign-tracking.server")
  return {
    ...actual,
    getPendingCampaigns: vi.fn(),
  }
})

const {
  processCampaignForEvent,
} = await import("~/business/newsletter/campaign-automation.server")
const { getPendingCampaigns } = await import(
  "~/business/newsletter/campaign-tracking.server"
)

const { action } = await import("./api.process-pre-opening-reminders")

describe("api.process-pre-opening-reminders - Integration Tests", () => {
  const { tracker, kysely: db } = setupIntegrationTest()
  const VALID_SECRET = "test-secret-123"

  beforeEach(() => {
    tracker.clear()
    vi.clearAllMocks()
    process.env.INTERNAL_JOB_SECRET = VALID_SECRET
  })

  afterEach(async () => {
    await cleanupAfterTest(tracker, db)
    delete process.env.INTERNAL_JOB_SECRET
  })

  describe("Authentication", () => {
    it("should reject requests without auth header", async () => {
      const request = new Request("http://localhost:5173/api/process-pre-opening-reminders", {
        method: "POST",
      })

      const response = await action({
        request,
        params: {},
        context: {},
      })

      expect(response.status).toBe(401)
      const body = await response.json()
      expect(body.error).toBe("Unauthorized")
    })

    it("should reject requests with invalid token", async () => {
      const request = new Request("http://localhost:5173/api/process-pre-opening-reminders", {
        method: "POST",
        headers: {
          Authorization: "Bearer invalid-token",
        },
      })

      const response = await action({
        request,
        params: {},
        context: {},
      })

      expect(response.status).toBe(401)
      const body = await response.json()
      expect(body.error).toBe("Unauthorized")
    })

    it("should reject requests with malformed auth header", async () => {
      const request = new Request("http://localhost:5173/api/process-pre-opening-reminders", {
        method: "POST",
        headers: {
          Authorization: "InvalidFormat",
        },
      })

      const response = await action({
        request,
        params: {},
        context: {},
      })

      expect(response.status).toBe(401)
      const body = await response.json()
      expect(body.error).toBe("Unauthorized")
    })

    it("should return 500 when INTERNAL_JOB_SECRET is not configured", async () => {
      delete process.env.INTERNAL_JOB_SECRET

      const request = new Request("http://localhost:5173/api/process-pre-opening-reminders", {
        method: "POST",
        headers: {
          Authorization: "Bearer some-token",
        },
      })

      const response = await action({
        request,
        params: {},
        context: {},
      })

      expect(response.status).toBe(500)
      const body = await response.json()
      expect(body.error).toBe("Server misconfigured")
    })

    it("should accept requests with valid token", async () => {
      vi.mocked(getPendingCampaigns).mockResolvedValueOnce({
        success: true,
        data: [],
        errors: [],
      })

      const request = new Request("http://localhost:5173/api/process-pre-opening-reminders", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${VALID_SECRET}`,
        },
      })

      const response = await action({
        request,
        params: {},
        context: {},
      })

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.success).toBe(true)
    })
  })

  describe("Campaign Processing", () => {
    it("should process pending pre-opening campaigns", async () => {
      const event = await createTestEvent(tracker, db, {
        title: "Test Event",
        time_application_start: new Date(
          Date.now() + 4 * 24 * 60 * 60 * 1000,
        ).toISOString(),
      })

      // Update the auto-created pre-opening campaign to be ready for processing
      await db
        .updateTable("event_newsletter_campaigns")
        .set({
          should_send_at: new Date(Date.now() - 1000).toISOString(), // In the past
        })
        .where("event_id", "=", event.id)
        .where("campaign_type", "=", "pre_opening")
        .execute()

      vi.mocked(getPendingCampaigns).mockResolvedValueOnce({
        success: true,
        data: [
          createMockCampaign({
            event_id: event.id,
            should_send_at: new Date(Date.now() - 1000).toISOString(),
          }),
        ],
        errors: [],
      })

      vi.mocked(processCampaignForEvent).mockResolvedValueOnce({
        success: true,
        data: undefined,
        errors: [],
      })

      const request = new Request("http://localhost:5173/api/process-pre-opening-reminders", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${VALID_SECRET}`,
        },
      })

      const response = await action({
        request,
        params: {},
        context: {},
      })

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.success).toBe(true)
      expect(body.processed).toBe(1)
      expect(body.succeeded).toBe(1)
      expect(body.failed).toBe(0)

      expect(getPendingCampaigns).toHaveBeenCalledWith("pre_opening")
      expect(processCampaignForEvent).toHaveBeenCalledWith(
        event.id,
        "pre_opening",
      )
    })

    it("should respect should_send_at timing", async () => {
      const futureEvent = await createTestEvent(tracker, db, {
        title: "Future Event",
        time_application_start: new Date(
          Date.now() + 10 * 24 * 60 * 60 * 1000,
        ).toISOString(),
      })

      // The trigger auto-creates campaign with should_send_at = time_application_start - 3 days
      // Verify it's in the future (not ready for processing yet)
      const campaign = await db
        .selectFrom("event_newsletter_campaigns")
        .selectAll()
        .where("event_id", "=", futureEvent.id)
        .where("campaign_type", "=", "pre_opening")
        .executeTakeFirst()

      expect(campaign).toBeDefined()
      if (campaign && campaign.should_send_at) {
        expect(new Date(campaign.should_send_at).getTime()).toBeGreaterThan(
          Date.now(),
        )
      }

      // Mock should return empty since should_send_at is in the future
      vi.mocked(getPendingCampaigns).mockResolvedValueOnce({
        success: true,
        data: [],
        errors: [],
      })

      const request = new Request("http://localhost:5173/api/process-pre-opening-reminders", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${VALID_SECRET}`,
        },
      })

      const response = await action({
        request,
        params: {},
        context: {},
      })

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.processed).toBe(0)
      expect(processCampaignForEvent).not.toHaveBeenCalled()
    })

    it("should handle multiple pending campaigns", async () => {
      const event1 = await createTestEvent(tracker, db, {
        title: "Event 1",
      })
      const event2 = await createTestEvent(tracker, db, {
        title: "Event 2",
      })

      vi.mocked(getPendingCampaigns).mockResolvedValueOnce({
        success: true,
        data: [
          createMockCampaign({
            event_id: event1.id,
            should_send_at: new Date(Date.now() - 1000).toISOString(),
          }),
          createMockCampaign({
            event_id: event2.id,
            should_send_at: new Date(Date.now() - 1000).toISOString(),
          }),
        ],
        errors: [],
      })

      vi.mocked(processCampaignForEvent)
        .mockResolvedValueOnce({ success: true, data: undefined, errors: [] })
        .mockResolvedValueOnce({ success: true, data: undefined, errors: [] })

      const request = new Request("http://localhost:5173/api/process-pre-opening-reminders", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${VALID_SECRET}`,
        },
      })

      const response = await action({
        request,
        params: {},
        context: {},
      })

      const body = await response.json()
      expect(body.processed).toBe(2)
      expect(body.succeeded).toBe(2)
      expect(body.failed).toBe(0)
      expect(processCampaignForEvent).toHaveBeenCalledTimes(2)
    })

    it("should handle campaign processing failures", async () => {
      const event = await createTestEvent(tracker, db, {
        title: "Test Event",
      })

      vi.mocked(getPendingCampaigns).mockResolvedValueOnce({
        success: true,
        data: [
          createMockCampaign({
            event_id: event.id,
            should_send_at: new Date(Date.now() - 1000).toISOString(),
          }),
        ],
        errors: [],
      })

      vi.mocked(processCampaignForEvent).mockResolvedValueOnce({
        success: false,
        errors: [Object.assign(new Error("Listmonk API error"), { name: "Error" })],
      })

      const request = new Request("http://localhost:5173/api/process-pre-opening-reminders", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${VALID_SECRET}`,
        },
      })

      const response = await action({
        request,
        params: {},
        context: {},
      })

      const body = await response.json()
      expect(body.success).toBe(true)
      expect(body.processed).toBe(1)
      expect(body.succeeded).toBe(0)
      expect(body.failed).toBe(1)
      expect(body.results[0].error).toBe("Listmonk API error")
    })

    it("should handle mixed success and failure results", async () => {
      const event1 = await createTestEvent(tracker, db, {
        title: "Event 1",
      })
      const event2 = await createTestEvent(tracker, db, {
        title: "Event 2",
      })

      vi.mocked(getPendingCampaigns).mockResolvedValueOnce({
        success: true,
        data: [
          createMockCampaign({
            event_id: event1.id,
            should_send_at: new Date(Date.now() - 1000).toISOString(),
          }),
          createMockCampaign({
            event_id: event2.id,
            should_send_at: new Date(Date.now() - 1000).toISOString(),
          }),
        ],
        errors: [],
      })

      vi.mocked(processCampaignForEvent)
        .mockResolvedValueOnce({ success: true, data: undefined, errors: [] })
        .mockResolvedValueOnce({
          success: false,
          errors: [Object.assign(new Error("Failed to send"), { name: "Error" })],
        })

      const request = new Request("http://localhost:5173/api/process-pre-opening-reminders", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${VALID_SECRET}`,
        },
      })

      const response = await action({
        request,
        params: {},
        context: {},
      })

      const body = await response.json()
      expect(body.processed).toBe(2)
      expect(body.succeeded).toBe(1)
      expect(body.failed).toBe(1)
    })
  })

  describe("Error Handling", () => {
    it("should return 500 when getPendingCampaigns fails", async () => {
      vi.mocked(getPendingCampaigns).mockResolvedValueOnce({
        success: false,
        errors: [Object.assign(new Error("Database error"), { name: "Error" })],
      })

      const request = new Request("http://localhost:5173/api/process-pre-opening-reminders", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${VALID_SECRET}`,
        },
      })

      const response = await action({
        request,
        params: {},
        context: {},
      })

      expect(response.status).toBe(500)
      const body = await response.json()
      expect(body.success).toBe(false)
      expect(body.error).toContain("Failed to fetch pending pre-opening campaigns")
    })

    it("should handle unexpected errors gracefully", async () => {
      vi.mocked(getPendingCampaigns).mockRejectedValueOnce(
        new Error("Unexpected error"),
      )

      const request = new Request("http://localhost:5173/api/process-pre-opening-reminders", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${VALID_SECRET}`,
        },
      })

      const response = await action({
        request,
        params: {},
        context: {},
      })

      expect(response.status).toBe(500)
      const body = await response.json()
      expect(body.success).toBe(false)
      expect(body.error).toBe("Unexpected error")
    })
  })
})
