import { describe, expect, it, beforeEach, afterEach } from "vitest"
import { setupIntegrationTest, cleanupAfterTest } from "~/test/integration-setup"
import { createTestProfile } from "~/test/db-test-utils"
import { processUnsubscribe, getUnsubscribeLog } from "./unsubscribe.server"

describe("Unsubscribe Service - Integration Tests", () => {
  const { tracker, kysely } = setupIntegrationTest()

  beforeEach(async () => {
    tracker.clear()
  })

  afterEach(async () => {
    await cleanupAfterTest(tracker, kysely)
  })

  describe("processUnsubscribe", () => {
    it("should update profile allow_marketing_email to false", async () => {
      const profile = await createTestProfile(tracker, kysely, {
        user_id: null,
        email: "test@example.com",
        allow_marketing_email: true,
      })

      const result = await processUnsubscribe(profile.id)

      expect(result.success).toBe(true)
      if (result.success === true) {
        expect(result.profileId).toBe(profile.id)
      }

      const updatedProfile = await kysely
        .selectFrom("profiles")
        .selectAll()
        .where("id", "=", profile.id)
        .executeTakeFirst()

      expect(updatedProfile?.allow_marketing_email).toBe(false)
    })

    it("should handle already unsubscribed profiles gracefully", async () => {
      const profile = await createTestProfile(tracker, kysely, {
        user_id: null,
        email: "already-unsubscribed@example.com",
        allow_marketing_email: false,
      })

      const result = await processUnsubscribe(profile.id)

      expect(result.success).toBe(true)
      if (result.success === true) {
        expect(result.profileId).toBe(profile.id)
        expect(result.alreadyUnsubscribed).toBe(true)
      }
    })

    it("should return error for non-existent profile", async () => {
      const fakeProfileId = "550e8400-e29b-41d4-a716-446655440000"

      const result = await processUnsubscribe(fakeProfileId)

      expect(result.success).toBe(false)
      if (result.success === false) {
        expect(result.error).toBe("profile_not_found")
      }
    })

    it("should log unsubscribe event for compliance", async () => {
      const profile = await createTestProfile(tracker, kysely, {
        user_id: null,
        email: "compliance-test@example.com",
        allow_marketing_email: true,
      })

      await processUnsubscribe(profile.id)

      const logs = await getUnsubscribeLog(profile.id)
      expect(logs).toHaveLength(1)
      expect(logs[0].profile_id).toBe(profile.id)
      expect(logs[0].unsubscribed_at).toBeDefined()
    })
  })

  describe("getUnsubscribeLog", () => {
    it("should retrieve unsubscribe logs for a profile", async () => {
      const profile = await createTestProfile(tracker, kysely, {
        user_id: null,
        email: "log-test@example.com",
        allow_marketing_email: true,
      })

      await processUnsubscribe(profile.id)
      await processUnsubscribe(profile.id) // Second attempt

      const logs = await getUnsubscribeLog(profile.id)
      
      expect(logs).toHaveLength(2)
      expect(logs[0].profile_id).toBe(profile.id)
      expect(logs[1].profile_id).toBe(profile.id)
    })

    it("should return empty array for profile with no unsubscribe history", async () => {
      const profile = await createTestProfile(tracker, kysely, {
        user_id: null,
        email: "no-history@example.com",
        allow_marketing_email: true,
      })

      const logs = await getUnsubscribeLog(profile.id)
      
      expect(logs).toHaveLength(0)
    })
  })
})