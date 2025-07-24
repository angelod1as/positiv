import { redirect } from "react-router"
import { describe, expect, it, vi, beforeEach } from "vitest"
import { loader } from "./event-rules-page"
import type { Route } from "./+types/event-rules-page"

// Mock dependencies
vi.mock("~/business/auth/auth.server", () => ({
  getContext: vi.fn(),
}))

vi.mock("react-router", async (importOriginal) => {
  const actual = await importOriginal() as any // eslint-disable-line @typescript-eslint/no-explicit-any
  return {
    ...actual,
    redirect: vi.fn(),
  }
})

import { getContext } from "~/business/auth/auth.server"

const mockGetContext = vi.mocked(getContext)
const mockRedirect = vi.mocked(redirect)

describe("event-rules-page loader", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should redirect to dashboard if no id param", async () => {
    const mockRequest = new Request("http://localhost")
    const mockParams = {} as Route.LoaderArgs["params"]

    await loader({ request: mockRequest, params: mockParams } as Route.LoaderArgs)

    expect(mockRedirect).toHaveBeenCalledWith("/dashboard")
  })

  it("should redirect to dashboard if event not found", async () => {
    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      }),
    }

    mockGetContext.mockResolvedValue({ 
      supabase: mockSupabase,
      supabaseHeaders: new Headers(),
      currentUser: null,
      currentProfile: null,
      isProdInDev: false,
      host: "localhost"
    } as any) // eslint-disable-line @typescript-eslint/no-explicit-any

    const mockRequest = new Request("http://localhost")
    const mockParams = { id: "123" }

    await loader({ request: mockRequest, params: mockParams } as Route.LoaderArgs)

    expect(mockRedirect).toHaveBeenCalledWith("/dashboard")
  })

  it("should return event type for regular event", async () => {
    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ 
              data: { event_type: "regular" }, 
              error: null 
            }),
          }),
        }),
      }),
    }

    mockGetContext.mockResolvedValue({ 
      supabase: mockSupabase,
      supabaseHeaders: new Headers(),
      currentUser: null,
      currentProfile: null,
      isProdInDev: false,
      host: "localhost"
    } as any) // eslint-disable-line @typescript-eslint/no-explicit-any

    const mockRequest = new Request("http://localhost")
    const mockParams = { id: "123" }

    const result = await loader({ request: mockRequest, params: mockParams } as Route.LoaderArgs)

    expect(result).toEqual({ eventType: "regular" })
    expect(mockSupabase.from).toHaveBeenCalledWith("events")
    expect(mockSupabase.from().select).toHaveBeenCalledWith("event_type")
    expect(mockSupabase.from().select().eq).toHaveBeenCalledWith("id", "123")
  })

  it("should return event type for bdsm event", async () => {
    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ 
              data: { event_type: "bdsm" }, 
              error: null 
            }),
          }),
        }),
      }),
    }

    mockGetContext.mockResolvedValue({ 
      supabase: mockSupabase,
      supabaseHeaders: new Headers(),
      currentUser: null,
      currentProfile: null,
      isProdInDev: false,
      host: "localhost"
    } as any) // eslint-disable-line @typescript-eslint/no-explicit-any

    const mockRequest = new Request("http://localhost")
    const mockParams = { id: "123" }

    const result = await loader({ request: mockRequest, params: mockParams } as Route.LoaderArgs)

    expect(result).toEqual({ eventType: "bdsm" })
  })
})