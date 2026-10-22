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
      request: new Request("http://localhost/dashboard/3f2b8c1e-9a4d-4e7b-8c2a-1d5e6f7a8b9c"),
      params: { id: "3f2b8c1e-9a4d-4e7b-8c2a-1d5e6f7a8b9c" },
    } as Route.LoaderArgs

    await loader(args)

    expect(mockFindVisibleEvent).toHaveBeenCalledWith("3f2b8c1e-9a4d-4e7b-8c2a-1d5e6f7a8b9c")
    expect(mockRedirect).toHaveBeenCalledWith("/dashboard")
  })

  it("redirects to the rules page for a visible event", async () => {
    mockFindVisibleEvent.mockResolvedValue({
      id: "7c1d2e3f-4a5b-4c6d-8e7f-9a0b1c2d3e4f",
      event_status: "Registration Closed",
    })

    const args = {
      request: new Request("http://localhost/dashboard/7c1d2e3f-4a5b-4c6d-8e7f-9a0b1c2d3e4f"),
      params: { id: "7c1d2e3f-4a5b-4c6d-8e7f-9a0b1c2d3e4f" },
    } as Route.LoaderArgs

    await loader(args)

    expect(mockRedirect).toHaveBeenCalledWith("/dashboard/7c1d2e3f-4a5b-4c6d-8e7f-9a0b1c2d3e4f/regras")
  })

  it("requires an authenticated user before looking the event up", async () => {
    const loginRedirect = new Response(null, { status: 302 })
    mockGetUserContext.mockRejectedValue(loginRedirect)

    const args = {
      request: new Request("http://localhost/dashboard/a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d"),
      params: { id: "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d" },
    } as Route.LoaderArgs

    await expect(loader(args)).rejects.toBe(loginRedirect)
    expect(mockFindVisibleEvent).not.toHaveBeenCalled()
  })
})
