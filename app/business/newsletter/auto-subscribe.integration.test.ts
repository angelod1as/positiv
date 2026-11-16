import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { randomUUID } from "crypto"
import { setupIntegrationTest, cleanupAfterTest } from "~/test/integration-setup"
import { createTestProfile } from "~/test/db-test-utils"
import { logger } from "~/lib/logger/logger.server"
import {
  refreshNewsletterSubscriber,
  subscribeProfileToNewsletter,
} from "./auto-subscribe.server"
import * as listmonkClient from "./listmonk-client.server"

vi.mock("~/lib/logger/logger.server", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

describe("Newsletter Auto-Subscription - Integration Tests", () => {
  const { tracker, kysely } = setupIntegrationTest()

  beforeEach(async () => {
    tracker.clear()
    vi.clearAllMocks()
  })

  afterEach(async () => {
    await cleanupAfterTest(tracker, kysely)
    vi.restoreAllMocks()
  })

  describe("Success scenarios", () => {
    it("should create subscription and call Listmonk API with all attributes when user consents", async () => {
      const addSubscriberSpy = vi.spyOn(listmonkClient, "addSubscriber")
      addSubscriberSpy.mockResolvedValue({ success: true, data: { subscriberId: 123 }, errors: [] })

      const profile = await createTestProfile(tracker, kysely, {
        email: "test@example.com",
        user_id: null,
        social_name: "Test User",
        full_name: "Test User Full Name",
        is_veteran: true,
        approved_to_attend: "approved",
      })

      const result = await subscribeProfileToNewsletter(
        profile.id,
        "onboarding_auto"
      )

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.syncStatus).toBe("synced")
      }
      expect(addSubscriberSpy).toHaveBeenCalledOnce()

      const callArgs = addSubscriberSpy.mock.calls[0][0]
      expect(callArgs.email).toBe("test@example.com")
      expect(callArgs.name).toBe("Test User")
      expect(callArgs.attributes).toEqual({
        profile_id: profile.id,
        user_id: null,
        social_name: "Test User",
        full_name: "Test User Full Name",
        name: "Test User",
        is_veteran: true,
        approved_to_attend: "approved",
        synced_at: expect.any(String),
      })

      const subscription = await kysely
        .selectFrom("newsletter_subscriptions")
        .selectAll()
        .where("profile_id", "=", profile.id)
        .executeTakeFirst()

      expect(subscription).toBeDefined()
      expect(subscription?.consent_given).toBe(true)
      expect(subscription?.sync_status).toBe("synced")
      expect(subscription?.subscription_source).toBe("onboarding_auto")
      expect(subscription?.listmonk_subscriber_id).toBe(123)
    })

    it("should compute name from full_name when social_name is null", async () => {
      const addSubscriberSpy = vi.spyOn(listmonkClient, "addSubscriber")
      addSubscriberSpy.mockResolvedValue({ success: true, data: { subscriberId: 123 }, errors: [] })

      const profile = await createTestProfile(tracker, kysely, {
        email: "test2@example.com",
        user_id: null,
        social_name: null,
        full_name: "John Michael Doe",
        is_veteran: false,
        approved_to_attend: "rejected",
      })

      await subscribeProfileToNewsletter(profile.id, "terms_and_conditions")

      const callArgs = addSubscriberSpy.mock.calls[0][0]
      expect(callArgs.attributes.name).toBe("John")
      expect(callArgs.attributes.social_name).toBeNull()
    })

    it("should update existing subscription when profile already has one", async () => {
      const addSubscriberSpy = vi.spyOn(listmonkClient, "addSubscriber")
      addSubscriberSpy.mockResolvedValue({ success: true, data: { subscriberId: 123 }, errors: [] })

      const profile = await createTestProfile(tracker, kysely, {
        email: "test3@example.com",
        user_id: null,
        social_name: "Test",
        full_name: "Test User",
        is_veteran: false,
        approved_to_attend: "pending",
      })

      await kysely
        .insertInto("newsletter_subscriptions")
        .values({
          profile_id: profile.id,
          consent_given: false,
          sync_status: "unsubscribed",
        })
        .execute()

      const result = await subscribeProfileToNewsletter(profile.id, "manual_button")

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.syncStatus).toBe("synced")
      }

      const subscription = await kysely
        .selectFrom("newsletter_subscriptions")
        .selectAll()
        .where("profile_id", "=", profile.id)
        .executeTakeFirst()

      expect(subscription?.consent_given).toBe(true)
      expect(subscription?.sync_status).toBe("synced")
      expect(subscription?.subscription_source).toBe("manual_button")
    })
  })

  describe("Failure scenarios", () => {
    it("should mark subscription as failed when Listmonk API fails", async () => {
      const addSubscriberSpy = vi.spyOn(listmonkClient, "addSubscriber")
      addSubscriberSpy.mockResolvedValue({
        success: false,
        errors: [{ message: "API Error", name: "APIError" }],
      })

      const profile = await createTestProfile(tracker, kysely, {
        email: "test4@example.com",
        user_id: null,
        social_name: "Error Test",
        full_name: "Error Test User",
        is_veteran: false,
        approved_to_attend: "approved",
      })

      const result = await subscribeProfileToNewsletter(profile.id, "onboarding_auto")

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.syncStatus).toBe("failed")
      }

      const subscription = await kysely
        .selectFrom("newsletter_subscriptions")
        .selectAll()
        .where("profile_id", "=", profile.id)
        .executeTakeFirst()

      expect(subscription?.consent_given).toBe(true)
      expect(subscription?.sync_status).toBe("failed")
      expect(subscription?.last_sync_attempt_at).toBeDefined()

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining("Failed to subscribe profile to newsletter"),
        expect.objectContaining({ profileId: profile.id }),
      )
    })

    it("should return error when profile does not exist", async () => {
      const result = await subscribeProfileToNewsletter(
        randomUUID(),
        "onboarding_auto"
      )

      expect(result.success).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })
  })

  describe("Attribute computation", () => {
    it("should include all required attributes with correct types", async () => {
      const addSubscriberSpy = vi.spyOn(listmonkClient, "addSubscriber")
      addSubscriberSpy.mockResolvedValue({ success: true, data: { subscriberId: 123 }, errors: [] })

      const profile = await createTestProfile(tracker, kysely, {
        email: "test5@example.com",
        user_id: null,
        social_name: "Social",
        full_name: "Full Name",
        is_veteran: true,
        approved_to_attend: "approved",
      })

      await subscribeProfileToNewsletter(profile.id, "admin")

      const callArgs = addSubscriberSpy.mock.calls[0][0]
      const attrs = callArgs.attributes

      expect(typeof attrs.profile_id).toBe("string")
      expect(attrs.user_id === null || typeof attrs.user_id === "string").toBe(true)
      expect(typeof attrs.synced_at).toBe("string")
      expect(typeof attrs.name).toBe("string")
      expect(typeof attrs.is_veteran).toBe("boolean")
      expect(["pending", "approved", "approved_with_reservations", "rejected"]).toContain(attrs.approved_to_attend)

      const syncedAt = new Date(attrs.synced_at as string)
      expect(syncedAt.toString()).not.toBe("Invalid Date")
    })
  })

  describe("Refreshing subscriber details", () => {
    it("should update the stored subscriber by id when the profile's email has changed", async () => {
      const updateSpy = vi.spyOn(listmonkClient, "updateSubscriberById")
      updateSpy.mockResolvedValue({ success: true, data: undefined, errors: [] })
      const addSubscriberSpy = vi.spyOn(listmonkClient, "addSubscriber")

      const profile = await createTestProfile(tracker, kysely, {
        email: "changed-address@example.com",
        user_id: null,
        social_name: "Changed",
        full_name: "Changed Address",
        is_veteran: true,
        approved_to_attend: "approved",
      })

      await kysely
        .insertInto("newsletter_subscriptions")
        .values({
          profile_id: profile.id,
          consent_given: true,
          sync_status: "synced",
          subscription_source: "manual_button",
          listmonk_subscriber_id: 900_000 + Math.floor(Math.random() * 99_999),
        })
        .execute()

      const { listmonk_subscriber_id } = await kysely
        .selectFrom("newsletter_subscriptions")
        .select("listmonk_subscriber_id")
        .where("profile_id", "=", profile.id)
        .executeTakeFirstOrThrow()

      const result = await refreshNewsletterSubscriber(profile.id)

      expect(result.success).toBe(true)
      expect(addSubscriberSpy).not.toHaveBeenCalled()
      expect(updateSpy).toHaveBeenCalledOnce()
      const [subscriberId, params] = updateSpy.mock.calls[0]
      expect(subscriberId).toBe(listmonk_subscriber_id)
      expect(params.email).toBe("changed-address@example.com")
      expect(params.name).toBe("Changed")
      expect(params.attributes.profile_id).toBe(profile.id)
    })

    it("should look the subscriber up by email when no subscriber id is stored", async () => {
      const updateSpy = vi.spyOn(listmonkClient, "updateSubscriberById")
      const addSubscriberSpy = vi.spyOn(listmonkClient, "addSubscriber")
      addSubscriberSpy.mockResolvedValue({ success: true, data: { subscriberId: 123 }, errors: [] })

      const profile = await createTestProfile(tracker, kysely, {
        email: "no-stored-id@example.com",
        user_id: null,
        social_name: "Unsynced",
        full_name: "Unsynced Person",
        is_veteran: false,
        approved_to_attend: "pending",
      })

      await kysely
        .insertInto("newsletter_subscriptions")
        .values({
          profile_id: profile.id,
          consent_given: true,
          sync_status: "pending",
          subscription_source: "manual_button",
        })
        .execute()

      const result = await refreshNewsletterSubscriber(profile.id)

      expect(result.success).toBe(true)
      expect(updateSpy).not.toHaveBeenCalled()
      expect(addSubscriberSpy).toHaveBeenCalledOnce()
      expect(addSubscriberSpy.mock.calls[0][0].email).toBe("no-stored-id@example.com")
      expect(addSubscriberSpy.mock.calls[0][0].lists).toEqual([])
    })
  })
})
