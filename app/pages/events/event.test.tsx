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

const eventLookupReturns = (event: { id: string } | undefined) => {
  mockKysely.selectFrom = vi.fn().mockReturnValue({
    select: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        executeTakeFirst: vi.fn().mockResolvedValue(event),
      }),
    }),
  })
}

describe("Event navigation loader", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUserContext.mockResolvedValue({} as never)
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

  it("reaches the rules page for an event that is not open, via the service-role lookup", async () => {
    // The RLS client hid every non-open event, which silently bounced the
    // person back to the dashboard. kyselyDb resolves it regardless of status,
    // so the entry route now opens the event like the rest of the flow.
    eventLookupReturns({ id: "closed-event-id" })

    const args = {
      request: new Request("http://localhost:3000/events/closed-event-id"),
      params: { id: "closed-event-id" },
    } as Route.LoaderArgs

    await loader(args)

    expect(mockRedirect).toHaveBeenCalledWith("/dashboard/closed-event-id/regras")
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

  it("passes request and params to getUserContext", async () => {
    eventLookupReturns({ id: "test-event" })

    const request = new Request("http://localhost:3000/events/test-event")
    const params = { id: "test-event" }
    const args = { request, params } as Route.LoaderArgs

    await loader(args)

    expect(mockGetUserContext).toHaveBeenCalledWith(request, params)
  })
})
