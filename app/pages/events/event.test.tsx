import { redirect } from "react-router"
import { describe, expect, it, vi, beforeEach } from "vitest"
import { loader } from "./event"
import type { Route } from "./+types/event"

// Mock dependencies
vi.mock("~/business/auth/auth.server", () => ({
  getContext: vi.fn(),
}))

vi.mock("react-router", () => ({
  redirect: vi.fn(),
}))

import { getContext } from "~/business/auth/auth.server"

const mockGetContext = getContext as ReturnType<typeof vi.fn>
const mockRedirect = redirect as ReturnType<typeof vi.fn>

describe("Event navigation loader", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("redirects to dashboard when no event ID is provided", async () => {
    const args = {
      request: new Request("http://localhost:3000/events/"),
      params: {},
    } as Route.LoaderArgs

    await loader(args)

    expect(mockRedirect).toHaveBeenCalledWith("/dashboard")
    expect(mockGetContext).not.toHaveBeenCalled()
  })

  it("redirects to dashboard when event is not found", async () => {
    const mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null }),
    }

    mockGetContext.mockResolvedValue({ supabase: mockSupabase })

    const args = {
      request: new Request("http://localhost:3000/events/non-existent-id"),
      params: { id: "non-existent-id" },
    } as Route.LoaderArgs

    await loader(args)

    expect(mockSupabase.from).toHaveBeenCalledWith("events")
    expect(mockSupabase.select).toHaveBeenCalledWith("event_type")
    expect(mockSupabase.eq).toHaveBeenCalledWith("id", "non-existent-id")
    expect(mockSupabase.single).toHaveBeenCalled()
    expect(mockRedirect).toHaveBeenCalledWith("/dashboard")
  })

  it("redirects to BDSM consent page for BDSM events", async () => {
    const mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ 
        data: { event_type: "bdsm" } 
      }),
    }

    mockGetContext.mockResolvedValue({ supabase: mockSupabase })

    const args = {
      request: new Request("http://localhost:3000/events/bdsm-event-id"),
      params: { id: "bdsm-event-id" },
    } as Route.LoaderArgs

    await loader(args)

    expect(mockSupabase.from).toHaveBeenCalledWith("events")
    expect(mockSupabase.select).toHaveBeenCalledWith("event_type")
    expect(mockSupabase.eq).toHaveBeenCalledWith("id", "bdsm-event-id")
    expect(mockSupabase.single).toHaveBeenCalled()
    expect(mockRedirect).toHaveBeenCalledWith("/dashboard/bdsm-event-id/bdsm-consent")
  })

  it("redirects to rules page for regular events", async () => {
    const mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ 
        data: { event_type: "regular" } 
      }),
    }

    mockGetContext.mockResolvedValue({ supabase: mockSupabase })

    const args = {
      request: new Request("http://localhost:3000/events/regular-event-id"),
      params: { id: "regular-event-id" },
    } as Route.LoaderArgs

    await loader(args)

    expect(mockSupabase.from).toHaveBeenCalledWith("events")
    expect(mockSupabase.select).toHaveBeenCalledWith("event_type")
    expect(mockSupabase.eq).toHaveBeenCalledWith("id", "regular-event-id")
    expect(mockSupabase.single).toHaveBeenCalled()
    expect(mockRedirect).toHaveBeenCalledWith("/dashboard/regular-event-id/regras")
  })

  it("handles null event_type as regular event", async () => {
    const mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ 
        data: { event_type: null } 
      }),
    }

    mockGetContext.mockResolvedValue({ supabase: mockSupabase })

    const args = {
      request: new Request("http://localhost:3000/events/null-type-event"),
      params: { id: "null-type-event" },
    } as Route.LoaderArgs

    await loader(args)

    expect(mockRedirect).toHaveBeenCalledWith("/dashboard/null-type-event/regras")
  })

  it("passes request and params to getContext correctly", async () => {
    const mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ 
        data: { event_type: "regular" } 
      }),
    }

    mockGetContext.mockResolvedValue({ supabase: mockSupabase })

    const request = new Request("http://localhost:3000/events/test-event")
    const params = { id: "test-event" }
    const args = { request, params } as Route.LoaderArgs

    await loader(args)

    expect(mockGetContext).toHaveBeenCalledWith(request, params)
  })

  it("handles database errors gracefully", async () => {
    const mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ 
        data: null,
        error: { message: "Database error" }
      }),
    }

    mockGetContext.mockResolvedValue({ supabase: mockSupabase })

    const args = {
      request: new Request("http://localhost:3000/events/error-event"),
      params: { id: "error-event" },
    } as Route.LoaderArgs

    await loader(args)

    // Should still redirect to dashboard on error
    expect(mockRedirect).toHaveBeenCalledWith("/dashboard")
  })
})