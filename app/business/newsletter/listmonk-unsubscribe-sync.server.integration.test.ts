import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { setupIntegrationTest, cleanupAfterTest } from "~/test/integration-setup"
import { createTestProfile } from "~/test/db-test-utils"
import { LISTMONK_REGISTERED_LIST_ID } from "~/lib/constants/constants"
import type { ListSubscriber } from "./listmonk-lists.server"

const { getListSubscribers, getBlocklistedSubscribers } = vi.hoisted(() => ({
  getListSubscribers: vi.fn(),
  getBlocklistedSubscribers: vi.fn(),
}))

vi.mock("./listmonk-lists.server", () => ({
  getListSubscribers,
  getBlocklistedSubscribers,
}))

import { syncListmonkUnsubscribes } from "./listmonk-unsubscribe-sync.server"

const leftRegistered = (
  id: number,
  email: string,
  at: string,
): ListSubscriber => ({
  id,
  email,
  name: email,
  status: "enabled",
  updated_at: at,
  lists: [
    {
      id: LISTMONK_REGISTERED_LIST_ID,
      subscription_status: "unsubscribed",
      subscription_updated_at: at,
    },
  ],
})

const blocklisted = (id: number, email: string, at: string): ListSubscriber => ({
  id,
  email,
  name: email,
  status: "blocklisted",
  updated_at: at,
  lists: [],
})

describe("syncListmonkUnsubscribes - Integration Tests", () => {
  const { tracker, kysely } = setupIntegrationTest()

  beforeEach(() => {
    tracker.clear()
    getListSubscribers.mockResolvedValue({ success: true, data: [], errors: [] })
    getBlocklistedSubscribers.mockResolvedValue({
      success: true,
      data: [],
      errors: [],
    })
  })

  afterEach(async () => {
    await cleanupAfterTest(tracker, kysely)
  })

  const consentedProfile = async (
    email: string,
    consentedAt: string,
    listmonkSubscriberId: number | null = null,
  ) => {
    const profile = await createTestProfile(tracker, kysely, {
      user_id: null,
      email,
    })
    const row = await kysely
      .insertInto("newsletter_subscriptions")
      .values({
        profile_id: profile.id,
        consent_given: true,
        subscription_source: "terms_and_conditions",
        sync_status: "synced",
        subscribed_at: consentedAt,
        last_consent_given_at: consentedAt,
        listmonk_subscriber_id: listmonkSubscriberId,
      })
      .returning("id")
      .executeTakeFirstOrThrow()
    tracker.track("newsletter_subscriptions", row.id)
    return row.id
  }

  const subscription = (id: string) =>
    kysely
      .selectFrom("newsletter_subscriptions")
      .selectAll()
      .where("id", "=", id)
      .executeTakeFirstOrThrow()

  it("withdraws site consent for someone who unsubscribed from Registered in Listmonk", async () => {
    const id = await consentedProfile(
      "pos635-left@example.com",
      "2026-09-01T10:00:00.000Z",
    )
    getListSubscribers.mockResolvedValue({
      success: true,
      data: [leftRegistered(1, "POS635-left@example.com", "2026-10-01T10:00:00.000Z")],
      errors: [],
    })

    const result = await syncListmonkUnsubscribes()

    expect(getListSubscribers).toHaveBeenCalledWith(
      LISTMONK_REGISTERED_LIST_ID,
      "unsubscribed",
    )
    expect(result.success && result.data.unsubscribed).toBe(1)
    const saved = await subscription(id)
    expect(saved.consent_given).toBe(false)
    expect(saved.sync_status).toBe("unsubscribed")
    expect(saved.subscription_source).toBeNull()
    expect(new Date(saved.unsubscribed_at as string).toISOString()).toBe(
      "2026-10-01T10:00:00.000Z",
    )
  })

  it("withdraws site consent for a blocklisted subscriber", async () => {
    const id = await consentedProfile(
      "pos635-blocked@example.com",
      "2026-09-01T10:00:00.000Z",
    )
    getBlocklistedSubscribers.mockResolvedValue({
      success: true,
      data: [blocklisted(2, "pos635-blocked@example.com", "2026-10-02T10:00:00.000Z")],
      errors: [],
    })

    await syncListmonkUnsubscribes()

    expect((await subscription(id)).consent_given).toBe(false)
  })

  it("matches by Listmonk subscriber ID when the e-mail changed", async () => {
    const id = await consentedProfile(
      "pos635-new-address@example.com",
      "2026-09-01T10:00:00.000Z",
      3,
    )
    getListSubscribers.mockResolvedValue({
      success: true,
      data: [leftRegistered(3, "pos635-old-address@example.com", "2026-10-01T10:00:00.000Z")],
      errors: [],
    })

    await syncListmonkUnsubscribes()

    expect((await subscription(id)).consent_given).toBe(false)
  })

  it("keeps consent given on the site after the Listmonk unsubscribe", async () => {
    const id = await consentedProfile(
      "pos635-came-back@example.com",
      "2026-10-05T10:00:00.000Z",
    )
    getListSubscribers.mockResolvedValue({
      success: true,
      data: [leftRegistered(4, "pos635-came-back@example.com", "2026-10-01T10:00:00.000Z")],
      errors: [],
    })

    const result = await syncListmonkUnsubscribes()

    expect(result.success && result.data.unsubscribed).toBe(0)
    expect((await subscription(id)).consent_given).toBe(true)
  })

  it("leaves everyone else's consent alone", async () => {
    const id = await consentedProfile(
      "pos635-staying@example.com",
      "2026-09-01T10:00:00.000Z",
    )
    getListSubscribers.mockResolvedValue({
      success: true,
      data: [leftRegistered(5, "pos635-someone-else@example.com", "2026-10-01T10:00:00.000Z")],
      errors: [],
    })

    await syncListmonkUnsubscribes()

    expect((await subscription(id)).consent_given).toBe(true)
  })

  it("writes nothing when Listmonk cannot be read", async () => {
    const id = await consentedProfile(
      "pos635-unread@example.com",
      "2026-09-01T10:00:00.000Z",
    )
    getListSubscribers.mockResolvedValue({
      success: true,
      data: [leftRegistered(6, "pos635-unread@example.com", "2026-10-01T10:00:00.000Z")],
      errors: [],
    })
    getBlocklistedSubscribers.mockResolvedValue({
      success: false,
      errors: [new Error("Listmonk is down")],
    })

    const result = await syncListmonkUnsubscribes()

    expect(result.success).toBe(false)
    expect((await subscription(id)).consent_given).toBe(true)
  })
})
