import { afterEach, beforeEach, describe, expect, it } from "vitest"
import {
  setupIntegrationTest,
  cleanupAfterTest,
} from "~/test/integration-setup"
import { createTestProfile } from "~/test/db-test-utils"
import {
  getSubscriptionStatus,
  subscribeProfile,
  unsubscribeProfile,
  updateSyncStatus,
} from "./subscription-helpers.server"

describe("Newsletter Subscription Helpers - Integration Tests", () => {
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
  })

  describe("getSubscriptionStatus", () => {
    it("should return null when no subscription exists", async () => {
      const profile = await createTestProfile(tracker, kysely, {
        user_id: null,
        email: "test@example.com",
      })

      const status = await getSubscriptionStatus(profile.id)

      expect(status).toBeNull()
    })

    it("should return subscription status when it exists", async () => {
      const profile = await createTestProfile(tracker, kysely, {
        user_id: null,
        email: "test@example.com",
      })

      // Create subscription
      const [subscription] = await kysely
        .insertInto("newsletter_subscriptions")
        .values({
          profile_id: profile.id,
          consent_given: true,
          subscription_source: "manual_button",
          sync_status: "pending",
        })
        .returningAll()
        .execute()

      tracker.track("newsletter_subscriptions", subscription.id)

      const status = await getSubscriptionStatus(profile.id)

      expect(status).not.toBeNull()
      expect(status?.consent_given).toBe(true)
      expect(status?.subscription_source).toBe("manual_button")
      expect(status?.sync_status).toBe("pending")
    })
  })

  describe("subscribeProfile", () => {
    it("should create a new subscription when none exists", async () => {
      const profile = await createTestProfile(tracker, kysely, {
        user_id: null,
        email: "test@example.com",
      })

      const result = await subscribeProfile(profile.id, "manual_button")

      expect(result.success).toBe(true)
      expect(result.subscription).toBeDefined()
      expect(result.subscription?.consent_given).toBe(true)
      expect(result.subscription?.subscription_source).toBe("manual_button")
      expect(result.subscription?.sync_status).toBe("pending")

      // Track for cleanup
      if (result.subscription) {
        tracker.track("newsletter_subscriptions", result.subscription.id)
      }

      // Verify in database
      const subscription = await kysely
        .selectFrom("newsletter_subscriptions")
        .selectAll()
        .where("profile_id", "=", profile.id)
        .executeTakeFirst()

      expect(subscription).toBeDefined()
      expect(subscription?.consent_given).toBe(true)
    })

    it("should resubscribe a previously unsubscribed profile", async () => {
      const profile = await createTestProfile(tracker, kysely, {
        user_id: null,
        email: "test@example.com",
      })

      // Create an unsubscribed subscription
      const [existingSubscription] = await kysely
        .insertInto("newsletter_subscriptions")
        .values({
          profile_id: profile.id,
          consent_given: false,
          subscription_source: "manual_button",
          sync_status: "unsubscribed",
          unsubscribed_at: new Date().toISOString(),
        })
        .returningAll()
        .execute()

      tracker.track("newsletter_subscriptions", existingSubscription.id)

      const result = await subscribeProfile(profile.id, "manual_button")

      expect(result.success).toBe(true)
      expect(result.subscription?.consent_given).toBe(true)
      expect(result.subscription?.sync_status).toBe("pending")
      expect(result.subscription?.unsubscribed_at).toBeNull()
    })

    it("should return existing subscription if already subscribed", async () => {
      const profile = await createTestProfile(tracker, kysely, {
        user_id: null,
        email: "test@example.com",
      })

      // Create an existing subscription
      const [existingSubscription] = await kysely
        .insertInto("newsletter_subscriptions")
        .values({
          profile_id: profile.id,
          consent_given: true,
          subscription_source: "manual_button",
          sync_status: "synced",
          listmonk_subscriber_id: 123,
        })
        .returningAll()
        .execute()

      tracker.track("newsletter_subscriptions", existingSubscription.id)

      const result = await subscribeProfile(profile.id, "manual_button")

      expect(result.success).toBe(true)
      expect(result.subscription?.id).toBe(existingSubscription.id)
      expect(result.subscription?.consent_given).toBe(true)
      expect(result.subscription?.listmonk_subscriber_id).toBe(123)
    })
  })

  describe("unsubscribeProfile", () => {
    it("should unsubscribe an active subscription", async () => {
      const profile = await createTestProfile(tracker, kysely, {
        user_id: null,
        email: "test@example.com",
      })

      // Create an active subscription
      const [subscription] = await kysely
        .insertInto("newsletter_subscriptions")
        .values({
          profile_id: profile.id,
          consent_given: true,
          subscription_source: "manual_button",
          sync_status: "synced",
        })
        .returningAll()
        .execute()

      tracker.track("newsletter_subscriptions", subscription.id)

      const result = await unsubscribeProfile(profile.id)

      expect(result.success).toBe(true)
      expect(result.subscription?.consent_given).toBe(false)
      expect(result.subscription?.sync_status).toBe("unsubscribed")
      expect(result.subscription?.unsubscribed_at).not.toBeNull()
    })

    it("should return error when no subscription exists", async () => {
      const profile = await createTestProfile(tracker, kysely, {
        user_id: null,
        email: "test@example.com",
      })

      const result = await unsubscribeProfile(profile.id)

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })

    it("should handle already unsubscribed subscription", async () => {
      const profile = await createTestProfile(tracker, kysely, {
        user_id: null,
        email: "test@example.com",
      })

      // Create an already unsubscribed subscription
      const [subscription] = await kysely
        .insertInto("newsletter_subscriptions")
        .values({
          profile_id: profile.id,
          consent_given: false,
          subscription_source: "manual_button",
          sync_status: "unsubscribed",
          unsubscribed_at: new Date().toISOString(),
        })
        .returningAll()
        .execute()

      tracker.track("newsletter_subscriptions", subscription.id)

      const result = await unsubscribeProfile(profile.id)

      expect(result.success).toBe(true)
      expect(result.subscription?.consent_given).toBe(false)
    })
  })

  describe("updateSyncStatus", () => {
    it("should update sync status and listmonk_subscriber_id", async () => {
      const profile = await createTestProfile(tracker, kysely, {
        user_id: null,
        email: "test@example.com",
      })

      // Create a subscription
      const [subscription] = await kysely
        .insertInto("newsletter_subscriptions")
        .values({
          profile_id: profile.id,
          consent_given: true,
          subscription_source: "manual_button",
          sync_status: "pending",
        })
        .returningAll()
        .execute()

      tracker.track("newsletter_subscriptions", subscription.id)

      const result = await updateSyncStatus(profile.id, "synced", 456)

      expect(result.success).toBe(true)
      expect(result.subscription?.sync_status).toBe("synced")
      expect(result.subscription?.listmonk_subscriber_id).toBe(456)
      expect(result.subscription?.last_sync_attempt_at).not.toBeNull()
    })

    it("should update only sync status without listmonk_subscriber_id", async () => {
      const profile = await createTestProfile(tracker, kysely, {
        user_id: null,
        email: "test@example.com",
      })

      // Create a subscription
      const [subscription] = await kysely
        .insertInto("newsletter_subscriptions")
        .values({
          profile_id: profile.id,
          consent_given: true,
          subscription_source: "manual_button",
          sync_status: "pending",
        })
        .returningAll()
        .execute()

      tracker.track("newsletter_subscriptions", subscription.id)

      const result = await updateSyncStatus(profile.id, "failed")

      expect(result.success).toBe(true)
      expect(result.subscription?.sync_status).toBe("failed")
      expect(result.subscription?.listmonk_subscriber_id).toBeNull()
      expect(result.subscription?.last_sync_attempt_at).not.toBeNull()
    })

    it("should return error when no subscription exists", async () => {
      const profile = await createTestProfile(tracker, kysely, {
        user_id: null,
        email: "test@example.com",
      })

      const result = await updateSyncStatus(profile.id, "synced")

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })
  })
})
