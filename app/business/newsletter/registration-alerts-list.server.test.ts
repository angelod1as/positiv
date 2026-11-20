import { beforeEach, describe, expect, it, vi } from "vitest"
import { LISTMONK_REGISTRATION_ALERTS_LIST_ID } from "~/lib/constants/constants"
import type { ListSubscriber } from "./listmonk-lists.server"

const {
  mockExecute,
  getAllSubscribers,
  getListSubscribers,
  addSubscribersToListBulk,
  removeSubscribersFromListBulk,
  addSubscriber,
  logger,
} = vi.hoisted(() => ({
  mockExecute: vi.fn(),
  getAllSubscribers: vi.fn(),
  getListSubscribers: vi.fn(),
  addSubscribersToListBulk: vi.fn(),
  removeSubscribersFromListBulk: vi.fn(),
  addSubscriber: vi.fn(),
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

vi.mock("~/lib/logger/logger.server", () => ({ logger }))

vi.mock("~/lib/supabase/db.server", () => {
  const chain = {
    selectFrom: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    execute: mockExecute,
  }
  return { db: chain }
})

vi.mock("./listmonk-lists.server", () => ({
  getAllSubscribers,
  getListSubscribers,
}))

vi.mock("./listmonk-client.server", () => ({
  addSubscribersToListBulk,
  removeSubscribersFromListBulk,
  addSubscriber,
}))

import { syncRegistrationAlertsListmonkList } from "./registration-alerts-list.server"

const ok = <T>(data: T) => ({ success: true, data, errors: [] })

const profile = (email: string, registrationAlertsAt: string | null = null) => ({
  id: `profile-${email}`,
  registration_alerts_at: registrationAlertsAt,
  email,
  user_id: null,
  social_name: null,
  full_name: `Name ${email}`,
  is_veteran: false,
  approved_to_attend: false,
  email_token: `token-${email}`,
})

const subscriber = (
  id: number,
  email: string,
  status: "enabled" | "blocklisted" = "enabled",
  lists: ListSubscriber["lists"] = [],
): ListSubscriber => ({
  id,
  email,
  name: email,
  status,
  updated_at: "2026-11-01T10:00:00.000Z",
  lists,
})

const leftAlertsAt = (id: number, email: string, at: string) =>
  subscriber(id, email, "enabled", [
    {
      id: LISTMONK_REGISTRATION_ALERTS_LIST_ID,
      subscription_status: "unsubscribed",
      subscription_updated_at: at,
    },
  ])

function listmonk({
  everyone = [] as ListSubscriber[],
  onAlerts = [] as ListSubscriber[],
  leftAlerts = [] as ListSubscriber[],
}) {
  getAllSubscribers.mockResolvedValue(ok(everyone))
  getListSubscribers.mockImplementation(
    async (listId: number, membership: string = "active") => {
      if (listId !== LISTMONK_REGISTRATION_ALERTS_LIST_ID) return ok([])
      return ok(membership === "unsubscribed" ? leftAlerts : onAlerts)
    },
  )
}

describe("syncRegistrationAlertsListmonkList", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    addSubscribersToListBulk.mockResolvedValue(ok(undefined))
    removeSubscribersFromListBulk.mockResolvedValue(ok(undefined))
    addSubscriber.mockResolvedValue(ok({ subscriberId: 99 }))
  })

  it("adds whoever has alerts on and removes members whose alerts are off", async () => {
    mockExecute.mockResolvedValue([profile("on@example.com")])
    const on = subscriber(1, "ON@example.com")
    const off = subscriber(2, "off@example.com")
    listmonk({ everyone: [on, off], onAlerts: [off] })

    const result = await syncRegistrationAlertsListmonkList()

    expect(addSubscribersToListBulk).toHaveBeenCalledWith(
      [1],
      LISTMONK_REGISTRATION_ALERTS_LIST_ID,
    )
    expect(removeSubscribersFromListBulk).toHaveBeenCalledWith(
      [2],
      LISTMONK_REGISTRATION_ALERTS_LIST_ID,
    )
    expect(result.success && result.data).toMatchObject({
      added: 1,
      removed: 1,
      created: 0,
    })
  })

  it("never puts back someone who left the list or is blocklisted", async () => {
    mockExecute.mockResolvedValue([
      profile("left@example.com"),
      profile("blocked@example.com"),
    ])
    const left = subscriber(3, "left@example.com")
    const blocked = subscriber(4, "blocked@example.com", "blocklisted")
    listmonk({ everyone: [left, blocked], leftAlerts: [left] })

    const result = await syncRegistrationAlertsListmonkList()

    expect(addSubscribersToListBulk).not.toHaveBeenCalled()
    expect(addSubscriber).not.toHaveBeenCalled()
    expect(result.success && result.data.added).toBe(0)
  })

  it("puts back someone who turned alerts on again on the site after leaving the list", async () => {
    mockExecute.mockResolvedValue([
      profile("back@example.com", "2026-11-25T10:00:00.000Z"),
    ])
    const back = leftAlertsAt(6, "back@example.com", "2026-11-20T10:00:00.000Z")
    listmonk({ everyone: [back], leftAlerts: [back] })

    const result = await syncRegistrationAlertsListmonkList()

    expect(removeSubscribersFromListBulk).toHaveBeenCalledWith(
      [6],
      LISTMONK_REGISTRATION_ALERTS_LIST_ID,
    )
    expect(addSubscribersToListBulk).toHaveBeenCalledWith(
      [6],
      LISTMONK_REGISTRATION_ALERTS_LIST_ID,
    )
    expect(result.success && result.data.added).toBe(1)
    expect(removeSubscribersFromListBulk.mock.invocationCallOrder[0]).toBeLessThan(
      addSubscribersToListBulk.mock.invocationCallOrder[0],
    )
  })

  it("puts back someone whose alerts were turned on at the moment they left, as the unsubscribe sync keeps them on", async () => {
    mockExecute.mockResolvedValue([
      profile("same@example.com", "2026-11-20T10:00:00.000Z"),
    ])
    const same = leftAlertsAt(9, "same@example.com", "2026-11-20T10:00:00.000Z")
    listmonk({ everyone: [same], leftAlerts: [same] })

    await syncRegistrationAlertsListmonkList()

    expect(addSubscribersToListBulk).toHaveBeenCalledWith(
      [9],
      LISTMONK_REGISTRATION_ALERTS_LIST_ID,
    )
  })

  it("keeps out someone whose alerts on the site are older than leaving the list", async () => {
    mockExecute.mockResolvedValue([
      profile("stale@example.com", "2026-11-10T10:00:00.000Z"),
    ])
    const stale = leftAlertsAt(8, "stale@example.com", "2026-11-20T10:00:00.000Z")
    listmonk({ everyone: [stale], leftAlerts: [stale] })

    await syncRegistrationAlertsListmonkList()

    expect(addSubscribersToListBulk).not.toHaveBeenCalled()
    expect(removeSubscribersFromListBulk).not.toHaveBeenCalled()
  })

  it("creates on the list whoever has alerts on and is not in Listmonk yet", async () => {
    const newcomer = profile("new@example.com")
    mockExecute.mockResolvedValue([newcomer])
    listmonk({})

    const result = await syncRegistrationAlertsListmonkList()

    expect(addSubscriber).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "new@example.com",
        name: "Name",
        lists: [LISTMONK_REGISTRATION_ALERTS_LIST_ID],
        attributes: expect.objectContaining({
          profile_id: newcomer.id,
          email_token: "token-new@example.com",
        }),
      }),
    )
    expect(result.success && result.data.created).toBe(1)
  })

  it("keeps going when one subscriber cannot be created, and counts it", async () => {
    mockExecute.mockResolvedValue([
      profile("fails@example.com"),
      profile("works@example.com"),
    ])
    listmonk({})
    addSubscriber
      .mockResolvedValueOnce({ success: false, errors: [new Error("boom")] })
      .mockResolvedValueOnce(ok({ subscriberId: 7 }))

    const result = await syncRegistrationAlertsListmonkList()

    expect(result.success && result.data).toMatchObject({
      created: 1,
      failed: 1,
    })
    expect(logger.warn).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        profileId: "profile-fails@example.com",
        errors: ["boom"],
      }),
    )
  })

  it("refuses to empty the list when no one has alerts on", async () => {
    mockExecute.mockResolvedValue([])
    listmonk({ onAlerts: [subscriber(5, "member@example.com")] })

    const result = await syncRegistrationAlertsListmonkList()

    expect(result.success).toBe(false)
    expect(removeSubscribersFromListBulk).not.toHaveBeenCalled()
  })

  it("writes nothing when Listmonk cannot be read", async () => {
    mockExecute.mockResolvedValue([profile("on@example.com")])
    listmonk({})
    getAllSubscribers.mockResolvedValue({
      success: false,
      errors: [new Error("Listmonk is down")],
    })

    const result = await syncRegistrationAlertsListmonkList()

    expect(result.success).toBe(false)
    expect(addSubscriber).not.toHaveBeenCalled()
    expect(addSubscribersToListBulk).not.toHaveBeenCalled()
  })
})
