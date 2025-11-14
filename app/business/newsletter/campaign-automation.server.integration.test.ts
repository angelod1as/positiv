import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  cleanupAfterTest,
  setupIntegrationTest,
} from "~/test/integration-setup"
import { createTestEvent } from "~/test/db-test-utils"
import {
  createCampaignForEvent,
  sendCampaign,
  processCampaignForEvent,
} from "./campaign-automation.server"
import * as campaignCreator from "./create-event-opening-campaign.server"

describe("Campaign Automation - Integration Tests", () => {
  const { tracker, kysely: db } = setupIntegrationTest()

  beforeEach(async () => {
    tracker.clear()
    await db.deleteFrom("event_newsletter_campaigns").execute()
  })

  afterEach(async () => {
    await cleanupAfterTest(tracker, db)
    vi.restoreAllMocks()
  })

  describe("createCampaignForEvent", () => {
    it("should create campaign and update tracking row", async () => {
      const event = await createTestEvent(tracker, db, {
        title: "Test Event",
        event_status: "Registration Open",
      })

      // Create tracking row first
      await db
        .insertInto("event_newsletter_campaigns")
        .values({
          event_id: event.id,
          campaign_is_created: false,
          campaign_is_sent: false,
          times_attempted: 0,
        })
        .execute()

      // Mock the Listmonk API call
      const mockCampaignId = 123
      vi.spyOn(campaignCreator, "createEventOpeningCampaign").mockResolvedValue({
        success: true,
        data: {
          data: {
            id: mockCampaignId,
            name: "Test Campaign",
            subject: "Test Subject",
            status: "draft",
          },
        },
        errors: [],
        inputErrors: [],
      })

      const result = await createCampaignForEvent(event.id)

      expect(result.success).toBe(true)
      expect(result.data).toBe(mockCampaignId)

      // Verify tracking row was updated
      const tracking = await db
        .selectFrom("event_newsletter_campaigns")
        .selectAll()
        .where("event_id", "=", event.id)
        .executeTakeFirstOrThrow()

      expect(tracking.campaign_is_created).toBe(true)
      expect(tracking.campaign_id).toBe(String(mockCampaignId))
      expect(tracking.campaign_creation_time).toBeDefined()
    })

    it("should return error when event does not exist", async () => {
      const fakeEventId = "00000000-0000-0000-0000-000000000000"

      const result = await createCampaignForEvent(fakeEventId)

      expect(result.success).toBe(false)
      expect(result.errors[0].message).toContain("Event not found")
    })

    it("should handle Listmonk API errors and update tracking", async () => {
      const event = await createTestEvent(tracker, db, {
        title: "Test Event",
        event_status: "Registration Open",
      })

      await db
        .insertInto("event_newsletter_campaigns")
        .values({
          event_id: event.id,
          campaign_is_created: false,
          campaign_is_sent: false,
          times_attempted: 0,
        })
        .execute()

      // Mock Listmonk API failure
      vi.spyOn(campaignCreator, "createEventOpeningCampaign").mockResolvedValue({
        success: false,
        data: undefined,
        errors: [{ message: "API rate limit exceeded", name: "APIError" }],
        inputErrors: [],
      })

      const result = await createCampaignForEvent(event.id)

      expect(result.success).toBe(false)

      // Verify error tracking was updated
      const tracking = await db
        .selectFrom("event_newsletter_campaigns")
        .selectAll()
        .where("event_id", "=", event.id)
        .executeTakeFirstOrThrow()

      expect(tracking.times_attempted).toBe(1)
      expect(tracking.last_error).toBeDefined()
      expect(tracking.last_attempt).toBeDefined()
    })
  })

  describe("sendCampaign", () => {
    it("should send campaign and update tracking row", async () => {
      const event = await createTestEvent(tracker, db, {
        title: "Test Event",
        event_status: "Registration Open",
      })

      const campaignId = "123"

      await db
        .insertInto("event_newsletter_campaigns")
        .values({
          event_id: event.id,
          campaign_is_created: true,
          campaign_id: campaignId,
          campaign_is_sent: false,
          times_attempted: 0,
        })
        .execute()

      // Mock fetch to simulate Listmonk API
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: { status: "running" } }),
      })

      const result = await sendCampaign(event.id)

      expect(result.success).toBe(true)

      // Verify tracking row was updated
      const tracking = await db
        .selectFrom("event_newsletter_campaigns")
        .selectAll()
        .where("event_id", "=", event.id)
        .executeTakeFirstOrThrow()

      expect(tracking.campaign_is_sent).toBe(true)
      expect(tracking.campaign_sent_time).toBeDefined()
    })

    it("should return error when tracking row not found", async () => {
      const fakeEventId = "00000000-0000-0000-0000-000000000000"

      const result = await sendCampaign(fakeEventId)

      expect(result.success).toBe(false)
      expect(result.errors[0].message).toContain("Tracking row not found")
    })

    it("should return error when campaign_id is missing", async () => {
      const event = await createTestEvent(tracker, db, {
        title: "Test Event",
        event_status: "Registration Open",
      })

      await db
        .insertInto("event_newsletter_campaigns")
        .values({
          event_id: event.id,
          campaign_is_created: false,
          campaign_is_sent: false,
          times_attempted: 0,
        })
        .execute()

      const result = await sendCampaign(event.id)

      expect(result.success).toBe(false)
      expect(result.errors[0].message).toContain("Campaign not created")
    })

    it("should handle Listmonk API errors and update tracking", async () => {
      const event = await createTestEvent(tracker, db, {
        title: "Test Event",
        event_status: "Registration Open",
      })

      const campaignId = "123"

      await db
        .insertInto("event_newsletter_campaigns")
        .values({
          event_id: event.id,
          campaign_is_created: true,
          campaign_id: campaignId,
          campaign_is_sent: false,
          times_attempted: 0,
        })
        .execute()

      // Mock fetch to simulate Listmonk API failure
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        text: async () => "Server error",
      })

      const result = await sendCampaign(event.id)

      expect(result.success).toBe(false)

      // Verify error tracking was updated
      const tracking = await db
        .selectFrom("event_newsletter_campaigns")
        .selectAll()
        .where("event_id", "=", event.id)
        .executeTakeFirstOrThrow()

      expect(tracking.times_attempted).toBe(1)
      expect(tracking.last_error).toBeDefined()
      expect(tracking.last_attempt).toBeDefined()
    })
  })

  describe("processCampaignForEvent", () => {
    it("should create and send campaign in one flow", async () => {
      const event = await createTestEvent(tracker, db, {
        title: "Test Event",
        event_status: "Registration Open",
      })

      await db
        .insertInto("event_newsletter_campaigns")
        .values({
          event_id: event.id,
          campaign_is_created: false,
          campaign_is_sent: false,
          times_attempted: 0,
        })
        .execute()

      // Mock campaign creation
      const mockCampaignId = 123
      vi.spyOn(campaignCreator, "createEventOpeningCampaign").mockResolvedValue({
        success: true,
        data: {
          data: {
            id: mockCampaignId,
            name: "Test Campaign",
            subject: "Test Subject",
            status: "draft",
          },
        },
        errors: [],
        inputErrors: [],
      })

      // Mock campaign sending
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: { status: "running" } }),
      })

      const result = await processCampaignForEvent(event.id)

      expect(result.success).toBe(true)

      // Verify final state
      const tracking = await db
        .selectFrom("event_newsletter_campaigns")
        .selectAll()
        .where("event_id", "=", event.id)
        .executeTakeFirstOrThrow()

      expect(tracking.campaign_is_created).toBe(true)
      expect(tracking.campaign_is_sent).toBe(true)
    })

    it("should stop at creation step if creation fails", async () => {
      const event = await createTestEvent(tracker, db, {
        title: "Test Event",
        event_status: "Registration Open",
      })

      await db
        .insertInto("event_newsletter_campaigns")
        .values({
          event_id: event.id,
          campaign_is_created: false,
          campaign_is_sent: false,
          times_attempted: 0,
        })
        .execute()

      // Mock campaign creation failure
      vi.spyOn(campaignCreator, "createEventOpeningCampaign").mockResolvedValue({
        success: false,
        data: undefined,
        errors: [{ message: "API error", name: "APIError" }],
        inputErrors: [],
      })

      const result = await processCampaignForEvent(event.id)

      expect(result.success).toBe(false)

      // Verify campaign was not sent
      const tracking = await db
        .selectFrom("event_newsletter_campaigns")
        .selectAll()
        .where("event_id", "=", event.id)
        .executeTakeFirstOrThrow()

      expect(tracking.campaign_is_created).toBe(false)
      expect(tracking.campaign_is_sent).toBe(false)
      expect(tracking.times_attempted).toBe(1)
    })

    it("should only send if campaign already created", async () => {
      const event = await createTestEvent(tracker, db, {
        title: "Test Event",
        event_status: "Registration Open",
      })

      const campaignId = "456"

      await db
        .insertInto("event_newsletter_campaigns")
        .values({
          event_id: event.id,
          campaign_is_created: true,
          campaign_id: campaignId,
          campaign_is_sent: false,
          times_attempted: 0,
        })
        .execute()

      // Mock campaign sending
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: { status: "running" } }),
      })

      const result = await processCampaignForEvent(event.id)

      expect(result.success).toBe(true)

      // Verify campaign was sent but not created again
      const tracking = await db
        .selectFrom("event_newsletter_campaigns")
        .selectAll()
        .where("event_id", "=", event.id)
        .executeTakeFirstOrThrow()

      expect(tracking.campaign_id).toBe(campaignId)
      expect(tracking.campaign_is_sent).toBe(true)
    })
  })
})
