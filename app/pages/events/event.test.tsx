import { redirect } from "react-router"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { loader } from "./event"
import type { Route } from "./+types/event"

vi.mock("~/business/auth/auth.server", () => ({
  getUserContext: vi.fn(),
}))

vi.mock("~/business/event/find-visible-event.server", () => ({
  findVisibleEvent: vi.fn(),
}))

vi.mock("react-router", () => ({
  redirect: vi.fn(),
}))

import { getUserContext } from "~/business/auth/auth.server"
import { findVisibleEvent } from "~/business/event/find-visible-event.server"

const mockGetUserContext = vi.mocked(getUserContext)
const mockFindVisibleEvent = vi.mocked(findVisibleEvent)
const mockRedirect = vi.mocked(redirect)

describe("Event navigation loader", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUserContext.mockResolvedValue({
      currentUser: { id: "user-1" },
    } as Awaited<ReturnType<typeof getUserContext>>)
  })

  it("redirects to dashboard when no event ID is provided", async () => {
    const args = {
      request: new Request("http://localhost/dashboard/"),
      params: {},
    } as Route.LoaderArgs

    await loader(args)

    expect(mockRedirect).toHaveBeenCalledWith("/dashboard")
    expect(mockGetUserContext).not.toHaveBeenCalled()
    expect(mockFindVisibleEvent).not.toHaveBeenCalled()
  })

  it("redirects to dashboard when the event is not visible", async () => {
    mockFindVisibleEvent.mockResolvedValue(undefined)

    const args = {
      request: new Request("http://localhost/dashboard/non-existent-id"),
      params: { id: "non-existent-id" },
    } as Route.LoaderArgs

    await loader(args)

    expect(mockFindVisibleEvent).toHaveBeenCalledWith("non-existent-id")
    expect(mockRedirect).toHaveBeenCalledWith("/dashboard")
  })

  it("redirects to the rules page for a visible event", async () => {
    mockFindVisibleEvent.mockResolvedValue({
      id: "closed-event-id",
      event_status: "Registration Closed",
    })

    const args = {
      request: new Request("http://localhost/dashboard/closed-event-id"),
      params: { id: "closed-event-id" },
    } as Route.LoaderArgs

    await loader(args)

    expect(mockRedirect).toHaveBeenCalledWith("/dashboard/closed-event-id/regras")
  })

  it("requires an authenticated user before looking the event up", async () => {
    const loginRedirect = new Response(null, { status: 302 })
    mockGetUserContext.mockRejectedValue(loginRedirect)

    const args = {
      request: new Request("http://localhost/dashboard/any-event"),
      params: { id: "any-event" },
    } as Route.LoaderArgs

    await expect(loader(args)).rejects.toBe(loginRedirect)
    expect(mockFindVisibleEvent).not.toHaveBeenCalled()
  })
})
