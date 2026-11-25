import { beforeEach, describe, expect, it, vi } from "vitest"
import type { ListSubscriber } from "./listmonk-lists.server"

const { mockExecute, getAllSubscribers, setSubscriberAttribs, logger } =
  vi.hoisted(() => ({
    mockExecute: vi.fn(),
    getAllSubscribers: vi.fn(),
    setSubscriberAttribs: vi.fn(),
    logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
  }))

vi.mock("~/lib/logger/logger.server", () => ({ logger }))

vi.mock("~/lib/supabase/db.server", () => {
  const chain = {
    selectFrom: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    execute: mockExecute,
  }
  return { db: chain }
})

vi.mock("./listmonk-lists.server", () => ({ getAllSubscribers }))
vi.mock("./listmonk-client.server", () => ({ setSubscriberAttribs }))

import { syncEmailTokensToListmonk } from "./email-token-sync.server"

const ok = <T>(data: T) => ({ success: true, data, errors: [] })

const subscriber = (
  id: number,
  email: string,
  attribs: Record<string, unknown> = {},
): ListSubscriber => ({
  id,
  email,
  name: email,
  status: "enabled",
  updated_at: "2026-11-01T10:00:00.000Z",
  lists: [],
  attribs,
})

describe("syncEmailTokensToListmonk", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setSubscriberAttribs.mockResolvedValue(ok(undefined))
  })

  it("gives the token to a subscriber that has none, matched by the profile_id attribute", async () => {
    mockExecute.mockResolvedValue([
      { id: "p-1", email: "old@example.com", email_token: "tok-1" },
    ])
    const listed = subscriber(1, "new@example.com", { profile_id: "p-1" })
    getAllSubscribers.mockResolvedValue(ok([listed]))

    const result = await syncEmailTokensToListmonk()

    expect(setSubscriberAttribs).toHaveBeenCalledWith(listed, {
      email_token: "tok-1",
    })
    expect(result.success && result.data).toEqual({ updated: 1, failed: 0 })
  })

  // A PUT drops the memberships it does not list, and keeps an unsubscribed
  // one as unsubscribed: every list goes back, left ones included.
  it("hands every list back to Listmonk, the ones the person left included", async () => {
    mockExecute.mockResolvedValue([
      { id: "p-3", email: "three@example.com", email_token: "tok-3" },
    ])
    const listed = {
      ...subscriber(3, "three@example.com", { profile_id: "p-3" }),
      lists: [
        { id: 4, subscription_status: "unsubscribed" },
        { id: 143, subscription_status: "confirmed" },
      ],
    } as ListSubscriber
    getAllSubscribers.mockResolvedValue(ok([listed]))

    await syncEmailTokensToListmonk()

    expect(setSubscriberAttribs).toHaveBeenCalledWith(
      expect.objectContaining({
        lists: [
          expect.objectContaining({ id: 4 }),
          expect.objectContaining({ id: 143 }),
        ],
      }),
      { email_token: "tok-3" },
    )
  })

  it("matches by email, ignoring case, when the subscriber has no profile_id", async () => {
    mockExecute.mockResolvedValue([
      { id: "p-2", email: "Two@Example.com", email_token: "tok-2" },
    ])
    const listed = subscriber(2, "two@example.com")
    getAllSubscribers.mockResolvedValue(ok([listed]))

    await syncEmailTokensToListmonk()

    expect(setSubscriberAttribs).toHaveBeenCalledWith(listed, {
      email_token: "tok-2",
    })
  })

  it("leaves alone a subscriber whose token is already right", async () => {
    mockExecute.mockResolvedValue([
      { id: "p-3", email: "three@example.com", email_token: "tok-3" },
    ])
    getAllSubscribers.mockResolvedValue(
      ok([
        subscriber(3, "three@example.com", {
          profile_id: "p-3",
          email_token: "tok-3",
        }),
      ]),
    )

    const result = await syncEmailTokensToListmonk()

    expect(setSubscriberAttribs).not.toHaveBeenCalled()
    expect(result.success && result.data).toEqual({ updated: 0, failed: 0 })
  })

  it("leaves alone a subscriber with no profile behind it", async () => {
    mockExecute.mockResolvedValue([])
    getAllSubscribers.mockResolvedValue(ok([subscriber(4, "nobody@example.com")]))

    await syncEmailTokensToListmonk()

    expect(setSubscriberAttribs).not.toHaveBeenCalled()
  })

  it("keeps going when one update fails, and counts it", async () => {
    mockExecute.mockResolvedValue([
      { id: "p-5", email: "five@example.com", email_token: "tok-5" },
      { id: "p-6", email: "six@example.com", email_token: "tok-6" },
    ])
    getAllSubscribers.mockResolvedValue(
      ok([subscriber(5, "five@example.com"), subscriber(6, "six@example.com")]),
    )
    setSubscriberAttribs
      .mockResolvedValueOnce({ success: false, errors: [new Error("nope")] })
      .mockResolvedValueOnce(ok(undefined))

    const result = await syncEmailTokensToListmonk()

    expect(result.success && result.data).toEqual({ updated: 1, failed: 1 })
    expect(logger.warn).toHaveBeenCalled()
  })

  it("fails when Listmonk cannot be read", async () => {
    mockExecute.mockResolvedValue([])
    getAllSubscribers.mockResolvedValue({
      success: false,
      errors: [new Error("down")],
    })

    const result = await syncEmailTokensToListmonk()

    expect(result.success).toBe(false)
  })
})
