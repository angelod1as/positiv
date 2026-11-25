import type { z } from "zod"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { contextSchema } from "~/business/auth/auth-schemas"
import {
  LISTMONK_REGISTERED_LIST_ID,
  LISTMONK_REGISTRATION_ALERTS_LIST_ID,
} from "~/lib/constants/constants"
import { createTestAuthUser } from "~/test/db-test-utils"
import {
  cleanupAfterTest,
  setupIntegrationTest,
} from "~/test/integration-setup"
import { sessionClientThatThrows } from "~/test/session-client-that-throws"

const { addSubscriber, getSubscriberById, setListMembership } = vi.hoisted(
  () => ({
    addSubscriber: vi.fn(),
    getSubscriberById: vi.fn(),
    setListMembership: vi.fn(),
  }),
)

vi.mock("~/business/newsletter/listmonk-client.server", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  addSubscriber,
  getSubscriberById,
  setListMembership,
}))

import { agreeToTerms } from "./agree-to-terms.server"

const ok = <T>(data: T) => ({ success: true, data, errors: [] })

describe("agreeToTerms email consent - Integration Tests", () => {
  const { tracker, kysely } = setupIntegrationTest()

  beforeEach(() => {
    tracker.clear()
    vi.clearAllMocks()
    addSubscriber.mockResolvedValue(ok({ subscriberId: 88 }))
    getSubscriberById.mockResolvedValue(
      ok({
        id: 88,
        email: "someone@example.com",
        name: "Someone",
        status: "enabled",
        lists: [],
        attribs: {},
      }),
    )
    setListMembership.mockResolvedValue(ok(undefined))
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

  const signUp = async (choices: {
    registrationAlerts: boolean
    newsletter: boolean
    marketing: boolean
  }) => {
    const email = `web54-${Date.now()}-${Math.random()}@example.com`
    const userId = await createTestAuthUser(email, "test1234", tracker)
    const context: z.infer<typeof contextSchema> = {
      supabase: sessionClientThatThrows("agreeToTerms") as z.infer<
        typeof contextSchema
      >["supabase"],
      supabaseHeaders: new Headers(),
      currentUser: { id: userId, email },
      currentProfile: null,
      isProdInDev: false,
      host: "localhost",
    }

    const result = await agreeToTerms({ agree: true, ...choices }, context)
    expect(result).toMatchObject({ success: true })

    const profile = await kysely
      .selectFrom("profiles")
      .select("id")
      .where("user_id", "=", userId)
      .executeTakeFirstOrThrow()
    tracker.track("profiles", profile.id)

    return { profileId: profile.id, result }
  }

  describe("a refusal at signup", () => {
    it("should record every category as a dated no, and confirm it, with nothing on record before", async () => {
      const { profileId } = await signUp({
        registrationAlerts: false,
        newsletter: false,
        marketing: false,
      })

      const consent = await consentOf(profileId)
      expect(consent).toMatchObject({
        registration_alerts: false,
        newsletter: false,
        marketing: false,
      })
      expect(consent.registration_alerts_at).toEqual(expect.any(Date))
      expect(consent.newsletter_at).toEqual(expect.any(Date))
      expect(consent.marketing_at).toEqual(expect.any(Date))
      expect(consent.confirmed_at).toEqual(expect.any(Date))
    })
  })

  describe("an acceptance at signup", () => {
    it("should record every category as a dated yes, confirm it, and put the person on the lists", async () => {
      const { profileId } = await signUp({
        registrationAlerts: true,
        newsletter: true,
        marketing: true,
      })

      const consent = await consentOf(profileId)
      expect(consent).toMatchObject({
        registration_alerts: true,
        newsletter: true,
        marketing: true,
      })
      expect(consent.confirmed_at).toEqual(expect.any(Date))

      expect(setListMembership).toHaveBeenCalledWith(
        88,
        LISTMONK_REGISTERED_LIST_ID,
        true,
      )
      expect(setListMembership).toHaveBeenCalledWith(
        88,
        LISTMONK_REGISTRATION_ALERTS_LIST_ID,
        true,
      )

      const subscription = await kysely
        .selectFrom("newsletter_subscriptions")
        .select(["consent_given", "subscription_source"])
        .where("profile_id", "=", profileId)
        .executeTakeFirstOrThrow()
      expect(subscription).toEqual({
        consent_given: true,
        subscription_source: "onboarding_auto",
      })
    })
  })

  describe("Listmonk refusing the choices", () => {
    it("should keep the choices on the site and report the lists as failed", async () => {
      setListMembership.mockResolvedValue({
        success: false,
        errors: [new Error("Listmonk down")],
      })

      const { profileId, result } = await signUp({
        registrationAlerts: true,
        newsletter: false,
        marketing: false,
      })

      expect(result).toMatchObject({
        data: { newsletterSubscriptionError: expect.any(String) },
      })
      const consent = await consentOf(profileId)
      expect(consent.registration_alerts).toBe(true)
      expect(consent.confirmed_at).toEqual(expect.any(Date))
    })
  })
})
