import { redirect } from "react-router"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { loader } from "./event"
import type { Route } from "./+types/event"

vi.mock("~/business/auth/auth.server", () => ({
  getUserContext: vi.fn(),
}))

vi.mock("~/kysely-db", () => ({
  kyselyDb: {
    selectFrom: vi.fn(),
  },
}))

vi.mock("react-router", () => ({
  redirect: vi.fn(),
}))

import { getUserContext } from "~/business/auth/auth.server"
import { kyselyDb } from "~/kysely-db"

const mockGetUserContext = vi.mocked(getUserContext)
const mockKysely = vi.mocked(kyselyDb)
const mockRedirect = vi.mocked(redirect)

let whereMock: ReturnType<typeof vi.fn>

const eventLookupReturns = (event: { id: string } | undefined) => {
  const chain: {
    where: ReturnType<typeof vi.fn>
    executeTakeFirst: ReturnType<typeof vi.fn>
  } = {
    where: vi.fn(() => chain),
    executeTakeFirst: vi.fn().mockResolvedValue(event),
  }
  whereMock = chain.where
  mockKysely.selectFrom = vi.fn().mockReturnValue({
    select: vi.fn().mockReturnValue(chain),
  })
}

describe("Event navigation loader", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUserContext.mockResolvedValue({
      currentUser: { id: "user-1" },
    } as Awaited<ReturnType<typeof getUserContext>>)
  })

  it("redirects to dashboard when no event ID is provided", async () => {
    const args = {
      request: new Request("http://localhost:3000/events/"),
      params: {},
    } as Route.LoaderArgs

    await loader(args)

    expect(mockRedirect).toHaveBeenCalledWith("/dashboard")
    expect(mockGetUserContext).not.toHaveBeenCalled()
    expect(mockKysely.selectFrom).not.toHaveBeenCalled()
  })

  it("redirects to dashboard when the event does not exist", async () => {
    eventLookupReturns(undefined)

    const args = {
      request: new Request("http://localhost:3000/events/non-existent-id"),
      params: { id: "non-existent-id" },
    } as Route.LoaderArgs

    await loader(args)

    expect(mockKysely.selectFrom).toHaveBeenCalledWith("events")
    expect(mockRedirect).toHaveBeenCalledWith("/dashboard")
  })

  it("reaches the rules page for a closed event, which the RLS client used to hide", async () => {
    eventLookupReturns({ id: "closed-event-id" })

    const args = {
      request: new Request("http://localhost:3000/events/closed-event-id"),
      params: { id: "closed-event-id" },
    } as Route.LoaderArgs

    await loader(args)

    expect(mockRedirect).toHaveBeenCalledWith("/dashboard/closed-event-id/regras")
  })

  it("looks the event up by id, excluding Draft events", async () => {
    eventLookupReturns({ id: "an-event" })

    const args = {
      request: new Request("http://localhost:3000/events/an-event"),
      params: { id: "an-event" },
    } as Route.LoaderArgs

    await loader(args)

    expect(whereMock).toHaveBeenCalledWith("id", "=", "an-event")
    expect(whereMock).toHaveBeenCalledWith("event_status", "!=", "Draft")
  })

  it("requires an authenticated user before looking the event up", async () => {
    const loginRedirect = new Response(null, { status: 302 })
    mockGetUserContext.mockRejectedValue(loginRedirect)
    eventLookupReturns({ id: "any-event" })

    const args = {
      request: new Request("http://localhost:3000/events/any-event"),
      params: { id: "any-event" },
    } as Route.LoaderArgs

    await expect(loader(args)).rejects.toBe(loginRedirect)
    expect(mockKysely.selectFrom).not.toHaveBeenCalled()
  })

})
