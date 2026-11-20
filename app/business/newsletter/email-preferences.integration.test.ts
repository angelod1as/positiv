import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  LISTMONK_REGISTERED_LIST_ID,
  LISTMONK_REGISTRATION_ALERTS_LIST_ID,
  LISTMONK_VETERANS_LIST_ID,
} from "~/lib/constants/constants"
import { createTestProfile } from "~/test/db-test-utils"
import {
  cleanupAfterTest,
  setupIntegrationTest,
} from "~/test/integration-setup"

const {
  addSubscriber,
  getSubscriberById,
  getSubscriberBounceCount,
  enableSubscriber,
  setListMembership,
} = vi.hoisted(() => ({
  addSubscriber: vi.fn(),
  getSubscriberById: vi.fn(),
  getSubscriberBounceCount: vi.fn(),
  enableSubscriber: vi.fn(),
  setListMembership: vi.fn(),
}))

vi.mock("./listmonk-client.server", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  addSubscriber,
  getSubscriberById,
  getSubscriberBounceCount,
  enableSubscriber,
  setListMembership,
}))

import {
  findEmailPreferences,
  saveEmailPreferences,
} from "./email-preferences.server"

const ok = <T>(data: T) => ({ success: true, data, errors: [] })

const listmonkSubscriber = (
  id: number,
  overrides: {
    status?: string
    lists?: Array<{ id: number; subscription_status: string }>
  } = {},
) => ({
  id,
  email: "someone@example.com",
  name: "Someone",
  status: overrides.status ?? "enabled",
  lists: overrides.lists ?? [],
  attribs: {},
})

