import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  setupIntegrationTest,
  cleanupAfterTest,
} from "~/test/integration-setup"
import { createTestProfile } from "~/test/db-test-utils"
import {
  getFailedSubscriptionsForRetry,
  processFailedSyncRetries,
} from "./retry-failed-syncs.server"
import * as listmonkClient from "./listmonk-client.server"

describe("Newsletter Retry Logic - Integration Tests", () => {
  const { tracker, kysely } = setupIntegrationTest()

  beforeEach(async () => {
    tracker.clear()
    // Clear existing test data
    await kysely
      .deleteFrom("newsletter_subscriptions")
      .where("subscription_source", "=", "backfill")
      .execute()
  })

  afterEach(async () => {
    await cleanupAfterTest(tracker, kysely)
    vi.restoreAllMocks()
  })

  describe("getFailedSubscriptionsForRetry", () => {
    it("should return failed subscriptions with retry_count < 5", async () => {
      const profile1 = await createTestProfile(tracker, kysely, {
        user_id: null,
        email: "failed1@example.com",
        social_name: "Test User 1",
      })

      const profile2 = await createTestProfile(tracker, kysely, {
        user_id: null,
        email: "failed2@example.com",
        social_name: "Test User 2",
      })

      // Create failed subscription with retry_count = 0
      const [sub1] = await kysely
        .insertInto("newsletter_subscriptions")
        .values({
          profile_id: profile1.id,
          consent_given: true,
          subscription_source: "manual_button",
          sync_status: "failed",
          retry_count: 0,
          last_sync_attempt_at: new Date().toISOString(),
        })
        .returningAll()
        .execute()

      tracker.track("newsletter_subscriptions", sub1.id)

      // Create failed subscription with retry_count = 3
      const [sub2] = await kysely
        .insertInto("newsletter_subscriptions")
        .values({
          profile_id: profile2.id,
          consent_given: true,
          subscription_source: "manual_button",
          sync_status: "failed",
          retry_count: 3,
          last_sync_attempt_at: new Date().toISOString(),
        })
        .returningAll()
        .execute()

      tracker.track("newsletter_subscriptions", sub2.id)

      const result = await getFailedSubscriptionsForRetry()

      expect(result).toBeDefined()
      expect(Array.isArray(result)).toBe(true)
      expect(result.length).toBe(2)
      expect(result.some(s => s.email === "failed1@example.com")).toBe(true)
      expect(result.some(s => s.email === "failed2@example.com")).toBe(true)
    })

    it("should NOT return subscriptions with retry_count >= 5", async () => {
      const profile = await createTestProfile(tracker, kysely, {
        user_id: null,
        email: "maxed-out@example.com",
      })

      // Create failed subscription with retry_count = 5 (at max)
      const [sub] = await kysely
        .insertInto("newsletter_subscriptions")
        .values({
          profile_id: profile.id,
          consent_given: true,
          subscription_source: "manual_button",
          sync_status: "failed",
          retry_count: 5,
          last_sync_attempt_at: new Date().toISOString(),
        })
        .returningAll()
        .execute()

      tracker.track("newsletter_subscriptions", sub.id)

      const result = await getFailedSubscriptionsForRetry()

      expect(result).toBeDefined()
      expect(result.some(s => s.email === "maxed-out@example.com")).toBe(false)
    })

    it("should NOT return synced subscriptions", async () => {
      const profile = await createTestProfile(tracker, kysely, {
        user_id: null,
        email: "synced@example.com",
      })

      // Create synced subscription
      const [sub] = await kysely
        .insertInto("newsletter_subscriptions")
        .values({
          profile_id: profile.id,
          consent_given: true,
          subscription_source: "manual_button",
          sync_status: "synced",
          retry_count: 0,
        })
        .returningAll()
        .execute()

      tracker.track("newsletter_subscriptions", sub.id)

      const result = await getFailedSubscriptionsForRetry()

      expect(result.some(s => s.email === "synced@example.com")).toBe(false)
    })
  })

  describe("processFailedSyncRetries", () => {
    it("should return zero counts when no failed subscriptions exist", async () => {
      const result = await processFailedSyncRetries()

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toEqual({
          processed: 0,
          succeeded: 0,
          failed: 0,
          skipped: 0,
        })
      }
    })

    it("should successfully retry and update sync status to synced", async () => {
      // Mock successful addSubscriber
      vi.spyOn(listmonkClient, "addSubscriber").mockResolvedValue({
        success: true,
        data: { subscriberId: 123 },
        errors: [],
      })

      const profile = await createTestProfile(tracker, kysely, {
        user_id: null,
        email: "retry-success@example.com",
        social_name: "Success User",
      })

      const [sub] = await kysely
        .insertInto("newsletter_subscriptions")
        .values({
          profile_id: profile.id,
          consent_given: true,
          subscription_source: "manual_button",
          sync_status: "failed",
          retry_count: 0,
          last_sync_attempt_at: null, // Should retry immediately
        })
        .returningAll()
        .execute()

      tracker.track("newsletter_subscriptions", sub.id)

      const result = await processFailedSyncRetries()

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.processed).toBe(1)
        expect(result.data.succeeded).toBe(1)
        expect(result.data.failed).toBe(0)
      }

      // Verify subscription was updated to synced with retry_count reset
      const updated = await kysely
        .selectFrom("newsletter_subscriptions")
        .selectAll()
        .where("id", "=", sub.id)
        .executeTakeFirst()

      expect(updated?.sync_status).toBe("synced")
      expect(updated?.retry_count).toBe(0)
      expect(updated?.listmonk_subscriber_id).toBe(123)
    })

    it("should increment retry_count when sync fails", async () => {
      // Mock failed addSubscriber
      vi.spyOn(listmonkClient, "addSubscriber").mockResolvedValue({
        success: false,
        errors: [new Error("API error")],
      })

      const profile = await createTestProfile(tracker, kysely, {
        user_id: null,
        email: "retry-fail@example.com",
      })

      const [sub] = await kysely
        .insertInto("newsletter_subscriptions")
        .values({
          profile_id: profile.id,
          consent_given: true,
          subscription_source: "manual_button",
          sync_status: "failed",
          retry_count: 2,
          last_sync_attempt_at: null, // Should retry immediately
        })
        .returningAll()
        .execute()

      tracker.track("newsletter_subscriptions", sub.id)

      const result = await processFailedSyncRetries()

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.processed).toBe(1)
        expect(result.data.failed).toBe(1)
        expect(result.data.succeeded).toBe(0)
      }

      // Verify retry_count was incremented
      const updated = await kysely
        .selectFrom("newsletter_subscriptions")
        .selectAll()
        .where("id", "=", sub.id)
        .executeTakeFirst()

      expect(updated?.retry_count).toBe(3)
      expect(updated?.sync_status).toBe("failed")
      expect(updated?.last_sync_attempt_at).not.toBeNull()
    })

    it("should handle thrown errors from addSubscriber", async () => {
      // Mock addSubscriber to throw error
      vi.spyOn(listmonkClient, "addSubscriber").mockRejectedValue(
        new Error("Network failure"),
      )

      const profile = await createTestProfile(tracker, kysely, {
        user_id: null,
        email: "retry-thrown@example.com",
      })

      const [sub] = await kysely
        .insertInto("newsletter_subscriptions")
        .values({
          profile_id: profile.id,
          consent_given: true,
          subscription_source: "manual_button",
          sync_status: "failed",
          retry_count: 1,
          last_sync_attempt_at: null,
        })
        .returningAll()
        .execute()

      tracker.track("newsletter_subscriptions", sub.id)

      const result = await processFailedSyncRetries()

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.processed).toBe(1)
        expect(result.data.failed).toBe(1)
      }

      // Verify retry_count was still incremented despite thrown error
      const updated = await kysely
        .selectFrom("newsletter_subscriptions")
        .selectAll()
        .where("id", "=", sub.id)
        .executeTakeFirst()

      expect(updated?.retry_count).toBe(2)
      expect(updated?.sync_status).toBe("failed")
    })

    it("should skip subscriptions not ready for retry based on backoff", async () => {
      vi.spyOn(listmonkClient, "addSubscriber").mockResolvedValue({
        success: true,
        data: { subscriberId: 456 },
        errors: [],
      })

      const profile = await createTestProfile(tracker, kysely, {
        user_id: null,
        email: "backoff@example.com",
      })

      // Last attempt was 2 minutes ago, retry_count = 1 (needs 5 min backoff)
      const twoMinutesAgo = new Date()
      twoMinutesAgo.setMinutes(twoMinutesAgo.getMinutes() - 2)

      const [sub] = await kysely
        .insertInto("newsletter_subscriptions")
        .values({
          profile_id: profile.id,
          consent_given: true,
          subscription_source: "manual_button",
          sync_status: "failed",
          retry_count: 1,
          last_sync_attempt_at: twoMinutesAgo.toISOString(),
        })
        .returningAll()
        .execute()

      tracker.track("newsletter_subscriptions", sub.id)

      const result = await processFailedSyncRetries()

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.skipped).toBe(1)
        expect(result.data.processed).toBe(0)
      }

      // Verify retry_count was NOT incremented
      const updated = await kysely
        .selectFrom("newsletter_subscriptions")
        .selectAll()
        .where("id", "=", sub.id)
        .executeTakeFirst()

      expect(updated?.retry_count).toBe(1)
    })

    it("should NOT update subscription if status changed from failed during retry", async () => {
      // This tests the race condition fix
      vi.spyOn(listmonkClient, "addSubscriber").mockImplementation(async () => {
        // Simulate another process updating the subscription to unsubscribed
        // while the retry is in progress
        await kysely
          .updateTable("newsletter_subscriptions")
          .set({ sync_status: "unsubscribed", consent_given: false })
          .where("profile_id", "=", profile.id)
          .execute()

        return {
          success: false,
          errors: [new Error("API error")],
        }
      })

      const profile = await createTestProfile(tracker, kysely, {
        user_id: null,
        email: "race-condition@example.com",
      })

      const [sub] = await kysely
        .insertInto("newsletter_subscriptions")
        .values({
          profile_id: profile.id,
          consent_given: true,
          subscription_source: "manual_button",
          sync_status: "failed",
          retry_count: 0,
          last_sync_attempt_at: null,
        })
        .returningAll()
        .execute()

      tracker.track("newsletter_subscriptions", sub.id)

      await processFailedSyncRetries()

      // Verify subscription status remained unsubscribed
      // and retry_count was NOT incremented due to WHERE clause race condition check
      const updated = await kysely
        .selectFrom("newsletter_subscriptions")
        .selectAll()
        .where("id", "=", sub.id)
        .executeTakeFirst()

      expect(updated?.sync_status).toBe("unsubscribed")
      expect(updated?.retry_count).toBe(0) // Should NOT be incremented
    })
  })
})
