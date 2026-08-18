import { redirect } from "react-router"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { Route } from "./+types/event-application-confirmation-page"
import { loader } from "./event-application-confirmation-page"

vi.mock("~/business/auth/auth.server", () => ({
  getUserContext: vi.fn(),
}))

vi.mock("~/kysely-db", () => ({
  kyselyDb: {
    selectFrom: vi.fn(),
  },
}))

vi.mock("react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router")>()
  return {
    ...actual,
    redirect: vi.fn(),
  }
})

import { getUserContext } from "~/business/auth/auth.server"
import { kyselyDb } from "~/kysely-db"

const mockGetUserContext = vi.mocked(getUserContext)
const mockKysely = vi.mocked(kyselyDb)
const mockRedirect = vi.mocked(redirect)

const mockApplication = (row: { id: string } | undefined) => {
  const executeTakeFirst = vi.fn().mockResolvedValue(row)
  const where = vi.fn()
  where.mockReturnValue({ where, executeTakeFirst })
  mockKysely.selectFrom = vi.fn().mockReturnValue({
    select: vi.fn().mockReturnValue({ where }),
  })
  return { executeTakeFirst, where }
}

const runLoader = (params: { id?: string } = { id: "event-id" }) =>
  loader({
    request: new Request("http://localhost"),
    params: params as Route.LoaderArgs["params"],
  } as Route.LoaderArgs)

const withProfile = (profileId: string | null) => {
  mockGetUserContext.mockResolvedValue({
    currentProfile: profileId ? { id: profileId } : null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any)
}

describe("event application confirmation loader", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("redirects to the dashboard when there is no event id", async () => {
    withProfile("profile-id")
    mockApplication({ id: "application-id" })

    await runLoader({})

    expect(mockRedirect).toHaveBeenCalledWith("/dashboard")
  })

  it("redirects to the dashboard when there is no profile", async () => {
    withProfile(null)
    mockApplication({ id: "application-id" })

    await runLoader()

    expect(mockRedirect).toHaveBeenCalledWith("/dashboard")
  })

  it("redirects to the dashboard when the person has not applied", async () => {
    withProfile("profile-id")
    mockApplication(undefined)

    await runLoader()

    expect(mockRedirect).toHaveBeenCalledWith("/dashboard")
  })

  it("renders the page for someone who applied to this event", async () => {
    withProfile("profile-id")
    const { where } = mockApplication({ id: "application-id" })

    await runLoader()

    expect(mockRedirect).not.toHaveBeenCalled()
    expect(where).toHaveBeenCalledWith("event_id", "=", "event-id")
    expect(where).toHaveBeenCalledWith("profile_id", "=", "profile-id")
    expect(where).toHaveBeenCalledWith("is_user_applied", "=", true)
  })
})