describe("email preferences - Integration Tests", () => {
  const { tracker, kysely } = setupIntegrationTest()

  beforeEach(() => {
    tracker.clear()
    vi.clearAllMocks()
    getSubscriberById.mockResolvedValue(ok(listmonkSubscriber(77)))
    getSubscriberBounceCount.mockResolvedValue(ok(0))
    enableSubscriber.mockResolvedValue(ok(undefined))
    setListMembership.mockResolvedValue(ok(undefined))
    addSubscriber.mockResolvedValue(ok({ subscriberId: 88 }))
  })

  afterEach(async () => {
    await cleanupAfterTest(tracker, kysely)
  })

  const newProfile = (overrides: { is_veteran?: boolean } = {}) =>
    createTestProfile(tracker, kysely, {
      email: `web53-${Date.now()}-${Math.random()}@example.com`,
      full_name: "Web Fifty Three",
      ...overrides,
    })

  const consentOf = (profileId: string) =>
    kysely
      .selectFrom("email_consents")
      .selectAll()
      .where("profile_id", "=", profileId)
      .executeTakeFirstOrThrow()

  const withSubscription = async (
    profileId: string,
    consentGiven: boolean,
    listmonkSubscriberId: number | null = 77,
  ) => {
    await kysely
      .insertInto("newsletter_subscriptions")
      .values({
        profile_id: profileId,
        consent_given: consentGiven,
        sync_status: consentGiven ? "synced" : "unsubscribed",
        listmonk_subscriber_id: listmonkSubscriberId,
      })
      .execute()
  }

  const answers = (
    overrides: Partial<{
      registrationAlerts: boolean
      newsletter: boolean
      marketing: boolean
    }> = {},
  ) => ({
    registrationAlerts: true,
    newsletter: true,
    marketing: true,
    ...overrides,
  })

  describe("findEmailPreferences", () => {
    it("shows everything ticked to someone who never answered", async () => {
      const profile = await newProfile()
      const { access_token } = await consentOf(profile.id)

      const result = await findEmailPreferences({ token: access_token })

      expect(result.success && result.data).toEqual({
        profileId: profile.id,
        email: profile.email,
        preferences: { registrationAlerts: true, newsletter: true, marketing: true },
      })
    })

    it("shows what is on record once anything was answered", async () => {
      const profile = await newProfile()
      await kysely
        .updateTable("email_consents")
        .set({ newsletter: false, newsletter_at: new Date().toISOString() })
        .where("profile_id", "=", profile.id)
        .execute()

      const result = await findEmailPreferences({ profileId: profile.id })

      expect(result.success && result.data && result.data.preferences).toEqual({
        registrationAlerts: true,
        newsletter: false,
        marketing: false,
      })
    })

    it("finds no one for an unknown token", async () => {
      const result = await findEmailPreferences({
        token: "00000000-0000-4000-8000-000000000000",
      })

      expect(result.success && result.data).toBeNull()
    })

    it("finds no one for a token that is not a uuid, such as a bare profile id typo", async () => {
      const result = await findEmailPreferences({ token: "not-a-token" })

      expect(result.success && result.data).toBeNull()
    })
  })

  describe("saveEmailPreferences on the site", () => {
    it("records the three choices, dated, and confirms them", async () => {
      const profile = await newProfile()
      await withSubscription(profile.id, true)
      const before = Date.now()

      const result = await saveEmailPreferences(
        profile.id,
        answers({ registrationAlerts: false, newsletter: true, marketing: false }),
      )

      expect(result.success).toBe(true)
      const consent = await consentOf(profile.id)
      expect(consent).toMatchObject({
        registration_alerts: false,
        newsletter: true,
        marketing: false,
      })
      for (const at of [
        consent.registration_alerts_at,
        consent.newsletter_at,
        consent.marketing_at,
        consent.confirmed_at,
      ]) {
        expect(new Date(at as string).getTime()).toBeGreaterThanOrEqual(
          before - 1000,
        )
      }
    })

    it("confirms even when nothing changed", async () => {
      const profile = await newProfile()
      await withSubscription(profile.id, true)

      await saveEmailPreferences(profile.id, answers())

      expect((await consentOf(profile.id)).confirmed_at).not.toBeNull()
    })

    it("withdraws the Newsletter subscription on a no, leaving alerts on", async () => {
      const profile = await newProfile()
      await withSubscription(profile.id, true)

      await saveEmailPreferences(profile.id, answers({ newsletter: false }))

      const subscription = await kysely
        .selectFrom("newsletter_subscriptions")
        .selectAll()
        .where("profile_id", "=", profile.id)
        .executeTakeFirstOrThrow()
      expect(subscription.consent_given).toBe(false)
      expect(subscription.sync_status).toBe("unsubscribed")
      expect((await consentOf(profile.id)).registration_alerts).toBe(true)
    })

    it("subscribes to the Newsletter on a yes", async () => {
      const profile = await newProfile()
      await withSubscription(profile.id, false)

      await saveEmailPreferences(profile.id, answers({ newsletter: true }))

      const subscription = await kysely
        .selectFrom("newsletter_subscriptions")
        .selectAll()
        .where("profile_id", "=", profile.id)
        .executeTakeFirstOrThrow()
      expect(subscription.consent_given).toBe(true)
      expect(subscription.sync_status).toBe("synced")
    })

    it("refuses answers that are not three booleans", async () => {
      const profile = await newProfile()

      const result = await saveEmailPreferences(profile.id, {
        newsletter: "yes",
      })

      expect(result.success).toBe(false)
      expect((await consentOf(profile.id)).confirmed_at).toBeNull()
    })
  })

  describe("saveEmailPreferences in Listmonk", () => {
    it("writes by the stored subscriber id, list by list", async () => {
      const profile = await newProfile()
      await withSubscription(profile.id, true, 77)
      getSubscriberById.mockResolvedValue(
        ok(
          listmonkSubscriber(77, {
            lists: [
              { id: LISTMONK_REGISTERED_LIST_ID, subscription_status: "confirmed" },
              {
                id: LISTMONK_REGISTRATION_ALERTS_LIST_ID,
                subscription_status: "confirmed",
              },
            ],
          }),
        ),
      )

      await saveEmailPreferences(
        profile.id,
        answers({ registrationAlerts: false, newsletter: false }),
      )

      expect(getSubscriberById).toHaveBeenCalledWith(77)
      expect(addSubscriber).not.toHaveBeenCalled()
      expect(setListMembership).toHaveBeenCalledWith(
        77,
        LISTMONK_REGISTERED_LIST_ID,
        false,
      )
      expect(setListMembership).toHaveBeenCalledWith(
        77,
        LISTMONK_REGISTRATION_ALERTS_LIST_ID,
        false,
      )
    })

    it("turns on a list the person had left", async () => {
      const profile = await newProfile()
      await withSubscription(profile.id, false, 77)
      getSubscriberById.mockResolvedValue(
        ok(
          listmonkSubscriber(77, {
            lists: [
              {
                id: LISTMONK_REGISTERED_LIST_ID,
                subscription_status: "unsubscribed",
              },
            ],
          }),
        ),
      )

      await saveEmailPreferences(profile.id, answers({ newsletter: true }))

      expect(setListMembership).toHaveBeenCalledWith(
        77,
        LISTMONK_REGISTERED_LIST_ID,
        true,
      )
    })

    it("leaves alone a list that already matches", async () => {
      const profile = await newProfile()
      await withSubscription(profile.id, true, 77)
      getSubscriberById.mockResolvedValue(
        ok(
          listmonkSubscriber(77, {
            lists: [
              { id: LISTMONK_REGISTERED_LIST_ID, subscription_status: "confirmed" },
              {
                id: LISTMONK_REGISTRATION_ALERTS_LIST_ID,
                subscription_status: "confirmed",
              },
            ],
          }),
        ),
      )

      await saveEmailPreferences(profile.id, answers())

      expect(setListMembership).not.toHaveBeenCalled()
    })

    it("puts a veteran who turns the Newsletter on back on the Veterans list", async () => {
      const profile = await newProfile({ is_veteran: true })
      await withSubscription(profile.id, false, 77)
      getSubscriberById.mockResolvedValue(
        ok(
          listmonkSubscriber(77, {
            lists: [
              {
                id: LISTMONK_VETERANS_LIST_ID,
                subscription_status: "unsubscribed",
              },
            ],
          }),
        ),
      )

      await saveEmailPreferences(profile.id, answers({ newsletter: true }))

      expect(setListMembership).toHaveBeenCalledWith(
        77,
        LISTMONK_VETERANS_LIST_ID,
        true,
      )
    })

    it("takes a veteran off the Veterans list with the Newsletter", async () => {
      const profile = await newProfile({ is_veteran: true })
      await withSubscription(profile.id, true, 77)
      getSubscriberById.mockResolvedValue(
        ok(
          listmonkSubscriber(77, {
            lists: [
              { id: LISTMONK_REGISTERED_LIST_ID, subscription_status: "confirmed" },
              { id: LISTMONK_VETERANS_LIST_ID, subscription_status: "confirmed" },
            ],
          }),
        ),
      )

      await saveEmailPreferences(profile.id, answers({ newsletter: false }))

      expect(setListMembership).toHaveBeenCalledWith(
        77,
        LISTMONK_VETERANS_LIST_ID,
        false,
      )
    })

    it("finds or creates the subscriber once when none is stored, and keeps its id", async () => {
      const profile = await newProfile()
      await withSubscription(profile.id, true, null)
      getSubscriberById.mockResolvedValue(ok(listmonkSubscriber(88)))

      await saveEmailPreferences(profile.id, answers())

      expect(addSubscriber).toHaveBeenCalledWith(
        expect.objectContaining({ email: profile.email, lists: [] }),
      )
      expect(getSubscriberById).toHaveBeenCalledWith(88)
      const subscription = await kysely
        .selectFrom("newsletter_subscriptions")
        .select("listmonk_subscriber_id")
        .where("profile_id", "=", profile.id)
        .executeTakeFirstOrThrow()
      expect(subscription.listmonk_subscriber_id).toBe(88)
    })

    it("lifts a block when the person opts back in and nothing bounced", async () => {
      const profile = await newProfile()
      await withSubscription(profile.id, false, 77)
      getSubscriberById.mockResolvedValue(
        ok(listmonkSubscriber(77, { status: "blocklisted" })),
      )

      const result = await saveEmailPreferences(profile.id, answers())

      expect(getSubscriberBounceCount).toHaveBeenCalledWith(77)
      expect(enableSubscriber).toHaveBeenCalledWith(
        expect.objectContaining({ id: 77 }),
      )
      expect(result.success && result.data).toEqual({ bounced: false })
    })

    it("keeps a bounced block, writes no list and asks for a new address", async () => {
      const profile = await newProfile()
      await withSubscription(profile.id, false, 77)
      getSubscriberById.mockResolvedValue(
        ok(listmonkSubscriber(77, { status: "blocklisted" })),
      )
      getSubscriberBounceCount.mockResolvedValue(ok(2))

      const result = await saveEmailPreferences(profile.id, answers())

      expect(enableSubscriber).not.toHaveBeenCalled()
      expect(setListMembership).not.toHaveBeenCalled()
      expect(result.success && result.data).toEqual({ bounced: true })
      expect((await consentOf(profile.id)).confirmed_at).not.toBeNull()
    })

    it("leaves a block alone when everything is turned off", async () => {
      const profile = await newProfile()
      await withSubscription(profile.id, false, 77)
      getSubscriberById.mockResolvedValue(
        ok(listmonkSubscriber(77, { status: "blocklisted" })),
      )

      await saveEmailPreferences(
        profile.id,
        answers({ registrationAlerts: false, newsletter: false, marketing: false }),
      )

      expect(getSubscriberBounceCount).not.toHaveBeenCalled()
      expect(enableSubscriber).not.toHaveBeenCalled()
    })

    it("fails when Listmonk refuses, with the choices already saved on the site", async () => {
      const profile = await newProfile()
      await withSubscription(profile.id, true, 77)
      setListMembership.mockResolvedValue({
        success: false,
        errors: [new Error("Listmonk is down")],
      })

      const result = await saveEmailPreferences(
        profile.id,
        answers({ newsletter: false }),
      )

      expect(result.success).toBe(false)
      expect((await consentOf(profile.id)).newsletter).toBe(false)
    })
  })
})
