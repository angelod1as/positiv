import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { createTestProfile } from "~/test/db-test-utils"
import {
  cleanupAfterTest,
  setupIntegrationTest,
} from "~/test/integration-setup"

vi.mock("./listmonk-client.server", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  unsubscribeSubscriber: vi
    .fn()
    .mockResolvedValue({ success: true, data: undefined, errors: [] }),
}))

import { recordNewsletterRefusal } from "./email-consents.server"
import {
  subscribeProfile,
  unsubscribeProfile,
  updateSyncStatus,
} from "./subscription-helpers.server"

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

  describe("Newsletter follows consent_given until WEB-54", () => {
    it("should record a yes, dated, when someone subscribes", async () => {
      const profile = await newProfile()

      await subscribeProfile(profile.id, "manual_button")

      const consent = await consentOf(profile.id)
      expect(consent.newsletter).toBe(true)
      expect(consent.newsletter_at).toEqual(expect.any(Date))
    })

    it("should record a no, dated, when someone unsubscribes", async () => {
      const profile = await newProfile()
      await subscribeProfile(profile.id, "manual_button")
      const subscribed = await consentOf(profile.id)

      await unsubscribeProfile(profile.id)

      const consent = await consentOf(profile.id)
      expect(consent.newsletter).toBe(false)
      expect(consent.newsletter_at).toEqual(expect.any(Date))
      expect(new Date(String(consent.newsletter_at)).getTime()).toBeGreaterThanOrEqual(
        new Date(String(subscribed.newsletter_at)).getTime(),
      )
    })

    it("should record a no when the subscription is created declined", async () => {
      const profile = await newProfile()

      await kysely
        .insertInto("newsletter_subscriptions")
        .values({ profile_id: profile.id, consent_given: false })
        .execute()

      const consent = await consentOf(profile.id)
      expect(consent.newsletter).toBe(false)
      expect(consent.newsletter_at).toEqual(expect.any(Date))
    })

    it("should keep the date of the choice when the same answer is written again", async () => {
      const profile = await newProfile()
      await subscribeProfile(profile.id, "manual_button")
      const chosen = await consentOf(profile.id)

      await updateSyncStatus(profile.id, "synced", 4242)

      expect((await consentOf(profile.id)).newsletter_at).toEqual(
        chosen.newsletter_at,
      )
    })

    it("should turn Registration alerts off with a no, as the migration does, and leave Marketing alone", async () => {
      const profile = await newProfile()
      await subscribeProfile(profile.id, "manual_button")

      await unsubscribeProfile(profile.id)

      const consent = await consentOf(profile.id)
      expect(consent).toMatchObject({
        registration_alerts: false,
        marketing: false,
        marketing_at: null,
      })
      expect(consent.registration_alerts_at).toEqual(consent.newsletter_at)
    })

    it("should leave Registration alerts alone on a yes", async () => {
      const profile = await newProfile()

      await subscribeProfile(profile.id, "manual_button")

      expect(await consentOf(profile.id)).toMatchObject({
        registration_alerts: true,
        registration_alerts_at: null,
      })
    })

    it("should keep the date alerts were turned off when another no follows", async () => {
      const profile = await newProfile()
      await subscribeProfile(profile.id, "manual_button")
      await unsubscribeProfile(profile.id)
      const off = await consentOf(profile.id)

      await subscribeProfile(profile.id, "manual_button")
      await unsubscribeProfile(profile.id)

      expect((await consentOf(profile.id)).registration_alerts_at).toEqual(
        off.registration_alerts_at,
      )
    })
  })

  describe("recordNewsletterRefusal", () => {
    it("should create the row when the profile has none", async () => {
      const profile = await newProfile()
      await kysely
        .deleteFrom("email_consents")
        .where("profile_id", "=", profile.id)
        .execute()

      const result = await recordNewsletterRefusal(profile.id)

      expect(result.success).toBe(true)
      const consent = await consentOf(profile.id)
      expect(consent.newsletter).toBe(false)
      expect(consent.newsletter_at).toEqual(expect.any(Date))
    })

    it("should turn Registration alerts off too, dated, and leave Marketing alone", async () => {
      const profile = await newProfile()

      await recordNewsletterRefusal(profile.id)

      const consent = await consentOf(profile.id)
      expect(consent).toMatchObject({
        registration_alerts: false,
        marketing: false,
        marketing_at: null,
      })
      expect(consent.registration_alerts_at).toEqual(consent.newsletter_at)
    })

    it("should keep the date of the first refusal when it is repeated", async () => {
      const profile = await newProfile()
      await recordNewsletterRefusal(profile.id)
      const refused = await consentOf(profile.id)

      await recordNewsletterRefusal(profile.id)

      expect((await consentOf(profile.id)).newsletter_at).toEqual(
        refused.newsletter_at,
      )
    })
  })
})
