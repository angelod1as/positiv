import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { createTestProfile } from "~/test/db-test-utils"
import {
  cleanupAfterTest,
  setupIntegrationTest,
} from "~/test/integration-setup"

describe("email_consents - Integration Tests", () => {
  const { tracker, kysely } = setupIntegrationTest()

  beforeEach(() => {
    tracker.clear()
  })

  afterEach(async () => {
    await cleanupAfterTest(tracker, kysely)
  })

  const consentOf = (profileId: string) =>
    kysely
      .selectFrom("email_consents")
      .selectAll()
      .where("profile_id", "=", profileId)
      .executeTakeFirstOrThrow()

  const newProfile = () =>
    createTestProfile(tracker, kysely, {
      email: `web51-${Date.now()}-${Math.random()}@example.com`,
    })

  describe("a new profile", () => {
    it("should start with alerts on, Newsletter and Marketing off, never asked", async () => {
      const profile = await newProfile()

      const consent = await consentOf(profile.id)

      expect(consent).toMatchObject({
        registration_alerts: true,
        registration_alerts_at: null,
        newsletter: false,
        newsletter_at: null,
        marketing: false,
        marketing_at: null,
      })
      expect(consent.access_token).toEqual(expect.any(String))
    })
  })
})
