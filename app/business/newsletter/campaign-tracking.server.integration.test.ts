import { afterEach, beforeEach, describe, expect, it } from "vitest"
import {
  cleanupAfterTest,
  setupIntegrationTest,
} from "~/test/integration-setup"
import { createTestEvent } from "~/test/db-test-utils"
import {
  createCampaignTracking,
  getPendingCampaigns,
  updateCampaignCreated,
  updateCampaignError,
  updateCampaignSent,
} from "./campaign-tracking.server"

describe("Campaign Tracking - Integration Tests", () => {
  const { tracker, kysely: db } = setupIntegrationTest()

  beforeEach(async () => {
    tracker.clear()
    await db.deleteFrom("event_newsletter_campaigns").execute()
  })

  afterEach(async () => {
    await cleanupAfterTest(tracker, db)
  })

  describe("createCampaignTracking", () => {
    it("should create tracking record for event", async () => {
      const event = await createTestEvent(tracker, db, {
        title: "Test Event",
        event_status: "Scheduled",
      })

      const result = await createCampaignTracking(event.id)

      expect(result.success).toBe(true)

      const tracking = await db
        .selectFrom("event_newsletter_campaigns")
        .selectAll()
        .where("event_id", "=", event.id)
        .executeTakeFirst()

      expect(tracking).toBeDefined()
      expect(tracking?.event_id).toBe(event.id)
      expect(tracking?.campaign_is_created).toBe(false)
      expect(tracking?.campaign_is_sent).toBe(false)
      expect(tracking?.times_attempted).toBe(0)
    })

    it("should handle duplicate tracking creation gracefully", async () => {
      const event = await createTestEvent(tracker, db, {
        title: "Test Event",
        event_status: "Scheduled",
      })

      await createCampaignTracking(event.id)
      const result = await createCampaignTracking(event.id)

      expect(result.success).toBe(true)

      const count = await db
        .selectFrom("event_newsletter_campaigns")
        .select((eb) => eb.fn.countAll().as("count"))
        .where("event_id", "=", event.id)
        .executeTakeFirstOrThrow()

      expect(Number(count.count)).toBe(1)
    })
  })

  describe("getPendingCampaigns", () => {
    it("should return campaigns where campaign_is_created is false", async () => {
      const event1 = await createTestEvent(tracker, db, { title: "Event 1" })
      const event2 = await createTestEvent(tracker, db, { title: "Event 2" })

      await createCampaignTracking(event1.id)
      await createCampaignTracking(event2.id)

      const result = await getPendingCampaigns()

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(2)
      }
    })

    it("should return campaigns where campaign_is_sent is false", async () => {
      const event = await createTestEvent(tracker, db, { title: "Event" })
      await createCampaignTracking(event.id)

      await db
        .updateTable("event_newsletter_campaigns")
        .set({ campaign_is_created: true, campaign_id: "test-123" })
        .where("event_id", "=", event.id)
        .execute()

      const result = await getPendingCampaigns()

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(1)
      }
    })

    it("should exclude campaigns with times_attempted >= 3", async () => {
      const event1 = await createTestEvent(tracker, db, { title: "Event 1" })
      const event2 = await createTestEvent(tracker, db, { title: "Event 2" })

      await createCampaignTracking(event1.id)
      await createCampaignTracking(event2.id)

      await db
        .updateTable("event_newsletter_campaigns")
        .set({ times_attempted: 3 })
        .where("event_id", "=", event1.id)
        .execute()

      const result = await getPendingCampaigns()

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(1)
        expect(result.data[0].event_id).toBe(event2.id)
      }
    })

    it("should exclude fully completed campaigns", async () => {
      const event = await createTestEvent(tracker, db, { title: "Event" })
      await createCampaignTracking(event.id)

      await db
        .updateTable("event_newsletter_campaigns")
        .set({
          campaign_is_created: true,
          campaign_is_sent: true,
        })
        .where("event_id", "=", event.id)
        .execute()

      const result = await getPendingCampaigns()

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(0)
      }
    })
  })

  describe("updateCampaignCreated", () => {
    it("should update campaign as created with campaign_id", async () => {
      const event = await createTestEvent(tracker, db, { title: "Event" })
      await createCampaignTracking(event.id)

      const campaignId = "listmonk-campaign-123"
      const result = await updateCampaignCreated(event.id, campaignId)

      expect(result.success).toBe(true)

      const tracking = await db
        .selectFrom("event_newsletter_campaigns")
        .selectAll()
        .where("event_id", "=", event.id)
        .executeTakeFirstOrThrow()

      expect(tracking.campaign_is_created).toBe(true)
      expect(tracking.campaign_id).toBe(campaignId)
      expect(tracking.campaign_creation_time).toBeDefined()
    })
  })

  describe("updateCampaignSent", () => {
    it("should update campaign as sent", async () => {
      const event = await createTestEvent(tracker, db, { title: "Event" })
      await createCampaignTracking(event.id)

      await db
        .updateTable("event_newsletter_campaigns")
        .set({
          campaign_is_created: true,
          campaign_id: "test-123",
        })
        .where("event_id", "=", event.id)
        .execute()

      const result = await updateCampaignSent(event.id)

      expect(result.success).toBe(true)

      const tracking = await db
        .selectFrom("event_newsletter_campaigns")
        .selectAll()
        .where("event_id", "=", event.id)
        .executeTakeFirstOrThrow()

      expect(tracking.campaign_is_sent).toBe(true)
      expect(tracking.campaign_sent_time).toBeDefined()
    })
  })

  describe("updateCampaignError", () => {
    it("should increment times_attempted and log error", async () => {
      const event = await createTestEvent(tracker, db, { title: "Event" })
      await createCampaignTracking(event.id)

      const errorData = {
        step: "campaign_creation" as const,
        message: "API rate limit exceeded",
        timestamp: new Date().toISOString(),
      }

      const result = await updateCampaignError(event.id, errorData)

      expect(result.success).toBe(true)

      const tracking = await db
        .selectFrom("event_newsletter_campaigns")
        .selectAll()
        .where("event_id", "=", event.id)
        .executeTakeFirstOrThrow()

      expect(tracking.times_attempted).toBe(1)
      expect(tracking.last_attempt).toBeDefined()
      expect(tracking.last_error).toEqual(errorData)
    })

    it("should increment times_attempted on subsequent errors", async () => {
      const event = await createTestEvent(tracker, db, { title: "Event" })
      await createCampaignTracking(event.id)

      const errorData1 = {
        step: "campaign_creation" as const,
        message: "First error",
        timestamp: new Date().toISOString(),
      }

      await updateCampaignError(event.id, errorData1)

      const errorData2 = {
        step: "send_signal" as const,
        message: "Second error",
        timestamp: new Date().toISOString(),
      }

      await updateCampaignError(event.id, errorData2)

      const tracking = await db
        .selectFrom("event_newsletter_campaigns")
        .selectAll()
        .where("event_id", "=", event.id)
        .executeTakeFirstOrThrow()

      expect(tracking.times_attempted).toBe(2)
      expect(tracking.last_error).toEqual(errorData2)
    })
  })
})
