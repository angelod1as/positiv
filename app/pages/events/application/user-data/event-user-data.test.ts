import { beforeEach, describe, expect, it, vi } from "vitest"
import type { Route } from "./+types/event-user-data"
import { loader } from "./event-user-data"

vi.mock("~/business/auth/auth.server", () => ({
  getUserContext: vi.fn().mockResolvedValue({ supabaseHeaders: new Headers() }),
}))

vi.mock("~/business/session.server", async (importOriginal) => ({
  // The gate check itself stays real: a mock of it could not catch the two
  // guards drifting apart, which is the whole reason it is shared.
  ...(await importOriginal<typeof import("~/business/session.server")>()),
  rulesSessionStorage: {
    getSession: vi.fn(),
    commitSession: vi.fn(),
  },
}))

import { rulesSessionStorage } from "~/business/session.server"

const mockGetSession = vi.mocked(rulesSessionStorage.getSession)
const mockCommitSession = vi.mocked(rulesSessionStorage.commitSession)

const loadFor = async (passedEvents?: string[]) => {
  mockGetSession.mockResolvedValue({
    get: vi.fn().mockReturnValue(passedEvents),
  } as never)
  mockCommitSession.mockResolvedValue("__session_rules=refreshed")

  return await loader({
    request: new Request("http://localhost/dashboard/3f2b8c1e-9a4d-4e7b-8c2a-1d5e6f7a8b9c/dados"),
    params: { id: "3f2b8c1e-9a4d-4e7b-8c2a-1d5e6f7a8b9c" } as Route.LoaderArgs["params"],
  } as Route.LoaderArgs)
}

const sentBack = (result: unknown) =>
  result instanceof Response ? result.headers.get("location") : null

const cookieOf = (result: unknown) => {
  const headers = (result as { init?: ResponseInit })?.init?.headers

  return new Headers(headers).get("Set-Cookie")
}

describe("event user data loader", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("turns away a browser that passed no quiz at all", async () => {
    expect(sentBack(await loadFor(undefined))).toBe("/dashboard/3f2b8c1e-9a4d-4e7b-8c2a-1d5e6f7a8b9c/regras")
  })

  it("turns away a browser that passed another event's quiz", async () => {
    expect(sentBack(await loadFor(["another-event"]))).toBe(
      "/dashboard/3f2b8c1e-9a4d-4e7b-8c2a-1d5e6f7a8b9c/regras",
    )
  })

  it("lets in a browser that passed this event's quiz", async () => {
    expect(sentBack(await loadFor(["another-event", "3f2b8c1e-9a4d-4e7b-8c2a-1d5e6f7a8b9c"]))).toBeNull()
  })

  it("restarts the clock while the form is being filled", async () => {
    expect(cookieOf(await loadFor(["3f2b8c1e-9a4d-4e7b-8c2a-1d5e6f7a8b9c"]))).toBe(
      "__session_rules=refreshed",
    )
  })
})
