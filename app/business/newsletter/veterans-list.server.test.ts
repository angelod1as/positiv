import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type MockInstance,
} from "vitest"
import {
  LISTMONK_REGISTERED_LIST_ID,
  LISTMONK_VETERANS_LIST_ID,
} from "~/lib/constants/constants"

const { mockExecute } = vi.hoisted(() => ({
  mockExecute: vi.fn(),
}))

vi.mock("~/kysely-db", () => {
  const chain = {
    selectFrom: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    execute: mockExecute,
  }
  return { kyselyDb: chain }
})

vi.mock("varlock/env", () => ({
  ENV: {
    LISTMONK_API_URL: "https://listmonk.test",
    LISTMONK_API_USERNAME: "testuser",
    LISTMONK_API_PASSWORD: "testpass",
  },
}))

import { syncVeteransListmonkList } from "./veterans-list.server"

type MembershipStatus = "confirmed" | "unconfirmed" | "unsubscribed"

interface FakeSubscriber {
  id: number
  email: string
  status: "enabled" | "blocklisted"
  lists: Map<number, MembershipStatus>
}

const jsonResponse = (body: unknown) =>
  ({ ok: true, json: async () => body }) as Response

function createFakeListmonk(subscribers: FakeSubscriber[]) {
  return async (input: string | URL | Request, init?: RequestInit) => {
    const url = decodeURIComponent(String(input))
    const method = init?.method ?? "GET"

    if (method === "GET" && url.includes("/api/subscribers?query=")) {
      const listId = Number(url.match(/list_id = (\d+)/)?.[1])
      const page = Number(url.match(/[?&]page=(\d+)/)?.[1] ?? 1)
      const results =
        page > 1
          ? []
          : subscribers
              .filter((s) => {
                const membership = s.lists.get(listId)
                return membership && membership !== "unsubscribed"
              })
              .map(({ id, email, status }) => ({
                id,
                email,
                name: email,
                status,
              }))
      return jsonResponse({
        data: { results, total: results.length, page, per_page: 100 },
      })
    }

    if (method === "PUT" && url.endsWith("/api/subscribers/lists")) {
      const body = JSON.parse(String(init?.body)) as {
        ids: number[]
        action: "add" | "remove"
        target_list_ids: number[]
      }
      for (const subscriber of subscribers) {
        if (!body.ids.includes(subscriber.id)) continue
        for (const listId of body.target_list_ids) {
          if (body.action === "add") subscriber.lists.set(listId, "confirmed")
          else subscriber.lists.delete(listId)
        }
      }
      return jsonResponse({ data: true })
    }

    throw new Error(`Unexpected Listmonk call: ${method} ${url}`)
  }
}

const subscriber = (
  id: number,
  email: string,
  lists: Array<[number, MembershipStatus]>,
  status: FakeSubscriber["status"] = "enabled",
): FakeSubscriber => ({ id, email, status, lists: new Map(lists) })

const onRegisteredList: Array<[number, MembershipStatus]> = [
  [LISTMONK_REGISTERED_LIST_ID, "confirmed"],
]

const writeCalls = (fetchSpy: MockInstance) =>
  fetchSpy.mock.calls.filter(([, init]) => init?.method && init.method !== "GET")

