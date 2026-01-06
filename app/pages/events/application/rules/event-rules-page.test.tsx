import { redirect } from "react-router"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { Route } from "./+types/event-rules-page"
import { loader } from "./event-rules-page"

// Mock dependencies
vi.mock("~/business/auth/auth.server", () => ({
  getUserContext: vi.fn(),
}))

vi.mock("~/kysely", () => ({
  kysely: {
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

const _mockGetUserContext = vi.mocked(getUserContext)
const mockKysely = vi.mocked(kyselyDb)
const mockRedirect = vi.mocked(redirect)

describe("event-rules-page loader", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should redirect to dashboard if no id param", async () => {
    const mockRequest = new Request("http://localhost")
    const mockParams = {} as Route.LoaderArgs["params"]

    await loader({
      request: mockRequest,
      params: mockParams,
    } as Route.LoaderArgs)

    expect(mockRedirect).toHaveBeenCalledWith("/dashboard")
  })

  it("should redirect to dashboard if event not found", async () => {
    const mockSelectFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          executeTakeFirst: vi.fn().mockResolvedValue(null),
        }),
      }),
    })

    mockKysely.selectFrom = mockSelectFrom

    const mockRequest = new Request("http://localhost")
    const mockParams = { id: "123" }

    await loader({
      request: mockRequest,
      params: mockParams,
    } as Route.LoaderArgs)

    expect(mockRedirect).toHaveBeenCalledWith("/dashboard")
  })

  it("should return event type for regular event", async () => {
    const mockSelectFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          executeTakeFirst: vi
            .fn()
            .mockResolvedValue({ event_type: "regular" }),
        }),
      }),
    })

    mockKysely.selectFrom = mockSelectFrom

    const mockRequest = new Request("http://localhost")
    const mockParams = { id: "123" }

    const result = await loader({
      request: mockRequest,
      params: mockParams,
    } as Route.LoaderArgs)

    expect(result).toEqual({ eventType: "regular" })
    expect(mockSelectFrom).toHaveBeenCalledWith("events")
    expect(mockSelectFrom().select).toHaveBeenCalledWith("event_type")
    expect(mockSelectFrom().select().where).toHaveBeenCalledWith(
      "id",
      "=",
      "123",
    )
  })

  it("should return event type for bdsm event", async () => {
    const mockSelectFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          executeTakeFirst: vi.fn().mockResolvedValue({ event_type: "bdsm" }),
        }),
      }),
    })

    mockKysely.selectFrom = mockSelectFrom

    const mockRequest = new Request("http://localhost")
    const mockParams = { id: "123" }

    const result = await loader({
      request: mockRequest,
      params: mockParams,
    } as Route.LoaderArgs)

    expect(result).toEqual({ eventType: "bdsm" })
  })
})