describe("syncVeteransListmonkList", () => {
  let fetchSpy: MockInstance

  const givenConsentedVeterans = (emails: string[]) => {
    mockExecute.mockResolvedValue(emails.map((email) => ({ email })))
  }

  const givenListmonk = (subscribers: FakeSubscriber[]) => {
    fetchSpy.mockImplementation(createFakeListmonk(subscribers))
  }

  beforeEach(() => {
    fetchSpy = vi.spyOn(global, "fetch")
  })

  afterEach(() => {
    fetchSpy.mockRestore()
    vi.clearAllMocks()
  })

  it("should add a consented veteran who is active on the registered list", async () => {
    givenConsentedVeterans(["vet@example.com"])
    const vet = subscriber(1, "vet@example.com", onRegisteredList)
    givenListmonk([vet])

    const result = await syncVeteransListmonkList()

    expect(result).toEqual({
      success: true,
      data: { added: 1, removed: 0, total: 1 },
      errors: [],
    })
    expect(vet.lists.has(LISTMONK_VETERANS_LIST_ID)).toBe(true)
  })

  it("should match emails regardless of case", async () => {
    givenConsentedVeterans(["Vet@Example.com"])
    const vet = subscriber(1, "vet@example.COM", onRegisteredList)
    givenListmonk([vet])

    const result = await syncVeteransListmonkList()

    expect(result).toMatchObject({ success: true, data: { added: 1, removed: 0, total: 1 } })
  })

  it("should skip a blocklisted subscriber", async () => {
    givenConsentedVeterans(["blocked@example.com"])
    const blocked = subscriber(
      1,
      "blocked@example.com",
      onRegisteredList,
      "blocklisted",
    )
    givenListmonk([blocked])

    const result = await syncVeteransListmonkList()

    expect(result).toMatchObject({ success: true, data: { added: 0, removed: 0, total: 0 } })
    expect(blocked.lists.has(LISTMONK_VETERANS_LIST_ID)).toBe(false)
  })

  it("should skip a subscriber who unsubscribed from the registered list", async () => {
    givenConsentedVeterans(["gone@example.com"])
    const gone = subscriber(1, "gone@example.com", [
      [LISTMONK_REGISTERED_LIST_ID, "unsubscribed"],
    ])
    givenListmonk([gone])

    const result = await syncVeteransListmonkList()

    expect(result).toMatchObject({ success: true, data: { added: 0, removed: 0, total: 0 } })
    expect(gone.lists.has(LISTMONK_VETERANS_LIST_ID)).toBe(false)
  })

  it("should never create a subscriber for a veteran missing from Listmonk", async () => {
    givenConsentedVeterans(["missing@example.com"])
    givenListmonk([])

    const result = await syncVeteransListmonkList()

    expect(result).toMatchObject({ success: true, data: { added: 0, removed: 0, total: 0 } })
    expect(writeCalls(fetchSpy)).toHaveLength(0)
  })

  it("should remove members who are no longer eligible", async () => {
    givenConsentedVeterans(["still@example.com"])
    const still = subscriber(1, "still@example.com", [
      ...onRegisteredList,
      [LISTMONK_VETERANS_LIST_ID, "confirmed"],
    ])
    const lostFlag = subscriber(2, "lost-flag@example.com", [
      ...onRegisteredList,
      [LISTMONK_VETERANS_LIST_ID, "confirmed"],
    ])
    const withdrew = subscriber(3, "withdrew@example.com", [
      [LISTMONK_REGISTERED_LIST_ID, "unsubscribed"],
      [LISTMONK_VETERANS_LIST_ID, "confirmed"],
    ])
    givenListmonk([still, lostFlag, withdrew])

    const result = await syncVeteransListmonkList()

    expect(result).toMatchObject({ success: true, data: { added: 0, removed: 2, total: 1 } })
    expect(still.lists.has(LISTMONK_VETERANS_LIST_ID)).toBe(true)
    expect(lostFlag.lists.has(LISTMONK_VETERANS_LIST_ID)).toBe(false)
    expect(withdrew.lists.has(LISTMONK_VETERANS_LIST_ID)).toBe(false)
  })

  it("should remove everyone no longer eligible in a single Listmonk call", async () => {
    givenConsentedVeterans([])
    givenListmonk([
      subscriber(1, "a@example.com", [[LISTMONK_VETERANS_LIST_ID, "confirmed"]]),
      subscriber(2, "b@example.com", [[LISTMONK_VETERANS_LIST_ID, "confirmed"]]),
      subscriber(3, "c@example.com", [[LISTMONK_VETERANS_LIST_ID, "confirmed"]]),
    ])

    const result = await syncVeteransListmonkList()

    expect(result).toMatchObject({
      success: true,
      data: { added: 0, removed: 3, total: 0 },
    })
    expect(writeCalls(fetchSpy)).toHaveLength(1)
  })

  it("should change nothing when run a second time", async () => {
    givenConsentedVeterans(["new@example.com", "kept@example.com"])
    givenListmonk([
      subscriber(1, "new@example.com", onRegisteredList),
      subscriber(2, "kept@example.com", [
        ...onRegisteredList,
        [LISTMONK_VETERANS_LIST_ID, "confirmed"],
      ]),
      subscriber(3, "stale@example.com", [
        ...onRegisteredList,
        [LISTMONK_VETERANS_LIST_ID, "confirmed"],
      ]),
    ])

    const first = await syncVeteransListmonkList()
    fetchSpy.mockClear()
    const second = await syncVeteransListmonkList()

    expect(first).toMatchObject({ success: true, data: { added: 1, removed: 1, total: 2 } })
    expect(second).toMatchObject({ success: true, data: { added: 0, removed: 0, total: 2 } })
    expect(writeCalls(fetchSpy)).toHaveLength(0)
  })

  it("should fail when Listmonk cannot be read", async () => {
    givenConsentedVeterans(["vet@example.com"])
    fetchSpy.mockResolvedValue({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
      text: async () => "boom",
    } as Response)

    const result = await syncVeteransListmonkList()

    expect(result.success).toBe(false)
  })
})
